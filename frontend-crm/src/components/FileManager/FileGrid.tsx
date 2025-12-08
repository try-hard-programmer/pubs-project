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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFiles, FileItem } from "@/hooks/useFiles";
import { useUserRole } from "@/hooks/useUserRole";
import { FilePreview } from "./FilePreview";
import { ShareDialog } from "./ShareDialog";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/apiClient";

interface FileGridProps {
  viewMode: "grid" | "list";
  searchQuery: string;
  section: string;
  currentFolderId?: string | null;
  onFolderNavigate?: (folder: { id: string; name: string }) => void;
}

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
  currentFolderId,
  onFolderNavigate,
}: FileGridProps) => {
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [shareFile, setShareFile] = useState<FileItem | null>(null);
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { userRole, isAdmin, isModerator } = useUserRole();
  const { user } = useAuth();

  const {
    files,
    isLoading,
    error,
    toggleStar,
    moveToTrash,
    deleteFile,
    restoreFile,
    fetchFile,
  } = useFiles(
    section === "all" ? undefined : (section as any),
    currentFolderId
  );

  console.log("FileGrid render:", {
    filesCount: files?.length || 0,
    isLoading,
    section,
    currentFolderId,
    error: error?.message,
  });
  // Effect untuk filter dengan semantic search
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
    setIsSearching(false);
  }, [section, currentFolderId]);

  // TAMBAH: useEffect terpisah untuk sync dengan files saat tidak ada search
  useEffect(() => {
    // Saat files berubah dan tidak ada search query, sync langsung
    if (!searchQuery || searchQuery.trim() === "") {
      console.log("Files changed without search, syncing", {
        filesCount: files?.length,
      });
      setFilteredFiles(files || []);
    }
  }, [files]);
  // const filteredFiles =
  //   files?.filter((file) =>
  //     file.name.toLowerCase().includes(searchQuery.toLowerCase())
  //   ) || [];

  console.log("Filtered files:", {
    originalCount: files?.length || 0,
    filteredCount: filteredFiles.length,
    searchQuery,
  });

  const handleItemClick = (item: FileItem) => {
    if (item.is_folder && onFolderNavigate) {
      onFolderNavigate({ id: item.id, name: item.name });
    } else if (!item.is_folder) {
      // Open file preview for non-folder items
      setPreviewFile(item);
    }
  };

  const handlePreview = async (file: FileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewFile(file);
  };

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
      const link = document.createElement("a");
      link.href = file.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("File download started");
    }
  };

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

  type DeletePayload = {
    email: string;
    filename: string;
  };

  async function deleteFromServer(payload: DeletePayload) {
    return apiClient.delete<{ status: string }>("/documents/delete", payload);
  }

  async function uploadSingleFile(file: File, email: string, file_id: string) {
    const form = new FormData();
    form.append("file", file);
    form.append("email", email);
    form.append("file_id", file_id);

    return apiClient.post<any>("/documents/upload", form);
  }

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
      toast.error(error.message);
    }
  };

  const handleDelete = async (file: FileItem) => {
    try {
      console.log("delete File", file);
      await deleteFile({
        id: file.id,
        storage_path: file.storage_path,
        is_folder: file.is_folder,
      });

      const itemType = file.is_folder ? "Folder" : "File";
      toast.success(`${itemType} permanently deleted`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleRestore = async (file: FileItem) => {
    try {
      console.log("Restoring item:", { id: file.id, name: file.name, is_folder: file.is_folder });

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
    console.log("FileGrid: showing empty state");
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

  if (viewMode === "list") {
    return (
      <div className="space-y-2">
        {filteredFiles.map((file) => {
          const IconComponent = getFileIcon(file);
          return (
            <Card
              key={file.id}
              className="p-4 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer border-border group"
              onClick={() => handleItemClick(file)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:from-primary/20 group-hover:to-primary/10 transition-all">
                    <IconComponent className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {file.name}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="font-medium">
                        {file.is_folder ? "Folder" : formatFileSize(file.size)}
                      </span>
                      <span>{formatDate(file.created_at)}</span>
                      {file.is_shared && (
                        <Badge variant="secondary" className="text-xs">
                          <Users className="w-3 h-3 mr-1" />
                          Shared ({file.access_level})
                        </Badge>
                      )}
                    </div>
                  </div>
                  {file.is_starred && (
                    <Star className="w-5 h-5 text-yellow-500 fill-current" />
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
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
                        {(!file.is_shared || file.access_level !== "view") && (
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
                        {!file.is_shared && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setShareFile(file);
                          }}>
                            <Share2 className="w-4 h-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                    {!file.is_shared && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStar(file);
                      }}>
                        <Star className="w-4 h-4 mr-2" />
                        {file.is_starred
                          ? "Remove from starred"
                          : "Add to starred"}
                      </DropdownMenuItem>
                    )}
                    {section === "trashed" ? (
                      <>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleRestore(file);
                        }}>
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
                    ) : (
                      !file.is_shared && (
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
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
      {filteredFiles.map((file) => {
        const IconComponent = getFileIcon(file);
        return (
          <Card
            key={file.id}
            className="p-3 hover:shadow-lg hover:border-primary/20 hover:-translate-y-1 transition-all duration-300 group cursor-pointer border-border"
            onClick={() => handleItemClick(file)}
          >
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
                {file.is_starred && (
                  <Star className="absolute top-2 right-2 w-4 h-4 text-yellow-500 fill-current drop-shadow-lg" />
                )}
                {file.is_shared && (
                  <Badge className="absolute top-2 left-2 text-xs shadow-md">
                    <Users className="w-2.5 h-2.5 mr-1" />
                    Shared
                  </Badge>
                )}
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
                            file.access_level !== "view") && (
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
                          {!file.is_shared && (
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
                      {!file.is_shared && (
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
                      {section === "trashed" ? (
                        <>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleRestore(file);
                          }}>
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
                      ) : (
                        !file.is_shared && (
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
              </div>
              <div>
                <h3 className="font-semibold text-foreground truncate text-xs group-hover:text-primary transition-colors">
                  {file.name}
                </h3>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                  <span className="font-medium truncate">
                    {file.is_folder ? "Folder" : formatFileSize(file.size)}
                  </span>
                </div>
                {file.is_shared && (
                  <div className="text-xs text-muted-foreground mt-1">
                    <Badge variant="secondary" className="text-[10px] py-0 px-1">
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
      />
    </div>
  );
};
