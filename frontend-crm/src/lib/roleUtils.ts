import { UserRole } from '@/hooks/useUserRole';

/**
 * Role hierarchy levels
 * Higher number = higher privilege
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 4,
  admin: 3,
  moderator: 2,
  user: 1,
};

/**
 * Check if a role has minimum required privilege level
 */
export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if user has admin privileges (admin or super_admin)
 */
export function isAdminRole(role: UserRole): boolean {
  return role === 'admin' || role === 'super_admin';
}

/**
 * Check if user has super admin privileges
 */
export function isSuperAdminRole(role: UserRole): boolean {
  return role === 'super_admin';
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    moderator: 'Moderator',
    user: 'User',
  };

  return displayNames[role];
}

/**
 * Get role color for UI
 */
export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    super_admin: 'text-purple-600 bg-purple-100',
    admin: 'text-blue-600 bg-blue-100',
    moderator: 'text-green-600 bg-green-100',
    user: 'text-gray-600 bg-gray-100',
  };

  return colors[role];
}

/**
 * Check if role can access admin pages
 * Admin pages include: user management, group management, etc.
 */
export function canAccessAdminPages(role: UserRole): boolean {
  return isAdminRole(role);
}

/**
 * Check if role can manage users
 */
export function canManageUsers(role: UserRole): boolean {
  return isAdminRole(role);
}

/**
 * Check if role can manage groups
 */
export function canManageGroups(role: UserRole): boolean {
  return isAdminRole(role);
}

/**
 * Check if role can manage organization settings
 * Only super_admin (organization owner) can manage organization settings
 */
export function canManageOrganization(role: UserRole): boolean {
  return isSuperAdminRole(role);
}