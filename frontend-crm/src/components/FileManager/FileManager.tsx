import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Search, Grid3X3, List, Upload, Plus, ArrowLeft, Home, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Sidebar } from "./Sidebar";
import { FileGrid } from "./FileGrid";
import { UploadArea } from "./UploadArea";
import { CreateFolderDialog } from "./CreateFolderDialog";
import { FolderInfoAlert } from "./FolderInfoAlert";
import { useFiles } from "@/hooks/useFiles";
import { toast } from "sonner";

export const FileManager = () => {
  const { folderId } = useParams<{ folderId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("all");
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<
    Array<{ id: string | null; name: string }>
  >([{ id: null, name: "My Drive" }]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // NEW: Track sidebar state

  console.log("FileManager state:", { currentFolderId, activeSection, urlFolderId: folderId });

  const { createFolder, creatingFolder } = useFiles();

  // Sync URL params with state
  useEffect(() => {
    if (folderId && folderId !== currentFolderId) {
      // URL changed, update state
      setCurrentFolderId(folderId);
      // Note: We'll need to fetch folder details to build full path
      // For now, we'll just update the current folder
      console.log("URL changed to folder:", folderId);
    } else if (!folderId && currentFolderId !== null) {
      // URL is root, but state is not
      setCurrentFolderId(null);
      setFolderPath([{ id: null, name: "My Drive" }]);
    }
  }, [folderId]);

  const getSectionTitle = () => {
    if (currentFolderId) {
      return folderPath[folderPath.length - 1]?.name || "Folder";
    }

    switch (activeSection) {
      case "all":
        return "My Drive";
      case "starred":
        return "Starred Files";
      case "trashed":
        return "Trash";
      case "images":
        return "Images";
      case "documents":
        return "Documents";
      case "videos":
        return "Videos";
      default:
        return "My Drive";
    }
  };

  const handleCreateFolder = async (name: string) => {
    try {
      console.log("Creating folder in current location:", {
        name,
        currentFolderId,
      });
      await createFolder({ name, parentFolderId: currentFolderId });
      toast.success("Folder created successfully");
    } catch (error: any) {
      console.error("Error creating folder:", error);
      toast.error(error.message);
    }
  };

  const handleFolderNavigate = (folder: { id: string; name: string }) => {
    console.log("Navigating to folder:", folder);
    setSearchQuery("");
    setCurrentFolderId(folder.id);
    setFolderPath((prev) => [...prev, folder]);
    setActiveSection("all"); // Reset to show all files in folder

    // Update URL to reflect folder navigation
    navigate(`/folder/${folder.id}`);
  };

  const handleNavigateBack = () => {
    console.log("Navigating back from:", folderPath);
    if (folderPath.length > 1) {
      setSearchQuery("");
      const newPath = folderPath.slice(0, -1);
      setFolderPath(newPath);
      const newFolderId = newPath[newPath.length - 1]?.id || null;
      console.log("Setting new folder ID:", newFolderId);
      setCurrentFolderId(newFolderId);

      // Update URL - navigate to parent folder or root
      if (newFolderId) {
        navigate(`/folder/${newFolderId}`);
      } else {
        navigate('/');
      }
    }
  };

  const handleNavigateToRoot = () => {
    console.log("Navigating to root");
    setSearchQuery("");
    setCurrentFolderId(null);
    setFolderPath([{ id: null, name: "My Drive" }]);

    // Navigate to root URL
    navigate('/');
  };

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Backspace to go back (only if not in input field)
      if (e.key === "Backspace" &&
          folderPath.length > 1 &&
          !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        handleNavigateBack();
      }
      // Alt+Home to go to root
      if (e.altKey && e.key === "Home") {
        e.preventDefault();
        handleNavigateToRoot();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [folderPath]);

  const handleSectionChange = (section: string) => {
    // PENTING: Reset search query SEBELUM mengubah section
    setSearchQuery("");
    setActiveSection(section);

    // Reset folder navigation when changing sections
    setCurrentFolderId(null);
    setFolderPath([{ id: null, name: "My Drive" }]);

    // Navigate to root URL
    navigate('/');
  };

  return (
    <>
      <Sidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        onCollapseChange={setIsSidebarCollapsed}
      />

      {/* Main Content - Responsive margin based on sidebar state */}
      <div className={`min-h-screen bg-background ${isSidebarCollapsed ? 'ml-20' : 'ml-64'} transition-all duration-300 flex flex-col`}>
        {/* Header */}
        <header className="bg-card border-b px-6 py-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 flex-1">
              {/* Navigation Buttons */}
              <div className="flex items-center gap-2">
                {/* Back Button - visible when in a folder */}
                {folderPath.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNavigateBack}
                    className="h-9 px-3 hover:bg-muted"
                    title="Go back (Backspace)"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                )}

                {/* Home Button - visible when not at root */}
                {currentFolderId !== null && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNavigateToRoot}
                    className="h-9 px-3 hover:bg-muted"
                    title="Go to root (Alt+Home)"
                  >
                    <Home className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Title and Breadcrumb */}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground mb-1">
                  {getSectionTitle()}
                </h1>
                {/* Enhanced Breadcrumb Navigation */}
                <Breadcrumb>
                  <BreadcrumbList>
                    {folderPath.map((pathItem, index) => (
                      <div key={pathItem.id || 'root'} className="flex items-center">
                        {index > 0 && (
                          <BreadcrumbSeparator>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </BreadcrumbSeparator>
                        )}
                        <BreadcrumbItem>
                          {index === folderPath.length - 1 ? (
                            <BreadcrumbPage className="font-medium text-foreground">
                              {pathItem.name}
                            </BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink
                              onClick={() => {
                                const newPath = folderPath.slice(0, index + 1);
                                setFolderPath(newPath);
                                setCurrentFolderId(pathItem.id);
                                setSearchQuery("");

                                // Navigate to URL
                                if (pathItem.id) {
                                  navigate(`/folder/${pathItem.id}`);
                                } else {
                                  navigate('/');
                                }
                              }}
                              className="cursor-pointer hover:text-primary transition-colors font-medium"
                            >
                              {index === 0 && <Home className="w-3.5 h-3.5 mr-1 inline-block" />}
                              {pathItem.name}
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </div>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="default"
                size="default"
                onClick={() => {
                  console.log("Opening upload modal with currentFolderId:", currentFolderId);
                  setShowUpload(true);
                }}
                className="bg-primary hover:bg-primary/90"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
              <Button
                variant="outline"
                size="default"
                onClick={() => setShowCreateFolder(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Folder
              </Button>
            </div>
          </div>

          {/* Search and View Controls */}
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search files and folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            <div className="flex items-center gap-2 ml-4 bg-muted/50 rounded-lg p-1">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={viewMode === "grid" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-background"}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={viewMode === "list" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-background"}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* File Grid */}
        <main className="flex-1 p-6">
          {/* Show folder info only when in root and no search */}
          {!currentFolderId && !searchQuery && activeSection === "all" && (
            <FolderInfoAlert />
          )}

          <FileGrid
            viewMode={viewMode}
            searchQuery={searchQuery}
            section={activeSection}
            currentFolderId={currentFolderId}
            onFolderNavigate={handleFolderNavigate}
          />
        </main>

        {/* Upload Modal */}
        {showUpload && (
          <UploadArea
            onClose={() => {
              console.log("Closing upload modal");
              setShowUpload(false);
            }}
            currentFolderId={currentFolderId}
          />
        )}

        {/* Create Folder Dialog */}
        <CreateFolderDialog
          open={showCreateFolder}
          onOpenChange={setShowCreateFolder}
          onCreateFolder={handleCreateFolder}
          isCreating={creatingFolder}
        />
      </div>
    </>
  );
};
