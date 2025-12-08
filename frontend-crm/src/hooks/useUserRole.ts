import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'super_admin' | 'admin' | 'moderator' | 'user';

interface UserRoleData {
  role: UserRole;
  organization_id: string | null;
  is_owner: boolean;
}

export const useUserRole = () => {
  const { user } = useAuth();

  const { data: userRoleData, isLoading, error } = useQuery({
    queryKey: ['userRole', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Fetch user role with organization context
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, organization_id')
        .eq('user_id', user.id)
        .order('role', { ascending: true }) // Get highest priority role
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        throw error;
      }

      if (!data) {
        // No role found, return default
        return {
          role: 'user' as UserRole,
          organization_id: null,
          is_owner: false,
        };
      }

      // Check if user is organization owner (has super_admin role)
      const isOwner = data.role === 'super_admin' && !!data.organization_id;

      return {
        role: (data.role as UserRole) || 'user',
        organization_id: data.organization_id,
        is_owner: isOwner,
      } as UserRoleData;
    },
    enabled: !!user,
  });

  const userRole = userRoleData?.role || 'user';
  const organizationId = userRoleData?.organization_id || null;
  const isOwner = userRoleData?.is_owner || false;

  const hasRole = (role: UserRole) => userRole === role;

  // Super admin and admin both have admin privileges
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const isSuperAdmin = userRole === 'super_admin';
  const isModerator = userRole === 'moderator';
  const isUser = userRole === 'user';

  // Check if user has at least the required role level
  const hasMinimumRole = (minimumRole: UserRole): boolean => {
    const roleHierarchy: Record<UserRole, number> = {
      super_admin: 4,
      admin: 3,
      moderator: 2,
      user: 1,
    };

    return roleHierarchy[userRole] >= roleHierarchy[minimumRole];
  };

  return {
    userRole,
    organizationId,
    isOwner,
    isLoading,
    error,
    hasRole,
    isAdmin,
    isSuperAdmin,
    isModerator,
    isUser,
    hasMinimumRole,
  };
};