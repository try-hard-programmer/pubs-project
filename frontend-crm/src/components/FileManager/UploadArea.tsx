import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, File, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useFiles } from "@/hooks/useFiles";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/apiClient";

interface UploadAreaProps {
  onClose: () => void;
  currentFolderId?: string | null;
}

interface UploadFile {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

export const UploadArea = ({ onClose, currentFolderId }: UploadAreaProps) => {
  console.log("UploadArea mounted with currentFolderId:", currentFolderId);

  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const { uploadFile, uploading, fetchFile } = useFiles(
    undefined,
    currentFolderId
  );
  const { user } = useAuth();

  console.log("UploadArea useFiles hook initialized with currentFolderId:", currentFolderId);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      progress: 0,
      status: "pending" as const,
    }));
    setUploadFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  // async function uploadSingleFile(file: File, email: string, file_id: string) {
  //   const form = new FormData();
  //   form.append("file", file);
  //   form.append("email", email);
  //   form.append("file_id", file_id);
  //
  //   return apiClient.post<any>("/documents/upload", form);
  // }

  // const handleUpload = async () => {
  //   const pendingFiles = uploadFiles.filter((f) => f.status === "pending");

  //   for (const uploadFileItem of pendingFiles) {
  //     try {
  //       setUploadFiles((prev) =>
  //         prev.map((f) =>
  //           f.file === uploadFileItem.file
  //             ? { ...f, status: "uploading", progress: 50 }
  //             : f
  //         )
  //       );
  //       // f537d25a-03b8-47ac-be39-376ab90f24cc
  //       const uploadSupabase = await uploadFile(uploadFileItem.file);
  //       // panggil API upload
  //       await uploadSingleFile(
  //         uploadFileItem.file,
  //         user.email,
  //         uploadSupabase.id
  //       );

  //       setUploadFiles((prev) =>
  //         prev.map((f) =>
  //           f.file === uploadFileItem.file
  //             ? { ...f, status: "success", progress: 100 }
  //             : f
  //         )
  //       );
  //     } catch (error: any) {
  //       setUploadFiles((prev) =>
  //         prev.map((f) =>
  //           f.file === uploadFileItem.file
  //             ? { ...f, status: "error", error: error.message }
  //             : f
  //         )
  //       );
  //     }
  //   }

  //   const successCount = uploadFiles.filter(
  //     (f) => f.status === "success"
  //   ).length;
  //   if (successCount > 0) {
  //     toast.success(`${successCount} file(s) uploaded successfully`);
  //   }
  // };

  const handleUpload = async () => {
    console.log("handleUpload called with currentFolderId:", currentFolderId);
    const pendingFiles = uploadFiles.filter((f) => f.status === "pending");
    let successCount = 0;

    for (const uploadFileItem of pendingFiles) {
      try {
        console.log("Uploading file:", uploadFileItem.file.name, "to folder:", currentFolderId);
        setUploadFiles((prev) =>
          prev.map((f) =>
            f.file === uploadFileItem.file
              ? { ...f, status: "uploading", progress: 50 }
              : f
          )
        );
        // Upload ke Supabase Storage
        const uploadSupabase = await uploadFile(uploadFileItem.file);
        console.log("Upload result:", uploadSupabase);
        setUploadFiles((prev) =>
          prev.map((f) =>
            f.file === uploadFileItem.file
              ? { ...f, status: "success", progress: 100 }
              : f
          )
        );
        successCount++;
      } catch (error) {
        setUploadFiles((prev) =>
          prev.map((f) =>
            f.file === uploadFileItem.file
              ? { ...f, status: "error", error: error.message }
              : f
          )
        );
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} file(s) uploaded successfully`);
    }
  };

  const removeFile = (fileToRemove: File) => {
    setUploadFiles((prev) => prev.filter((f) => f.file !== fileToRemove));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <File className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const allCompleted =
    uploadFiles.length > 0 &&
    uploadFiles.every((f) => f.status === "success" || f.status === "error");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
              <Upload className="w-5 h-5 text-primary-foreground" />
            </div>
            Upload Files
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          <div className="space-y-6">
            {/* Drop Zone */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-300 ${
                isDragActive
                  ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 scale-[1.02]"
                  : "border-muted-foreground/25 hover:border-primary hover:bg-muted/50 hover:shadow-lg"
              }`}
            >
              <input {...getInputProps()} />
              <div className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ${isDragActive ? 'scale-110' : ''} transition-transform`}>
                <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
              {isDragActive ? (
                <p className="text-primary font-semibold text-base sm:text-lg">Drop the files here...</p>
              ) : (
                <div>
                  <p className="text-foreground font-semibold mb-2 text-base sm:text-lg">
                    Drag & drop files here, or click to select
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Support for multiple file upload
                  </p>
                </div>
              )}
            </div>

            {/* File List */}
            {uploadFiles.length > 0 && (
              <div className="space-y-2">
                {uploadFiles.map((uploadFileItem, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 sm:p-4 border rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
                      {getStatusIcon(uploadFileItem.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {uploadFileItem.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">
                        {formatFileSize(uploadFileItem.file.size)}
                      </p>
                      {uploadFileItem.status === "uploading" && (
                        <Progress
                          value={uploadFileItem.progress}
                          className="h-1.5 mt-2"
                        />
                      )}
                      {uploadFileItem.error && (
                        <p className="text-xs text-red-500 mt-1 font-medium">
                          {uploadFileItem.error}
                        </p>
                      )}
                    </div>
                    {uploadFileItem.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(uploadFileItem.file)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Fixed Actions at Bottom */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-background flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            {allCompleted ? "Close" : "Cancel"}
          </Button>
          {uploadFiles.length > 0 && !allCompleted && (
            <Button
              onClick={handleUpload}
              disabled={
                uploading || uploadFiles.every((f) => f.status !== "pending")
              }
              className="bg-primary hover:bg-primary/90"
            >
              {uploading ? "Uploading..." : "Upload Files"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
