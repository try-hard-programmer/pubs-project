import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useFiles } from "@/hooks/useFiles";
import { FileText, Image, Music, Video, HardDrive } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/FileManager/Sidebar";
import { FloatingAIButton } from "@/components/FloatingAIButton";

export const Dashboard = () => {
  const { user } = useAuth();
  const { files: allFiles } = useFiles('all' as any);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Helper function to format bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Calculate file statistics
  const getFileStats = () => {
    if (!allFiles) {
      return {
        documents: 0,
        images: 0,
        audio: 0,
        videos: 0,
        totalFiles: 0,
        totalSize: 0,
        documentSize: 0,
        imageSize: 0,
        audioSize: 0,
        videoSize: 0,
      };
    }

    // Filter out folders and trashed files
    const validFiles = allFiles.filter(f => !f.is_folder && !f.is_trashed);

    const stats = {
      documents: 0,
      images: 0,
      audio: 0,
      videos: 0,
      totalFiles: validFiles.length,
      totalSize: 0,
      documentSize: 0,
      imageSize: 0,
      audioSize: 0,
      videoSize: 0,
    };

    validFiles.forEach(file => {
      const size = file.size || 0;
      stats.totalSize += size;

      // Categorize by MIME type
      if (file.type) {
        if (file.type.startsWith('image/')) {
          stats.images++;
          stats.imageSize += size;
        } else if (file.type.startsWith('audio/')) {
          stats.audio++;
          stats.audioSize += size;
        } else if (file.type.startsWith('video/')) {
          stats.videos++;
          stats.videoSize += size;
        } else if (
          file.type.includes('pdf') ||
          file.type.includes('document') ||
          file.type.includes('text') ||
          file.type.includes('word') ||
          file.type.includes('excel') ||
          file.type.includes('powerpoint') ||
          file.type.includes('spreadsheet') ||
          file.type.includes('presentation')
        ) {
          stats.documents++;
          stats.documentSize += size;
        } else {
          // Default to document for unknown types
          stats.documents++;
          stats.documentSize += size;
        }
      } else {
        // If no type, default to document
        stats.documents++;
        stats.documentSize += size;
      }
    });

    return stats;
  };

  const stats = getFileStats();
  const maxSize = 10 * 1024 * 1024 * 1024; // 10GB
  const usagePercentage = (stats.totalSize / maxSize) * 100;

  // File type cards data
  const fileTypeCards = [
    {
      title: 'Documents',
      count: stats.documents,
      size: formatBytes(stats.documentSize),
      icon: FileText,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Images',
      count: stats.images,
      size: formatBytes(stats.imageSize),
      icon: Image,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Audio',
      count: stats.audio,
      size: formatBytes(stats.audioSize),
      icon: Music,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Videos',
      count: stats.videos,
      size: formatBytes(stats.videoSize),
      icon: Video,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
  ];

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
  };

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
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Selamat datang kembali, {user?.email?.split('@')[0] || 'User'}
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {fileTypeCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title} className="border-border hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <Icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {card.count}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {card.size}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Storage Usage - Full Width */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary" />
              Storage Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Storage Overview */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Used</span>
                    <span className="font-semibold text-foreground">
                      {formatBytes(stats.totalSize)} / {formatBytes(maxSize)}
                    </span>
                  </div>
                  <Progress value={usagePercentage} className="h-3" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{Math.round(usagePercentage)}% used</span>
                    <span>{formatBytes(maxSize - stats.totalSize)} free</span>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-2xl font-bold text-foreground">{stats.totalFiles}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total Files</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-2xl font-bold text-foreground">{formatBytes(stats.totalSize)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Storage Used</p>
                  </div>
                </div>
              </div>

              {/* Storage Breakdown */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Storage Breakdown by Type</h4>
                {fileTypeCards.map((card) => {
                  const percentage = stats.totalSize > 0
                    ? ((card.title === 'Documents' ? stats.documentSize :
                        card.title === 'Images' ? stats.imageSize :
                        card.title === 'Audio' ? stats.audioSize :
                        stats.videoSize) / stats.totalSize) * 100
                    : 0;

                  return (
                    <div key={card.title} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{card.title}</span>
                        <span className="font-medium text-foreground">
                          {card.size} ({Math.round(percentage)}%)
                        </span>
                      </div>
                      <Progress value={percentage} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

          </div>
        </div>
      </div>

      <FloatingAIButton />
    </>
  );
};
