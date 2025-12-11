import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import * as fileManagerApi from "@/lib/fileManagerApi";
import * as documentsApi from "@/lib/documentsApi";

export interface FileItem {
  id: string;
  name: string;
  size?: number;
  type: string;
  storage_path: string | null;
  is_starred?: boolean;
  is_trashed?: boolean;
  is_folder: boolean;
  folder_id: string | null;
  parent_folder_id?: string | null; // API uses parent_folder_id
  created_at: string;
  updated_at: string;
  url?: string;
  is_shared?: boolean;
  shared_by?: string;
  access_level?: "view" | "edit" | "delete" | "share" | "manage";
  metadata?: Record<string, any>;
  shared?: fileManagerApi.ShareResponse[];
}

export const useFiles = (
  filter?:
    | "starred"
    | "trashed"
    | "shared"
    | "images"
    | "documents"
    | "videos"
    | "all",
  currentFolderId?: string | null,
  sortBy?: "name" | "size" | "created_at",
  sortOrder?: "asc" | "desc"
) => {
  const { user } = useAuth();
  console.log("user", user);
  const queryClient = useQueryClient();

  const {
    data: files = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["files", filter, currentFolderId, sortBy, sortOrder],
    queryFn: async () => {
      if (!user) return [];
      console.log("USEFILES TRIGGERED", {
        filter,
        currentFolderId,
        sortBy,
        sortOrder,
      });

      try {
        // Apply folder navigation
        const folderId = currentFolderId || undefined;

        // Build filter untuk API dalam satu objek
        const apiFilters: Record<string, any> =
          filter === "starred"
            ? { is_starred: true, is_trashed: false }
            : filter === "trashed"
            ? { is_trashed: true }
            : filter === "images" ||
              filter === "documents" ||
              filter === "videos"
            ? { type: "file", is_trashed: false }
            : filter === "shared"
            ? {}
            : { is_trashed: false };

        // Ambil data: bedakan shared vs non-shared
        let rawItems: any[] = [];
        if (filter !== "shared") {
          const response = await fileManagerApi.browseFolder(folderId, {
            ...apiFilters,
            sort_by: sortBy,
            sort_order: sortOrder,
          });
          rawItems = (response.items || []).map((item: any) => ({
            ...item,
            is_shared: item.is_shared ?? false,
            shared: item.shared ?? [],
          }));
        } else {
          const shares = await fileManagerApi.listShareFile();
          rawItems = Array.isArray(shares)
            ? shares.map((share: any) => ({
                ...share.file,
                shared: [
                  {
                    id: share.id,
                    access_level: share.access_level,
                    expires_at: share.expires_at,
                    share_type: share.share_type,
                    shared_by: share.shared_by,
                    shared_with_email: share.shared_with_email,
                    shared_with_user_id: share.shared_with_user_id,
                    created_at: share.created_at,
                    updated_at: share.updated_at,
                    metadata: share.metadata,
                  },
                ],
              }))
            : [];
        }

        // Client-side MIME filter
        const itemsAfterMime =
          filter === "images"
            ? rawItems.filter((f) => f.mime_type?.startsWith("image/"))
            : filter === "videos"
            ? rawItems.filter((f) => f.mime_type?.startsWith("video/"))
            : filter === "documents"
            ? rawItems.filter((f) => {
                const mime = (f.mime_type || "").toLowerCase();
                return (
                  mime.includes("pdf") ||
                  mime.includes("document") ||
                  mime.includes("word") ||
                  mime.includes("text") ||
                  mime.includes("excel") ||
                  mime.includes("spreadsheet") ||
                  mime.includes("powerpoint") ||
                  mime.includes("presentation")
                );
              })
            : rawItems;

        // Map API response to our FileItem interface
        const mappedFiles = itemsAfterMime.map((item: any) => ({
          id: item.id,
          name: item.name,
          size: item.size || 0,
          type: item.mime_type || "folder", // Use mime_type for files, "folder" for folders
          storage_path: item.storage_path || null,
          is_starred: item.is_starred || false,
          is_trashed: item.is_trashed || false,
          is_folder: item.is_folder, // Use is_folder directly from API response
          folder_id: item.parent_folder_id || null,
          parent_folder_id: item.parent_folder_id || null,
          created_at: item.created_at,
          updated_at: item.updated_at,
          metadata: item.metadata,
          url: item.url || null,
          is_shared: !!(Array.isArray(item.shared) && item.shared.length > 0),
          shared: item.shared ?? [],
        }));

        console.log("API browse results:", {
          filter,
          currentFolderId: folderId,
          totalCount: mappedFiles.length,
          folders: mappedFiles.filter((f) => f.is_folder).length,
          files: mappedFiles.filter((f) => !f.is_folder).length,
          filesWithUrls: mappedFiles.filter((f) => !f.is_folder && f.url)
            .length,
        });

        // Sort: folders first, then by creation date
        const sortedFiles = mappedFiles.sort((a, b) => {
          // Folder selalu di atas, tapi tidak ubah urutan antar folder/file
          if (a.is_folder && !b.is_folder) return -1;
          if (!a.is_folder && b.is_folder) return 1;

          // Kalau API sudah handle sorting, tidak perlu ubah
          if (sortBy && sortOrder) {
            // Optional: kamu bisa skip return di sini
            return 0;
          }

          // Default fallback kalau tidak ada sortBy/order
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });

        console.log("Final processed results:", {
          count: sortedFiles.length,
          folders: sortedFiles.filter((f) => f.is_folder).length,
          files: sortedFiles.filter((f) => !f.is_folder).length,
        });

        return sortedFiles;
      } catch (error) {
        console.error("Error fetching files from API:", error);
        throw error;
      }
    },
    enabled: !!user && !!sortBy && !!sortOrder,
    staleTime: 0, // Always refetch
    gcTime: 0, // Don't cache
  });

  const detailFolderMutation = useMutation({
    mutationFn: async ({ folderId }: { folderId: string }) => {
      if (!user) throw new Error("User not authenticated");

      const response = await fileManagerApi.detailFolder(folderId);
      return response;
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async ({
      name,
      parentFolderId,
    }: {
      name: string;
      parentFolderId?: string | null;
    }) => {
      if (!user) throw new Error("User not authenticated");

      console.log("Creating folder via API:", {
        name,
        parentFolderId,
      });

      const folderData = await fileManagerApi.createFolder({
        name,
        parent_folder_id: parentFolderId || undefined,
      });

      console.log("Folder created successfully:", folderData);
      return folderData;
    },
    onSuccess: (data) => {
      console.log("Invalidating queries after folder creation...");
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.refetchQueries({
        queryKey: ["files", filter, currentFolderId],
      });
    },
  });

  const updateFolderMutation = useMutation({
    mutationFn: async ({
      folderId,
      name,
    }: {
      folderId: string;
      name: string;
    }) => {
      if (!user) throw new Error("User not authenticated");

      // Upload file via API
      const update_folder = await fileManagerApi.updateFolder(folderId, {
        name: name,
      });

      console.log("Folder update successfully:", update_folder);

      return update_folder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("User not authenticated");

      console.log("Uploading file via API:", {
        fileName: file.name,
        fileSize: file.size,
        targetFolder: currentFolderId || "root",
      });

      // Upload file via API
      const fileData = await fileManagerApi.uploadFile(
        file,
        currentFolderId || null
      );

      console.log("File uploaded successfully:", fileData);

      return fileData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });

  const updateFileMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      if (!user) throw new Error("User not authenticated");

      const update_file = await fileManagerApi.updateFile(id, { name: name });

      console.log("File update successfully:", update_file);
      return update_file;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });

  // Helper function to determine if file should have embeddings
  function shouldFileHaveEmbeddings(file: File): boolean {
    const embeddableTypes = [
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    return embeddableTypes.includes(file.type);
  }

  const toggleStarMutation = useMutation({
    mutationFn: async ({
      id,
      is_starred,
    }: {
      id: string;
      is_starred: boolean;
    }) => {
      await fileManagerApi.toggleStar(id, !is_starred);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });

  const moveToTrashMutation = useMutation({
    mutationFn: async ({
      id,
      is_folder,
    }: {
      id: string;
      is_folder: boolean;
    }) => {
      if (is_folder) {
        // Use folder endpoint for folders
        await fileManagerApi.deleteFolder(id, false); // false = move to trash
      } else {
        // Use file endpoint for files
        await fileManagerApi.deleteFile(id, false); // false = move to trash
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async ({
      id,
      storage_path,
      is_folder,
    }: {
      id: string;
      storage_path: string | null;
      is_folder: boolean;
    }) => {
      console.log("Permanently deleting:", { id, is_folder, storage_path });

      if (is_folder) {
        // Use folder endpoint for folders
        await fileManagerApi.deleteFolder(id, true); // true = permanent delete
      } else {
        // Use file endpoint for files
        await fileManagerApi.deleteFile(id, true); // true = permanent delete

        // If file had embeddings, try to delete them
        if (storage_path) {
          try {
            // Extract filename from storage path
            const filename = storage_path.split("/").pop();
            if (filename) {
              await documentsApi.deleteDocument(filename);
            }
          } catch (error) {
            console.warn("Failed to delete embeddings:", error);
            // Don't fail the entire operation if embedding deletion fails
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });

  const restoreFileMutation = useMutation({
    mutationFn: async ({
      id,
      is_folder,
    }: {
      id: string;
      is_folder: boolean;
    }) => {
      console.log("Restoring from trash:", { id, is_folder });

      if (is_folder) {
        // Use folder restore endpoint for folders
        await fileManagerApi.restoreFolder(id);
      } else {
        // Use file restore endpoint for files
        await fileManagerApi.restoreFile(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });

  const fetchFileMutation = useMutation({
    mutationFn: async (id: string) => {
      // 1) Get file metadata
      const meta = await fileManagerApi.getFileDetails(id);

      if (meta.type === "folder" || !meta.storage_path) {
        throw new Error("Not a valid stored file");
      }

      // 2) Download file as blob
      const blob = await fileManagerApi.downloadFile(id);

      // 3) Convert blob to File object
      const file = new File([blob], meta.name, {
        type: meta.mime_type || blob.type,
      });

      return { file, meta };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });

  const moveFileToFolderMutation = useMutation({
    mutationFn: async ({
      fileId,
      folderId,
    }: {
      fileId: string;
      folderId: string | null;
    }) => {
      return await fileManagerApi.moveFile(fileId, folderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });

  const shareFileMutation = useMutation({
    mutationFn: async ({
      file_id,
      share_type = "user",
      shared_with_email = null,
      group_id = null,
      access_level = "view",
      expires_at = null,
      metadata = {},
    }: {
      // Tidak perlu type terpisah; ini inline untuk IntelliSense minimal
      file_id: string;
      share_type?: fileManagerApi.ShareType;
      shared_with_email?: string | null;
      group_id?: string | null;
      access_level?: fileManagerApi.PermissionType;
      expires_at?: string | null;
      metadata?: Record<string, any>;
    }) => {
      if (!user) throw new Error("User not authenticated");

      // Upload file via API
      return await fileManagerApi.shareFile({
        file_id: file_id,
        share_type: share_type,
        shared_with_email: shared_with_email,
        access_level: access_level,
        expires_at: expires_at,
        group_id: group_id,
        metadata: metadata,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });

  const updateShareMutation = useMutation({
    mutationFn: async ({
      share_id,
      access_level = "view",
      expires_at = null,
      metadata = {},
    }: {
      share_id: string;
      access_level?: fileManagerApi.PermissionType;
      expires_at?: string | null;
      metadata?: Record<string, any>;
    }) => {
      if (!user) throw new Error("User not authenticated");
      return await fileManagerApi.updateShare(
        share_id,
        access_level,
        expires_at,
        metadata
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });

  const deleteShareMutation = useMutation({
    mutationFn: async ({ share_id }: { share_id: string }) => {
      if (!user) throw new Error("User not authenticated");
      return await fileManagerApi.deleteShare(share_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });

  const createUrlPublicShareMutation = useMutation({
    mutationFn: async ({
      file_id,
      permission,
      expires_in_hours,
    }: {
      file_id: string;
      permission?: fileManagerApi.PermissionType;
      expires_in_hours?: number;
    }) => {
      if (!user) throw new Error("User not authenticated");
      const result = await fileManagerApi.publicShareFile(
        file_id,
        permission,
        expires_in_hours
      );
      return result;
    },
  });

  const detailShareFile = useMutation({
    mutationFn: async ({ file_id }: { file_id: string }) => {
      return await fileManagerApi.listShareFile(file_id);
    },
  });

  console.log("useFiles hook returning:", {
    filesCount: files?.length || 0,
    isLoading,
    error: error?.message,
    hasFiles: files && files.length > 0,
  });

  return {
    files,
    isLoading,
    error,
    createFolder: createFolderMutation.mutateAsync,
    updateFolder: updateFolderMutation.mutateAsync,
    detailFolder: detailFolderMutation.mutateAsync,
    creatingFolder: createFolderMutation.isPending,
    uploadFile: uploadFileMutation.mutateAsync,
    updateFile: updateFileMutation.mutateAsync,
    moveFileToFolder: moveFileToFolderMutation.mutateAsync,
    uploading: uploadFileMutation.isPending,
    toggleStar: toggleStarMutation.mutateAsync,
    moveToTrash: moveToTrashMutation.mutateAsync,
    deleteFile: deleteFileMutation.mutateAsync,
    restoreFile: restoreFileMutation.mutateAsync,
    fetchFile: fetchFileMutation.mutateAsync,
    shareFile: shareFileMutation.mutateAsync,
    updateFileShare: updateShareMutation.mutateAsync,
    deleteFileShare: deleteShareMutation.mutateAsync,
    createPublicShareUrl: createUrlPublicShareMutation.mutateAsync,
    fetchFileShareDetail: detailShareFile.mutateAsync,
  };
};
