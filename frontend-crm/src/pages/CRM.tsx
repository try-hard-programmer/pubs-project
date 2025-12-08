import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Sidebar } from "@/components/FileManager/Sidebar";
import { FloatingAIButton } from "@/components/FloatingAIButton";
import { CRMNavbar } from "@/components/CRM/CRMNavbar";
import { CustomerService } from "@/components/CRM/CustomerService";
import { KontakPelanggan } from "@/components/CRM/KontakPelanggan";
import { SalesManagement } from "@/components/CRM/SalesManagement";

export const CRM = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState("crm");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Get tab from URL or default to customer-service
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    tabFromUrl && ["customer-service", "kontak-pelanggan", "sales-management"].includes(tabFromUrl)
      ? tabFromUrl
      : "customer-service"
  );

  // Get filter from URL or default to unassigned
  const filterFromUrl = searchParams.get("filter");
  const [csFilterType, setCsFilterType] = useState<"assigned" | "unassigned">(
    filterFromUrl === "assigned" ? "assigned" : "unassigned"
  );

  // Update URL when tab changes
  useEffect(() => {
    const currentTab = searchParams.get("tab");
    if (currentTab !== activeTab) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set("tab", activeTab);
      setSearchParams(newParams, { replace: true });
    }
  }, [activeTab, searchParams, setSearchParams]);

  // Update URL when filter changes
  useEffect(() => {
    const currentFilter = searchParams.get("filter");
    if (currentFilter !== csFilterType) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set("filter", csFilterType);
      setSearchParams(newParams, { replace: true });
    }
  }, [csFilterType, searchParams, setSearchParams]);

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleCsFilterChange = (filter: "assigned" | "unassigned") => {
    setCsFilterType(filter);
  };

  return (
    <>
      <Sidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        onCollapseChange={setIsSidebarCollapsed}
      />

      <CRMNavbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      <div className={`min-h-screen bg-background ${isSidebarCollapsed ? 'ml-20' : 'ml-64'} transition-all duration-300 pt-16`}>
        <div className="overflow-auto bg-background">
          <div className="p-8 mx-auto">
            {/* Content based on active tab */}
            {activeTab === "customer-service" && (
              <CustomerService
                filterType={csFilterType}
                onFilterChange={handleCsFilterChange}
              />
            )}
            {activeTab === "kontak-pelanggan" && <KontakPelanggan />}
            {activeTab === "sales-management" && <SalesManagement />}
          </div>
        </div>
      </div>

      <FloatingAIButton />
    </>
  );
};
