import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileText, Image, Music, Video, HardDrive } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/FileManager/Sidebar";
import { FloatingAIButton } from "@/components/FloatingAIButton";

import { useStorageUse } from "@/hooks/useStorageUse";
import { useRole } from "@/contexts/RoleContext";

export const Dashboard = () => {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const { userRoles } = useRole();
  const organizationId = userRoles?.[0]?.organization_id;

  const {
    storage,
    isLoading: storageLoading,
    error: storageError,
  } = useStorageUse(organizationId);

  const formatKB = (kb: number) => {
    if (!kb || kb === 0) return "0 KB";
    const k = 1000;
    const sizes = ["KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(kb) / Math.log(k));
    return parseFloat((kb / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Kuota default 10 GB dalam KB (decimal): 10 GB = 10.000.000 KB
  const DEFAULT_QUOTA_KB = 10_000_000;

  // Asumsi: storage.quota_size & storage.total_use & bucket.size dikirim dalam KB
  const maxSizeKb = storage?.quota_size ?? DEFAULT_QUOTA_KB;
  const usedKb = storage?.total_use ?? 0;

  const usagePercentage =
    storage?.volume_percentage ??
    (maxSizeKb > 0 ? (usedKb / maxSizeKb) * 100 : 0);

  const fileTypeCards = [
    {
      title: "Documents",
      count: storage?.document?.total ?? 0,
      size: formatKB(storage?.document?.size ?? 0),
      icon: FileText,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      kb: storage?.document?.size ?? 0,
    },
    {
      title: "Images",
      count: storage?.image?.total ?? 0,
      size: formatKB(storage?.image?.size ?? 0),
      icon: Image,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      kb: storage?.image?.size ?? 0,
    },
    {
      title: "Audio",
      count: storage?.audio?.total ?? 0,
      size: formatKB(storage?.audio?.size ?? 0),
      icon: Music,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      kb: storage?.audio?.size ?? 0,
    },
    {
      title: "Videos",
      count: storage?.video?.total ?? 0,
      size: formatKB(storage?.video?.size ?? 0),
      icon: Video,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      kb: storage?.video?.size ?? 0,
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

      <div
        className={`min-h-screen bg-background ${
          isSidebarCollapsed ? "ml-20" : "ml-64"
        } transition-all duration-300`}
      >
        <div className="overflow-auto bg-background">
          <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Selamat datang kembali, {user?.email?.split("@")[0] || "User"}
              </p>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {fileTypeCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Card
                    key={card.title}
                    className="border-border hover:shadow-lg transition-shadow"
                  >
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
                        {storageLoading ? "-" : card.count}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {storageLoading ? "Loading..." : card.size}
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
                {storageError ? (
                  <div className="text-sm text-destructive">
                    Gagal mengambil storage usage
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Storage Overview */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Used</span>
                          <span className="font-semibold text-foreground">
                            {formatKB(usedKb)} / {formatKB(maxSizeKb)}
                          </span>
                        </div>
                        <Progress value={usagePercentage} className="h-3" />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{Math.round(usagePercentage)}% used</span>
                          <span>
                            {formatKB(Math.max(0, maxSizeKb - usedKb))} free
                          </span>
                        </div>
                      </div>

                      {/* Quick Stats */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="text-center p-3 rounded-lg bg-muted/30">
                          <p className="text-2xl font-bold text-foreground">
                            {storage?.total_file ?? 0}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Total Files
                          </p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-muted/30">
                          <p className="text-2xl font-bold text-foreground">
                            {formatKB(usedKb)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Storage Used
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Storage Breakdown */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-foreground">
                        Storage Breakdown by Type
                      </h4>

                      {fileTypeCards.map((card) => {
                        const percentage =
                          usedKb > 0 ? (card.kb / usedKb) * 100 : 0;

                        return (
                          <div key={card.title} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                {card.title}
                              </span>
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
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <FloatingAIButton />
    </>
  );
};
