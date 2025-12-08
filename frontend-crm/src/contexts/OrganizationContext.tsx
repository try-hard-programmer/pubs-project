/**
 * Organization Context
 * Manages current user's organization data with session-based localStorage caching
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { OrganizationService, Organization } from '@/services/organizationService';
import { organizationStorage } from '@/lib/organizationStorage';
import { useDebugState, logContextAction } from '@/lib/debuggableContext';

/**
 * Organization Context Type
 */
interface OrganizationContextType {
  /** Current user's organization */
  currentOrganization: Organization | null;
  /** Loading state while fetching organization */
  loading: boolean;
  /** Error message if fetch fails */
  error: string | null;
}

/**
 * Create Organization Context
 */
const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

/**
 * Organization Provider Props
 */
interface OrganizationProviderProps {
  children: ReactNode;
}

/**
 * Organization Provider Component
 * Fetches and manages organization data with session-based caching
 *
 * @param props - Provider props
 */
export const OrganizationProvider = ({ children }: OrganizationProviderProps) => {
  const [currentOrganization, setCurrentOrganization] = useDebugState<Organization | null>('Organization', 'current', null);
  const [loading, setLoading] = useDebugState<boolean>('Organization', 'loading', true);
  const [error, setError] = useDebugState<string | null>('Organization', 'error', null);
  const { user } = useAuth();

  /**
   * Fetch organization from API
   * Called when user logs in or when cache is empty
   */
  const fetchOrganization = async () => {
    if (!user) {
      // User not logged in - clear state
      setCurrentOrganization(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Try loading from cache first (instant load)
    const cached = organizationStorage.load();
    if (cached) {
      console.log('✅ Using cached organization:', cached.name);
      logContextAction('Organization', 'LOADED_FROM_CACHE', { id: cached.id, name: cached.name });
      setCurrentOrganization(cached);
      setLoading(false);
      setError(null);
      return;
    }

    // No cache - fetch from API
    console.log('🔄 Fetching organization from API...');
    logContextAction('Organization', 'FETCH_STARTED', null);
    setLoading(true);
    setError(null);

    try {
      const organization = await OrganizationService.getMyOrganization();
      setCurrentOrganization(organization);
      setError(null);

      // Save to cache for next time
      organizationStorage.save(organization);

      console.log('✅ Organization loaded from API:', organization.name);
      logContextAction('Organization', 'FETCH_SUCCESS', { id: organization.id, name: organization.name });
    } catch (err: any) {
      console.error('❌ Error fetching organization:', err);
      const errorMessage = err.message || 'Failed to fetch organization';
      setError(errorMessage);
      setCurrentOrganization(null);
      logContextAction('Organization', 'FETCH_ERROR', { error: errorMessage });

      // Clear any corrupted cache
      organizationStorage.clear();
    } finally {
      setLoading(false);
    }
  };

  /**
   * Effect: Fetch organization when user changes
   * Runs on mount and when user logs in/out
   */
  useEffect(() => {
    fetchOrganization();
  }, [user]);

  /**
   * Effect: Clear organization data on unmount
   * Clean up when provider is unmounted
   */
  useEffect(() => {
    return () => {
      // Cleanup function - no action needed for session-based cache
      // Cache persists until explicit logout
    };
  }, []);

  /**
   * Context value
   */
  const value: OrganizationContextType = {
    currentOrganization,
    loading,
    error,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};

/**
 * useOrganization Hook
 * Access organization context in components
 *
 * @returns OrganizationContextType
 * @throws Error if used outside OrganizationProvider
 *
 * @example
 * ```tsx
 * const { currentOrganization, loading, error } = useOrganization();
 *
 * if (loading) return <div>Loading organization...</div>;
 * if (error) return <div>Error: {error}</div>;
 * if (!currentOrganization) return <div>No organization</div>;
 *
 * return <div>{currentOrganization.name}</div>;
 * ```
 */
export const useOrganization = (): OrganizationContextType => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};

export default OrganizationContext;
