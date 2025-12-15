import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Filter,
  Columns,
  Eye,
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  Loader2, // Added for loading state
} from "lucide-react";
import { CustomerDetailPanel } from "./CustomerDetailPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// API Import
import {
  getCustomers,
  type Customer as ApiCustomer,
} from "@/services/crmChatsService";

// Extended Interface to support UI fields that might not be in API yet
interface Customer extends ApiCustomer {
  // Fields from original interface
  // id: number; // OLD (Commented out)
  // id: string; // NEW (Inherited from ApiCustomer)
  // name: string;
  // email: string;
  // phone: string;
  company?: string;
  location?: string;
  status?: "active" | "inactive";
  lastContact?: string;
  tags?: string[];
  notes?: string;
  totalOrders?: number;
  totalSpent?: number;
  createdDate?: string;
  industry?: string;
  position?: string;
}

export const KontakPelanggan = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    email: true,
    phone: true,
    company: true,
    location: true,
    status: true,
    lastContact: true,
    tags: false,
    totalOrders: false,
    totalSpent: false,
  });

  // ==================================================================================
  // OLD MOCK DATA (COMMENTED FOR DEBUGGING)
  // ==================================================================================
  /*
  const [customers] = useState<Customer[]>([
    {
      id: 1,
      name: "John Doe",
      email: "john.doe@example.com",
      phone: "+62 812-3456-7890",
      company: "PT. Maju Jaya",
      location: "Jakarta",
      status: "active",
      lastContact: "2024-01-15",
      tags: ["VIP", "Enterprise"],
      totalOrders: 25,
      totalSpent: 150000000,
      createdDate: "2023-06-15",
      industry: "Technology",
      position: "CEO",
      notes: "Important client with high potential for growth.",
    },
    // ... (rest of mock data)
  ]);
  */

  // ==================================================================================
  // NEW API INTEGRATION
  // ==================================================================================
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCustomersCount, setTotalCustomersCount] = useState(0);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Call Backend API
      // Using search param if query exists
      const data = await getCustomers({
        search: searchQuery || undefined,
        limit: 50,
      });

      // Transform API data to match UI structure
      const mappedData: Customer[] = data.map((c) => ({
        ...c,
        // Provide defaults for fields not yet in API
        status: "active",
        company: c.metadata?.company || "-",
        location: c.metadata?.location || "-",
        totalOrders: c.metadata?.total_orders || 0,
        totalSpent: c.metadata?.total_spent || 0,
        lastContact: new Date(c.updated_at).toLocaleDateString(),
        tags: [],
      }));

      setCustomers(mappedData);
      setTotalCustomersCount(mappedData.length); // Ideally API returns total count separately
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Search Debounce Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ==================================================================================

  // Get unique locations for filter
  // Using 'set' on current customers list
  const locations = Array.from(
    new Set(customers.map((c) => c.location).filter(Boolean) as string[])
  );

  // Filter customers (Client-side filtering for Status/Location)
  // Search is now handled by API above
  const filteredCustomers = customers.filter((customer) => {
    // OLD Search Logic (Commented out since API does search)
    /*
    const matchesSearch =
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.company || "").toLowerCase().includes(searchQuery.toLowerCase());
    */

    const matchesStatus =
      statusFilter === "all" || customer.status === statusFilter;

    const matchesLocation =
      locationFilter === "all" || customer.location === locationFilter;

    // return matchesSearch && matchesStatus && matchesLocation;
    return matchesStatus && matchesLocation;
  });

  const getStatusBadge = (status?: string) => {
    return status === "active" ? (
      <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    );
  };

  const toggleColumn = (column: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  const activeFiltersCount =
    (statusFilter !== "all" ? 1 : 0) + (locationFilter !== "all" ? 1 : 0);

  // Calculate summary statistics (Based on current data)
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.status === "active").length;
  const inactiveCustomers = customers.filter(
    (c) => c.status === "inactive"
  ).length;
  const totalRevenue = customers.reduce(
    (sum, c) => sum + (c.totalSpent || 0),
    0
  );

  return (
    <div className="space-y-3">
      {/* Summary Cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3 px-3">
            <CardTitle className="text-xs font-medium">
              Total Pelanggan
            </CardTitle>
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-xl font-bold">{totalCustomers}</div>
            <p className="text-[10px] text-muted-foreground">
              Semua pelanggan terdaftar
            </p>
          </CardContent>
        </Card>

        {/* ... (Other Cards - No changes needed) ... */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3 px-3">
            <CardTitle className="text-xs font-medium">
              Pelanggan Aktif
            </CardTitle>
            <UserCheck className="h-3.5 w-3.5 text-green-600" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-xl font-bold text-green-600">
              {activeCustomers}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {totalCustomers > 0
                ? ((activeCustomers / totalCustomers) * 100).toFixed(1)
                : 0}
              % dari total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3 px-3">
            <CardTitle className="text-xs font-medium">
              Pelanggan Tidak Aktif
            </CardTitle>
            <UserX className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-xl font-bold text-muted-foreground">
              {inactiveCustomers}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {totalCustomers > 0
                ? ((inactiveCustomers / totalCustomers) * 100).toFixed(1)
                : 0}
              % dari total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3 px-3">
            <CardTitle className="text-xs font-medium">
              Total Pendapatan
            </CardTitle>
            <TrendingUp className="h-3.5 w-3.5 text-green-600" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-lg font-bold text-green-600">
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
                notation: "compact",
                compactDisplay: "short",
              }).format(totalRevenue)}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Estimasi pendapatan
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Area */}
      <div className="flex h-[calc(100vh-16rem)] gap-0 relative">
        <div
          className={`flex-1 flex flex-col border rounded-lg overflow-hidden ${
            selectedCustomer ? "" : ""
          }`}
        >
          {/* Toolbar */}
          <div className="p-2 border-b bg-card space-y-2">
            {/* Top Row: Search & Actions */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name, email, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
                {/* Added Loading Indicator */}
                {isLoading && (
                  <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </div>
              <Button size="sm" className="h-8 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Customer
              </Button>
            </div>

            {/* Bottom Row: Filters & Column Selector */}
            <div className="flex items-center gap-2">
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Status
                  </SelectItem>
                  <SelectItem value="active" className="text-xs">
                    Active
                  </SelectItem>
                  <SelectItem value="inactive" className="text-xs">
                    Inactive
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Location Filter */}
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Locations
                  </SelectItem>
                  {locations.map((location) => (
                    <SelectItem
                      key={location}
                      value={location}
                      className="text-xs"
                    >
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  {activeFiltersCount} filters
                </Badge>
              )}

              <div className="flex-1" />

              {/* Column Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <Columns className="h-3.5 w-3.5 mr-1.5" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.name}
                    onCheckedChange={() => toggleColumn("name")}
                  >
                    Name
                  </DropdownMenuCheckboxItem>
                  {/* ... (Rest of column toggles remain same) ... */}
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.email}
                    onCheckedChange={() => toggleColumn("email")}
                  >
                    Email
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.phone}
                    onCheckedChange={() => toggleColumn("phone")}
                  >
                    Phone
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.company}
                    onCheckedChange={() => toggleColumn("company")}
                  >
                    Company
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.location}
                    onCheckedChange={() => toggleColumn("location")}
                  >
                    Location
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.status}
                    onCheckedChange={() => toggleColumn("status")}
                  >
                    Status
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.lastContact}
                    onCheckedChange={() => toggleColumn("lastContact")}
                  >
                    Last Contact
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs">
                    Additional Columns
                  </DropdownMenuLabel>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.tags}
                    onCheckedChange={() => toggleColumn("tags")}
                  >
                    Tags
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.totalOrders}
                    onCheckedChange={() => toggleColumn("totalOrders")}
                  >
                    Total Orders
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.totalSpent}
                    onCheckedChange={() => toggleColumn("totalSpent")}
                  >
                    Total Spent
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.name && <TableHead>Name</TableHead>}
                  {visibleColumns.email && <TableHead>Email</TableHead>}
                  {visibleColumns.phone && <TableHead>Phone</TableHead>}
                  {visibleColumns.company && <TableHead>Company</TableHead>}
                  {visibleColumns.location && <TableHead>Location</TableHead>}
                  {visibleColumns.status && <TableHead>Status</TableHead>}
                  {visibleColumns.lastContact && (
                    <TableHead>Last Contact</TableHead>
                  )}
                  {visibleColumns.tags && <TableHead>Tags</TableHead>}
                  {visibleColumns.totalOrders && (
                    <TableHead className="text-right">Orders</TableHead>
                  )}
                  {visibleColumns.totalSpent && (
                    <TableHead className="text-right">Total Spent</TableHead>
                  )}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Show Loading State */}
                {isLoading && filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading data...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className={`cursor-pointer hover:bg-muted/50 ${
                        selectedCustomer?.id === customer.id ? "bg-muted" : ""
                      }`}
                    >
                      {visibleColumns.name && (
                        <TableCell className="font-medium">
                          {customer.name}
                        </TableCell>
                      )}
                      {visibleColumns.email && (
                        <TableCell className="text-sm text-muted-foreground">
                          {customer.email || "-"}
                        </TableCell>
                      )}
                      {visibleColumns.phone && (
                        <TableCell className="text-sm">
                          {customer.phone || "-"}
                        </TableCell>
                      )}
                      {visibleColumns.company && (
                        <TableCell className="text-sm">
                          {customer.company || "-"}
                        </TableCell>
                      )}
                      {visibleColumns.location && (
                        <TableCell className="text-sm">
                          {customer.location || "-"}
                        </TableCell>
                      )}
                      {visibleColumns.status && (
                        <TableCell>{getStatusBadge(customer.status)}</TableCell>
                      )}
                      {visibleColumns.lastContact && (
                        <TableCell className="text-sm">
                          {customer.lastContact || "-"}
                        </TableCell>
                      )}
                      {visibleColumns.tags && (
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {customer.tags?.map((tag, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.totalOrders && (
                        <TableCell className="text-right font-medium">
                          {customer.totalOrders || 0}
                        </TableCell>
                      )}
                      {visibleColumns.totalSpent && (
                        <TableCell className="text-right font-medium text-green-600">
                          {new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                            minimumFractionDigits: 0,
                          }).format(customer.totalSpent || 0)}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCustomer(customer)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}

                {!isLoading && filteredCustomers.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={
                        Object.values(visibleColumns).filter(Boolean).length + 1
                      }
                      className="text-center py-8 text-muted-foreground"
                    >
                      {searchQuery
                        ? "No customers found matching your search"
                        : "No customers found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer */}
          <div className="p-2 border-t bg-card">
            <p className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-medium">{filteredCustomers.length}</span>{" "}
              results
            </p>
          </div>
        </div>

        {/* Detail Panel - Added Type Cast to make it compatible with old types if needed */}
        {selectedCustomer && (
          <CustomerDetailPanel
            customer={selectedCustomer as any}
            onClose={() => setSelectedCustomer(null)}
          />
        )}
      </div>
    </div>
  );
};
