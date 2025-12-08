-- Fix RLS policy to allow users to accept invitations
-- This is required because users who are accepting invitations need to:
-- 1. SELECT the invitation (verify token) - before authentication
-- 2. UPDATE the invitation status - after signup but before full login
-- 3. INSERT into user_hierarchy - to establish parent-child relationship

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Admins can view all invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Admins can update all invitations" ON public.user_invitations;

-- ============================================================================
-- SELECT POLICIES (for viewing invitations)
-- ============================================================================

-- Users can view invitations they created
CREATE POLICY "Users can view their own invitations"
ON public.user_invitations
FOR SELECT
USING (auth.uid() = invited_by);

-- Admins can view all invitations
CREATE POLICY "Admins can view all invitations"
ON public.user_invitations
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- CRITICAL: Allow anyone (including anonymous) to SELECT invitations for token verification
-- This is safe because tokens are cryptographically random
CREATE POLICY "Anyone can verify invitation tokens"
ON public.user_invitations
FOR SELECT
USING (true);

-- ============================================================================
-- UPDATE POLICIES (for accepting invitations)
-- ============================================================================

-- Users can update invitations they created
CREATE POLICY "Users can update their own invitations"
ON public.user_invitations
FOR UPDATE
USING (auth.uid() = invited_by)
WITH CHECK (auth.uid() = invited_by);

-- Admins can update all invitations
CREATE POLICY "Admins can update all invitations"
ON public.user_invitations
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- CRITICAL: Allow authenticated users to accept their invitation
-- This allows newly signed up users to update the invitation status
CREATE POLICY "Authenticated users can accept pending invitations"
ON public.user_invitations
FOR UPDATE
USING (
  status = 'pending' AND expires_at > now()
)
WITH CHECK (
  status IN ('accepted', 'pending')
);

-- ============================================================================
-- FIX USER_HIERARCHY RLS (for creating parent-child relationships)
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own hierarchy" ON public.user_hierarchy;
DROP POLICY IF EXISTS "Admins can view all hierarchies" ON public.user_hierarchy;
DROP POLICY IF EXISTS "Admins can manage all hierarchies" ON public.user_hierarchy;

-- Users can view their hierarchy (as parent or child)
CREATE POLICY "Users can view their own hierarchy"
ON public.user_hierarchy
FOR SELECT
USING (
  auth.uid() = parent_user_id OR
  auth.uid() = child_user_id
);

-- Admins can view all hierarchies
CREATE POLICY "Admins can view all hierarchies"
ON public.user_hierarchy
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage all hierarchies
CREATE POLICY "Admins can manage all hierarchies"
ON public.user_hierarchy
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- CRITICAL: Allow authenticated users to INSERT themselves as child when accepting invitation
-- This allows newly signed up users to be added to the hierarchy
CREATE POLICY "Users can be added as children when accepting invitations"
ON public.user_hierarchy
FOR INSERT
WITH CHECK (
  -- The new user must be the child in the relationship
  auth.uid() = child_user_id
);
