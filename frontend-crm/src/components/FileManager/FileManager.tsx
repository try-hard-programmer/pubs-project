import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  Grid3X3,
  List,
  Upload,
  Plus,
  ArrowLeft,
  Home,
  ChevronRight,
  Trash,
  Trash2,
  FolderOpen,
  Star,
} from "lucide-react";
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
import { FileFilterDropdown } from "../FileFilterControl";

export const FileManager = () => {
  const { folderId } = useParams<{ folderId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("all");
  const [previousSection, setPreviousSection] = useState("all");
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [deleteTrigger, setDeleteTrigger] = useState<number>(0);
  const [folderPath, setFolderPath] = useState<
    Array<{ id: string | null; name: string }>
  >([{ id: null, name: "My Drive" }]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  console.log("FileManager state:", {
    currentFolderId,
    activeSection,
    urlFolderId: folderId,
  });

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
      case "shared":
        return "Shared Files";
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

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Backspace to go back (only if not in input field)
      if (
        e.key === "Backspace" &&
        folderPath.length > 1 &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        )
      ) {
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

  const handleCreateFolder = async (name: string) => {
    try {
      console.log("Creating folder in current location:", {
        name,
        currentFolderId,
      });
      const isValid = /^[a-zA-Z0-9\s._-\u00C0-\u024F\u1E00-\u1EFF]+$/.test(
        name
      );
      if (!isValid) {
        toast.error(
          "Error: Failed Create Folder Allowed characters: letters, numbers, spaces, . _ -"
        );
      } else {
        try {
          // 2. Call backend
          await createFolder({
            name,
            parentFolderId: currentFolderId,
          });

          toast.success("Folder created successfully");
        } catch (error: any) {
          let msg = "";
          try {
            msg =
              JSON.parse(error.message.replace("Error: ", "")).detail || msg;
          } catch {
            msg = error.message || msg;
          }

          toast.error(msg);
        }
      }
    } catch (error: any) {
      console.error("Error creating folder:", error);
      toast.error(
        "Error: Failed to create folder: The parent folder contains invalid characters. Please rename the parent folder to use only letters, numbers, spaces, dot (.), underscore (_), and dash (-)."
      );
    }
  };

  const handleFolderNavigate = (folder: { id: string; name: string }) => {
    console.log("Navigating to folder:", folder);
    setSearchQuery("");
    setCurrentFolderId(folder.id);
    // Simpan section saat membuka folder
    setPreviousSection(activeSection);

    // Sesuaikan folderPath berdasarkan section yang aktif
    setFolderPath((prev) => [...prev, folder]);

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
      // setActiveSection(previousSection);

      // Restore previousSection HANYA ketika kembali ke root
      if (newFolderId === null) {
        setActiveSection(previousSection);
      }

      // Update URL - navigate to parent folder or root
      if (newFolderId) {
        navigate(`/folder/${newFolderId}`);
      } else {
        navigate("/");
      }
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    const newPath = folderPath.slice(0, index + 1);
    setFolderPath(newPath);

    const targetFolderId = newPath[newPath.length - 1]?.id;
    setCurrentFolderId(targetFolderId);
    setSearchQuery("");

    // Restore section if going back to root
    if (targetFolderId === null) {
      setActiveSection(previousSection);
    }

    // Navigate to URL
    if (targetFolderId) {
      navigate(`/folder/${targetFolderId}`);
    } else {
      navigate("/");
    }
  };

  const handleNavigateToRoot = () => {
    console.log("Navigating to root");
    setSearchQuery("");
    setCurrentFolderId(null);
    setFolderPath([{ id: null, name: "My Drive" }]);

    // Navigate to root URL
    navigate("/");
  };

  const handleSectionChange = (section: string) => {
    // PENTING: Reset search query SEBELUM mengubah section
    setSearchQuery("");
    setActiveSection(section);
    setPreviousSection(section);

    // Reset folder navigation when changing sections
    setCurrentFolderId(null);

    // Reset path ke section yang dipilih
    if (section === "trashed") {
      setFolderPath([{ id: null, name: "Trash" }]);
    } else if (section === "starred") {
      setFolderPath([{ id: null, name: "Starred" }]);
    } else if (section === "shared") {
      setFolderPath([{ id: null, name: "Shared with me" }]);
    } else {
      setFolderPath([{ id: null, name: "My Drive" }]);
    }

    // Navigate to root URL
    navigate("/");
  };

  return (
    <>
      <Sidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        onCollapseChange={setIsSidebarCollapsed}
      />

      {/* Main Content */}
      <div
        className="min-h-screen bg-background transition-all duration-300"
        style={{ marginLeft: isSidebarCollapsed ? 80 : 256 }}
      >
        {/* Header */}
        <header className="bg-card border-b px-3 py-4 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {folderPath.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNavigateBack}
                  className="h-9 px-3 hover:bg-muted flex-shrink-0"
                  title="Go back (Backspace)"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-foreground mb-1 truncate">
                  {getSectionTitle()}
                </h1>
                <Breadcrumb>
                  <BreadcrumbList>
                    {folderPath.map((pathItem, index) => (
                      <div
                        key={pathItem.id || "root"}
                        className="flex items-center"
                      >
                        {index > 0 && (
                          <BreadcrumbSeparator>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </BreadcrumbSeparator>
                        )}
                        <BreadcrumbItem>
                          {index === folderPath.length - 1 ? (
                            <BreadcrumbPage className="font-medium text-foreground truncate">
                              {pathItem.name}
                            </BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink
                              onClick={() => handleBreadcrumbClick(index)}
                              className="cursor-pointer hover:text-primary transition-colors font-medium truncate"
                            >
                              <span className="flex items-center">
                                {index === 0 && (
                                  <>
                                    {activeSection === "all" && (
                                      <Home className="w-3.5 h-3.5 mr-1 inline-block" />
                                    )}
                                    {activeSection === "shared" && (
                                      <FolderOpen className="w-3.5 h-3.5 mr-1 inline-block" />
                                    )}
                                    {activeSection === "starred" && (
                                      <Star className="w-3.5 h-3.5 mr-1 inline-block" />
                                    )}
                                    {activeSection === "trashed" && (
                                      <Trash2 className="w-3.5 h-3.5 mr-1 inline-block" />
                                    )}
                                  </>
                                )}
                                {pathItem.name}
                              </span>
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </div>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0 mt-3 sm:mt-0">
                {activeSection !== "shared" &&
                  activeSection !== "starred" &&
                  activeSection !== "trashed" && (
                    <>
                      <Button
                        variant="default"
                        size="default"
                        onClick={() => setShowUpload(true)}
                        className="bg-primary hover:bg-primary/90 flex items-center justify-center sm:justify-start"
                      >
                        <Upload className="w-4 h-4" />
                        <span className="hidden sm:inline ml-2">Upload</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="default"
                        onClick={() => setShowCreateFolder(true)}
                        className="flex items-center justify-center sm:justify-start"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline ml-2">
                          New Folder
                        </span>
                      </Button>
                    </>
                  )}
                {activeSection === "trashed" && (
                  <Button
                    variant="destructive"
                    size="default"
                    onClick={() => setDeleteTrigger((prev) => prev + 1)}
                    className="hover:bg-destructive/90 hover:text-white"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Empty Trash
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="relative flex-1 max-w-md min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search files and folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 w-full"
              />
            </div>
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1 flex-shrink-0">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={
                  viewMode === "grid"
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "hover:bg-background"
                }
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "hover:bg-background"
                }
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* File Grid */}
        <main className="flex-1 p-2 sm:p-4 lg:p-6">
          {/* Show folder info only when in root and no search */}
          {!currentFolderId && !searchQuery && activeSection === "all" && (
            <FolderInfoAlert />
          )}

          <FileGrid
            viewMode={viewMode}
            searchQuery={searchQuery}
            section={currentFolderId ? null : activeSection}
            previousSection={currentFolderId ? activeSection : null}
            currentFolderId={currentFolderId}
            onFolderNavigate={handleFolderNavigate}
            deleteTrigger={deleteTrigger}
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
