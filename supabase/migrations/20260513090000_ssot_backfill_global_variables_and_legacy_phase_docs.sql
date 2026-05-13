-- =============================================================================
-- HQT-1904 — SSOT 백필 마이그레이션 (Stage 1-C)
-- =============================================================================
-- D2 X2 정책 (project.global_variables / category_variables = SSOT) +
-- D6 auto_distribute (옛 평면 컬럼 → 첫 phase로 자동 분배) 결정사항을 반영한
-- 옛 데이터 안전 마이그레이션.
--
-- 이 마이그레이션은 항상 idempotent이며 다음 두 가지를 처리한다:
--
--   1) global_variables 시드 백필
--      모든 projects 행에 대해 project_name / project_location /
--      project_deadline / project_leader 변수가 global_variables.variables
--      안에 없거나 비어 있다면 projects.{name,location,deadline} 와
--      leader_id → users.name 으로부터 시드한다 (Issue 16 backfill).
--      이미 채워진 entry는 건드리지 않는다 (시연 데이터 보호).
--
--   2) 옛 평면 *_templates 컬럼 → 첫 project_phase로 자동 분배
--      finalize_phase_system 마이그레이션이 적용된 환경에서는 컬럼이
--      이미 drop된 상태이므로 이 블록은 NOOP이다.
--      아직 drop되지 않은 환경(레거시 dev/스테이징)에서만 옛 평면 배열을
--      읽어 각 project의 첫 phase에 project_phase_documents 행이 없으면
--      자동 분배한다 (Issue 11 ghost 발생을 막는 D6 결정).
--
-- 모든 작업은 idempotent이며 단일 트랜잭션으로 처리된다.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- (1) global_variables 시드 백필 — Issue 16 backfill
-- -----------------------------------------------------------------------------
-- 안전한 jsonb 병합 헬퍼: 기존 entry의 value가 비어 있을 때만 갱신.
-- (NULL/빈 string/없는 entry → 새 값으로 채움. 이외에는 그대로 유지)
CREATE OR REPLACE FUNCTION pg_temp.upsert_global_variable(
  current_global jsonb,
  var_name text,
  var_value text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  variables_arr jsonb;
  new_arr jsonb := '[]'::jsonb;
  item jsonb;
  found boolean := false;
  existing_value text;
BEGIN
  IF var_value IS NULL OR length(var_value) = 0 THEN
    RETURN current_global;
  END IF;

  IF current_global IS NULL THEN
    current_global := jsonb_build_object('variables', '[]'::jsonb);
  END IF;

  variables_arr := COALESCE(current_global->'variables', '[]'::jsonb);

  FOR item IN SELECT * FROM jsonb_array_elements(variables_arr)
  LOOP
    IF item->>'name' = var_name THEN
      found := true;
      existing_value := item->>'value';
      IF existing_value IS NULL OR length(existing_value) = 0 THEN
        item := jsonb_set(item, '{value}', to_jsonb(var_value), true);
      END IF;
    END IF;
    new_arr := new_arr || item;
  END LOOP;

  IF NOT found THEN
    new_arr := new_arr || jsonb_build_object(
      'name', var_name,
      'type', 'text',
      'value', var_value
    );
  END IF;

  RETURN jsonb_set(current_global, '{variables}', new_arr, true);
END;
$$;

-- 모든 projects 행에 대해 4개 시드 변수 백필
UPDATE public.projects p
SET global_variables = (
  SELECT
    pg_temp.upsert_global_variable(
      pg_temp.upsert_global_variable(
        pg_temp.upsert_global_variable(
          pg_temp.upsert_global_variable(
            COALESCE(p.global_variables, '{"variables": []}'::jsonb),
            'project_name',
            p.name
          ),
          'project_location',
          p.location
        ),
        'project_deadline',
        CASE
          WHEN p.deadline IS NOT NULL THEN to_char(p.deadline::date, 'YYYY-MM-DD')
          ELSE NULL
        END
      ),
      'project_leader',
      COALESCE(u.name, 'Unassigned')
    )
)
FROM public.users u
WHERE p.leader_id = u.id;

-- leader_id가 NULL인 프로젝트도 처리 (project_leader는 'Unassigned'로 시드)
UPDATE public.projects p
SET global_variables = pg_temp.upsert_global_variable(
  pg_temp.upsert_global_variable(
    pg_temp.upsert_global_variable(
      COALESCE(p.global_variables, '{"variables": []}'::jsonb),
      'project_name',
      p.name
    ),
    'project_location',
    p.location
  ),
  'project_deadline',
  CASE
    WHEN p.deadline IS NOT NULL THEN to_char(p.deadline::date, 'YYYY-MM-DD')
    ELSE NULL
  END
)
WHERE p.leader_id IS NULL;

-- -----------------------------------------------------------------------------
-- (2) 옛 평면 *_templates 컬럼 → 첫 phase로 auto-distribute (D6)
-- -----------------------------------------------------------------------------
-- finalize_phase_system이 컬럼을 drop한 환경에서는 NOOP (information_schema check).
-- 옛 컬럼이 살아 있는 환경(예: 미적용 dev/스테이징)에서만 카테고리별 INSERT 실행.
--
-- 구현 노트: PL/pgSQL의 record 타입은 EXECUTE 안에서 컬럼을 동적으로 참조할 수 없어
-- (`$1.%I` 패턴은 컴파일 타임에 컬럼명이 필요함), 카테고리별로 dynamic SQL을
-- 한 번씩 실행해 INSERT...SELECT...NOT EXISTS 형태로 처리한다.
DO $$
DECLARE
  has_legacy_columns boolean;
  cat_pair RECORD;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'architecture_templates'
  ) INTO has_legacy_columns;

  IF NOT has_legacy_columns THEN
    RAISE NOTICE 'Legacy *_templates columns already dropped — skipping auto-distribute step.';
    RETURN;
  END IF;

  FOR cat_pair IN
    SELECT category_name, column_name FROM (VALUES
      ('ARCHITECTURE',         'architecture_templates'),
      ('CONSTRUCTIONS',        'constructions_templates'),
      ('FIRE',                 'fire_templates'),
      ('AUTHORITY_PROCESSING', 'authority_processing_templates'),
      ('ENERGY',               'energy_templates'),
      ('HVAC',                 'hvac_templates'),
      ('EXECUTION_CONTROL',    'execution_control_templates')
    ) AS v(category_name, column_name)
  LOOP
    EXECUTE format($fmt$
      INSERT INTO public.project_phase_documents (
        project_phase_id, template_name, category, variables,
        propagation_settings, assignments, review_status, template_version_lock
      )
      SELECT
        ph.id, t.template_name, %1$L, '{"variables": []}'::jsonb,
        '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, NULL
      FROM public.projects p
      CROSS JOIN LATERAL unnest(p.%2$I) AS t(template_name)
      JOIN LATERAL (
        SELECT id FROM public.project_phases
        WHERE project_id = p.id
        ORDER BY is_current DESC, created_at ASC NULLS LAST, id ASC
        LIMIT 1
      ) ph ON true
      WHERE p.%2$I IS NOT NULL
        AND array_length(p.%2$I, 1) > 0
        AND NOT EXISTS (
          SELECT 1 FROM public.project_phase_documents d
          WHERE d.project_phase_id = ph.id
            AND d.template_name = t.template_name
            AND d.category = %1$L
        )
    $fmt$, cat_pair.category_name, cat_pair.column_name);
  END LOOP;
END;
$$;

COMMIT;
