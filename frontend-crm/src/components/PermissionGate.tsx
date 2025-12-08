import { ReactNode } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { OrganizationRole } from '@/lib/organizationRolesService';

interface PermissionGateProps {
  organizationId: string;
  requiredRole: OrganizationRole;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component to conditionally render children based on user's role in organization
 * Usage:
 * <PermissionGate organizationId={orgId} requiredRole="admin">
 *   <AdminOnlyButton />
 * </PermissionGate>
 */
export const PermissionGate = ({
  organizationId,
  requiredRole,
  children,
  fallback = null,
}: PermissionGateProps) => {
  const { hasPermission } = useRole();

  if (!hasPermission(organizationId, requiredRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface OwnerGateProps {
  organizationId: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component to conditionally render children only for organization owners
 */
export const OwnerGate = ({ organizationId, children, fallback = null }: OwnerGateProps) => {
  const { isOwner } = useRole();

  if (!isOwner(organizationId)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface RoleBasedProps {
  organizationId: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component to render children only if user can manage roles (admin or super_admin)
 */
export const RoleManagerGate = ({ organizationId, children, fallback = null }: RoleBasedProps) => {
  const { canManageRoles } = useRole();

  if (!canManageRoles(organizationId)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};