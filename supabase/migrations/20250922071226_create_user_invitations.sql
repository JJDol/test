-- Create user_invitations table
CREATE TABLE IF NOT EXISTS public.user_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT,
    role TEXT NOT NULL CHECK (role IN ('USER', 'MANAGER')),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON public.user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON public.user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_company_id ON public.user_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON public.user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires_at ON public.user_invitations(expires_at);

-- Create RLS policies for user_invitations table
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Company admins can view invitations for their company
CREATE POLICY "Company admins can view company invitations" ON public.user_invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'COMPANY_ADMIN'
            AND users.company_id = user_invitations.company_id
        )
    );

-- Policy: Company admins can create invitations for their company
CREATE POLICY "Company admins can create company invitations" ON public.user_invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'COMPANY_ADMIN'
            AND users.company_id = user_invitations.company_id
        )
        AND invited_by = auth.uid()
    );

-- Policy: Company admins can update invitations for their company
CREATE POLICY "Company admins can update company invitations" ON public.user_invitations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'COMPANY_ADMIN'
            AND users.company_id = user_invitations.company_id
        )
    );

-- Policy: Anyone can read invitations by token (for validation)
CREATE POLICY "Anyone can read invitations by token" ON public.user_invitations
    FOR SELECT USING (true);

-- Policy: Anyone can update invitations by token (for acceptance)
CREATE POLICY "Anyone can update invitations by token" ON public.user_invitations
    FOR UPDATE USING (true);

-- Create function to automatically expire old invitations
CREATE OR REPLACE FUNCTION public.expire_old_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.user_invitations
    SET status = 'expired'
    WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$;

-- Create a trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION public.update_user_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_invitations_updated_at
    BEFORE UPDATE ON public.user_invitations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_invitations_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.user_invitations TO authenticated;
GRANT SELECT ON public.user_invitations TO anon;
