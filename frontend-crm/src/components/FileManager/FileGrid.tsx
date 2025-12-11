import {
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Star,
  Trash2,
  Download,
  MoreHorizontal,
  RotateCcw,
  Folder,
  FolderOpen,
  Eye,
  Share2,
  Users,
  Pencil,
  X,
  Home,
  Loader2,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFiles, FileItem } from "@/hooks/useFiles";
import { useUserRole } from "@/hooks/useUserRole";
import { FilePreview } from "./FilePreview";
import { ShareDialog } from "./ShareDialog";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/apiClient";
import { Input } from "../ui/input";
import { ConfirmDeleteDialog } from "../ConfirmDeleteDialog";
import { deleteDocument } from "@/lib/documentsApi";
import { FileFilterDropdown } from "../FileFilterControl";
import { parse } from "path";

interface FileGridProps {
  viewMode: "grid" | "list";
  searchQuery: string;
  section: string;
  previousSection: string;
  currentFolderId?: string | null;
  onFolderNavigate?: (folder: { id: string; name: string }) => void;
  deleteTrigger: number;
}

type DeletePayload = {
  email: string;
  filename: string;
};

const getFileIcon = (item: FileItem) => {
  if (item.is_folder) return Folder;
  if (item.type.startsWith("image/")) return Image;
  if (item.type.startsWith("video/")) return Video;
  if (item.type.startsWith("audio/")) return Music;
  if (item.type.includes("zip") || item.type.includes("rar")) return Archive;
  return FileText;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const FileGrid = ({
  viewMode,
  searchQuery,
  section,
  previousSection,
  currentFolderId,
  onFolderNavigate,
  deleteTrigger,
}: FileGridProps) => {
  const [sortBy, setSortBy] = useState<"name" | "size" | "created_at">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [shareFile, setShareFile] = useState<FileItem | null>(null);
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState<string | null>(null);
  const [handleLoading, setHandleLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    itemCount: 0,
    isFolder: false,
    isPermanent: false,
    filesCount: 0,
    foldersCount: 0,
    filesInsideFolder: 0,
    folderInsideFolder: 0,
    // callback yang dijalankan
    callback: null as (() => Promise<void>) | null,
  });

  const [selectedMap, setSelectedMap] = useState<
    Map<string, { is_folder: boolean }>
  >(new Map());
  const selectionMode = selectedMap.size > 0;
  const isSelected = (id: string) => selectedMap.has(id);
  const toggleSelect = (item: FileItem) =>
    setSelectedMap((prev) => {
      const next = new Map(prev);
      next.has(item.id)
        ? next.delete(item.id)
        : next.set(item.id, { is_folder: item.is_folder });
      return next;
    });

  const clearSelection = () => setSelectedMap(new Map());
  const { userRole, isAdmin, isModerator } = useUserRole();
  const { user } = useAuth();
  console.log("SECTION", section);

  const {
    files,
    isLoading,
    error,
    updateFolder,
    detailFolder,
    toggleStar,
    updateFile,
    moveFileToFolder,
    moveToTrash,
    deleteFile,
    restoreFile,
    fetchFile,
    deleteFileShare,
  } = useFiles(
    (previousSection ?? section) === "all"
      ? undefined
      : previousSection ?? (section as any),
    currentFolderId,
    sortBy,
    sortOrder
  );

  console.log("FileGrid render:", {
    filesCount: files?.length || 0,
    isLoading,
    section,
    currentFolderId,
    error: error?.message,
  });

  // Helper menghitung folder
  function getFilesCountInFolder(folderId: string, files: FileItem[]): number {
    const count = files.filter((file) => {
      return file.parent_folder_id === folderId && !file.is_folder;
    }).length;
    return count;
  }

  // Helper hitung folder dan file dalam folder
  async function getFolderSummary(
    folderId: string,
    folderName: string
  ): Promise<{ filesInsideFolder: number; folderInsideFolder: number }> {
    try {
      const detail = await detailFolder({ folderId });
      return {
        filesInsideFolder: detail?.children_count || 0,
        folderInsideFolder: detail?.folder_children_count || 0,
      };
    } catch (error) {
      console.warn(`Failed to fetch folder ${folderName} details:`, error);
      const filesInsideFolder = getFilesCountInFolder(folderId, filteredFiles);
      return { filesInsideFolder, folderInsideFolder: 0 };
    }
  }

  // Helper Delete Item
  const processDeleteItems = async (
    items: FileItem[],
    isPermanent: boolean
  ) => {
    try {
      const results = await Promise.allSettled(
        items.map(async (item) => {
          if (isPermanent) {
            return deleteFile({
              id: item.id,
              storage_path: item.storage_path,
              is_folder: item.is_folder,
            });
          } else {
            return moveToTrash({
              id: item.id,
              is_folder: item.is_folder,
            });
          }
        })
      );

      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.filter((r) => r.status === "rejected").length;

      if (ok) {
        toast.success(
          `${ok} item(s) ${
            isPermanent ? "permanently deleted" : "moved to trash"
          } successfully`
        );
      }
      if (fail) toast.error(`Failed to delete ${fail} item(s)`);
    } catch (error: any) {
      toast.error(error.message || "Delete operation failed");
    } finally {
      clearSelection?.();
      setDeleteDialog((prev) => ({ ...prev, open: false, callback: null }));
    }
  };

  // Helper Upload File
  async function uploadSingleFile(file: File, email: string, file_id: string) {
    const form = new FormData();
    form.append("file", file);
    form.append("email", email);
    form.append("file_id", file_id);

    return apiClient.post<any>("/documents/upload", form);
  }

  // Helper Delete dokumen in server
  async function deleteFromServer(payload: DeletePayload) {
    return apiClient.delete<{ status: string }>("/documents/delete", payload);
  }

  // useEffect untuk filter dengan semantic search
  // useEffect(() => {
  //   const filterFiles = async () => {
  //     // 1) Jika tidak ada query, tampilkan semua
  //     if (!searchQuery.trim()) {
  //       setFilteredFiles(files || []);
  //       return;
  //     }

  //     // 2) Panggil API semantic search
  //     setIsSearching(true);
  //     try {
  //       const response = await fetch("http://localhost:8000/query", {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({
  //           email: user.email,
  //           query: searchQuery,
  //         }),
  //       });

  //       if (!response.ok) {
  //         throw new Error(`Search failed: ${response.status}`);
  //       }

  //       const data = await response.json();
  //       const matchedIds = new Set(data.file_id || []);
  //       // Filter files berdasarkan file_id yang cocok
  //       const matched = (files || []).filter((file) => matchedIds.has(file.id));

  //       setFilteredFiles(matched);
  //     } catch (error: any) {
  //       console.error("Semantic search error:", error);
  //       toast.error("Search failed: " + error.message);
  //       // Fallback ke filter lokal
  //       const localMatch = (files || []).filter((file) =>
  //         file.name.toLowerCase().includes(searchQuery.toLowerCase())
  //       );
  //       setFilteredFiles(localMatch);
  //     } finally {
  //       setIsSearching(false);
  //     }
  //   };

  //   // Debounce untuk hindari hit API terlalu sering
  //   const timer = setTimeout(() => {
  //     filterFiles();
  //   }, 500);

  //   return () => clearTimeout(timer);
  // }, [searchQuery, files, user.email]);
  useEffect(() => {
    const filterFiles = async () => {
      // PERBAIKAN: Cek searchQuery lebih ketat
      if (!searchQuery || searchQuery.trim() === "") {
        // Langsung set tanpa delay
        setFilteredFiles(files || []);
        setIsSearching(false);
        return;
      }

      // Panggil API semantic search
      setIsSearching(true);
      try {
        const data = await apiClient.post<any>("/documents/query", {
          email: user.email,
          query: searchQuery,
        });

        const matchedIds = new Set(data.file_id || []);
        const matched = (files || []).filter((file) => matchedIds.has(file.id));

        setFilteredFiles(matched);
      } catch (error: any) {
        console.error("Semantic search error:", error);
        toast.error("Search failed: " + error.message);
        const localMatch = (files || []).filter((file) =>
          file.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredFiles(localMatch);
      } finally {
        setIsSearching(false);
      }
    };

    // Debounce hanya untuk search yang ada query
    if (searchQuery && searchQuery.trim() !== "") {
      const timer = setTimeout(() => {
        filterFiles();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // Jika tidak ada query, langsung set tanpa debounce
      filterFiles();
    }
  }, [searchQuery, files, user.email]);

  // useEffect untuk immediate reset saat section/folder berubah
  useEffect(() => {
    setFilteredFiles(files || []);
    clearSelection();
    setIsSearching(false);
  }, [section, currentFolderId]);

  // useEffect terpisah untuk sync dengan files saat tidak ada search
  useEffect(() => {
    // Saat files berubah dan tidak ada search query, sync langsung
    if (!searchQuery || searchQuery.trim() === "") {
      console.log("Files changed without search, syncing", {
        filesCount: files?.length,
      });
      setFilteredFiles(files || []);
    }
  }, [files]);

  // useEffect Button Trigger Empety Trash.
  useEffect(() => {
    const deleteAllFiles = async () => {
      if (!deleteTrigger || !files?.length) return;

      const hasTrashedItems = files.some((f) => f.is_trashed);
      const isPermanent = hasTrashedItems;
      const folders = files.filter((f) => f.is_folder);
      const normalFiles = files.filter((f) => !f.is_folder);

      let filesInsideFolder = 0;
      let folderInsideFolder = 0;

      if (isPermanent && folders.length > 0) {
        for (const folder of folders) {
          const summary = await getFolderSummary(folder.id, folder.name);
          filesInsideFolder += summary.filesInsideFolder;
          folderInsideFolder += summary.folderInsideFolder;
        }
      }

      setDeleteDialog({
        open: true,
        itemCount: files.length,
        isFolder: folders.length > 0,
        isPermanent,
        filesCount: normalFiles.length,
        foldersCount: folders.length,
        filesInsideFolder,
        folderInsideFolder,
        callback: async () => {
          await processDeleteItems(files, isPermanent);
        },
      });
    };

    deleteAllFiles();
  }, [deleteTrigger]);

  // const filteredFiles =
  //   files?.filter((file) =>
  //     file.name.toLowerCase().includes(searchQuery.toLowerCase())
  //   ) || [];

  console.log("Filtered files:", {
    originalCount: files?.length || 0,
    filteredCount: filteredFiles.length,
    searchQuery,
  });

  // Utility untuk handle click file
  const handleItemClick = (item: FileItem) => {
    if (item.is_folder && onFolderNavigate) {
      onFolderNavigate({ id: item.id, name: item.name });
    } else if (!item.is_folder) {
      // Open file preview for non-folder items
      setPreviewFile(item);
    }
  };

  // Utility untuk handle preview file
  const handlePreview = async (file: FileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewFile(file);
  };

  // Utility untuk handle download file
  const handleDownload = async (file: FileItem) => {
    if (file.is_folder) {
      toast.error("Cannot download folders");
      return;
    }

    if (file.is_shared && file.access_level === "view") {
      toast.error("Download not allowed for this shared file");
      return;
    }

    if (file.url) {
      // const link = document.createElement("a");
      // link.href = file.url;
      // link.download = file.name;
      // console.log("download", file.name);
      // document.body.appendChild(link);
      // link.click();
      // document.body.removeChild(link);
      const res = await fetch(file.url, { credentials: "omit" });
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      URL.revokeObjectURL(link.href);
      link.remove();
      toast.success("File download started");
    }
  };

  // Utility untuk handle favorite file
  const handleToggleStar = async (file: FileItem) => {
    if (file.is_shared) {
      toast.error("Cannot star shared files");
      return;
    }
    try {
      await toggleStar({ id: file.id, is_starred: file.is_starred });
      toast.success(
        file.is_starred ? "Removed from starred" : "Added to starred"
      );
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Utility untuk handle rename file
  function splitFilename(name: string) {
    const lastDot = name.lastIndexOf(".");
    if (lastDot <= 0 || lastDot === name.length - 1) {
      return { base: name, ext: "" };
    }
    return { base: name.slice(0, lastDot), ext: name.slice(lastDot) };
  }

  // Utility untuk update rename file
  const handleRenameFile = async (
    file: FileItem,
    ext: string,
    event?: React.FormEvent
  ) => {
    event.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed || trimmed === file.name) {
      setEditingId(null);
      return;
    }
    try {
      const isValid = /^[a-zA-Z0-9\s._-\u00C0-\u024F\u1E00-\u1EFF]+$/.test(
        trimmed
      );
      if (!isValid) {
        toast.error(
          "Error: Invalid file name. Allowed characters: letters, numbers, spaces, dot (.), underscore (_), and dash (-)"
        );
      } else {
        const response = await updateFile({ id: file.id, name: trimmed + ext });
        toast.success(`Success change name file`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to rename");
    } finally {
      setEditingId(null);
    }
  };

  // Utility untuk handle rename folder
  const handleRenameFolder = async (
    folder_id: string,
    name: string,
    event?: React.FormEvent
  ) => {
    event.preventDefault();

    try {
      const isValid = /^[a-zA-Z0-9\s._-\u00C0-\u024F\u1E00-\u1EFF]+$/.test(
        name
      );
      if (!isValid) {
        toast.error(
          "Error: Invalid folder name. Allowed characters: letters, numbers, spaces, dot (.), underscore (_), and dash (-)"
        );
      } else {
        await updateFolder({ folderId: folder_id, name: name });
        toast.success(`Success change name folder`);
      }
    } catch (error: any) {
      let msg = "Failed to rename folder";

      try {
        msg = JSON.parse(error.message.replace("Error: ", "")).detail || msg;
      } catch {
        msg = error.message || msg;
      }

      toast.error(msg);
    } finally {
      setEditingId(null);
    }
  };

  // Utility Bulk Delete dan Restore
  const handleBulkDeleteAndRestore = async (restore: boolean) => {
    const selectedIds = [...selectedMap.keys()];
    if (!selectedIds.length) return;

    const itemMap = new Map(filteredFiles.map((f) => [f.id, f]));
    const items = selectedIds
      .map((id) => itemMap.get(id))
      .filter(Boolean) as FileItem[];

    if (!items.length) {
      clearSelection();
      return;
    }

    const hasTrashedItems = items.some((it) => it.is_trashed);
    const isPermanent = !restore && hasTrashedItems;

    // Hitung statistik
    let filesCount = 0;
    let foldersCount = 0;
    let filesInsideFolder = 0;
    let folderInsideFolder = 0;

    for (const item of items) {
      if (item.is_folder) {
        foldersCount++;

        if (isPermanent) {
          const summary = await getFolderSummary(item.id, item.name);
          filesInsideFolder += summary.filesInsideFolder;
          folderInsideFolder += summary.folderInsideFolder;
        }
      } else {
        filesCount++;
      }
    }

    setDeleteDialog({
      open: true,
      itemCount: items.length,
      isFolder: foldersCount > 0,
      isPermanent,
      filesCount,
      foldersCount,
      filesInsideFolder,
      folderInsideFolder,
      callback: async () => {
        restore
          ? await performBulkRestore(items)
          : await processDeleteItems(items, isPermanent);
      },
    });
  };

  // Utility Delete Folder / File
  const handleDelete = async (file: FileItem) => {
    const isPermanent = file.is_trashed;
    let filesInsideFolder = 0;
    let folderInsideFolder = 0;

    if (file.is_folder && isPermanent) {
      const summary = await getFolderSummary(file.id, file.name);
      filesInsideFolder = summary.filesInsideFolder;
      folderInsideFolder = summary.folderInsideFolder;
    }

    setDeleteDialog({
      open: true,
      itemCount: 1,
      isFolder: file.is_folder,
      isPermanent,
      filesCount: file.is_folder ? 0 : 1,
      foldersCount: file.is_folder ? 1 : 0,
      filesInsideFolder,
      folderInsideFolder,
      callback: async () => {
        await processDeleteItems([file], isPermanent);
      },
    });
  };

  // Utility Soft Delete Folder / File
  const handleMoveToTrash = async (file: FileItem) => {
    if (file.is_shared) {
      toast.error("Cannot move shared files to trash");
      return;
    }
    try {
      // siapkan payload sesuai req body backend
      const payload: DeletePayload = {
        email: user.email, // pastikan variabel email tersedia dari state/auth
        filename: file.name, // atau file.filename sesuai struktur FileItem
      };
      await deleteFromServer(payload);
      await moveToTrash({ id: file.id, is_folder: file.is_folder });
      const itemType = file.is_folder ? "Folder" : "File";
      toast.success(`${itemType} moved to trash`);
    } catch (error: any) {
      let msg;
      try {
        msg = JSON.parse(error.message.replace("Error: ", "")).detail;
      } catch {
        msg = error.message;
      }
      toast.error(msg);
    }
  };

  // Utility untuk bulk move files/folders
  const handleBulkMove = async (targetFolderId: string | null) => {
    const selectedIds = [...selectedMap.keys()];
    if (!selectedIds.length) return toast.error("No items selected");

    const itemMap = new Map(filteredFiles.map((f) => [f.id, f]));
    const items = selectedIds
      .map((id) => itemMap.get(id))
      .filter(Boolean) as FileItem[];

    if (!items.length) return clearSelection();

    // Validasi items
    const sharedItems = items.filter((item) => item.is_shared);
    if (sharedItems.length > 0) {
      return toast.error("Cannot move shared files/folders");
    }

    const alreadyInTarget = items.filter(
      (item) => item.parent_folder_id === targetFolderId
    );
    if (alreadyInTarget.length === items.length) {
      return toast.error("Items already in target folder");
    }

    // Set loading state
    setHandleLoading(true);

    // Buat loading toast dengan custom ID untuk prevent duplicate
    const toastId = toast.loading(`Moving ${items.length} item(s)...`, {
      id: "bulk-move-toast",
      description: "Please wait, do not close this window",
      duration: Infinity, // Toast tidak hilang otomatis
    });

    try {
      const movedCount = { files: 0, folders: 0 };
      const failedItems: { name: string; error: string }[] = [];

      // Process all items in parallel
      const movePromises = items.map(async (item) => {
        if (item.parent_folder_id === targetFolderId) return null;

        try {
          await moveFileToFolder({
            fileId: item.id,
            folderId: targetFolderId,
          });
          return { success: true, type: "file", item };
        } catch (e: any) {
          console.error("Failed to move item:", {
            itemName: item.name,
            itemId: item.id,
            error: e.message,
          });

          return {
            success: false,
            item,
            error: e.message || "Unknown error",
          };
        }
      });

      // Tunggu semua proses selesai
      const results = await Promise.all(movePromises);

      // Hitung hasil
      results.forEach((result) => {
        if (!result) return;

        if (result.success) {
          if (result.type === "folder") {
            movedCount.folders++;
          } else {
            movedCount.files++;
          }
        } else {
          failedItems.push({
            name: result.item.name,
            error: result.error,
          });
        }
      });

      // Update UI setelah SEMUA proses selesai
      if (currentFolderId && currentFolderId !== targetFolderId) {
        const movedIds = results
          .filter((r) => r && r.success)
          .map((r) => r!.item.id);

        setFilteredFiles((prev) =>
          prev.filter((f) => !movedIds.includes(f.id))
        );
      }

      clearSelection();

      // Dismiss loading toast dan tampilkan hasil
      toast.dismiss(toastId);

      if (failedItems.length === 0) {
        toast.success(
          `Successfully moved ${movedCount.files} file(s) and ${movedCount.folders} folder(s)`,
          {
            duration: 3000,
          }
        );
      } else {
        const successCount = movedCount.files + movedCount.folders;
        const failedCount = failedItems.length;

        toast.warning(`Moved ${successCount} item(s). ${failedCount} failed`, {
          description: `Failed: ${failedItems.map((f) => f.name).join(", ")}`,
          duration: 5000,
        });

        console.error("Failed items:", failedItems);
      }
    } catch (e: any) {
      console.error("Bulk move error:", e);
      toast.dismiss(toastId);
      toast.error(e.message || "Failed to move items", {
        duration: 3000,
      });
    } finally {
      setHandleLoading(false);
    }
  };

  // Utility untuk restore file/folder banyak
  const performBulkRestore = async (items: FileItem[]) => {
    try {
      const results = await Promise.allSettled(
        items.map((item) =>
          restoreFile({ id: item.id, is_folder: item.is_folder })
        )
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.filter((r) => r.status === "rejected").length;
      if (ok) toast.success(`Restored ${ok} item(s)`);
      if (fail) toast.error(`Failed to restore ${fail} item(s)`);
    } catch (error: any) {
      toast.error(error.message || "Restore failed");
    } finally {
      clearSelection?.();
      setDeleteDialog((prev) => ({ ...prev, open: false, callback: null }));
    }
  };

  // Utility untuk restore 1 file/folder
  const handleRestore = async (file: FileItem) => {
    try {
      console.log("Restoring item:", {
        id: file.id,
        name: file.name,
        is_folder: file.is_folder,
      });

      // Restore via API (handles both files and folders)
      await restoreFile({ id: file.id, is_folder: file.is_folder });

      // Only re-upload embeddings for files (not folders)
      if (!file.is_folder && file.storage_path) {
        try {
          const fileUpload = await fetchFile(file.id);
          await uploadSingleFile(fileUpload.file, user.email, file.id);
          console.log("Embeddings re-uploaded for file:", file.id);
        } catch (embeddingError) {
          console.warn("Failed to re-upload embeddings:", embeddingError);
          // Don't fail restore if embedding upload fails
        }
      }

      const itemType = file.is_folder ? "Folder" : "File";
      toast.success(`${itemType} restored`);
    } catch (error: any) {
      console.error("Restore failed:", error);
      toast.error(error.message);
    }
  };

  // Utility untuk move file/folder ke folder lain
  const handleMoveFile = async (
    fileId: string,
    targetFolderId: string | null
  ) => {
    const src = filteredFiles.find((f) => f.id === fileId);
    if (!src) return toast.error("File not found");
    if (src.is_shared) return toast.error("Cannot move shared files");
    if (src.is_folder) return toast.error("Use folder move API for folders"); // atau dukung juga

    try {
      await moveFileToFolder({ fileId: fileId, folderId: targetFolderId });
      toast.success("File moved");
      if (currentFolderId && currentFolderId !== targetFolderId) {
        setFilteredFiles((prev) => prev.filter((f) => f.id !== fileId));
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to move file");
    }
  };

  // Utility untuk filter file/folder
  const handleOnFilter = (
    sortBy: "name" | "size" | "created_at",
    sortOrder: "asc" | "desc"
  ) => {
    setSortBy(sortBy);
    setSortOrder(sortOrder);
  };

  // Utility Remove Access File Shared
  const handleRemoveAccess = async (shareId: string) => {
    try {
      await deleteFileShare({ share_id: shareId });
      toast.success("Akses file berhasil dihapus");
    } catch (e) {
      toast.error(`Gagal menghapus akses file ${e.message}`);
    }
  };
  // Utility Bulk Remove Access File Shared
  const handleBulkRevokeAccess = async () => {
    const selectedIds = [...selectedMap.keys()];
    if (!selectedIds.length) return;

    const itemMap = new Map(filteredFiles.map((f) => [f.id, f]));
    const items = selectedIds
      .map((id) => itemMap.get(id))
      .filter(Boolean) as FileItem[];
    if (!items.length) {
      clearSelection?.();
      return;
    }

    // Kumpulkan semua shareId dari semua selected items
    const allShareIds: string[] = [];
    for (const item of items) {
      if (item.shared && item.shared.length > 0) {
        for (const share of item.shared) {
          if (share.id) {
            allShareIds.push(share.id);
          }
        }
      }
    }

    if (allShareIds.length === 0) {
      toast.info("No shared access to revoke");
      clearSelection?.();
      return;
    }

    try {
      const results = await Promise.allSettled(
        allShareIds.map((shareId) => deleteFileShare({ share_id: shareId }))
      );

      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.filter((r) => r.status === "rejected").length;

      if (ok) toast.success(`Removed access for ${ok} shared item(s)`);
      if (fail)
        toast.error(`Failed to remove access for ${fail} shared item(s)`);
    } catch (error: any) {
      toast.error(error.message || "Failed to revoke shared access");
    } finally {
      clearSelection?.();
    }
  };

  function getPreviousRecipients(file: FileItem | null | undefined): string[] {
    if (!file) return [];
    const emails = (file.shared ?? [])
      .map((s) => s.shared_with_email)
      .filter((e): e is string => !!e);
    return Array.from(new Set(emails)).sort((a, b) => a.localeCompare(b));
  }

  const previousRecipients = getPreviousRecipients(shareFile);

  const foldersCandidates = useMemo(() => {
    const all = filteredFiles || [];
    if (section === "trashed") return [];

    if (!currentFolderId) {
      return all.filter((f) => f.is_folder && f.parent_folder_id == null);
    }
    return all.filter((f) => f.is_folder);
  }, [filteredFiles, currentFolderId, section]);

  if (isLoading) {
    console.log("FileGrid: showing loading state");
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground font-medium">Loading files...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error("FileGrid: showing error state", error);
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            Error loading files
          </h3>
          <p className="text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  if (filteredFiles.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No files found
          </h3>
          <p className="text-muted-foreground">
            {searchQuery
              ? "Try adjusting your search terms"
              : "Upload your first file to get started"}
          </p>
        </div>
      </div>
    );
  }

  // Loading state saat semantic search
  if (isSearching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground font-medium">Searching...</p>
        </div>
      </div>
    );
  }

  const BulkToolbar = (section: string) => {
    return (
      <div className="relative">
        {/* Selection toolbar */}
        {selectionMode && selectedMap.size > 0 && (
          <div className="flex items-center justify-between gap-2 mb-4">
            {/* Item count - Left side */}
            <span className="text-sm text-muted-foreground">
              {selectedMap.size} item(s) selected
            </span>

            {/* Action buttons - Right side */}
            <div className="flex items-center gap-2">
              {section !== "trashed" && section !== "shared" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={handleLoading}
                    >
                      <Folder className="w-4 h-4 mr-2" />
                      Move to...
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-56 max-h-64 overflow-auto"
                  >
                    {currentFolderId && (
                      <DropdownMenuItem
                        onClick={() => handleBulkMove(null)}
                        disabled={handleLoading}
                      >
                        <Home className="w-4 h-4 mr-2" />
                        My Drive
                      </DropdownMenuItem>
                    )}
                    {foldersCandidates.map((folder) => (
                      <DropdownMenuItem
                        key={folder.id}
                        onClick={() => handleBulkMove(folder.id)}
                        disabled={handleLoading}
                      >
                        <Folder className="w-4 h-4 mr-2" />
                        {folder.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {(previousSection || section) === "trashed" && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleBulkDeleteAndRestore(true)}
                  disabled={handleLoading}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore
                </Button>
              )}

              <Button
                variant="destructive"
                size="sm"
                onClick={() =>
                  section === "shared"
                    ? handleBulkRevokeAccess()
                    : handleBulkDeleteAndRestore(false)
                }
                disabled={handleLoading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {section === "shared"
                  ? "Delete Access"
                  : section === "all"
                  ? "Move to Trash"
                  : "Delete"}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                disabled={handleLoading}
              >
                Clear
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCheckbox = (file: FileItem) => {
    // list
    if (viewMode === "list") {
      return (
        <div
          className="flex items-center mr-3"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={isSelected(file.id)}
            onChange={() => toggleSelect(file)}
          />
        </div>
      );
    }

    // grid
    return (
      <div
        className={
          "absolute top-2 left-2 z-30 transition-opacity " +
          (selectionMode
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 group-hover:opacity-100")
        }
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          className="h-4 w-4 accent-primary"
          checked={isSelected(file.id)}
          onChange={() => toggleSelect(file)}
        />
      </div>
    );
  };

  if (viewMode === "list") {
    return (
      <>
        {/* Toolbar aksi massal */}
        {BulkToolbar(section)}
        <FileFilterDropdown
          sortBy={sortBy}
          sortOrder={sortOrder}
          onFilterChange={handleOnFilter}
        />
        <div className="space-y-2">
          {filteredFiles.map((file) => {
            const IconComponent = getFileIcon(file);
            return (
              <Card
                key={file.id}
                className="relative p-4 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer border-border group"
                draggable={!file.is_folder}
                onDragStart={(e) => {
                  if (!file.is_folder) {
                    e.dataTransfer.setData("text/file-id", file.id);
                  }
                }}
                onDragEnd={() => {}}
                onDragOver={(e) => {
                  if (file.is_folder) e.preventDefault();
                }}
                onDragEnter={(e) => {
                  if (file.is_folder) {
                    e.preventDefault();
                    setIsDragOver(file.id);
                  }
                }}
                onDragLeave={() => {
                  if (isDragOver === file.id) setIsDragOver(null);
                }}
                onDrop={(e) => {
                  if (!file.is_folder) return;
                  e.preventDefault();
                  const fileId = e.dataTransfer.getData("text/file-id");
                  setIsDragOver(null);
                  if (!fileId || fileId === file.id) return;
                  handleMoveFile(fileId, file.id);
                }}
                onClick={() => handleItemClick(file)}
              >
                <div className="flex items-center">
                  {renderCheckbox(file)}
                  <div className="flex items-center justify-between flex-1">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:from-primary/20 group-hover:to-primary/10 transition-all">
                        <IconComponent className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {editingId === file.id ? (
                            <form
                              className="flex items-center gap-2 min-w-0"
                              onSubmit={async (e) => {
                                const { ext } = splitFilename(file.name);
                                if (
                                  !newName.trim() ||
                                  newName.trim() ===
                                    splitFilename(file.name).base
                                ) {
                                  setEditingId(null);
                                  return;
                                }
                                if (file.is_folder) {
                                  handleRenameFolder(file.id, newName, e);
                                } else {
                                  handleRenameFile(file, ext, e);
                                }
                              }}
                            >
                              <Input
                                autoFocus
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onBlur={async (e) => {
                                  const { ext } = splitFilename(file.name);
                                  if (
                                    !newName.trim() ||
                                    newName.trim() ===
                                      splitFilename(file.name).base
                                  ) {
                                    // Tidak ada perubahan (atau kosong) → tutup edit tanpa aksi
                                    setEditingId(null);
                                    return;
                                  }
                                  if (file.is_folder) {
                                    handleRenameFolder(file.id, newName, e);
                                  } else {
                                    handleRenameFile(file, ext, e);
                                  }
                                }}
                                onKeyDown={async (e) => {
                                  if (e.key === "Enter") {
                                    const { ext } = splitFilename(file.name);
                                    if (
                                      !newName.trim() ||
                                      newName.trim() ===
                                        splitFilename(file.name).base
                                    ) {
                                      setEditingId(null);
                                      return;
                                    }
                                    if (file.is_folder) {
                                      handleRenameFolder(file.id, newName, e);
                                    } else {
                                      handleRenameFile(file, ext, e);
                                    }
                                  } else if (e.key === "Escape") {
                                    setEditingId(null);
                                  }
                                }}
                                className="h-8 px-2 py-1 text-sm"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingId(null)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </form>
                          ) : (
                            <>
                              <h3
                                className="font-semibold text-foreground truncate group-hover:text-primary transition-colors"
                                title={file.name}
                              >
                                {file.name}
                              </h3>
                              {(!file.is_shared ||
                                (Array.isArray(file.shared) &&
                                  file.shared.some(
                                    (s) => s.shared_by === user.id
                                  )) ||
                                (Array.isArray(file.shared) &&
                                  !file.shared.some(
                                    (s) => s.access_level === "view"
                                  ))) &&
                                (previousSection ?? section) !== "trashed" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingId(file.id);
                                      const { base } = splitFilename(file.name);
                                      setNewName(base);
                                    }}
                                    aria-label="Rename file"
                                    title="Rename"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                )}
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="font-medium">
                            {file.is_folder
                              ? "Folder"
                              : formatFileSize(file.size)}
                          </span>
                          <span>{formatDate(file.created_at)}</span>
                          {file.is_shared && (
                            <Badge variant="secondary" className="text-xs">
                              <Users className="w-3 h-3 mr-1" />
                              Shared
                            </Badge>
                          )}
                        </div>
                      </div>
                      {(previousSection ?? section) !== "shared" &&
                        file.is_starred && (
                          <Star className="w-5 h-5 text-yellow-500 fill-current" />
                        )}
                    </div>
                    {!selectionMode && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!file.is_folder && (
                            <>
                              <DropdownMenuItem
                                onClick={(e) => handlePreview(file, e)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Preview
                              </DropdownMenuItem>
                              {(!file.is_shared ||
                                (Array.isArray(file.shared) &&
                                  file.shared.some(
                                    (s) => s.shared_by === user.id
                                  ))) &&
                                (previousSection ?? section) !== "trashed" && (
                                  <DropdownMenuSub>
                                    <DropdownMenuSubTrigger
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Folder className="w-4 h-4 mr-2" />
                                      Move to folder
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                      <DropdownMenuSubContent
                                        sideOffset={8}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-56 max-h-64 overflow-auto"
                                      >
                                        {currentFolderId && (
                                          <DropdownMenuItem
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleMoveFile(file.id, null);
                                            }}
                                          >
                                            My Drive
                                          </DropdownMenuItem>
                                        )}
                                        {foldersCandidates.map((folder) => (
                                          <DropdownMenuItem
                                            key={folder.id}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (
                                                file.parent_folder_id ===
                                                folder.id
                                              )
                                                return;
                                              handleMoveFile(
                                                file.id,
                                                folder.id
                                              );
                                            }}
                                          >
                                            {folder.name}
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                  </DropdownMenuSub>
                                )}
                              {(!file.is_shared ||
                                (Array.isArray(file.shared) &&
                                  file.shared.some(
                                    (s) => s.shared_by === user.id
                                  )) ||
                                Array.isArray(file.shared)) &&
                                (previousSection ?? section) !== "trashed" && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownload(file);
                                    }}
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download
                                  </DropdownMenuItem>
                                )}
                              {(!file.is_shared ||
                                !Array.isArray(file.shared) ||
                                file.shared.some(
                                  (s) => s.shared_by === user.id
                                ) ||
                                file.shared.some(
                                  (s) => s.access_level === "share"
                                ) ||
                                file.shared.some(
                                  (s) => s.access_level === "manage"
                                )) &&
                                (previousSection ?? section) !== "trashed" && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShareFile(file);
                                    }}
                                  >
                                    <Share2 className="w-4 h-4 mr-2" />
                                    Share
                                  </DropdownMenuItem>
                                )}
                            </>
                          )}
                          {(!file.is_shared ||
                            (Array.isArray(file.shared) &&
                              file.shared.some(
                                (s) => s.shared_by === user.id
                              ))) &&
                            (previousSection ?? section) !== "trashed" && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleStar(file);
                                }}
                              >
                                <Star className="w-4 h-4 mr-2" />
                                {file.is_starred
                                  ? "Remove from starred"
                                  : "Add to starred"}
                              </DropdownMenuItem>
                            )}
                          {(previousSection ?? section) === "trashed" ? (
                            <>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRestore(file);
                                }}
                              >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Restore
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(file);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete permanently
                              </DropdownMenuItem>
                            </>
                          ) : section === "shared" ? (
                            (file.shared[0].access_level === "delete" ||
                              file.shared[0].access_level === "manage") && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveAccess(file.shared[0].id);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete access
                              </DropdownMenuItem>
                            )
                          ) : (
                            section !== "shared" &&
                            (!file.is_shared ||
                              !Array.isArray(file.shared) ||
                              file.shared.some(
                                (s) => s.shared_by === user.id
                              ) ||
                              file.shared.some(
                                (s) => s.access_level === "delete"
                              ) ||
                              file.shared.some(
                                (s) => s.access_level === "manage"
                              )) && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveToTrash(file);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Move to trash
                              </DropdownMenuItem>
                            )
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
          <FilePreview
            file={previewFile}
            isOpen={!!previewFile}
            onClose={() => setPreviewFile(null)}
          />
          <ShareDialog
            open={!!shareFile}
            onOpenChange={(open) => !open && setShareFile(null)}
            file={shareFile}
            previousRecipients={previousRecipients}
            user={
              user as { id: string; aud: string; role: string; email: string }
            }
          />
          <ConfirmDeleteDialog
            open={deleteDialog.open}
            onOpenChange={(open) => {
              setDeleteDialog({ ...deleteDialog, open });
            }}
            onConfirm={() => deleteDialog.callback?.()}
            itemCount={deleteDialog.itemCount}
            isFolder={deleteDialog.isFolder}
            isPermanent={deleteDialog.isPermanent}
            filesCount={deleteDialog.filesCount}
            foldersCount={deleteDialog.foldersCount}
            filesInsideFolder={deleteDialog.filesInsideFolder}
            folderInsideFolder={deleteDialog.folderInsideFolder}
          />
        </div>
      </>
    );
  }

  return (
    <>
      {/* Toolbar aksi massal */}
      {BulkToolbar(section)}
      <FileFilterDropdown
        sortBy={sortBy}
        sortOrder={sortOrder}
        onFilterChange={handleOnFilter}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {filteredFiles.map((file) => {
          const IconComponent = getFileIcon(file);
          return (
            <Card
              key={file.id}
              className={
                "relative p-3 hover:shadow-lg hover:border-primary/20 hover:-translate-y-1 transition-all duration-300 group cursor-pointer border-border " +
                (file.is_folder && isDragOver === file.id
                  ? "ring-2 ring-primary/50"
                  : "")
              }
              onClick={() => handleItemClick(file)}
              draggable={!file.is_folder}
              onDragStart={(e) => {
                if (!file.is_folder) {
                  e.dataTransfer.setData("text/file-id", file.id);
                }
              }}
              onDragEnd={() => {}}
              onDragOver={(e) => {
                if (file.is_folder) e.preventDefault();
              }}
              onDragEnter={(e) => {
                if (file.is_folder) {
                  e.preventDefault();
                  setIsDragOver(file.id);
                }
              }}
              onDragLeave={() => {
                if (isDragOver === file.id) setIsDragOver(null);
              }}
              onDrop={(e) => {
                if (!file.is_folder) return;
                e.preventDefault();
                const fileId = e.dataTransfer.getData("text/file-id");
                setIsDragOver(null);
                if (!fileId || fileId === file.id) return;
                handleMoveFile(fileId, file.id);
              }}
            >
              {renderCheckbox(file)}
              <div className="space-y-2">
                <div className="relative">
                  {file.type.startsWith("image/") &&
                  "url" in file &&
                  file.url &&
                  !file.is_folder ? (
                    <div className="aspect-square rounded-lg overflow-hidden bg-muted ring-1 ring-border group-hover:ring-primary/30 transition-all">
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:from-primary/20 group-hover:to-primary/10 transition-all ring-1 ring-border group-hover:ring-primary/30">
                      <IconComponent className="w-8 h-8 text-primary" />
                    </div>
                  )}
                  {(previousSection ?? section) !== "shared" &&
                    file.is_starred && (
                      <Star className="absolute top-2 right-2 w-4 h-4 text-yellow-500 fill-current drop-shadow-lg" />
                    )}
                  {file.is_shared && file.shared[0].share_type !== "public" && (
                    <Badge className="absolute top-2 left-2 text-xs shadow-md flex items-center">
                      {section === "shared" ? (
                        (() => {
                          const accessMap = {
                            view: { icon: Eye, label: "View" },
                            edit: { icon: Pencil, label: "Can Edit" },
                            delete: { icon: Trash2, label: "Can Delete" },
                            manage: { icon: Settings, label: "Manage" },
                          };

                          const access = accessMap[file.shared[0].access_level];
                          if (!access) return null;

                          const Icon = access.icon;

                          return (
                            <>
                              <Icon className="w-3 h-3 mr-1" />
                              {access.label}
                            </>
                          );
                        })()
                      ) : (
                        <>
                          <Users className="w-3 h-3 mr-1" />
                          Shared
                        </>
                      )}
                    </Badge>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-end justify-center pb-2">
                    {!selectionMode && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-end justify-center pb-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!file.is_folder && (
                              <>
                                <DropdownMenuItem
                                  onClick={(e) => handlePreview(file, e)}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Preview
                                </DropdownMenuItem>
                                {(!file.is_shared ||
                                  (Array.isArray(file.shared) &&
                                    file.shared.some(
                                      (s) => s.shared_by === user.id
                                    ))) &&
                                  (previousSection ?? section) !==
                                    "trashed" && (
                                    <DropdownMenuSub>
                                      <DropdownMenuSubTrigger
                                        disabled={
                                          foldersCandidates.length === 0 &&
                                          !currentFolderId
                                        }
                                        onClick={(e) => e.stopPropagation()}
                                        className={
                                          foldersCandidates.length === 0 &&
                                          !currentFolderId
                                            ? "opacity-50 pointer-events-none"
                                            : ""
                                        }
                                      >
                                        <Folder className="w-4 h-4 mr-2" />
                                        Move to folder
                                      </DropdownMenuSubTrigger>

                                      {/* Hanya render submenu jika tidak disabled */}
                                      {!(
                                        foldersCandidates.length === 0 &&
                                        !currentFolderId
                                      ) && (
                                        <DropdownMenuPortal>
                                          <DropdownMenuSubContent
                                            sideOffset={8}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-56 max-h-64 overflow-auto"
                                          >
                                            {currentFolderId && (
                                              <DropdownMenuItem
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleMoveFile(file.id, null);
                                                }}
                                              >
                                                My Drive
                                              </DropdownMenuItem>
                                            )}

                                            {foldersCandidates.map((folder) => (
                                              <DropdownMenuItem
                                                key={folder.id}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (
                                                    file.parent_folder_id ===
                                                    folder.id
                                                  )
                                                    return;
                                                  handleMoveFile(
                                                    file.id,
                                                    folder.id
                                                  );
                                                }}
                                              >
                                                {folder.name}
                                              </DropdownMenuItem>
                                            ))}
                                          </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                      )}
                                    </DropdownMenuSub>
                                  )}

                                {(!file.is_shared ||
                                  (Array.isArray(file.shared) &&
                                    file.shared.some(
                                      (s) => s.shared_by === user.id
                                    )) ||
                                  Array.isArray(file.shared)) &&
                                  (previousSection ?? section) !==
                                    "trashed" && (
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownload(file);
                                      }}
                                    >
                                      <Download className="w-4 h-4 mr-2" />
                                      Download
                                    </DropdownMenuItem>
                                  )}
                                {(!file.is_shared ||
                                  !Array.isArray(file.shared) ||
                                  file.shared.some(
                                    (s) => s.shared_by === user.id
                                  ) ||
                                  file.shared.some(
                                    (s) => s.access_level === "share"
                                  ) ||
                                  file.shared.some(
                                    (s) => s.access_level === "manage"
                                  )) &&
                                  (previousSection ?? section) !==
                                    "trashed" && (
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShareFile(file);
                                      }}
                                    >
                                      <Share2 className="w-4 h-4 mr-2" />
                                      Share
                                    </DropdownMenuItem>
                                  )}
                              </>
                            )}
                            {(!file.is_shared ||
                              (Array.isArray(file.shared) &&
                                file.shared.some(
                                  (s) => s.shared_by === user.id
                                ))) &&
                              (previousSection ?? section) !== "trashed" && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleStar(file);
                                  }}
                                >
                                  <Star className="w-4 h-4 mr-2" />
                                  {file.is_starred
                                    ? "Remove from starred"
                                    : "Add to starred"}
                                </DropdownMenuItem>
                              )}

                            {(previousSection ?? section) === "trashed" ? (
                              <>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRestore(file);
                                  }}
                                >
                                  <RotateCcw className="w-4 h-4 mr-2" />
                                  Restore
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(file);
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete permanently
                                </DropdownMenuItem>
                              </>
                            ) : section === "shared" ? (
                              (file.shared[0].access_level === "delete" ||
                                file.shared[0].access_level === "manage") && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveAccess(file.shared[0].id);
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete access
                                </DropdownMenuItem>
                              )
                            ) : (
                              section !== "shared" &&
                              (!file.is_shared ||
                                !Array.isArray(file.shared) ||
                                file.shared.some(
                                  (s) => s.shared_by === user.id
                                ) ||
                                file.shared.some(
                                  (s) => s.access_level === "delete"
                                ) ||
                                file.shared.some(
                                  (s) => s.access_level === "manage"
                                )) && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveToTrash(file);
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Move to trash
                                </DropdownMenuItem>
                              )
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {editingId === file.id ? (
                      <Input
                        autoFocus
                        value={newName}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onChange={(e) => setNewName(e.target.value)}
                        onBlur={async (e) => {
                          e.stopPropagation();
                          const { ext } = splitFilename(file.name);
                          if (
                            !newName.trim() ||
                            newName.trim() === splitFilename(file.name).base
                          ) {
                            setEditingId(null);
                            return;
                          }
                          if (file.is_folder) {
                            handleRenameFolder(file.id, newName, e);
                          } else {
                            handleRenameFile(file, ext, e);
                          }
                        }}
                        onKeyDown={async (e) => {
                          if (e.key === "Enter") {
                            const { ext } = splitFilename(file.name);
                            if (
                              !newName.trim() ||
                              newName.trim() === splitFilename(file.name).base
                            ) {
                              setEditingId(null);
                              return;
                            }
                            if (file.is_folder) {
                              handleRenameFolder(file.id, newName, e);
                            } else {
                              handleRenameFile(file, ext, e);
                            }
                          } else if (e.key === "Escape") {
                            setEditingId(null);
                          }
                        }}
                        className="h-7 px-2 py-0 text-xs"
                      />
                    ) : (
                      <>
                        <h3 className="font-semibold text-foreground truncate text-xs group-hover:text-primary transition-colors">
                          {file.name}
                        </h3>
                        {(!file.is_shared ||
                          (Array.isArray(file.shared) &&
                            file.shared.some((s) => s.shared_by === user.id)) ||
                          (Array.isArray(file.shared) &&
                            !file.shared.some(
                              (s) => s.access_level === "view"
                            ))) &&
                          (previousSection ?? section) !== "trashed" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(file.id);
                                const { base } = splitFilename(file.name);
                                setNewName(base);
                              }}
                              aria-label="Rename file"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                    <span className="font-medium truncate">
                      {file.is_folder ? "Folder" : formatFileSize(file.size)}
                    </span>
                  </div>
                  {file.is_shared && file.shared[0].share_type !== "public" && (
                    <div className="text-xs text-muted-foreground mt-1">
                      <Badge
                        variant="secondary"
                        className="text-[10px] py-0 px-1"
                      >
                        <Users className="w-2.5 h-2.5 mr-0.5" />
                        Shared
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        <FilePreview
          file={previewFile}
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
        />
        <ShareDialog
          open={!!shareFile}
          onOpenChange={(open) => !open && setShareFile(null)}
          file={shareFile}
          previousRecipients={previousRecipients}
          user={
            user as { id: string; aud: string; role: string; email: string }
          }
        />
        <ConfirmDeleteDialog
          open={deleteDialog.open}
          onOpenChange={(open) => {
            setDeleteDialog({ ...deleteDialog, open });
          }}
          onConfirm={() => deleteDialog.callback?.()}
          itemCount={deleteDialog.itemCount}
          isFolder={deleteDialog.isFolder}
          isPermanent={deleteDialog.isPermanent}
          filesCount={deleteDialog.filesCount}
          foldersCount={deleteDialog.foldersCount}
          filesInsideFolder={deleteDialog.filesInsideFolder}
          folderInsideFolder={deleteDialog.folderInsideFolder}
        />
      </div>
    </>
  );
};
