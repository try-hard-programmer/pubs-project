import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Home, FolderOpen, Star, Trash2, LogOut, LayoutDashboard, Bot, BookOpen, CreditCard, Settings as SettingsIcon, ChevronLeft, ChevronRight, Coins, Users, BarChart3, Calculator, Wifi, WifiOff, RefreshCw } from "lucide-react";
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
  onCollapseChange?: (isCollapsed: boolean) => void; // NEW: Callback for collapse state
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
  { icon: Home, label: "My Drive", key: "all", active: true },
  { icon: FolderOpen, label: "Shared with me", key: "shared" },
  { icon: Star, label: "Starred", key: "starred" },
  { icon: Trash2, label: "Trash", key: "trashed" },
];

const settingsItems = [
  { icon: CreditCard, label: "Usage & Billing", key: "usage-billing" },
  { icon: SettingsIcon, label: "Organization", key: "organization" },
  { icon: BookOpen, label: "Learning Center", key: "learning-center" },
];

export const Sidebar = ({ activeSection, onSectionChange, onCollapseChange }: SidebarProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { unreadChatsCount, wsStatus, reconnectAttempts } = useWebSocket();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isFooterExpanded, setIsFooterExpanded] = useState(false);

  // Notify parent when collapse state changes
  const handleToggleCollapse = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    onCollapseChange?.(newCollapsedState);
  };

  // TODO: Replace with actual credit data from backend
  const userCredits = {
    remaining: 653,
    total: 1000,
  };

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} h-screen bg-card border-r flex flex-col transition-all duration-300 fixed left-0 top-0 z-40`}>
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggleCollapse}
        className="absolute -right-3 top-20 z-50 h-6 w-6 rounded-full border border-border bg-card p-0 shadow-md hover:bg-muted"
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      {/* Logo */}
      <div className={`${isCollapsed ? 'p-4' : 'p-6'} border-b bg-gradient-to-br from-card to-muted/20 transition-all duration-300 flex-shrink-0`}>
        <div className={`w-full ${isCollapsed ? 'h-8' : 'h-12'} flex items-center justify-center transition-all duration-300`}>
          {isCollapsed ? (
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-lg">S</span>
            </div>
          ) : (
            <img
              src={theme === 'dark'
                ? "https://vkaixrdqtrzybovvquzv.supabase.co/storage/v1/object/public/assests/syntra-dark-2.png"
                : "https://vkaixrdqtrzybovvquzv.supabase.co/storage/v1/object/public/assests/syntra-light.png"
              }
              alt="SINERGI Logo"
              className="h-full w-auto object-contain"
            />
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={`${isCollapsed ? 'p-2' : 'p-4'} flex-1 min-h-0 overflow-y-auto transition-all duration-300`}>
        {/* Main Section - Dashboard & AI Workers */}
        <div className="space-y-1">
          {mainItems.map((item) => (
            <Button
              key={item.key}
              variant="ghost"
              className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'} text-foreground transition-all ${
                activeSection === item.key ? 'bg-muted' : 'hover:bg-muted/50'
              }`}
              size="default"
              onClick={() => {
                if (item.key === 'dashboard') {
                  navigate('/dashboard');
                } else if (item.key === 'learning-center') {
                  navigate('/learning-center');
                } else {
                  navigate('/coming-soon');
                }
              }}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'} text-muted-foreground`} />
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
            </Button>
          ))}
        </div>

        <Separator className="my-6" />

        {/* Application Section */}
        <div className="space-y-1">
          {!isCollapsed && <h3 className="text-xs font-semibold text-muted-foreground px-3 mb-3 uppercase tracking-wider">Application</h3>}
          {applicationItems.map((item) => (
            <Button
              key={item.key}
              variant="ghost"
              className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-between'} text-foreground transition-all ${
                activeSection === item.key ? 'bg-muted' : 'hover:bg-muted/50'
              }`}
              size="default"
              onClick={() => {
                if (item.key === 'crm') {
                  navigate('/crm');
                } else {
                  navigate('/coming-soon');
                }
              }}
              title={isCollapsed ? item.label : undefined}
            >
              <div className="flex items-center">
                <item.icon className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'} text-muted-foreground`} />
                {!isCollapsed && <span className="font-medium">{item.label}</span>}
              </div>

              {/* CRM Badge & Status Indicator */}
              {item.key === 'crm' && !isCollapsed && (
                <div className="flex items-center gap-2">
                  {/* Unread badge */}
                  {unreadChatsCount > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-xs">
                      {unreadChatsCount > 99 ? '99+' : unreadChatsCount}
                    </Badge>
                  )}
                  {/* WebSocket status */}
                  {wsStatus === 'connected' && (
                    <Wifi className="h-3 w-3 text-green-500" title="Connected" />
                  )}
                  {wsStatus === 'disconnected' && (
                    <WifiOff className="h-3 w-3 text-red-500" title="Disconnected" />
                  )}
                  {wsStatus === 'reconnecting' && (
                    <RefreshCw className="h-3 w-3 text-orange-500 animate-spin" title={`Reconnecting (attempt ${reconnectAttempts + 1})`} />
                  )}
                </div>
              )}
              {/* Collapsed view - show badge on icon */}
              {item.key === 'crm' && isCollapsed && unreadChatsCount > 0 && (
                <div className="absolute top-1 right-1">
                  <div className="h-2 w-2 rounded-full bg-destructive"></div>
                </div>
              )}
            </Button>
          ))}
        </div>

        <Separator className="my-6" />

        {/* File Manager Section */}
        <div className="space-y-1">
          {!isCollapsed && <h3 className="text-xs font-semibold text-muted-foreground px-3 mb-3 uppercase tracking-wider">File Manager</h3>}
          {fileManagerItems.map((item) => (
            <Button
              key={item.key}
              variant={activeSection === item.key ? "default" : "ghost"}
              className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'} transition-all ${
                activeSection === item.key
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'hover:bg-muted text-foreground'
              }`}
              size="default"
              onClick={() => {
                // Navigate to home page (FileManager) first, then change section
                navigate('/');
                onSectionChange(item.key);
              }}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'}`} />
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
            </Button>
          ))}
        </div>

        <Separator className="my-6" />

        {/* Settings Section */}
        <div className="space-y-1">
          {!isCollapsed && <h3 className="text-xs font-semibold text-muted-foreground px-3 mb-3 uppercase tracking-wider">Settings</h3>}
          {settingsItems.map((item) => (
            <Button
              key={item.key}
              variant="ghost"
              className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'} text-foreground transition-all ${
                activeSection === item.key ? 'bg-muted' : 'hover:bg-muted/50'
              }`}
              size="default"
              onClick={() => {
                if (item.key === 'usage-billing') {
                  navigate('/usage-billing');
                } else if (item.key === 'organization') {
                  navigate('/organization');
                } else if (item.key === 'learning-center') {
                  navigate('/learning-center');
                }
              }}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'} text-muted-foreground`} />
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
            </Button>
          ))}
        </div>

      </nav>

      {/* Account Section - Fixed at Bottom with Collapse/Expand */}
      <div className={`${isCollapsed ? 'p-3' : 'p-4'} border-t bg-card transition-all duration-300 flex-shrink-0`}>
        {isCollapsed ? (
          /* Collapsed Sidebar - Show minimal info */
          <div className="flex flex-col items-center gap-3">
            <Avatar className="w-8 h-8 ring-2 ring-primary/20 cursor-pointer" onClick={() => setIsFooterExpanded(!isFooterExpanded)}>
              <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs font-semibold">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-center gap-1 py-2">
              <Coins className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-foreground">{userCredits.remaining}</span>
            </div>
            <ThemeToggle />
            <Separator />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center px-2 hover:bg-destructive/10 text-destructive hover:text-destructive"
              onClick={signOut}
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          /* Expanded Sidebar */
          <div className="space-y-3">
            {/* Collapsed State - Compact View (Default) */}
            {!isFooterExpanded ? (
              <>
                {/* Toggle Header - Click to Expand */}
                <div
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 hover:border-border transition-all cursor-pointer group"
                  onClick={() => setIsFooterExpanded(true)}
                >
                  <Avatar className="w-8 h-8 ring-2 ring-primary/20">
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs font-semibold">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {user?.email?.split('@')[0] || 'User'}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Coins className="w-3 h-3 text-primary" />
                      <span className="font-medium">{userCredits.remaining.toLocaleString()}</span>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </>
            ) : (
              /* Expanded State - Full Details */
              <>
                {/* Profile Section with Collapse Button */}
                <div className="space-y-3">
                  <div
                    className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 hover:border-border transition-all cursor-pointer group"
                    onClick={() => setIsFooterExpanded(false)}
                  >
                    <Avatar className="w-9 h-9 ring-2 ring-primary/20">
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground text-sm font-semibold">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {user?.email?.split('@')[0] || 'User'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.email}
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <ThemeToggle />
                      <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </div>

                  {/* Credit Balance */}
                  <div className="px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-primary" />
                        <span className="text-xs font-medium text-muted-foreground">Credits</span>
                      </div>
                      <span className="text-sm font-bold text-foreground">
                        {userCredits.remaining.toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${(userCredits.remaining / userCredits.total) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Logout Button */}
                  <Button
                    variant="ghost"
                    className="w-full justify-start hover:bg-destructive/10 text-destructive hover:text-destructive"
                    size="default"
                    onClick={signOut}
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    <span className="font-medium">Sign Out</span>
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Version Section - Fixed at Bottom */}
      <div className={`${isCollapsed ? 'px-2 py-2' : 'px-4 py-2'} border-t bg-muted/30 transition-all duration-300 flex-shrink-0`}>
        <p className={`text-xs text-muted-foreground text-center ${isCollapsed ? 'text-[10px]' : ''}`}>
          v1.1.0
        </p>
      </div>
    </aside>
  );
};
