-- Enable RLS on companies table
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Revoke ALL from anon (anon should never access companies directly)
REVOKE ALL ON TABLE public.companies FROM anon;

-- Super admins can read all companies (used by /api/companies admin endpoint)
CREATE POLICY "Super admins can read all companies"
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (public.check_if_super_admin());

-- Authenticated users can read their own company
CREATE POLICY "Users can read own company"
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (id = public.get_current_user_company_id());

-- Company admins can update their own company
CREATE POLICY "Company admins can update own company"
  ON public.companies
  FOR UPDATE
  TO authenticated
  USING (id = public.get_current_user_company_id() AND public.check_if_admin())
  WITH CHECK (id = public.get_current_user_company_id() AND public.check_if_admin());
