-- =====================================================
-- ORGANIZATIONS/BUSINESSES SYSTEM
-- =====================================================
-- This creates organizations table to store business information
-- Super admins (web registrants) own organizations
-- Invited users belong to the same organization as their parent
-- =====================================================

-- =====================================================
-- CREATE ENUM TYPES
-- =====================================================

-- Business category types
DO $$ BEGIN
    CREATE TYPE public.business_category AS ENUM (
        'technology',
        'finance',
        'healthcare',
        'education',
        'retail',
        'manufacturing',
        'consulting',
        'real_estate',
        'hospitality',
        'transportation',
        'media',
        'agriculture',
        'construction',
        'energy',
        'telecommunications',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- CREATE TABLES
-- =====================================================

-- Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    legal_name TEXT,
    category business_category NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(owner_id)
);

-- Organization members table (many-to-many relationship between organizations and users)
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    is_owner BOOLEAN NOT NULL DEFAULT false,
    UNIQUE(organization_id, user_id)
);

-- =====================================================
-- CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON public.organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_category ON public.organizations(category);
CREATE INDEX IF NOT EXISTS idx_organizations_name ON public.organizations(name);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON public.organizations(is_active);

CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON public.organization_members(user_id);

-- =====================================================
-- ENABLE RLS
-- =====================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DROP EXISTING POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "Organization owners can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "Organization owners can create organization" ON public.organizations;

DROP POLICY IF EXISTS "Users can view their organization membership" ON public.organization_members;
DROP POLICY IF EXISTS "Organization owners can manage members" ON public.organization_members;

-- =====================================================
-- RLS POLICIES FOR organizations
-- =====================================================

-- Users can view organizations they are members of
CREATE POLICY "Users can view their organization"
ON public.organizations
FOR SELECT
USING (
    id IN (
        SELECT organization_id
        FROM public.organization_members
        WHERE user_id = auth.uid()
    )
);

-- Organization owners can update their organization
CREATE POLICY "Organization owners can update their organization"
ON public.organizations
FOR UPDATE
USING (owner_id = auth.uid());

-- Organization owners can create organization (only once)
CREATE POLICY "Organization owners can create organization"
ON public.organizations
FOR INSERT
WITH CHECK (
    owner_id = auth.uid()
    AND NOT EXISTS (
        SELECT 1 FROM public.organizations
        WHERE owner_id = auth.uid()
    )
);

-- =====================================================
-- RLS POLICIES FOR organization_members
-- =====================================================

-- Users can view their own organization memberships
CREATE POLICY "Users can view their organization membership"
ON public.organization_members
FOR SELECT
USING (user_id = auth.uid());

-- Organization owners can manage members
CREATE POLICY "Organization owners can manage members"
ON public.organization_members
FOR ALL
USING (
    organization_id IN (
        SELECT id FROM public.organizations
        WHERE owner_id = auth.uid()
    )
);

-- =====================================================
-- CREATE TRIGGERS
-- =====================================================

-- Trigger to update updated_at on organizations
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to create organization with owner as first member
CREATE OR REPLACE FUNCTION public.create_organization(
    p_name TEXT,
    p_legal_name TEXT,
    p_category business_category,
    p_description TEXT,
    p_owner_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- Check if user already has an organization
    IF EXISTS (SELECT 1 FROM public.organizations WHERE owner_id = p_owner_id) THEN
        RAISE EXCEPTION 'User already has an organization';
    END IF;

    -- Create organization
    INSERT INTO public.organizations (
        name,
        legal_name,
        category,
        description,
        owner_id
    ) VALUES (
        p_name,
        p_legal_name,
        p_category,
        p_description,
        p_owner_id
    ) RETURNING id INTO v_org_id;

    -- Add owner as first member
    INSERT INTO public.organization_members (
        organization_id,
        user_id,
        is_owner
    ) VALUES (
        v_org_id,
        p_owner_id,
        true
    );

    RETURN v_org_id;
END;
$$;

-- Function to get organization by user ID
CREATE OR REPLACE FUNCTION public.get_user_organization(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    legal_name TEXT,
    category business_category,
    description TEXT,
    owner_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN,
    is_owner BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id,
        o.name,
        o.legal_name,
        o.category,
        o.description,
        o.owner_id,
        o.created_at,
        o.updated_at,
        o.is_active,
        om.is_owner
    FROM public.organization_members om
    JOIN public.organizations o ON o.id = om.organization_id
    WHERE om.user_id = p_user_id
    LIMIT 1;
END;
$$;

-- Function to add user to parent's organization (called when accepting invitation)
CREATE OR REPLACE FUNCTION public.add_user_to_parent_organization(
    p_user_id UUID,
    p_parent_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- Get parent's organization
    SELECT organization_id INTO v_org_id
    FROM public.organization_members
    WHERE user_id = p_parent_user_id
    LIMIT 1;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Parent user does not belong to any organization';
    END IF;

    -- Add user to same organization
    INSERT INTO public.organization_members (
        organization_id,
        user_id,
        is_owner
    ) VALUES (
        v_org_id,
        p_user_id,
        false
    )
    ON CONFLICT (organization_id, user_id) DO NOTHING;

    RETURN TRUE;
END;
$$;

-- Function to get organization members
CREATE OR REPLACE FUNCTION public.get_organization_members(p_org_id UUID)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    joined_at TIMESTAMP WITH TIME ZONE,
    is_owner BOOLEAN,
    role app_role
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        om.user_id,
        au.email,
        om.joined_at,
        om.is_owner,
        COALESCE(ur.role, 'user'::app_role) as role
    FROM public.organization_members om
    JOIN auth.users au ON au.id = om.user_id
    LEFT JOIN public.user_roles ur ON ur.user_id = om.user_id
    WHERE om.organization_id = p_org_id
    ORDER BY om.is_owner DESC, om.joined_at ASC;
END;
$$;

-- Update accept_invitation function to also add user to organization
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

    -- Add user to parent's organization
    PERFORM public.add_user_to_parent_organization(p_user_id, v_invitation_record.invited_by);

    RETURN TRUE;
END;
$$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;
GRANT SELECT, INSERT ON public.organization_members TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_organization TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_organization TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_user_to_parent_organization TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_members TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT
    'Organizations System Created Successfully!' as status,
    EXISTS(SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organizations') as organizations_table_exists,
    EXISTS(SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organization_members') as organization_members_table_exists,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organizations') as organizations_policies_count,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organization_members') as organization_members_policies_count;
