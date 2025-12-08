/**
 * ============================================================================
 * CustomerServiceSidebar Component
 * ============================================================================
 *
 * Sidebar component for displaying and filtering customer service chats.
 * Provides search functionality and advanced filtering options.
 *
 * Features:
 * - Real-time search for conversations
 * - Advanced filtering (status, agent, read status, labels, date)
 * - Visual indicators for chat status and unread messages
 * - Responsive scrollable chat list
 *
 * @module CustomerServiceSidebar
 */

// ============================================================================
// IMPORTS
// ============================================================================

// React
import { useState } from "react";

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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Icons
import {
  Search,
  Bot,
  User,
  Filter,
  X,
  Loader2,
  CheckCircle2,
} from "lucide-react";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Chat interface for sidebar display (mapped from API response)
 *
 * @interface Chat
 * @property {string} id - Unique chat identifier
 * @property {string} customerName - Customer's display name
 * @property {string} lastMessage - Preview of last message content
 * @property {string} timestamp - Formatted time of last message
 * @property {number} unreadCount - Number of unread messages
 * @property {boolean} isAssigned - Whether chat is assigned to human agent (derived from handled_by === "human")
 * @property {string} assignedTo - Name of assigned agent (human_agent_name || ai_agent_name || "-")
 * @property {string} status - Current chat status
 * @property {string} channel - Communication channel (whatsapp, telegram, email, web, mcp)
 * @property {string} handledBy - Who is handling the chat: ai, human, or unassigned
 */
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

/**
 * Filter configuration for chat list (aligned with API fields)
 *
 * @interface ChatFilters
 * @property {string} readStatus - Filter by read/unread status
 * @property {string} agent - Filter by assigned agent
 * @property {string} status - Filter by chat status
 * @property {string} channel - Filter by communication channel
 */
export interface ChatFilters {
  readStatus: "all" | "read" | "unread";
  agent: string;
  status: "all" | "open" | "pending" | "assigned" | "resolved" | "closed";
  channel: "all" | "whatsapp" | "telegram" | "email" | "web" | "mcp" | string;
}

/**
 * Props for CustomerServiceSidebar component
 *
 * @interface CustomerServiceSidebarProps
 * @property {Chat[]} chats - Array of chat conversations
 * @property {string | null} activeChat - Currently selected chat ID
 * @property {function} onChatSelect - Callback when chat is selected
 * @property {string} filterType - Type of chats to display (assigned/unassigned)
 * @property {ChatFilters} filters - Current filter configuration
 * @property {function} onFiltersChange - Callback when filters change
 * @property {boolean} [isLoading] - Loading state for chats
 */
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

/**
 * CustomerServiceSidebar Component
 *
 * Displays a filterable list of customer service conversations.
 * Includes search, advanced filters, and visual status indicators.
 *
 * @param {CustomerServiceSidebarProps} props - Component props
 * @returns {JSX.Element} Rendered sidebar component
 */
export const CustomerServiceSidebar = ({
  chats,
  activeChat,
  onChatSelect,
  filterType,
  filters,
  onFiltersChange,
  isLoading = false,
}: CustomerServiceSidebarProps) => {
  // ==========================================================================
  // STATE
  // ==========================================================================

  /** Toggle state for filter panel */
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  /** Search query for filtering chats by customer name */
  const [searchQuery, setSearchQuery] = useState("");

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  /** Extract unique agents from chats for filter dropdown (exclude "-" placeholder) */
  const agents = Array.from(
    new Set(
      chats
        .filter((c) => c.assignedTo && c.assignedTo !== "-")
        .map((c) => c.assignedTo)
    )
  );

  /** Extract unique channels from chats for filter dropdown (exclude undefined/null) */
  const channels = Array.from(
    new Set(chats.filter((c) => c.channel).map((c) => c.channel))
  );

  /**
   * Filter chats based on multiple criteria:
   *
   * Server-side filters (handled by API in CustomerService.tsx):
   * - handled_by (assigned/unassigned)
   * - status_filter
   * - channel
   *
   * Client-side filters (handled here):
   * - searchQuery: Customer name search
   * - readStatus: Computed from unreadCount
   * - agent: Kept client-side (requires name-to-ID mapping for API)
   */
  const filteredChats = chats.filter((chat) => {
    // Filter by assigned/unassigned (backup, already handled by API)
    if (filterType === "assigned" ? !chat.isAssigned : chat.isAssigned) {
      return false;
    }

    // Filter by search query (client-side only)
    if (
      searchQuery &&
      !chat.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    // Filter by read status (client-side only - computed value)
    if (filters.readStatus === "read" && chat.unreadCount > 0) return false;
    if (filters.readStatus === "unread" && chat.unreadCount === 0) return false;

    // Filter by agent (client-side only - agent filter uses names, API needs UUIDs)
    if (filters.agent !== "all" && chat.assignedTo !== filters.agent)
      return false;

    // NOTE: Status and Channel filters are now handled server-side via API
    // Removed redundant client-side filtering for these fields

    return true;
  });

  /** Count how many filters are currently active (not set to "all") */
  const activeFiltersCount = Object.values(filters).filter(
    (v) => v !== "all"
  ).length;

  // ==========================================================================
  // UTILITY FUNCTIONS
  // ==========================================================================

  /**
   * Get color class for chat status indicator
   *
   * @param {string} status - Chat status
   * @returns {string} Tailwind color class
   */
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
      case "closed": // FIX: Handle closed color
        return "bg-slate-700";
      default:
        return "bg-gray-500";
    }
  };

  /**
   * Reset all filters to default "all" state
   */
  const resetFilters = (): void => {
    onFiltersChange({
      readStatus: "all",
      agent: "all",
      status: "all",
      channel: "all",
    });
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="bg-card flex flex-col h-full">
      {/* ====================================================================
          SEARCH & FILTER SECTION - Fixed at top
          ==================================================================== */}
      <div className="p-2 border-b space-y-2 flex-shrink-0">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search conversations..."
            className="pl-8 h-8 text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Advanced Filters Panel (Collapsible) */}
        <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between h-8 text-xs"
              >
                <div className="flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5" />
                  <span>Filters</span>
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-1 text-[10px] h-4">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </div>
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="mt-2 space-y-2">
            {/* Read Status */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold">Read Status</Label>
              <Select
                value={filters.readStatus}
                onValueChange={(value) =>
                  onFiltersChange({ ...filters, readStatus: value as any })
                }
              >
                <SelectTrigger className="h-7 text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[10px]">
                    All
                  </SelectItem>
                  <SelectItem value="read" className="text-[10px]">
                    Read
                  </SelectItem>
                  <SelectItem value="unread" className="text-[10px]">
                    Unread
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  onFiltersChange({ ...filters, status: value as any })
                }
              >
                <SelectTrigger className="h-7 text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[10px]">
                    All Status
                  </SelectItem>
                  <SelectItem value="open" className="text-[10px]">
                    Open
                  </SelectItem>
                  <SelectItem value="pending" className="text-[10px]">
                    Pending
                  </SelectItem>
                  <SelectItem value="assigned" className="text-[10px]">
                    Assigned
                  </SelectItem>
                  <SelectItem value="resolved" className="text-[10px]">
                    Resolved
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Agent */}
            {agents.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold">
                  Assigned Agent
                </Label>
                <Select
                  value={filters.agent}
                  onValueChange={(value) =>
                    onFiltersChange({ ...filters, agent: value })
                  }
                >
                  <SelectTrigger className="h-7 text-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-[10px]">
                      All Agents
                    </SelectItem>
                    {agents.map((agent) => (
                      <SelectItem
                        key={agent}
                        value={agent}
                        className="text-[10px]"
                      >
                        {agent}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Channel */}
            {channels.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold">Channel</Label>
                <Select
                  value={filters.channel}
                  onValueChange={(value) =>
                    onFiltersChange({ ...filters, channel: value })
                  }
                >
                  <SelectTrigger className="h-7 text-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-[10px]">
                      All Channels
                    </SelectItem>
                    {channels.map((channel) => (
                      <SelectItem
                        key={channel}
                        value={channel}
                        className="text-[10px]"
                      >
                        {channel
                          ? channel.charAt(0).toUpperCase() + channel.slice(1)
                          : "-"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Reset Button */}
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="w-full text-[10px] h-7"
              >
                <X className="h-3 w-3 mr-1" />
                Reset Filters
              </Button>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* ====================================================================
          CHAT LIST SECTION - Scrollable
          ==================================================================== */}
      <ScrollArea className="flex-1">
        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="text-xs text-muted-foreground">Loading chats...</p>
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {/* Chat Items */}
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => onChatSelect(chat.id)}
                className={`p-2 cursor-pointer hover:bg-muted/50 transition-colors ${
                  activeChat === chat.id ? "bg-muted" : ""
                } ${
                  chat.status === "resolved"
                    ? "opacity-60 bg-gray-50 dark:bg-gray-900/30"
                    : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  {/* Avatar with Status Indicator */}
                  <div className="relative">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                        {chat.customerName
                          ? chat.customerName.charAt(0).toUpperCase()
                          : "?"}
                      </AvatarFallback>
                    </Avatar>
                    {/* Status Indicator Badge */}
                    <div
                      className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-card ${getStatusColor(
                        chat.status
                      )}`}
                    />
                  </div>

                  {/* Chat Details */}
                  <div className="flex-1 min-w-0">
                    {/* Header: Customer Name & Timestamp */}
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="font-semibold text-xs truncate">
                        {chat.customerName}
                      </h4>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                        {chat.timestamp}
                      </span>
                    </div>

                    {/* Last Message Preview */}
                    <p className="text-[10px] text-muted-foreground truncate mb-1.5">
                      {chat.lastMessage}
                    </p>

                    {/* Badges: Assignment, Channel & Unread Count */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Agent Assignment Badge */}
                      {chat.handledBy === "human" ? (
                        <Badge
                          variant="secondary"
                          className="text-[9px] h-4 px-1.5 flex items-center gap-1"
                        >
                          <User className="w-2.5 h-2.5" />
                          {chat.assignedTo}
                        </Badge>
                      ) : chat.handledBy === "ai" ? (
                        <Badge
                          variant="outline"
                          className="text-[9px] h-4 px-1.5 flex items-center gap-1"
                        >
                          <Bot className="w-2.5 h-2.5" />
                          {chat.assignedTo}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[9px] h-4 px-1.5"
                        >
                          Unassigned
                        </Badge>
                      )}

                      {/* Channel Badge */}
                      {chat.channel && (
                        <Badge
                          variant="secondary"
                          className="text-[9px] h-4 px-1.5"
                        >
                          {chat.channel.charAt(0).toUpperCase() +
                            chat.channel.slice(1)}
                        </Badge>
                      )}

                      {/* Resolved Status Badge */}
                      {chat.status === "resolved" && (
                        <Badge
                          variant="outline"
                          className="text-[9px] h-4 px-1.5 flex items-center gap-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-300"
                        >
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Resolved
                        </Badge>
                      )}

                      {/* Unread Count Badge */}
                      {chat.unreadCount > 0 && (
                        <Badge className="bg-primary text-primary-foreground text-[9px] h-4 px-1.5">
                          {chat.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Empty State */}
            {!isLoading && filteredChats.length === 0 && (
              <div className="p-6 text-center text-muted-foreground">
                <p className="text-xs">No conversations found</p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
