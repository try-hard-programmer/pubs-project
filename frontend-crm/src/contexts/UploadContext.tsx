import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import * as crmAgentsService from "@/services/crmAgentsService";
import { toast } from "sonner";

export interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  agentId: string;
  onSuccess?: () => void; // Save the callback here to fire later
}

interface UploadContextType {
  uploads: UploadItem[];
  startUpload: (agentId: string, file: File, onSuccess?: () => void) => void;
  clearCompleted: () => void;
  isUploading: boolean;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export const UploadProvider = ({ children }: { children: React.ReactNode }) => {
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  // 1. Add file to the queue (DOES NOT START UPLOAD YET)
  const startUpload = useCallback(
    (agentId: string, file: File, onSuccess?: () => void) => {
      const uploadId = Math.random().toString(36).substring(7);
      setUploads((prev) => [
        ...prev,
        {
          id: uploadId,
          file,
          progress: 0,
          status: "pending",
          agentId,
          onSuccess,
        },
      ]);
    },
    [],
  );

  // 2. The Engine: Watches the queue and processes ONE file at a time
  useEffect(() => {
    const processQueue = async () => {
      // If something is currently uploading, wait for it to finish
      if (uploads.some((u) => u.status === "uploading")) return;

      // Find the next pending item
      const nextUpload = uploads.find((u) => u.status === "pending");
      if (!nextUpload) return; // Nothing left to upload

      // Mark it as uploading
      setUploads((prev) =>
        prev.map((u) =>
          u.id === nextUpload.id
            ? { ...u, status: "uploading", progress: 5 }
            : u,
        ),
      );

      // Simulate progress bar movement
      const progressInterval = setInterval(() => {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === nextUpload.id && u.progress < 90
              ? { ...u, progress: u.progress + Math.random() * 15 }
              : u,
          ),
        );
      }, 500);

      try {
        // Execute the actual network request
        await crmAgentsService.uploadKnowledgeDocument(
          nextUpload.agentId,
          nextUpload.file,
        );

        clearInterval(progressInterval);

        // Success
        setUploads((prev) =>
          prev.map((u) =>
            u.id === nextUpload.id
              ? { ...u, status: "success", progress: 100 }
              : u,
          ),
        );
        toast.success(`Berhasil mengupload ${nextUpload.file.name}`);

        // Fire the refresh callback if it exists
        if (nextUpload.onSuccess) nextUpload.onSuccess();

        // 3. AUTO CLEANUP: Remove from the UI list after 3 seconds
        setTimeout(() => {
          setUploads((prev) => prev.filter((u) => u.id !== nextUpload.id));
        }, 3000);
      } catch (error: any) {
        clearInterval(progressInterval);
        console.error("Global upload failed:", error);

        // Error
        setUploads((prev) =>
          prev.map((u) =>
            u.id === nextUpload.id
              ? { ...u, status: "error", error: error.message || "Failed" }
              : u,
          ),
        );
        toast.error(`Gagal mengupload ${nextUpload.file.name}`);

        // Remove failed uploads from UI after 5 seconds
        setTimeout(() => {
          setUploads((prev) => prev.filter((u) => u.id !== nextUpload.id));
        }, 5000);
      }
    };

    processQueue();
  }, [uploads]); // Re-run this effect whenever the `uploads` array changes

  const clearCompleted = () => {
    setUploads((prev) =>
      prev.filter((u) => u.status === "uploading" || u.status === "pending"),
    );
  };

  const isUploading = uploads.some((u) => u.status === "uploading");

  return (
    <UploadContext.Provider
      value={{ uploads, startUpload, clearCompleted, isUploading }}
    >
      {children}
    </UploadContext.Provider>
  );
};

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (!context) throw new Error("useUpload must be used within UploadProvider");
  return context;
};
