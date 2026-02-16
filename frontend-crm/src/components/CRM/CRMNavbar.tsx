import { Button } from "@/components/ui/button";
import { Headphones, Users, TrendingUp } from "lucide-react";

interface CRMNavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isSidebarCollapsed?: boolean;
}

export const CRMNavbar = ({
  activeTab,
  onTabChange,
  isSidebarCollapsed = false,
}: CRMNavbarProps) => {
  const navItems = [
    {
      key: "customer-service",
      label: "Customer Service",
      icon: Headphones,
    },
    {
      key: "kontak-pelanggan",
      label: "Kontak Pelanggan",
      icon: Users,
    },
    {
      key: "sales-management",
      label: "Sales Management",
      icon: TrendingUp,
    },
  ];

  return (
    <div
      className={`fixed top-0 ${isSidebarCollapsed ? "left-20" : "left-64"} right-0 z-30 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-sm transition-all duration-300`}
    >
      <div className="flex items-center justify-between h-16 px-6">
        {/* Navigation Items */}
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;

            return (
              <Button
                key={item.key}
                variant="ghost"
                size="default"
                onClick={() => onTabChange(item.key)}
                className={`gap-2 transition-all ${
                  isActive
                    ? "bg-[#906BFF] text-white shadow-sm"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium hidden sm:inline">
                  {item.label}
                </span>
              </Button>
            );
          })}
        </div>

        {/* Page Title */}
        <div className="hidden md:block">
          <h2 className="text-lg font-semibold text-foreground">
            {navItems.find((item) => item.key === activeTab)?.label || "CRM"}
          </h2>
        </div>
      </div>
    </div>
  );
};
