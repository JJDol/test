-- Enable RLS on document_chunks table
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Revoke ALL from anon (anon should never access document_chunks)
REVOKE ALL ON TABLE public.document_chunks FROM anon;

-- Authenticated users can read chunks belonging to their company or public chunks
-- This mirrors the match_document_chunks RPC logic: company_id IN (user_company, 'public')
CREATE POLICY "Users can read own company or public chunks"
  ON public.document_chunks
  FOR SELECT
  TO authenticated
  USING (
    company_id = (public.get_current_user_company_id())::text
    OR company_id = 'public'
  );

-- No INSERT/UPDATE/DELETE policies for authenticated users.
-- All write operations go through the service role client which bypasses RLS.
