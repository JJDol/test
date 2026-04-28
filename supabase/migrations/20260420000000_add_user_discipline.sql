-- Add an explicit "discipline" for each user (Architect / Engineer / Fire /
-- Constructor). This is authored by a COMPANY_ADMIN and replaces the previous
-- client-side inference from document assignment categories, so a user's
-- discipline is stable regardless of which documents they happen to be
-- assigned to on a given project.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS discipline text;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_discipline_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_discipline_check
  CHECK (
    discipline IS NULL
    OR discipline IN ('Architect', 'Engineer', 'Fire', 'Constructor')
  );

CREATE INDEX IF NOT EXISTS idx_users_discipline ON public.users (discipline);

COMMENT ON COLUMN public.users.discipline IS
  'Professional discipline of the user within their company. NULL means unassigned. Set by a COMPANY_ADMIN via the Team page.';
