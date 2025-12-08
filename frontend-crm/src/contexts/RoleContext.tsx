import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  OrganizationRolesService,
  UserOrganizationRole,
  OrganizationRole,
} from '@/lib/organizationRolesService';
import { useAuth } from './AuthContext';

interface RoleContextType {
  userRoles: UserOrganizationRole[];
  currentOrgRole: OrganizationRole | null;
  loading: boolean;
  error: string | null;
  getRoleInOrg: (orgId: string) => OrganizationRole;
  isOwner: (orgId: string) => boolean;
  setCurrentOrgRole: (role: OrganizationRole | null) => void;
  refreshRoles: () => Promise<void>;
  hasPermission: (orgId: string, requiredRole: OrganizationRole) => boolean;
  canManageRoles: (orgId: string) => boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

interface RoleProviderProps {
  children: ReactNode;
}

export const RoleProvider = ({ children }: RoleProviderProps) => {
  const [userRoles, setUserRoles] = useState<UserOrganizationRole[]>([]);
  const [currentOrgRole, setCurrentOrgRole] = useState<OrganizationRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchUserRoles = async () => {
    if (!user) {
      setUserRoles([]);
      setCurrentOrgRole(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await OrganizationRolesService.getMyRoles();
      setUserRoles(response.organizations);

      // Set current org role if we have organizations
      if (response.organizations.length > 0 && !currentOrgRole) {
        setCurrentOrgRole(response.organizations[0].role);
      }
    } catch (err: any) {
      console.error('Error fetching user roles:', err);
      setError(err.message || 'Failed to fetch user roles');
      setUserRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserRoles();
  }, [user]);

  const getRoleInOrg = (orgId: string): OrganizationRole => {
    const org = userRoles.find((o) => o.organization_id === orgId);
    return org?.role || 'user';
  };

  const isOwner = (orgId: string): boolean => {
    const org = userRoles.find((o) => o.organization_id === orgId);
    return org?.is_owner || false;
  };

  const refreshRoles = async () => {
    await fetchUserRoles();
  };

  const hasPermission = (orgId: string, requiredRole: OrganizationRole): boolean => {
    const userRole = getRoleInOrg(orgId);
    return OrganizationRolesService.hasPermission(userRole, requiredRole);
  };

  const canManageRoles = (orgId: string): boolean => {
    const userRole = getRoleInOrg(orgId);
    return userRole === 'admin' || userRole === 'super_admin';
  };

  const value: RoleContextType = {
    userRoles,
    currentOrgRole,
    loading,
    error,
    getRoleInOrg,
    isOwner,
    setCurrentOrgRole,
    refreshRoles,
    hasPermission,
    canManageRoles,
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

export const useRole = (): RoleContextType => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};