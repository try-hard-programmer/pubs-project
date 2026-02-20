import { useState } from "react";
import {
  Home,
  FolderOpen,
  Star,
  Trash2,
  LogOut,
  LayoutDashboard,
  Bot,
  BookOpen,
  CreditCard,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Coins,
  ChevronDown,
  ChevronUp,
  Users,
  BarChart3,
  Calculator,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onCollapseChange?: (collapsed: boolean) => void;
}

const mainItems = [
  { icon: LayoutDashboard, label: "Dashboard", key: "dashboard" },
  { icon: Bot, label: "AI Workers", key: "ai-workers" },
];

const applicationItems = [
  { icon: Users, label: "CRM", key: "crm" },
  { icon: BarChart3, label: "Data Analytics", key: "data-analytics" },
  { icon: Calculator, label: "Accounting", key: "accounting" },
];

const fileManagerItems = [
  { icon: Home, label: "My Drive", key: "all" },
  { icon: FolderOpen, label: "Shared with me", key: "shared" },
  { icon: Star, label: "Starred", key: "starred" },
  { icon: Trash2, label: "Trash", key: "trashed" },
];

const settingsItems = [
  { icon: CreditCard, label: "Usage & Billing", key: "usage-billing" },
  { icon: SettingsIcon, label: "Organization", key: "organization" },
  { icon: BookOpen, label: "Learning Center", key: "learning-center" },
];

export const Sidebar = ({
  activeSection,
  onSectionChange,
  onCollapseChange,
}: SidebarProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();

  // web socket CRM notification support
  const { unreadChatsCount, wsStatus, reconnectAttempts } = useWebSocket();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isFooterExpanded, setIsFooterExpanded] = useState(false);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onCollapseChange?.(newState);
  };

  const userCredits = { remaining: 653, total: 1000 };

  return (
    <aside
      className={`${
        isCollapsed ? "w-20" : "w-64"
      } h-screen bg-card border-r flex flex-col transition-all duration-300 fixed left-0 top-0 z-40`}
    >
      {/* Collapse Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleCollapse}
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-card"
      >
        {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
      </Button>

      {/* Logo */}
      <div className={`${isCollapsed ? "p-4" : "p-6"} border-b`}>
        <div className={`${isCollapsed ? "h-8" : "h-12"} flex justify-center`}>
          {isCollapsed ? (
            <div className="w-8 h-8 flex items-center justify-center">
              <img
                src={
                  resolvedTheme === "dark"
                    ? "https://vkaixrdqtrzybovvquzv.supabase.co/storage/v1/object/public/assests/favicon.webp"
                    : "https://vkaixrdqtrzybovvquzv.supabase.co/storage/v1/object/public/assests/favicon.webp"
                }
                className="w-full object-fill-"
                alt="Icon Palapa"
              />
            </div>
          ) : (
            <img
              src={
                resolvedTheme === "dark"
                  ? "https://vkaixrdqtrzybovvquzv.supabase.co/storage/v1/object/public/assests/palapa-ai-dark.svg"
                  : "https://vkaixrdqtrzybovvquzv.supabase.co/storage/v1/object/public/assests/palapa-ai-light.svg"
              }
              className="h-full object-contain"
              alt="Palapa AI"
            />
          )}
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className={`${isCollapsed ? "p-2" : "p-4"} flex-1 overflow-y-auto`}>
        {/* Main */}
        <div className="space-y-1">
          {mainItems.map((item) => (
            <Button
              key={item.key}
              variant="ghost"
              className={`${isCollapsed ? "justify-center" : "justify-start"} ${
                activeSection === item.key
                  ? "bg-[#906BFF] text-white hover:bg-[#906BFF]/90"
                  : "hover:bg-muted/50"
              } w-full`}
              onClick={() => navigate(`/${item.key}`)}
            >
              <item.icon className={`${!isCollapsed && "mr-3"}`} />
              {!isCollapsed && item.label}
            </Button>
          ))}
        </div>

        <Separator className="my-6" />

        {/* Applications */}
        {!isCollapsed && (
          <h3 className="text-xs font-semibold text-muted-foreground px-3 mb-2">
            Application
          </h3>
        )}

        {applicationItems.map((item) => (
          <Button
            key={item.key}
            variant="ghost"
            className={`${
              isCollapsed ? "justify-center" : "justify-between"
            } w-full ${
              activeSection === item.key
                ? "bg-[#906BFF] text-white"
                : "hover:bg-muted/50"
            }`}
            onClick={() =>
              item.key === "crm" ? navigate("/crm") : navigate("/coming-soon")
            }
          >
            <div className="flex items-center">
              <item.icon className={`${!isCollapsed && "mr-3"}`} />
              {!isCollapsed && item.label}
            </div>

            {/* CRM Badge */}
            {item.key === "crm" &&
              (isCollapsed ? (
                unreadChatsCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )
              ) : (
                <div className="flex items-center gap-2">
                  {unreadChatsCount > 0 && (
                    <Badge variant="destructive">
                      {unreadChatsCount > 99 ? "99+" : unreadChatsCount}
                    </Badge>
                  )}

                  {wsStatus === "connected" && (
                    <Wifi
                      className={`h-3 w-3 ${activeSection === item.key ? "text-white" : "text-green-500"}`}
                    />
                  )}
                  {wsStatus === "disconnected" && (
                    <WifiOff
                      className={`h-3 w-3 ${activeSection === item.key ? "text-white" : "text-red-500"}`}
                    />
                  )}
                  {wsStatus === "reconnecting" && (
                    <RefreshCw
                      className={`h-3 w-3 animate-spin ${activeSection === item.key ? "text-white" : "text-orange-500"}`}
                    />
                  )}
                </div>
              ))}
          </Button>
        ))}

        <Separator className="my-6" />

        {/* File Manager */}
        {!isCollapsed && (
          <h3 className="text-xs font-semibold text-muted-foreground px-3 mb-3">
            File Manager
          </h3>
        )}

        {fileManagerItems.map((item) => (
          <Button
            key={item.key}
            variant="ghost"
            className={`w-full ${
              isCollapsed ? "justify-center" : "justify-start"
            } ${
              activeSection === item.key
                ? "bg-[#906BFF] text-white hover:bg-[#906BFF]/90"
                : ""
            }`}
            onClick={() => {
              navigate("/");
              onSectionChange(item.key);
            }}
          >
            <item.icon className={`${!isCollapsed && "mr-3"}`} />
            {!isCollapsed && item.label}
          </Button>
        ))}

        <Separator className="my-6" />

        {/* Settings */}
        {!isCollapsed && (
          <h3 className="text-xs font-semibold text-muted-foreground px-3 mb-3">
            Settings
          </h3>
        )}

        {settingsItems.map((item) => (
          <Button
            key={item.key}
            variant="ghost"
            className={`w-full ${
              isCollapsed ? "justify-center" : "justify-start"
            } ${
              activeSection === item.key
                ? "bg-[#906BFF] text-white"
                : "hover:bg-muted/50"
            }`}
            onClick={() => navigate(`/${item.key}`)}
          >
            <item.icon className={`${!isCollapsed && "mr-3"}`} />
            {!isCollapsed && item.label}
          </Button>
        ))}
      </nav>

      {/* FOOTER */}
      <div className={`${isCollapsed ? "p-3" : "p-4"} border-t`}>
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-3">
            <Avatar
              className="w-8 h-8 ring-2 ring-primary/20 cursor-pointer"
              onClick={() => setIsFooterExpanded(!isFooterExpanded)}
            >
              <AvatarFallback>
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>

            <div className="text-xs font-bold">{userCredits.remaining}</div>

            <ThemeToggle />

            <Button
              variant="ghost"
              size="sm"
              className="text-red-500"
              onClick={signOut}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <>
            {!isFooterExpanded ? (
              <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => setIsFooterExpanded(true)}
              >
                <Avatar className="w-8 h-8 ring-2 ring-primary/20">
                  <AvatarFallback>
                    {user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <p className="font-semibold">
                    {user?.email?.split("@")[0] || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Coins className="w-3 h-3 text-primary" />
                    {userCredits.remaining}
                  </p>
                </div>

                <ChevronDown className="w-4 h-4" />
              </div>
            ) : (
              <>
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setIsFooterExpanded(false)}
                >
                  <Avatar className="w-9 h-9 ring-2 ring-primary/20">
                    <AvatarFallback>
                      {user?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">
                      {user?.email?.split("@")[0] || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.email}
                    </p>
                  </div>

                  <ThemeToggle />
                  <ChevronUp className="w-4 h-4" />
                </div>

                <Button
                  variant="ghost"
                  className="w-full text-red-500 mt-4"
                  onClick={signOut}
                >
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </Button>
              </>
            )}
          </>
        )}
      </div>

      <div className="text-center text-xs text-muted-foreground border-t p-2">
        v1.1.1
      </div>
    </aside>
  );
};
