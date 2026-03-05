import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import * as storageUseApi from "@/lib/storageUseApi";

export const useStorageUse = (organizationId?: string | null) => {
  const { user } = useAuth();

  // Kalau kamu punya orgId dari props/route, pakai itu.
  // Kalau tidak, coba ambil dari user (sesuaikan field user kamu).
  const orgId =
    organizationId ??
    ((user as any)?.organization_id as string | undefined) ??
    null;

  const {
    data: storage,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["storage-use", orgId],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");
      if (!orgId) throw new Error("organizationId is required");

      return await storageUseApi.getStorageUse(orgId);
    },
    enabled: !!user && !!orgId,
    staleTime: 0,
    gcTime: 0,
  });

  return {
    storage, // StorageUsageResponse | undefined
    isLoading,
    isFetching,
    error,
    refetch,
  };
};
