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
  access_level?: "view" | "download" | "edit";
  metadata?: Record<string, any>;
}

export const useFiles = (
  filter?: "starred" | "trashed" | "shared" | "images" | "documents" | "videos" | "all",
  currentFolderId?: string | null
) => {
  const { user } = useAuth();
  console.log("user", user);
  const queryClient = useQueryClient();

  const {
    data: files = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["files", filter, currentFolderId],
    queryFn: async () => {
      if (!user) return [];

      try {
        // Build filter options based on the filter type
        const apiFilters: any = {};

        // Apply folder navigation
        const folderId = currentFolderId || undefined;

        // Apply type-based filters
        if (filter === "starred") {
          apiFilters.is_starred = true;
          apiFilters.is_trashed = false;
        } else if (filter === "trashed") {
          apiFilters.is_trashed = true;
        } else if (filter === "images" || filter === "documents" || filter === "videos") {
          // Note: API might not support MIME type filtering, so we'll filter client-side
          apiFilters.type = "file";
          apiFilters.is_trashed = false;
        } else if (filter === "shared") {
          // Shared files will be handled separately
          apiFilters.is_trashed = false;
        } else {
          // Default and "all" filter
          apiFilters.is_trashed = false;
        }

        // Fetch files from API
        const response = await fileManagerApi.browseFolder(folderId, apiFilters);

        let allFiles = response.items || [];

        // Apply client-side MIME type filtering if needed
        if (filter === "images") {
          allFiles = allFiles.filter(f => f.mime_type?.startsWith("image/"));
        } else if (filter === "documents") {
          allFiles = allFiles.filter(f => {
            const mime = f.mime_type || "";
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
          });
        } else if (filter === "videos") {
          allFiles = allFiles.filter(f => f.mime_type?.startsWith("video/"));
        }

        // Map API response to our FileItem interface
        const mappedFiles = allFiles.map((item: any) => ({
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
          url: item.url || null, // ✅ Use signed URL from API
          // For shared files, these would come from API if supported
          is_shared: item.shared_with_user_ids?.length > 0 || item.shared_with_group_ids?.length > 0,
        }));

        console.log("API browse results:", {
          filter,
          currentFolderId: folderId,
          totalCount: mappedFiles.length,
          folders: mappedFiles.filter(f => f.is_folder).length,
          files: mappedFiles.filter(f => !f.is_folder).length,
          filesWithUrls: mappedFiles.filter(f => !f.is_folder && f.url).length,
        });

        // Sort: folders first, then by creation date
        const sortedFiles = mappedFiles.sort((a, b) => {
          if (a.is_folder && !b.is_folder) return -1;
          if (!a.is_folder && b.is_folder) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        console.log("Final processed results:", {
          count: sortedFiles.length,
          folders: sortedFiles.filter(f => f.is_folder).length,
          files: sortedFiles.filter(f => !f.is_folder).length,
        });

        return sortedFiles;
      } catch (error) {
        console.error("Error fetching files from API:", error);
        throw error;
      }
    },
    enabled: !!user,
    staleTime: 0, // Always refetch
    gcTime: 0, // Don't cache
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
    mutationFn: async ({ id, is_folder }: { id: string; is_folder: boolean }) => {
      console.log("Moving to trash:", { id, is_folder });

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
    mutationFn: async ({ id, is_folder }: { id: string; is_folder: boolean }) => {
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
    creatingFolder: createFolderMutation.isPending,
    uploadFile: uploadFileMutation.mutateAsync,
    uploading: uploadFileMutation.isPending,
    toggleStar: toggleStarMutation.mutateAsync,
    moveToTrash: moveToTrashMutation.mutateAsync,
    deleteFile: deleteFileMutation.mutateAsync,
    restoreFile: restoreFileMutation.mutateAsync,
    fetchFile: fetchFileMutation.mutateAsync,
  };
};
