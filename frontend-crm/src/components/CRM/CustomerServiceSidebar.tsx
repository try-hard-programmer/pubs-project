import { useState } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// UI Components
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Icons
import {
  Search,
  Bot,
  User,
  Filter,
  X,
  Loader2,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Chat {
  id: string;
  customerName: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isAssigned: boolean;
  assignedTo: string;
  status: "open" | "pending" | "assigned" | "resolved" | "closed";
  channel: string;
  handledBy: "ai" | "human" | "unassigned";
}

// FIX: Ensure 'readStatus' is defined here
export interface ChatFilters {
  readStatus: "all" | "read" | "unread"; // <--- THIS LINE WAS LIKELY MISSING
  agent: string;
  status: "all" | "open" | "pending" | "assigned" | "resolved" | "closed";
  channel: "all" | "whatsapp" | "telegram" | "email" | "web" | "mcp" | string;
  dateRange?: DateRange;
}

interface CustomerServiceSidebarProps {
  chats: Chat[];
  activeChat: string | null;
  onChatSelect: (chatId: string) => void;
  filterType: "assigned" | "unassigned";
  filters: ChatFilters;
  onFiltersChange: (filters: ChatFilters) => void;
  isLoading?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CustomerServiceSidebar = ({
  chats,
  activeChat,
  onChatSelect,
  filterType,
  filters,
  onFiltersChange,
  isLoading = false,
}: CustomerServiceSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Get unique lists for dropdowns
  const agents = Array.from(
    new Set(
      chats
        .filter((c) => c.assignedTo && c.assignedTo !== "-")
        .map((c) => c.assignedTo)
    )
  );

  const channels = ["whatsapp", "telegram", "email"];

  // Filter Logic
  const filteredChats = chats.filter((chat) => {
    // 1. Filter by Assigned/Unassigned (Base Filter)
    if (filterType === "assigned" ? !chat.isAssigned : chat.isAssigned) {
      return false;
    }

    // 2. Filter by Search Query
    if (
      searchQuery &&
      !chat.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    // 3. Filter by Read Status (Client-side)
    if (filters.readStatus === "read" && chat.unreadCount > 0) return false;
    if (filters.readStatus === "unread" && chat.unreadCount === 0) return false;

    // 4. Filter by Agent (Client-side)
    if (filters.agent !== "all" && chat.assignedTo !== filters.agent)
      return false;

    // 5. Filter by Status (Client-side) - Logic previously implied but good to be explicit
    if (filters.status !== "all" && chat.status !== filters.status)
      return false;

    // 6. Filter by Channel (Client-side)
    if (filters.channel !== "all" && chat.channel !== filters.channel)
      return false;

    return true;
  });

  const activeFiltersCount = Object.values(filters).filter(
    (v) => v !== "all" && v !== undefined
  ).length;

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "open":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "assigned":
        return "bg-blue-500";
      case "resolved":
        return "bg-gray-500";
      case "closed":
        return "bg-slate-700";
      default:
        return "bg-gray-500";
    }
  };

  const resetFilters = (): void => {
    onFiltersChange({
      readStatus: "all",
      agent: "all",
      status: "all",
      channel: "all",
      dateRange: undefined,
    });
  };

  const applyDatePreset = (days: number) => {
    const today = new Date();
    // 0 means "Today"
    const from = days === 0 ? today : subDays(today, days);

    onFiltersChange({
      ...filters,
      dateRange: {
        from: startOfDay(from),
        to: endOfDay(today),
      },
    });
  };

  return (
    <div className="bg-card flex flex-col h-full border-r">
      {/* HEADER: Search & Filter Button */}
      <div className="p-3 border-b space-y-3 flex-shrink-0 bg-background/50 backdrop-blur-sm">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search conversations..."
            className="pl-9 h-9 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter Modal Trigger */}
        <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-full justify-between h-9 text-xs",
                activeFiltersCount > 0 &&
                  "border-primary/50 bg-primary/5 text-primary"
              )}
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Filter Conversations</span>
              </div>
              {activeFiltersCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 text-[10px] h-5 px-1.5 min-w-[20px] justify-center"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </DialogTrigger>

          {/* FILTER MODAL CONTENT */}
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter Options
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-5 py-4">
              {/* Date Range Picker - Full Width with Presets */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange?.from ? (
                        filters.dateRange.to ? (
                          <>
                            {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                            {format(filters.dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(filters.dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <div className="flex">
                      {/* PRESETS SIDEBAR */}
                      <div className="flex flex-col gap-2 p-3 border-r w-[140px]">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Quick Select
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start text-xs font-normal"
                          onClick={() => applyDatePreset(0)}
                        >
                          Today
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start text-xs font-normal"
                          onClick={() => applyDatePreset(1)}
                        >
                          Last 24 Hours
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start text-xs font-normal"
                          onClick={() => applyDatePreset(7)}
                        >
                          Last 7 Days
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start text-xs font-normal"
                          onClick={() => applyDatePreset(30)}
                        >
                          Last 30 Days
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start text-xs font-normal"
                          onClick={() => applyDatePreset(90)}
                        >
                          Last 3 Months
                        </Button>
                      </div>

                      {/* CALENDAR */}
                      <div className="p-0">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={filters.dateRange?.from}
                          selected={filters.dateRange}
                          onSelect={(range) =>
                            onFiltersChange({ ...filters, dateRange: range })
                          }
                          numberOfMonths={2}
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Status Filter */}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) =>
                      onFiltersChange({ ...filters, status: value as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Read Status Filter */}
                <div className="space-y-2">
                  <Label>Read Status</Label>
                  <Select
                    value={filters.readStatus}
                    onValueChange={(value) =>
                      onFiltersChange({ ...filters, readStatus: value as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Read status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                      <SelectItem value="unread">Unread</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Agent Filter */}
                <div className="space-y-2">
                  <Label>Assigned Agent</Label>
                  <Select
                    value={filters.agent}
                    onValueChange={(value) =>
                      onFiltersChange({ ...filters, agent: value })
                    }
                    disabled={agents.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Agents</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent} value={agent}>
                          {agent}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Channel Filter */}
                <div className="space-y-2">
                  <Label>Channel</Label>
                  <Select
                    value={filters.channel}
                    onValueChange={(value) =>
                      onFiltersChange({ ...filters, channel: value })
                    }
                    disabled={channels.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select channel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Channels</SelectItem>
                      {channels.map((channel) => (
                        <SelectItem key={channel} value={channel}>
                          {channel
                            ? channel.charAt(0).toUpperCase() + channel.slice(1)
                            : "-"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <DialogFooter className="flex sm:justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={resetFilters}
                className="w-full sm:w-auto text-muted-foreground"
              >
                <X className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <DialogClose asChild>
                <Button type="button" className="w-full sm:w-auto">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Apply Filters
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* CHAT LIST */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs">Loading conversations...</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => onChatSelect(chat.id)}
                className={cn(
                  "p-3 cursor-pointer transition-all hover:bg-muted/50 group relative",
                  activeChat === chat.id
                    ? "bg-muted border-l-4 border-l-primary pl-2"
                    : "border-l-4 border-l-transparent",
                  chat.status === "resolved" &&
                    "opacity-70 bg-gray-50/50 dark:bg-gray-900/10"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar className="w-10 h-10 border shadow-sm">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                        {chat.customerName
                          ? chat.customerName.charAt(0).toUpperCase()
                          : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                        getStatusColor(chat.status)
                      )}
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm truncate text-foreground/90">
                        {chat.customerName}
                      </h4>
                      <span className="text-[10px] text-muted-foreground font-medium flex-shrink-0">
                        {chat.timestamp}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground truncate line-clamp-1">
                      {chat.lastMessage}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {/* Handler Badge */}
                      <Badge
                        variant="secondary"
                        className="h-5 px-1.5 text-[10px] gap-1 font-normal bg-secondary/50"
                      >
                        {chat.handledBy === "ai" ? (
                          <Bot className="w-3 h-3" />
                        ) : (
                          <User className="w-3 h-3" />
                        )}
                        <span className="truncate max-w-[80px]">
                          {chat.assignedTo}
                        </span>
                      </Badge>

                      {/* Channel */}
                      {chat.channel && (
                        <Badge
                          variant="outline"
                          className="h-5 px-1.5 text-[10px] font-normal border-border/50 text-muted-foreground capitalize"
                        >
                          {chat.channel}
                        </Badge>
                      )}

                      {/* Unread Counter */}
                      {chat.unreadCount > 0 && (
                        <Badge className="ml-auto bg-primary text-primary-foreground h-5 px-1.5 min-w-[20px] justify-center text-[10px] shadow-sm">
                          {chat.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {!isLoading && filteredChats.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 px-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Search className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    No conversations found
                  </p>
                  <p className="text-xs text-muted-foreground max-w-[180px] mx-auto">
                    Try adjusting your filters or search terms
                  </p>
                </div>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilters}
                    className="h-8 text-xs"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
