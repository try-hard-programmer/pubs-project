/**
 * Organization Context
 * Manages current user's organization data with session-based localStorage caching
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import {
  OrganizationService,
  Organization,
} from "@/services/organizationService";
import { organizationStorage } from "@/lib/organizationStorage";
import { useDebugState, logContextAction } from "@/lib/debuggableContext";

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
  /** Manual refresh function */
  refreshOrganization: () => Promise<void>;
}

/**
 * Create Organization Context
 */
const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined
);

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
export const OrganizationProvider = ({
  children,
}: OrganizationProviderProps) => {
  const [currentOrganization, setCurrentOrganization] =
    useDebugState<Organization | null>("Organization", "current", null);
  const [loading, setLoading] = useDebugState<boolean>(
    "Organization",
    "loading",
    true
  );
  const [error, setError] = useDebugState<string | null>(
    "Organization",
    "error",
    null
  );
  const { user } = useAuth();

  /**
   * Fetch organization from API
   * Called when user logs in or when cache is empty
   */
  const fetchOrganization = async (forceRefetch = false) => {
    if (!user) {
      // User not logged in - clear state
      setCurrentOrganization(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Try loading from cache first (instant load) - ONLY if not forced
    if (!forceRefetch) {
      const cached = organizationStorage.load();
      if (cached) {
        console.log("✅ Using cached organization:", cached.name);
        logContextAction("Organization", "LOADED_FROM_CACHE", {
          id: cached.id,
          name: cached.name,
        });
        setCurrentOrganization(cached);
        setLoading(false);
        setError(null);
        return;
      }
    }

    // No cache or forced refresh - fetch from API
    console.log("🔄 Fetching organization from API...");
    logContextAction("Organization", "FETCH_STARTED", null);
    setLoading(true);
    setError(null);

    try {
      const organization = await OrganizationService.getMyOrganization();
      if (organization && organization.id) {
        setCurrentOrganization(organization);
        organizationStorage.save(organization);
        setError(null);
      } else {
        // If API returns 200 but data is null/empty, treat as no org
        console.log("⚠️ API returned 200 but no valid organization found");
        setCurrentOrganization(null);
        // Do NOT set error here, or ProtectedRoute might show error state instead of redirecting
      }
    } catch (err: any) {
      console.error("❌ Error fetching organization:", err);
      const errorMessage = err.message || "Failed to fetch organization";
      setError(errorMessage);
      setCurrentOrganization(null);
      logContextAction("Organization", "FETCH_ERROR", { error: errorMessage });

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
    // 🛑 CRITICAL FIX: Only run if user ID changes (primitive string),
    // not the user object reference. This stops the loop.
    if (user?.id) {
      fetchOrganization();
    } else if (!user) {
      setCurrentOrganization(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  /**
   * Effect: Clear organization data on unmount
   * Clean up when provider is unmounted
   */
  useEffect(() => {
    return () => {
      // Cleanup function - no action needed for session-based cache
    };
  }, []);

  /**
   * Context value
   */
  const value: OrganizationContextType = {
    currentOrganization,
    loading,
    error,
    refreshOrganization: () => fetchOrganization(true),
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
 */
export const useOrganization = (): OrganizationContextType => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error(
      "useOrganization must be used within an OrganizationProvider"
    );
  }
  return context;
};

export default OrganizationContext;
