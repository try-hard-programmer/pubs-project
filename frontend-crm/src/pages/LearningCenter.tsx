import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayCircle, BookOpen, Lightbulb, Clock, Search, Star } from "lucide-react";
import { Sidebar } from "@/components/FileManager/Sidebar";
import { FloatingAIButton } from "@/components/FloatingAIButton";

export const LearningCenter = () => {
  const [activeSection, setActiveSection] = useState("learning-center");
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
  };

  // Tutorial videos data - placeholder YouTube links
  const tutorials = [
    {
      id: 1,
      title: "Getting Started with File Manager",
      description: "Learn the basics of uploading, organizing, and managing your files",
      thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
      videoId: "dQw4w9WgXcQ",
      duration: "5:30",
      category: "Getting Started",
      isNew: true,
      isFeatured: true,
    },
    {
      id: 2,
      title: "Advanced File Sharing & Permissions",
      description: "Master file sharing, group permissions, and collaboration features",
      thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
      videoId: "dQw4w9WgXcQ",
      duration: "8:45",
      category: "Advanced",
      isNew: true,
      isFeatured: false,
    },
    {
      id: 3,
      title: "Using AI Agent for File Search",
      description: "Discover how to use AI to find and analyze your documents",
      thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
      videoId: "dQw4w9WgXcQ",
      duration: "6:20",
      category: "AI Features",
      isNew: false,
      isFeatured: true,
    },
    {
      id: 4,
      title: "Storage Management Best Practices",
      description: "Tips and tricks to optimize your storage and organize files efficiently",
      thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
      videoId: "dQw4w9WgXcQ",
      duration: "7:15",
      category: "Tips & Tricks",
      isNew: false,
      isFeatured: false,
    },
    {
      id: 5,
      title: "Creating and Managing Folders",
      description: "Organize your files with folders and subfolders",
      thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
      videoId: "dQw4w9WgXcQ",
      duration: "4:50",
      category: "Getting Started",
      isNew: false,
      isFeatured: false,
    },
    {
      id: 6,
      title: "Collaborating with Team Members",
      description: "Learn how to share files and collaborate effectively with your team",
      thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
      videoId: "dQw4w9WgXcQ",
      duration: "9:30",
      category: "Advanced",
      isNew: false,
      isFeatured: false,
    },
  ];

  // Filter tutorials based on search query
  const filteredTutorials = tutorials.filter(tutorial =>
    tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tutorial.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tutorial.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter by category
  const getStartedTutorials = filteredTutorials.filter(t => t.category === "Getting Started");
  const advancedTutorials = filteredTutorials.filter(t => t.category === "Advanced");
  const aiFeaturesTutorials = filteredTutorials.filter(t => t.category === "AI Features");
  const tipsTutorials = filteredTutorials.filter(t => t.category === "Tips & Tricks");
  const featuredTutorials = filteredTutorials.filter(t => t.isFeatured);

  const renderTutorialCard = (tutorial: typeof tutorials[0]) => (
    <Card
      key={tutorial.id}
      className="border-border hover:shadow-lg transition-all cursor-pointer overflow-hidden group"
      onClick={() => setSelectedVideo(tutorial.videoId)}
    >
      <div className="relative aspect-video bg-muted overflow-hidden">
        <img
          src={tutorial.thumbnail}
          alt={tutorial.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <PlayCircle className="w-16 h-16 text-white" />
        </div>
        <div className="absolute top-2 left-2 flex gap-2">
          {tutorial.isNew && (
            <Badge className="bg-red-500 hover:bg-red-600">
              New
            </Badge>
          )}
          {tutorial.isFeatured && (
            <Badge className="bg-yellow-500 hover:bg-yellow-600 flex items-center gap-1">
              <Star className="w-3 h-3" />
              Featured
            </Badge>
          )}
        </div>
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {tutorial.duration}
        </div>
      </div>
      <CardContent className="p-4">
        <Badge variant="outline" className="mb-2 text-xs">
          {tutorial.category}
        </Badge>
        <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
          {tutorial.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {tutorial.description}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Sidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        onCollapseChange={setIsSidebarCollapsed}
      />

      <div className={`min-h-screen bg-background ${isSidebarCollapsed ? 'ml-20' : 'ml-64'} transition-all duration-300`}>
        <div className="overflow-auto bg-background">
          <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary/10">
                  <BookOpen className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Learning Center</h1>
                  <p className="text-muted-foreground mt-1">
                    Master the platform with our video tutorials and guides
                  </p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative max-w-xl">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder="Search tutorials..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-blue-500/10">
                      <PlayCircle className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{tutorials.length}</p>
                      <p className="text-sm text-muted-foreground">Video Tutorials</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-yellow-500/10">
                      <Star className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{featuredTutorials.length}</p>
                      <p className="text-sm text-muted-foreground">Featured Content</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-green-500/10">
                      <Lightbulb className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{tutorials.filter(t => t.isNew).length}</p>
                      <p className="text-sm text-muted-foreground">New This Week</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tutorials Tabs */}
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
                <TabsTrigger value="all">All Videos</TabsTrigger>
                <TabsTrigger value="featured">Featured</TabsTrigger>
                <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
                <TabsTrigger value="tips">Tips & Tricks</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTutorials.map(renderTutorialCard)}
                </div>
                {filteredTutorials.length === 0 && (
                  <Card className="border-border">
                    <CardContent className="p-12 text-center">
                      <p className="text-muted-foreground">No tutorials found matching your search.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="featured" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredTutorials.map(renderTutorialCard)}
                </div>
              </TabsContent>

              <TabsContent value="getting-started" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getStartedTutorials.map(renderTutorialCard)}
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {advancedTutorials.map(renderTutorialCard)}
                </div>
              </TabsContent>

              <TabsContent value="tips" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tipsTutorials.map(renderTutorialCard)}
                </div>
              </TabsContent>
            </Tabs>

            {/* Video Player Modal */}
            {selectedVideo && (
              <div
                className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                onClick={() => setSelectedVideo(null)}
              >
                <div
                  className="w-full max-w-5xl bg-background rounded-lg overflow-hidden shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="aspect-video">
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${selectedVideo}?autoplay=1`}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    ></iframe>
                  </div>
                  <div className="p-4 bg-card border-t border-border">
                    <button
                      onClick={() => setSelectedVideo(null)}
                      className="w-full py-2 px-4 bg-primary hover:bg-primary/90 rounded-lg text-primary-foreground font-medium transition-colors"
                    >
                      Close Video
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <FloatingAIButton />
    </>
  );
};
