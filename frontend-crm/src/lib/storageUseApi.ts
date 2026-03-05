import { apiClient } from "./apiClient";
import { supabase } from "@/integrations/supabase/client";
import { env } from "@/config/env";

/**
 * Storage Usage API Client
 * Handles storage usage operations via REST API
 */

export interface StorageBucket {
  total: number; // jumlah file
  size: number; // bytes
}

export interface StorageUsageResponse {
  id: string;
  organization_id: string;
  documents_storage: Record<string, any>;
  document: StorageBucket;
  image: StorageBucket;
  audio: StorageBucket;
  video: StorageBucket;
  total_file: number;
  total_use: number;
  quota_size?: number | null;
  volume_percentage?: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get storage use details
 * GET /filemanager/storage?organization_id=...
 */
export async function getStorageUse(
  organizationId: string,
): Promise<StorageUsageResponse> {
  if (!organizationId) {
    throw new Error("organizationId is required");
  }

  try {
    const params = new URLSearchParams();
    params.append("organization_id", organizationId);

    const endpoint = `/filemanager/storage?${params.toString()}`;
    const response = await apiClient.get<StorageUsageResponse>(endpoint);

    console.log(`Storage usage for org ${organizationId}:`, response);
    return response;
  } catch (error: any) {
    console.error(
      `Failed to fetch storage usage for org ${organizationId}:`,
      error,
    );
    throw error;
  }
}

// Helper functions (samakan seperti file sebelumnya)
async function getAuthToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
}

function getBaseUrl(): string {
  return env.agentApiUrl.replace(/\/$/, "");
}
