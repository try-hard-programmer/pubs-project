/**
 * Organization LocalStorage Utility
 * Manages caching of organization data in browser localStorage
 * Uses session-based caching (no expiry until logout)
 */

import type { Organization } from '@/services/organizationService';

// LocalStorage keys
const ORG_STORAGE_KEY = 'syntra_current_organization';
const ORG_ID_KEY = 'syntra_current_org_id';

/**
 * Organization Storage Utility
 * Provides methods to save, load, and clear organization data from localStorage
 */
export const organizationStorage = {
  /**
   * Save organization data to localStorage
   * Session-based: Data persists until explicitly cleared (logout)
   *
   * @param organization - Organization object to save
   */
  save(organization: Organization): void {
    try {
      localStorage.setItem(ORG_STORAGE_KEY, JSON.stringify(organization));
      localStorage.setItem(ORG_ID_KEY, organization.id);
      console.log('💾 Organization saved to localStorage:', organization.name);
    } catch (error) {
      console.error('❌ Failed to save organization to localStorage:', error);
      // Fail silently - localStorage might be disabled or full
    }
  },

  /**
   * Load organization data from localStorage
   * Returns cached data without expiry check (session-based)
   *
   * @returns Organization object if exists, null otherwise
   */
  load(): Organization | null {
    try {
      const cached = localStorage.getItem(ORG_STORAGE_KEY);
      if (!cached) {
        console.log('📭 No cached organization found');
        return null;
      }

      const organization = JSON.parse(cached) as Organization;
      console.log('📦 Loaded organization from cache:', organization.name);
      return organization;
    } catch (error) {
      console.error('❌ Failed to load organization from localStorage:', error);
      // If parsing fails, clear corrupted data
      this.clear();
      return null;
    }
  },

  /**
   * Get current organization ID quickly without parsing full object
   *
   * @returns Organization ID string if exists, null otherwise
   */
  getCurrentOrgId(): string | null {
    try {
      return localStorage.getItem(ORG_ID_KEY);
    } catch (error) {
      console.error('❌ Failed to get organization ID from localStorage:', error);
      return null;
    }
  },

  /**
   * Clear all organization data from localStorage
   * Called on logout or when organization changes
   */
  clear(): void {
    try {
      localStorage.removeItem(ORG_STORAGE_KEY);
      localStorage.removeItem(ORG_ID_KEY);
      console.log('🧹 Organization data cleared from localStorage');
    } catch (error) {
      console.error('❌ Failed to clear organization from localStorage:', error);
    }
  },

  /**
   * Check if organization data exists in cache
   *
   * @returns true if cached data exists, false otherwise
   */
  hasCache(): boolean {
    try {
      return localStorage.getItem(ORG_STORAGE_KEY) !== null;
    } catch {
      return false;
    }
  },
};

export default organizationStorage;
