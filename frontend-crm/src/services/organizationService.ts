/**
 * Organization Service
 * Handles API calls related to organization management
 */

import { apiClient } from '@/lib/apiClient';

/**
 * Organization interface representing organization entity
 */
export interface Organization {
  id: string;
  name: string;
  legal_name?: string | null;
  category?: string;
  description?: string | null;
  logo_url?: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  metadata?: Record<string, any>;
  is_owner?: boolean; // Included in /me response
}

/**
 * Response from GET /organizations/me endpoint
 */
export interface OrganizationMeResponse extends Organization {
  // All organization fields are directly in response
  is_owner: boolean;
}

/**
 * Organization Service class
 * Provides methods to interact with organization endpoints
 */
export class OrganizationService {
  /**
   * Get current user's organization
   * Endpoint: GET /organizations/me
   *
   * @returns Promise<Organization> Current user's organization with full details
   * @throws Error if request fails or user has no organization
   */
  static async getMyOrganization(): Promise<Organization> {
    return apiClient.get<Organization>('/organizations/me');
  }

  /**
   * Get organization by ID
   * Endpoint: GET /organizations/{orgId}
   *
   * @param orgId - Organization UUID
   * @returns Promise<Organization> Organization details
   */
  static async getOrganization(orgId: string): Promise<Organization> {
    return apiClient.get<Organization>(`/organizations/${orgId}`);
  }

  /**
   * Update organization details
   * Endpoint: PATCH /organizations/{orgId}
   *
   * @param orgId - Organization UUID
   * @param data - Partial organization data to update
   * @returns Promise<Organization> Updated organization
   */
  static async updateOrganization(
    orgId: string,
    data: Partial<Omit<Organization, 'id' | 'owner_id' | 'created_at' | 'updated_at'>>
  ): Promise<Organization> {
    return apiClient.patch<Organization>(`/organizations/${orgId}`, data);
  }
}

export default OrganizationService;
