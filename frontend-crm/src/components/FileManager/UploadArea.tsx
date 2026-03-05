import { useCallback, useState, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import {
  X,
  Upload,
  File as FileIcon,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useFiles } from "@/hooks/useFiles";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";

interface UploadAreaProps {
  open: boolean;
  onClose: () => void;
  currentFolderId?: string | null;
}

interface UploadFile {
  id?: string;
  file?: File;
  name?: string;
  progress: number;
  status: "pending" | "uploading" | "processing" | "completed" | "error";
  error?: string;
  source?: "local" | "rehydrated";
}

export const UploadArea = ({
  open,
  onClose,
  currentFolderId,
}: UploadAreaProps) => {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const { uploadFile, uploading } = useFiles(undefined, currentFolderId);
  const [uploadClicked, setUploadClicked] = useState(false);

  const { userRoles } = useRole();
  const organizationId = userRoles?.[0]?.organization_id;

  const { subscribeToMessages } = useWebSocket();

  const allFinal =
    uploadFiles.length > 0 &&
    uploadFiles.every((f) => f.status === "completed" || f.status === "error");

  // 1) Spinner setelah semua selesai
  useEffect(() => {
    if (allFinal && uploadClicked) {
      setUploadClicked(false);
    }
  }, [uploadFiles, allFinal, uploadClicked]);

  // 2) WS listener: ubah UI status, tanpa localStorage
  useEffect(() => {
    if (!organizationId) return;

    const unsubscribe = subscribeToMessages((notification: any) => {
      if (notification.type === "file_upload_completed") {
        const docId = notification.doc_id;
        const fileName = notification.filename;

        setUploadFiles((prev) =>
          prev.map((f) =>
            f.id === docId
              ? { ...f, status: "completed", progress: 100, error: undefined }
              : f,
          ),
        );
      }

      if (notification.type === "file_upload_failed") {
        const docId = notification.doc_id;
        const fileName = notification.filename;
        const errorMessage = notification.error || "Unknown error";

        setUploadFiles((prev) =>
          prev.map((f) =>
            f.id === docId
              ? {
                  ...f,
                  status: "error",
                  progress: 0,
                  error: errorMessage,
                }
              : f,
          ),
        );
      }
    });

    return () => unsubscribe();
  }, [organizationId, subscribeToMessages]);

  // 3) Dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
      file,
      name: file.name,
      progress: 0,
      status: "pending",
      source: "local",
    }));
    setUploadFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  // 4) Upload handler: sukses langsung set completed & toast
  const handleUpload = async () => {
    const pendingFiles = uploadFiles.filter(
      (f) => f.status === "pending" && f.file,
    );
    if (pendingFiles.length === 0) return;

    setUploadClicked(true);

    for (let i = 0; i < pendingFiles.length; i++) {
      const item = pendingFiles[i];

      setUploadFiles((prev) =>
        prev.map((f) =>
          f.file === item.file
            ? { ...f, status: "uploading", progress: 50 }
            : f,
        ),
      );

      try {
        const response = await uploadFile(item.file!);
        const backendFileId = response.id as string;

        setUploadFiles((prev) =>
          prev.map((f) =>
            f.file === item.file
              ? { ...f, id: backendFileId, status: "processing", progress: 75 }
              : f,
          ),
        );

        setUploadFiles((prev) =>
          prev.map((f) =>
            f.id === backendFileId
              ? { ...f, status: "completed", progress: 100, error: undefined }
              : f,
          ),
        );
      } catch (error: any) {
        let msg = "Upload failed";
        try {
          msg =
            JSON.parse(String(error?.message ?? "").replace("Error: ", ""))
              .detail || msg;
        } catch {
          msg = error?.message || msg;
        }

        setUploadFiles((prev) =>
          prev.map((f) =>
            f.file === item.file
              ? { ...f, status: "error", error: msg, progress: 0 }
              : f,
          ),
        );
      }
    }
  };

  // 5) UI helpers
  const removeFile = (fileToRemove?: File, idToRemove?: string) => {
    setUploadFiles((prev) =>
      prev.filter((f) => {
        if (fileToRemove && f.file) return f.file !== fileToRemove;
        if (idToRemove) return f.id !== idToRemove;
        return true;
      }),
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getStatusIcon = (item: UploadFile) => {
    const { status, error } = item;

    if (error) return <AlertCircle className="w-4 h-4 text-red-500" />;
    if (uploadClicked || status === "uploading" || status === "processing")
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    if (status === "completed")
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <FileIcon className="w-4 h-4 text-muted-foreground" />;
  };

  const allCompleted =
    uploadFiles.length > 0 &&
    uploadFiles.every(
      (f) =>
        f.status === "completed" ||
        f.status === "processing" ||
        f.status === "error",
    );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        className="max-w-2xl max-h-[90vh] flex flex-col p-0"
        showCloseButton={true}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
              <Upload className="w-5 h-5 text-primary-foreground" />
            </div>
            Upload Files
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          <div className="space-y-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-300 ${
                isDragActive
                  ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 scale-[1.02]"
                  : "border-muted-foreground/25 hover:border-primary hover:bg-muted/50 hover:shadow-lg"
              }`}
            >
              <input {...getInputProps()} />
              <div
                className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ${
                  isDragActive ? "scale-110" : ""
                } transition-transform`}
              >
                <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
              {isDragActive ? (
                <p className="text-primary font-semibold text-base sm:text-lg">
                  Drop the files here...
                </p>
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

            {uploadFiles.length > 0 && (
              <div className="space-y-2">
                {uploadFiles.map((item, index) => {
                  const displayName =
                    item.file?.name ?? item.name ?? "Unknown file";

                  return (
                    <div
                      key={item.id ?? `${displayName}-${index}`}
                      className="flex items-center gap-3 p-3 sm:p-4 border rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
                        {getStatusIcon(item)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {displayName}
                        </p>

                        {item.file ? (
                          <p className="text-xs text-muted-foreground font-medium">
                            {formatFileSize(item.file.size)}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground font-medium">
                            Processing
                          </p>
                        )}

                        {(item.status === "uploading" ||
                          item.status === "processing") && (
                          <Progress
                            value={item.progress}
                            className="h-1.5 mt-2"
                          />
                        )}

                        {item.error && (
                          <p className="text-xs text-red-500 mt-1 font-medium">
                            {item.error}
                          </p>
                        )}
                      </div>

                      {item.status === "pending" && item.file && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(item.file)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

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
