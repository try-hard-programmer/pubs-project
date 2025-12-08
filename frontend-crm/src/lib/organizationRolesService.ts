import { apiClient } from './apiClient';

// Types for organization roles
export type OrganizationRole = 'super_admin' | 'admin' | 'moderator' | 'user';

export interface OrganizationMemberWithRole {
  user_id: string;
  email?: string;
  role: OrganizationRole;
  is_owner: boolean;
  joined_at: string;
  assigned_by?: string;
}

export interface MembersWithRolesResponse {
  members: OrganizationMemberWithRole[];
  total: number;
  organization?: {
    id: string;
    name: string;
  };
}

export interface UserOrganizationRole {
  user_id: string;
  organization_id: string;
  organization_name: string;
  role: OrganizationRole;
  is_owner: boolean;
  joined_at: string;
}

export interface UserRolesResponse {
  organizations: UserOrganizationRole[];
  total: number;
}

export interface AssignRoleRequest {
  user_id: string;
  role: OrganizationRole;
}

export interface AssignRoleResponse {
  role_id: string;
  message: string;
}

/**
 * Organization Roles Service
 * Handles all API calls related to organization role management
 */
export class OrganizationRolesService {
  /**
   * Get all members with their roles in an organization
   */
  static async getMembersWithRoles(orgId: string): Promise<MembersWithRolesResponse> {
    return apiClient.get<MembersWithRolesResponse>(
      `/organizations/${orgId}/members-with-roles`
    );
  }

  /**
   * Assign a role to a member in an organization
   * Requires admin or super_admin permission
   */
  static async assignRole(
    orgId: string,
    userId: string,
    role: OrganizationRole
  ): Promise<AssignRoleResponse> {
    return apiClient.post<AssignRoleResponse>(
      `/organizations/${orgId}/members/${userId}/role`,
      { user_id: userId, role }
    );
  }

  /**
   * Get a specific member's role in an organization
   */
  static async getMemberRole(orgId: string, userId: string): Promise<OrganizationRole> {
    return apiClient.get<OrganizationRole>(
      `/organizations/${orgId}/members/${userId}/role`
    );
  }

  /**
   * Remove a member's role (reverts to default 'user' role)
   * Requires admin or super_admin permission
   */
  static async removeMemberRole(orgId: string, userId: string): Promise<void> {
    return apiClient.delete<void>(`/organizations/${orgId}/members/${userId}/role`);
  }

  /**
   * Get current user's roles in all organizations they belong to
   */
  static async getMyRoles(): Promise<UserRolesResponse> {
    return apiClient.get<UserRolesResponse>('/organizations/users/me/roles');
  }

  /**
   * Check if user has required permission level
   * @param userRole - Current user's role
   * @param requiredRole - Required role for the action
   * @returns true if user has sufficient permission
   */
  static hasPermission(userRole: OrganizationRole, requiredRole: OrganizationRole): boolean {
    const roleHierarchy: Record<OrganizationRole, number> = {
      super_admin: 4,
      admin: 3,
      moderator: 2,
      user: 1,
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  /**
   * Check if user can assign a specific role
   * Rules:
   * - super_admin can assign: admin, moderator, user (not super_admin)
   * - admin can assign: moderator, user (not admin or super_admin)
   * - others cannot assign roles
   */
  static canAssignRole(
    assignerRole: OrganizationRole,
    roleToAssign: OrganizationRole
  ): boolean {
    if (assignerRole === 'super_admin') {
      return roleToAssign !== 'super_admin';
    }

    if (assignerRole === 'admin') {
      return roleToAssign === 'moderator' || roleToAssign === 'user';
    }

    return false;
  }

  /**
   * Get available roles that a user can assign
   */
  static getAssignableRoles(assignerRole: OrganizationRole): OrganizationRole[] {
    if (assignerRole === 'super_admin') {
      return ['admin', 'moderator', 'user'];
    }

    if (assignerRole === 'admin') {
      return ['moderator', 'user'];
    }

    return [];
  }

  /**
   * Get role display name
   */
  static getRoleDisplayName(role: OrganizationRole): string {
    const displayNames: Record<OrganizationRole, string> = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      moderator: 'Moderator',
      user: 'User',
    };

    return displayNames[role];
  }

  /**
   * Get role color for UI badges
   */
  static getRoleColor(role: OrganizationRole): string {
    const colors: Record<OrganizationRole, string> = {
      super_admin: 'bg-purple-500 text-white',
      admin: 'bg-blue-500 text-white',
      moderator: 'bg-green-500 text-white',
      user: 'bg-gray-500 text-white',
    };

    return colors[role];
  }
}

/**
 * Organization Management Service
 * Handles CRUD operations for organizations
 */
export interface UpdateOrganizationRequest {
  name?: string;
  description?: string | null;
}

export interface UpdateOrganizationResponse {
  id: string;
  name: string;
  description?: string | null;
  message: string;
}

export class OrganizationService {
  /**
   * Update organization information
   * Requires owner permission
   * @param orgId - Organization ID
   * @param data - Organization data to update (name and/or description)
   */
  static async updateOrganization(
    orgId: string,
    data: UpdateOrganizationRequest
  ): Promise<UpdateOrganizationResponse> {
    return apiClient.patch<UpdateOrganizationResponse>(
      `/organizations/${orgId}`,
      data
    );
  }

  /**
   * Get organization details
   * @param orgId - Organization ID
   */
  static async getOrganization(orgId: string): Promise<any> {
    return apiClient.get(`/organizations/${orgId}`);
  }
}