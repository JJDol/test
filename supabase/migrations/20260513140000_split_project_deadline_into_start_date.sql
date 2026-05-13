-- ============================================================================
-- Issue 15 (D3 옵션 B 풀 적용) — `projects.deadline`을 의미별로 분리
--
-- 변경 전:
--   `projects.deadline`이 "프로젝트 마감일" 의미로 (사실상 모호하게) 사용됨.
--   사용자가 New Project 모달에 입력한 값이 사이드보드/대시보드/칸반에서
--   "마감일"로 표시되었지만, virtualProject가 active phase의 deadline으로
--   오버라이드해 실제 표시값과 의미가 어긋남.
--
-- 변경 후:
--   1. `projects.start_date date NULL` 신설 — 사용자가 입력하는 "프로젝트
--      시작일". 의미가 명확하고 phase 마감일과 독립.
--   2. 옛 `projects.deadline` 값은 해당 프로젝트의 첫 phase
--      (display_order 가장 작은 phase) deadline이 NULL일 때만 backfill.
--      옛 값은 본래 마감일 의미였으므로 phase 마감일로 옮기는 것이 가장
--      일관됨.
--   3. `projects.deadline` 컬럼 DROP — UI는 이제 모두 phase별 deadline
--      또는 새 `start_date` 만 사용함.
--
-- 멱등성: ADD COLUMN IF NOT EXISTS / DROP COLUMN IF EXISTS / 백필 시
-- IS NULL 가드로 재실행 안전.
-- ============================================================================

BEGIN;

-- 1) start_date 컬럼 신설 (NULL 허용 — 옛 프로젝트엔 값 없음)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS start_date date;

COMMENT ON COLUMN public.projects.start_date IS
  'Project start date. Distinct from per-phase deadlines (project_phases.deadline). '
  'D3 option B (Issue 15) — replaces the previous overloaded `deadline` column.';

-- 2) 옛 deadline 값을 first phase deadline으로 backfill
--    (phase deadline이 NULL일 때만 — 사용자가 phase별로 명시적으로 설정한
--    값은 절대 덮어쓰지 않음)
DO $$
DECLARE
  has_legacy_deadline boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'deadline'
  ) INTO has_legacy_deadline;

  IF has_legacy_deadline THEN
    -- 각 프로젝트의 first phase (phase_definitions.display_order 가장 작은
    -- phase, tie-break은 project_phases.created_at) deadline이 NULL인
    -- 경우 옛 projects.deadline 값으로 채움.
    -- (display_order는 phase_definitions에만 존재하므로 join 필요.)
    EXECUTE $sql$
      UPDATE public.project_phases pp
      SET deadline = sub.legacy_deadline
      FROM (
        SELECT DISTINCT ON (p.id)
          p.id            AS project_id,
          p.deadline      AS legacy_deadline,
          ph.id           AS phase_id
        FROM public.projects p
        JOIN public.project_phases ph ON ph.project_id = p.id
        JOIN public.phase_definitions pd ON pd.id = ph.phase_definition_id
        WHERE p.deadline IS NOT NULL
        ORDER BY p.id, pd.display_order ASC NULLS LAST, ph.created_at ASC NULLS LAST
      ) AS sub
      WHERE pp.id = sub.phase_id
        AND pp.deadline IS NULL;
    $sql$;
  END IF;
END$$;

-- 3) 옛 deadline 컬럼 제거. 코드는 이미 본 마이그레이션과 같은 PR에서
--    `start_date` / phase별 deadline만 참조하도록 변경됨.
ALTER TABLE public.projects
  DROP COLUMN IF EXISTS deadline;

COMMIT;
