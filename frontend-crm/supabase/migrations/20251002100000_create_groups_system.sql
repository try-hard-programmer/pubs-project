-- =====================================================
-- GROUPS & PERMISSIONS SYSTEM
-- =====================================================
-- This creates groups system with file/folder permissions
-- Super admin can create groups and assign permissions
-- =====================================================

-- =====================================================
-- CREATE ENUM TYPES
-- =====================================================

-- Permission types for files/folders
DO $$ BEGIN
    CREATE TYPE public.permission_type AS ENUM ('view', 'edit', 'delete', 'full');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- CREATE TABLES
-- =====================================================

-- Groups table
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(name)
);

-- Group members table (many-to-many relationship between groups and users)
CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(group_id, user_id)
);

-- Group permissions for files/folders
CREATE TABLE IF NOT EXISTS public.group_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
    file_id UUID REFERENCES public.files(id) ON DELETE CASCADE NOT NULL,
    permission permission_type NOT NULL DEFAULT 'view',
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(group_id, file_id)
);

-- =====================================================
-- CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_name ON public.groups(name);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_added_by ON public.group_members(added_by);

CREATE INDEX IF NOT EXISTS idx_group_permissions_group_id ON public.group_permissions(group_id);
CREATE INDEX IF NOT EXISTS idx_group_permissions_file_id ON public.group_permissions(file_id);
CREATE INDEX IF NOT EXISTS idx_group_permissions_permission ON public.group_permissions(permission);

-- =====================================================
-- ENABLE RLS
-- =====================================================

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_permissions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DROP EXISTING POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admins can view all groups" ON public.groups;
DROP POLICY IF EXISTS "Admins can create groups" ON public.groups;
DROP POLICY IF EXISTS "Admins can update groups" ON public.groups;
DROP POLICY IF EXISTS "Admins can delete groups" ON public.groups;
DROP POLICY IF EXISTS "Users can view their groups" ON public.groups;

DROP POLICY IF EXISTS "Admins can view all group members" ON public.group_members;
DROP POLICY IF EXISTS "Admins can manage group members" ON public.group_members;
DROP POLICY IF EXISTS "Users can view their group memberships" ON public.group_members;

DROP POLICY IF EXISTS "Admins can view all group permissions" ON public.group_permissions;
DROP POLICY IF EXISTS "Admins can manage group permissions" ON public.group_permissions;
DROP POLICY IF EXISTS "Users can view permissions for their groups" ON public.group_permissions;

-- =====================================================
-- RLS POLICIES FOR groups
-- =====================================================

-- Admins can view all groups
CREATE POLICY "Admins can view all groups"
ON public.groups
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Users can view groups they are members of
CREATE POLICY "Users can view their groups"
ON public.groups
FOR SELECT
USING (
    id IN (
        SELECT group_id FROM public.group_members
        WHERE user_id = auth.uid()
    )
);

-- Admins can create groups
CREATE POLICY "Admins can create groups"
ON public.groups
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Admins can update groups
CREATE POLICY "Admins can update groups"
ON public.groups
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Admins can delete groups
CREATE POLICY "Admins can delete groups"
ON public.groups
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- =====================================================
-- RLS POLICIES FOR group_members
-- =====================================================

-- Admins can view all group members
CREATE POLICY "Admins can view all group members"
ON public.group_members
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Users can view their own group memberships
CREATE POLICY "Users can view their group memberships"
ON public.group_members
FOR SELECT
USING (user_id = auth.uid());

-- Admins can manage group members
CREATE POLICY "Admins can manage group members"
ON public.group_members
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- =====================================================
-- RLS POLICIES FOR group_permissions
-- =====================================================

-- Admins can view all group permissions
CREATE POLICY "Admins can view all group permissions"
ON public.group_permissions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Users can view permissions for groups they belong to
CREATE POLICY "Users can view permissions for their groups"
ON public.group_permissions
FOR SELECT
USING (
    group_id IN (
        SELECT group_id FROM public.group_members
        WHERE user_id = auth.uid()
    )
);

-- Admins can manage group permissions
CREATE POLICY "Admins can manage group permissions"
ON public.group_permissions
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- =====================================================
-- CREATE TRIGGERS
-- =====================================================

-- Trigger to update updated_at on groups
DROP TRIGGER IF EXISTS update_groups_updated_at ON public.groups;
CREATE TRIGGER update_groups_updated_at
    BEFORE UPDATE ON public.groups
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at on group_permissions
DROP TRIGGER IF EXISTS update_group_permissions_updated_at ON public.group_permissions;
CREATE TRIGGER update_group_permissions_updated_at
    BEFORE UPDATE ON public.group_permissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if user has permission to access a file through groups
CREATE OR REPLACE FUNCTION public.user_has_group_permission(
    p_user_id UUID,
    p_file_id UUID,
    p_required_permission permission_type
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is in any group that has the required permission for this file
    RETURN EXISTS (
        SELECT 1
        FROM public.group_members gm
        JOIN public.group_permissions gp ON gm.group_id = gp.group_id
        WHERE gm.user_id = p_user_id
        AND gp.file_id = p_file_id
        AND (
            gp.permission = p_required_permission
            OR gp.permission = 'full'
        )
    );
END;
$$;

-- Function to get all files accessible by user through groups
CREATE OR REPLACE FUNCTION public.get_user_accessible_files(p_user_id UUID)
RETURNS TABLE (
    file_id UUID,
    permission permission_type
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        gp.file_id,
        gp.permission
    FROM public.group_members gm
    JOIN public.group_permissions gp ON gm.group_id = gp.group_id
    WHERE gm.user_id = p_user_id
    ORDER BY gp.file_id;
END;
$$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_permissions TO authenticated;

GRANT EXECUTE ON FUNCTION public.user_has_group_permission TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_accessible_files TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT
    'Groups System Created Successfully!' as status,
    EXISTS(SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'groups') as groups_table_exists,
    EXISTS(SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'group_members') as group_members_table_exists,
    EXISTS(SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'group_permissions') as group_permissions_table_exists,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'groups') as groups_policies_count,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_members') as group_members_policies_count,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_permissions') as group_permissions_policies_count;
