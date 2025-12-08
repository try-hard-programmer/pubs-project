-- Create user_hierarchy table to track parent-child relationships
CREATE TABLE public.user_hierarchy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    child_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (parent_user_id, child_user_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_user_hierarchy_parent ON public.user_hierarchy(parent_user_id);
CREATE INDEX idx_user_hierarchy_child ON public.user_hierarchy(child_user_id);

-- Enable RLS on user_hierarchy
ALTER TABLE public.user_hierarchy ENABLE ROW LEVEL SECURITY;

-- Create enum for invitation status
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');

-- Create user_invitations table
CREATE TABLE public.user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invited_email TEXT NOT NULL,
    invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    invitation_token TEXT UNIQUE NOT NULL,
    status invitation_status NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_user_invitations_email ON public.user_invitations(invited_email);
CREATE INDEX idx_user_invitations_token ON public.user_invitations(invitation_token);
CREATE INDEX idx_user_invitations_invited_by ON public.user_invitations(invited_by);
CREATE INDEX idx_user_invitations_status ON public.user_invitations(status);

-- Enable RLS on user_invitations
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_hierarchy
CREATE POLICY "Users can view their own hierarchy"
ON public.user_hierarchy
FOR SELECT
USING (
    auth.uid() = parent_user_id OR
    auth.uid() = child_user_id
);

CREATE POLICY "Admins can view all hierarchies"
ON public.user_hierarchy
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all hierarchies"
ON public.user_hierarchy
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for user_invitations
CREATE POLICY "Users can view their own invitations"
ON public.user_invitations
FOR SELECT
USING (auth.uid() = invited_by);

CREATE POLICY "Admins can view all invitations"
ON public.user_invitations
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create invitations"
ON public.user_invitations
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own invitations"
ON public.user_invitations
FOR UPDATE
USING (auth.uid() = invited_by);

CREATE POLICY "Admins can update all invitations"
ON public.user_invitations
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete invitations"
ON public.user_invitations
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Function to generate secure invitation token
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    token TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        -- Generate a random token (32 characters)
        token := encode(gen_random_bytes(24), 'base64');
        -- Remove characters that might cause URL issues
        token := replace(replace(replace(token, '+', ''), '/', ''), '=', '');

        -- Check if token already exists
        SELECT EXISTS(SELECT 1 FROM public.user_invitations WHERE invitation_token = token) INTO exists;

        IF NOT exists THEN
            RETURN token;
        END IF;
    END LOOP;
END;
$$;

-- Function to create user invitation
CREATE OR REPLACE FUNCTION public.create_user_invitation(
    p_email TEXT,
    p_invited_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invitation_id UUID;
    v_token TEXT;
BEGIN
    -- Check if user is admin
    IF NOT public.has_role(p_invited_by, 'admin') THEN
        RAISE EXCEPTION 'Only admins can create invitations';
    END IF;

    -- Check if email already exists
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
        RAISE EXCEPTION 'User with this email already exists';
    END IF;

    -- Check if there's already a pending invitation
    IF EXISTS (
        SELECT 1 FROM public.user_invitations
        WHERE invited_email = p_email
        AND status = 'pending'
        AND expires_at > now()
    ) THEN
        RAISE EXCEPTION 'Pending invitation already exists for this email';
    END IF;

    -- Generate token
    v_token := public.generate_invitation_token();

    -- Create invitation
    INSERT INTO public.user_invitations (
        invited_email,
        invited_by,
        invitation_token,
        status
    ) VALUES (
        p_email,
        p_invited_by,
        v_token,
        'pending'
    ) RETURNING id INTO v_invitation_id;

    RETURN v_invitation_id;
END;
$$;

-- Function to accept invitation and create hierarchy
CREATE OR REPLACE FUNCTION public.accept_invitation(
    p_token TEXT,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invitation_record RECORD;
BEGIN
    -- Get invitation details
    SELECT * INTO v_invitation_record
    FROM public.user_invitations
    WHERE invitation_token = p_token
    AND status = 'pending'
    AND expires_at > now()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired invitation token';
    END IF;

    -- Update invitation status
    UPDATE public.user_invitations
    SET status = 'accepted',
        accepted_at = now(),
        updated_at = now()
    WHERE id = v_invitation_record.id;

    -- Create user hierarchy relationship
    INSERT INTO public.user_hierarchy (parent_user_id, child_user_id)
    VALUES (v_invitation_record.invited_by, p_user_id);

    RETURN TRUE;
END;
$$;

-- Function to get user's downlines (children)
CREATE OR REPLACE FUNCTION public.get_user_downlines(p_user_id UUID)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    role app_role
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        au.id,
        au.email,
        uh.created_at,
        COALESCE(ur.role, 'user'::app_role) as role
    FROM public.user_hierarchy uh
    JOIN auth.users au ON au.id = uh.child_user_id
    LEFT JOIN public.user_roles ur ON ur.user_id = au.id
    WHERE uh.parent_user_id = p_user_id
    ORDER BY uh.created_at DESC;
END;
$$;

-- Function to get user's parent (upline)
CREATE OR REPLACE FUNCTION public.get_user_parent(p_user_id UUID)
RETURNS TABLE (
    user_id UUID,
    email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        au.id,
        au.email
    FROM public.user_hierarchy uh
    JOIN auth.users au ON au.id = uh.parent_user_id
    WHERE uh.child_user_id = p_user_id
    LIMIT 1;
END;
$$;

-- Function to expire old invitations (can be called by a cron job)
CREATE OR REPLACE FUNCTION public.expire_old_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.user_invitations
    SET status = 'expired',
        updated_at = now()
    WHERE status = 'pending'
    AND expires_at <= now();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- Trigger to update updated_at on user_invitations
CREATE TRIGGER update_user_invitations_updated_at
    BEFORE UPDATE ON public.user_invitations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Grant necessary permissions
GRANT SELECT ON public.user_invitations TO authenticated;
GRANT SELECT ON public.user_hierarchy TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_downlines TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_parent TO authenticated;