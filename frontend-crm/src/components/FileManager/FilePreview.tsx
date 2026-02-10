import { useState } from "react";
import { X, Download, ZoomIn, ZoomOut, RotateCw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileItem } from "@/hooks/useFiles";
import { toast } from "sonner";

interface FilePreviewProps {
  file: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const PDFViewer = ({ url }: { url: string }) => {
  return (
    <div className="w-full h-[600px]">
      <iframe
        src={`${url}#toolbar=1&navpanes=1&scrollbar=1`}
        className="w-full h-full border-0 rounded-lg"
        title="PDF Preview"
      />
    </div>
  );
};

const ImageViewer = ({ url, name }: { url: string; name: string }) => {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 300));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 25));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" onClick={handleZoomOut}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-sm min-w-[60px] text-center">{zoom}%</span>
        <Button variant="outline" size="sm" onClick={handleZoomIn}>
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleRotate}>
          <RotateCw className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex justify-center max-h-[600px] overflow-auto">
        <img
          src={url}
          alt={name}
          className="max-w-full h-auto transition-transform"
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
          }}
        />
      </div>
    </div>
  );
};

const VideoViewer = ({ url }: { url: string }) => {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <video
        controls
        className="w-full h-auto max-h-[600px] rounded-lg"
        preload="metadata"
      >
        <source src={url} />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

const AudioViewer = ({ url, name }: { url: string; name: string }) => {
  return (
    <div className="w-full max-w-2xl mx-auto p-8">
      <div className="bg-surface rounded-lg p-6 text-center space-y-4">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Eye className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-medium">{name}</h3>
        <audio controls className="w-full">
          <source src={url} />
          Your browser does not support the audio tag.
        </audio>
      </div>
    </div>
  );
};

const DocumentViewer = ({
  url,
  name,
  type,
}: {
  url: string;
  name: string;
  type: string;
}) => {
  const isOfficeDoc =
    type.includes("officedocument") ||
    type.includes("msword") ||
    type.includes("excel") ||
    type.includes("powerpoint");

  if (isOfficeDoc) {
    // Use Microsoft Office Online viewer for Office documents
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
      url,
    )}`;
    return (
      <div className="w-full h-[600px]">
        <iframe
          src={viewerUrl}
          className="w-full h-full border-0 rounded-lg"
          title="Document Preview"
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-8">
      <div className="bg-surface rounded-lg p-6 text-center space-y-4">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Eye className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-medium">{name}</h3>
        <p className="text-muted-foreground">
          Preview not available for this file type. Click download to view the
          file.
        </p>
      </div>
    </div>
  );
};

const getFileTypeCategory = (type: string) => {
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (type === "application/pdf") return "pdf";
  if (
    type.includes("text/") ||
    type.includes("document") ||
    type.includes("word") ||
    type.includes("excel") ||
    type.includes("powerpoint") ||
    type.includes("spreadsheet")
  ) {
    return "document";
  }
  return "other";
};

export const FilePreview = ({ file, isOpen, onClose }: FilePreviewProps) => {
  if (!file || file.is_folder) return null;

  const handleDownload = async () => {
    if (file.url) {
      // const link = document.createElement('a');
      // link.href = file.url;
      // link.download = file.name;
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

  const fileCategory = getFileTypeCategory(file.type);

  const renderPreview = () => {
    if (!file.url) {
      return (
        <div className="w-full max-w-2xl mx-auto p-8">
          <div className="bg-surface rounded-lg p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <X className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-medium">Preview not available</h3>
            <p className="text-muted-foreground">File URL not found</p>
          </div>
        </div>
      );
    }

    switch (fileCategory) {
      case "image":
        return <ImageViewer url={file.url} name={file.name} />;
      case "video":
        return <VideoViewer url={file.url} />;
      case "audio":
        return <AudioViewer url={file.url} name={file.name} />;
      case "pdf":
        return <PDFViewer url={file.url} />;
      case "document":
        return (
          <DocumentViewer url={file.url} name={file.name} type={file.type} />
        );
      default:
        return (
          <DocumentViewer url={file.url} name={file.name} type={file.type} />
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-6xl w-full h-[80vh] flex flex-col"
        showCloseButton={true}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="truncate">{file.name}</DialogTitle>
              <Badge variant="secondary">{file.type}</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{formatFileSize(file.size)}</span>
            <span>•</span>
            <span>
              {new Date(file.created_at).toLocaleDateString("id-ID", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto">{renderPreview()}</div>
      </DialogContent>
    </Dialog>
  );
};
