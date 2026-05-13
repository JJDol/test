-- =============================================================================
-- 2026-05-13 — D2 X2 정책 재정의 (X2'') : Category SSOT를 phase-level로
-- =============================================================================
-- 배경:
--   PR3c (`20260422000000_finalize_phase_system.sql`)에서
--   `project_phases.category_variables` / `global_variables` 컬럼을 drop했고
--   "global/category variables stay on the project row" 정책이 적용됐음.
--
-- 사용자 정책 변경 (2026-05-13):
--   - Global → 그대로 project-level 유지 (모든 phase 공유)
--   - Category → phase-level (같은 phase 내 도큐먼트끼리만 공유,
--                              phase 변경 시 독립)
--   - propagation_settings → 그대로 project-level 유지 (scope 결정은 공통)
--
-- 본 마이그레이션:
--   1) `project_phases.category_variables` 컬럼 재추가
--      (jsonb NOT NULL DEFAULT '{}')
--   2) 백필 정책 (copy-first):
--        프로젝트별 first/current phase 1개로만
--        `projects.category_variables` 복사. 다른 phase는 빈 상태로 시작.
--   3) `projects.category_variables`는 일단 유지 (legacy fallback +
--      롤백 안전망). 충분히 안정화된 후 별도 마이그레이션에서 drop.
--
-- 멱등성: 모든 DDL은 IF NOT EXISTS, 백필은 NOT EXISTS / 비어있는 경우만.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) Phase-scoped category_variables 컬럼 재추가
-- -----------------------------------------------------------------------------
ALTER TABLE public.project_phases
  ADD COLUMN IF NOT EXISTS category_variables jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.project_phases.category_variables IS
  'Phase-scoped category variables SSOT. Shape: { [category]: { variables: DocumentVariable[] } }. Same-phase documents share via this; cross-phase isolation enforced.';

-- -----------------------------------------------------------------------------
-- 2) Copy-first 백필 — 각 프로젝트의 first/current phase 1개에만 복사
-- -----------------------------------------------------------------------------
--    선택 우선순위:
--      a) is_current = true 인 phase
--      b) (없으면) phase_definitions.display_order 가장 작은 phase
--    이미 phase.category_variables 가 비어있지 않으면 스킵 (재실행 안전).
DO $$
DECLARE
  proj RECORD;
  target_phase_id uuid;
  source_jsonb    jsonb;
  current_jsonb   jsonb;
BEGIN
  FOR proj IN
    SELECT p.id, p.category_variables
    FROM public.projects p
    WHERE p.category_variables IS NOT NULL
      AND p.category_variables <> '{}'::jsonb
  LOOP
    -- (a) current phase 우선
    SELECT pp.id INTO target_phase_id
    FROM public.project_phases pp
    WHERE pp.project_id = proj.id
      AND pp.is_current = TRUE
    LIMIT 1;

    -- (b) fallback : display_order 가장 작은 phase
    IF target_phase_id IS NULL THEN
      SELECT pp.id INTO target_phase_id
      FROM public.project_phases pp
      JOIN public.phase_definitions pd ON pd.id = pp.phase_definition_id
      WHERE pp.project_id = proj.id
      ORDER BY pd.display_order ASC
      LIMIT 1;
    END IF;

    -- 타겟 phase가 없으면 (이론상 trigger로 보장되므로 거의 없음) 스킵
    IF target_phase_id IS NULL THEN
      CONTINUE;
    END IF;

    -- 이미 phase.category_variables가 채워져 있으면 스킵 (재실행 안전)
    SELECT pp.category_variables INTO current_jsonb
    FROM public.project_phases pp
    WHERE pp.id = target_phase_id;

    IF current_jsonb IS NOT NULL AND current_jsonb <> '{}'::jsonb THEN
      CONTINUE;
    END IF;

    source_jsonb := proj.category_variables;

    UPDATE public.project_phases
       SET category_variables = source_jsonb
     WHERE id = target_phase_id;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 3) (의도적 미적용) projects.category_variables 컬럼 drop은 후속 작업
-- -----------------------------------------------------------------------------
--    당분간 fallback 경로(코드 레벨)에서 활용. 충분한 운영 기간 후 별도
--    마이그레이션에서 DROP COLUMN 진행.

COMMIT;
