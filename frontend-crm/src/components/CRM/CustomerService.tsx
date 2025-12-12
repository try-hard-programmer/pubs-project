/**
 * ============================================================================
 * CustomerService Component
 * ============================================================================
 *
 * Main component for Customer Service Management System.
 * Provides dual-view interface for managing customer interactions:
 * - Chat View: Real-time customer chat management
 * - Ticketing View: Kanban-style ticket management
 *
 * Features:
 * - Smart Multi-Fetch Kanban Board (Active vs Archive logic)
 * - Dual agent tracking (AI + Human agents)
 * - Chat escalation workflow
 * - Real-time message handling
 * - Ticket creation and management
 *
 * @module CustomerService
 */

// ============================================================================
// IMPORTS
// ============================================================================

// React core
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";

// Custom components
import { CustomerServiceSidebar, ChatFilters } from "./CustomerServiceSidebar";
import { ChatWindow } from "./ChatWindow";
import { AgentManagementModal } from "./AgentManagementModal";
import { TicketingKanban } from "./TicketingKanban";
import { NewChatModal } from "./NewChatModal";
import { WebSocketStatusIndicator } from "./WebSocketStatusIndicator";

// UI components
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

// Icons
import {
  Users,
  MessageSquare,
  Ticket as TicketIcon,
  Loader2,
  Plus,
} from "lucide-react";

// Utilities and services
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import type {
  WebSocketNotification,
  WebSocketNewMessage,
  WebSocketChatUpdate,
} from "@/contexts/WebSocketContext";
import * as crmAgentsService from "@/services/crmAgentsService";
import * as crmChatsService from "@/services/crmChatsService";
import {
  playNotificationSound,
  enableAudioNotifications,
} from "@/utils/audioNotification";
import { env } from "@/config/env";

// Types
import type { AgentFrontend, AgentStatus } from "@/services/crmAgentsService";
import type {
  Chat as APIChat,
  Message as APIMessage,
  Ticket as APITicket,
  Customer,
  CommunicationChannel,
  ChatObject,
} from "@/services/crmChatsService";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Message interface representing a single chat message
 */
interface Message {
  id: string;
  sender: "customer" | "agent" | "ai";
  senderName: string;
  content: string;
  timestamp: string;
  ticketId?: string;
}

/**
 * Ticket interface for customer support tickets
 */
interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "resolved" | "closed";
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  assignedTo?: string;
  tags?: string[];
  relatedMessages: string[];
  // Extra fields for Kanban display
  customerName?: string;
  chatId?: string;
}

/**
 * Chat interface representing a customer conversation
 */
interface Chat {
  id: string;
  customerName: string;
  customerId: string; // Needed for ticket creation
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  // Legacy fields
  isAssigned: boolean;
  assignedTo: string;
  // Dual agent tracking
  aiAgentId?: string;
  aiAgentName?: string;
  humanAgentId?: string;
  humanAgentName?: string;
  humanId?: string; // User ID of the human agent
  handledBy: "ai" | "human" | "unassigned";
  // Escalation tracking
  escalatedAt?: string;
  escalationReason?: string;
  // Status and content
  channel: string;
  status: "open" | "pending" | "assigned" | "resolved" | "closed";
  messages: Message[];
  labels?: string[];
  createdDate: string;
  solvedBy?: string;
  tickets?: Ticket[];
}

/**
 * Agent interface representing a customer service agent
 */
interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "busy";
  assignedChats: number;
  resolvedToday: number;
  avgResponseTime: string;
  lastActive: string;
}

/**
 * Props for CustomerService component
 */
interface CustomerServiceProps {
  filterType: "assigned" | "unassigned";
  onFilterChange: (filter: "assigned" | "unassigned") => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CustomerService = ({
  filterType,
  onFilterChange,
}: CustomerServiceProps) => {
  // ==========================================================================
  // AUTH & USER
  // ==========================================================================

  const { user, session } = useAuth();
  const { userRoles } = useRole();
  const { currentOrganization } = useOrganization();
  const location = useLocation();

  const organizationId = currentOrganization?.id;
  const accessToken = session?.access_token;

  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================

  const { wsStatus, reconnectAttempts, subscribeToMessages, resetUnreadCount } =
    useWebSocket();

  // UI State
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [filters, setFilters] = useState<ChatFilters>({
    readStatus: "all",
    agent: "all",
    status: "all",
    channel: "all",
    dateRange: undefined, // Initialize
  });

  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"chat" | "ticketing">("chat");

  // Agent State
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);

  const agentsRef = useRef<Agent[]>([]);

  // Chat & Message State
  const [chats, setChats] = useState<Chat[]>([]);
  const chatsRef = useRef<Chat[]>([]);
  const activeChatRef = useRef<string | null>(null);
  const pendingChatCreations = useRef<Set<string>>(new Set());

  // Kanban State
  const [kanbanTickets, setKanbanTickets] = useState<Ticket[]>([]);
  const [isKanbanLoading, setIsKanbanLoading] = useState(false);

  // Sync Refs
  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  const [chatsLoading, setChatsLoading] = useState(true);
  const [customersMap, setCustomersMap] = useState<Map<string, Customer>>(
    new Map()
  );
  const [currentChatMessages, setCurrentChatMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const fetchAndAddTicket = useCallback(
    async (ticketId: string, chatId: string) => {
      try {
        // Avoid refetching if we already have it
        const currentChat = chatsRef.current.find((c) => c.id === chatId);
        if (
          currentChat &&
          currentChat.tickets?.some((t) => t.id === ticketId)
        ) {
          return;
        }

        const apiTicket = await crmChatsService.getTicket(ticketId);

        let agentName = undefined;
        if (apiTicket.assigned_agent?.name) {
          agentName = apiTicket.assigned_agent.name;
        } else if (apiTicket.assigned_agent_id) {
          const foundAgent = agentsRef.current.find(
            (a) => a.id === apiTicket.assigned_agent_id
          );
          agentName = foundAgent?.name;
        }

        const newTicket: Ticket = {
          id: apiTicket.id,
          ticketNumber: apiTicket.ticket_number,
          title: apiTicket.title,
          description: apiTicket.description || "",
          category: apiTicket.category || "Uncategorized",
          priority: apiTicket.priority,
          status: apiTicket.status,
          createdAt: new Date(apiTicket.created_at).toLocaleString(),
          updatedAt: new Date(apiTicket.updated_at).toLocaleString(),
          resolvedAt: apiTicket.resolved_at
            ? new Date(apiTicket.resolved_at).toLocaleString()
            : undefined,
          closedAt: apiTicket.closed_at
            ? new Date(apiTicket.closed_at).toLocaleString()
            : undefined,
          assignedTo: agentName,
          tags: apiTicket.tags,
          relatedMessages: [],
          chatId: chatId,
          customerName: currentChat?.customerName || "Unknown",
        };

        setChats((prevChats) =>
          prevChats.map((chat) => {
            if (chat.id === chatId) {
              // Double check to prevent duplicates
              if (chat.tickets?.some((t) => t.id === ticketId)) return chat;
              return {
                ...chat,
                tickets: [newTicket, ...(chat.tickets || [])],
              };
            }
            return chat;
          })
        );

        toast.info(`New ticket created: ${newTicket.ticketNumber}`);
      } catch (error) {
        console.error("Error fetching automatically created ticket:", error);
      }
    },
    []
  );

  // =============================  =============================================
  // API INTEGRATION - DATA FETCHING HOOKS
  // ==========================================================================

  /**
   * Effect: Fetch chats when filter type or filters change
   */
  useEffect(() => {
    const fetchChats = async () => {
      try {
        setChatsLoading(true);

        // NEW: Extract dates
        const createdAfter = filters.dateRange?.from
          ? filters.dateRange.from.toISOString()
          : undefined;

        const createdBefore = filters.dateRange?.to
          ? filters.dateRange.to.toISOString()
          : undefined;

        const apiChats = await crmChatsService.getChats({
          handled_by: filterType === "assigned" ? "human" : undefined,
          status_filter: filters.status !== "all" ? filters.status : undefined,
          channel:
            filters.channel !== "all" ? (filters.channel as any) : undefined,
          // NEW: Pass to API
          created_after: createdAfter,
          created_before: createdBefore,
        });

        const transformedChats: Chat[] = await Promise.all(
          apiChats?.chats?.map(async (apiChat) => {
            let assignedAgent: Agent | undefined;

            return {
              id: apiChat.id,
              customerId: apiChat.customer_id, // Map customer_id
              customerName: apiChat.customer_name || "Unknown Customer",
              lastMessage: apiChat.last_message?.content || "",
              timestamp: new Date(apiChat.last_message_at).toLocaleTimeString(
                [],
                {
                  hour: "2-digit",
                  minute: "2-digit",
                }
              ),
              unreadCount: apiChat.unread_count || 0,
              isAssigned: apiChat.handled_by === "human",
              assignedTo:
                (apiChat.handled_by === "human"
                  ? apiChat.human_agent_name
                  : apiChat.ai_agent_name) || "-",
              aiAgentId: apiChat.ai_agent_id || undefined,
              aiAgentName: apiChat.ai_agent_name || undefined,
              humanAgentId: apiChat.human_agent_id || undefined,
              humanAgentName: apiChat.human_agent_name || undefined,
              humanId: apiChat.human_id || undefined,
              handledBy: apiChat.handled_by,
              escalatedAt: apiChat.escalated_at || undefined,
              escalationReason: apiChat.escalation_reason || undefined,
              channel: apiChat.channel || "-",
              status: apiChat.status as
                | "open"
                | "pending"
                | "assigned"
                | "resolved",
              messages: [],
              labels: [],
              createdDate: new Date(apiChat.created_at).toLocaleDateString(),
              solvedBy: apiChat.resolved_by_agent_id
                ? assignedAgent?.name
                : undefined,
              tickets: [],
            };
          })
        );

        setChats(transformedChats);
      } catch (error) {
        console.error("Error fetching chats:", error);
        if (error && typeof error === "object" && "response" in error) {
          toast.error("Gagal memuat data chats");
        }
      } finally {
        setChatsLoading(false);
      }
    };

    fetchChats();
  }, [filterType, filters]);

  /**
   * Effect: Fetch ALL tickets SMARTLY when switching to 'ticketing' view
   *
   * Strategy:
   * 1. Active Tickets (Open): Fetch created in last 30 days (Backlog Control)
   * 2. Active Tickets (In Progress): Fetch most recent 50 (Active Work)
   * 3. Archive Tickets (Resolved/Closed): Fetch ONLY updated in last 7 days (Data Hygiene)
   */
  useEffect(() => {
    if (viewMode !== "ticketing") return;

    const fetchSmartTickets = async () => {
      try {
        setIsKanbanLoading(true);

        const now = new Date();
        // Time windows
        const sevenDaysAgo = new Date(
          now.getTime() - 7 * 24 * 60 * 60 * 1000
        ).toISOString();
        const thirtyDaysAgo = new Date(
          now.getTime() - 30 * 24 * 60 * 60 * 1000
        ).toISOString();

        // PARALLEL FETCHING: 4 Requests for 4 Columns
        // We use the new sorting and date filter params
        const [openRes, progressRes, resolvedRes, closedRes] =
          await Promise.all([
            // 1. OPEN: Last 30 days, sorted by Creation Date
            crmChatsService.getTickets({
              status_filter: "open",
              limit: 50,
              created_after: thirtyDaysAgo, // <--- 30 Day Window
              sort_by: "created_at",
              sort_order: "desc",
            }) as any,

            // 2. IN PROGRESS: High limit, sorted by Last Update
            crmChatsService.getTickets({
              status_filter: "in_progress",
              limit: 50,
              sort_by: "updated_at",
              sort_order: "desc",
            }) as any,

            // 3. RESOLVED: Only last 7 days
            crmChatsService.getTickets({
              status_filter: "resolved",
              limit: 50,
              updated_after: sevenDaysAgo, // <--- 7 Day Hygiene
              sort_by: "updated_at",
              sort_order: "desc",
            }) as any,

            // 4. CLOSED: Only last 7 days
            crmChatsService.getTickets({
              status_filter: "closed",
              limit: 50,
              updated_after: sevenDaysAgo, // <--- 7 Day Hygiene
              sort_by: "updated_at",
              sort_order: "desc",
            }) as any,
          ]);

        // Combine all results
        const allRawTickets = [
          ...(Array.isArray(openRes) ? openRes : openRes.tickets || []),
          ...(Array.isArray(progressRes)
            ? progressRes
            : progressRes.tickets || []),
          ...(Array.isArray(resolvedRes)
            ? resolvedRes
            : resolvedRes.tickets || []),
          ...(Array.isArray(closedRes) ? closedRes : closedRes.tickets || []),
        ];

        // Map to Component Format
        const mappedTickets: Ticket[] = allRawTickets.map((apiTicket: any) => {
          let agentName = undefined;
          if (apiTicket.assigned_agent?.name) {
            agentName = apiTicket.assigned_agent.name;
          } else if (apiTicket.assigned_agent_id) {
            const foundAgent = agents.find(
              (a) => a.id === apiTicket.assigned_agent_id
            );
            agentName = foundAgent?.name;
          }

          return {
            id: apiTicket.id,
            ticketNumber: apiTicket.ticket_number,
            title: apiTicket.title,
            description: apiTicket.description || "",
            category: apiTicket.category || "Uncategorized",
            priority: apiTicket.priority,
            status: apiTicket.status,
            createdAt: new Date(apiTicket.created_at).toLocaleString(),
            updatedAt: new Date(apiTicket.updated_at).toLocaleString(),
            resolvedAt: apiTicket.resolved_at
              ? new Date(apiTicket.resolved_at).toLocaleString()
              : undefined,
            closedAt: apiTicket.closed_at
              ? new Date(apiTicket.closed_at).toLocaleString()
              : undefined,
            assignedTo: agentName,
            tags: apiTicket.tags,
            relatedMessages: [],
            customerName: apiTicket.customer_name || "Unknown Customer",
            chatId: apiTicket.chat_id,
          };
        });

        setKanbanTickets(mappedTickets);
      } catch (error) {
        console.error("Error fetching kanban tickets:", error);
        toast.error("Gagal memuat data tiket");
      } finally {
        setIsKanbanLoading(false);
      }
    };

    fetchSmartTickets();
  }, [viewMode, agents]);

  /**
   * Fetch chat details (messages and tickets) when a chat is selected
   */
  useEffect(() => {
    if (!activeChat) {
      setCurrentChatMessages([]);
      return;
    }

    const fetchChatDetails = async () => {
      try {
        setMessagesLoading(true);

        // 1. Fetch Messages
        const messagesResponse = await crmChatsService.getChatMessages(
          activeChat
        );

        // Transform messages
        const transformedMessages: Message[] = messagesResponse.messages.map(
          (apiMsg) => {
            let senderRole: "customer" | "agent" | "ai" = "customer";
            const type = String(apiMsg.sender_type || "");

            if (type === "agent" || type === "human") senderRole = "agent";
            else if (type === "ai") senderRole = "ai";
            else senderRole = "customer";

            return {
              id: apiMsg.id,
              sender: senderRole,
              senderName: apiMsg.sender_name || "Unknown",
              content: apiMsg.content,
              timestamp: new Date(apiMsg.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              ticketId: apiMsg.ticket_id || undefined,
            };
          }
        );

        setCurrentChatMessages(transformedMessages);

        // 2. Fetch Tickets for this specific chat
        const ticketsResponse = (await crmChatsService.getTickets({
          chat_id: activeChat,
        })) as any;

        const apiTickets = Array.isArray(ticketsResponse)
          ? ticketsResponse
          : ticketsResponse.tickets || [];

        // Transform tickets
        const transformedTickets: Ticket[] = apiTickets.map(
          (apiTicket: any) => {
            let agentName = undefined;
            if (apiTicket.assigned_agent?.name) {
              agentName = apiTicket.assigned_agent.name;
            } else if (apiTicket.assigned_agent_id) {
              const foundAgent = agents.find(
                (a) => a.id === apiTicket.assigned_agent_id
              );
              agentName = foundAgent?.name;
            }

            return {
              id: apiTicket.id,
              ticketNumber: apiTicket.ticket_number,
              title: apiTicket.title,
              description: apiTicket.description || "",
              category: apiTicket.category || "Uncategorized",
              priority: apiTicket.priority as
                | "low"
                | "medium"
                | "high"
                | "urgent",
              status: apiTicket.status as
                | "open"
                | "in_progress"
                | "resolved"
                | "closed",
              createdAt: new Date(apiTicket.created_at).toLocaleString(),
              updatedAt: new Date(apiTicket.updated_at).toLocaleString(),
              resolvedAt: apiTicket.resolved_at
                ? new Date(apiTicket.resolved_at).toLocaleString()
                : undefined,
              closedAt: apiTicket.closed_at
                ? new Date(apiTicket.closed_at).toLocaleString()
                : undefined,
              assignedTo: agentName,
              tags: apiTicket.tags,
              relatedMessages: [],
            };
          }
        );

        // 3. Update State
        setChats((prevChats) =>
          prevChats.map((chat) =>
            chat.id === activeChat
              ? {
                  ...chat,
                  messages: transformedMessages,
                  tickets: transformedTickets,
                }
              : chat
          )
        );
      } catch (error) {
        console.error("Error fetching chat details:", error);
        toast.error("Gagal memuat detail chat");
      } finally {
        setMessagesLoading(false);
      }
    };

    fetchChatDetails();
    // Removed 'agents' from dependency to prevent double fetch loop on page load
  }, [activeChat]);

  // Fetch agents on component mount
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setAgentsLoading(true);
        const fetchedAgents = await crmAgentsService.getAgents();
        setAgents(fetchedAgents);
      } catch (error) {
        console.error("Error fetching agents:", error);
        toast.error("Gagal memuat data agents");
      } finally {
        setAgentsLoading(false);
      }
    };

    fetchAgents();
  }, []);

  // ==========================================================================
  // WEBSOCKET HANDLERS
  // ==========================================================================

  const handleNewMessageNotification = useCallback(
    async (notification: WebSocketNewMessage) => {
      const { data } = notification;
      const { chat_id, message_id, message_content, ticket_id } = data;

      console.log("📩 WebSocket Message Received:", data);

      const payload = data as any;
      const senderType = payload.sender_type;
      const senderName = payload.sender_name;

      // Check existence in CURRENT state (Ref)
      const chatExists = chatsRef.current.some((c) => c.id === chat_id);

      // === 1. TICKET LOGIC ===
      if (ticket_id) {
        fetchAndAddTicket(ticket_id, chat_id);
      }

      // === 2. SENDER LOGIC ===
      let finalSender: "customer" | "agent" | "ai" = "customer";
      const rawType = String(senderType || "").toLowerCase();

      if (rawType === "agent" || rawType === "human" || rawType === "admin") {
        finalSender = "agent";
      } else if (
        rawType === "ai" ||
        rawType === "bot" ||
        rawType === "system"
      ) {
        finalSender = "ai";
      } else {
        finalSender = "customer";
      }

      // === 3. NEW CHAT LOGIC (With Race Condition Fix) ===
      if (!chatExists) {
        // FIX: Check if we are already handling this new chat
        if (pendingChatCreations.current.has(chat_id)) {
          console.log(
            "⏳ Chat creation already in progress, skipping duplicate event:",
            chat_id
          );
          return;
        }

        console.log("🆕 New chat detected via WebSocket:", chat_id);

        // Mark as pending
        pendingChatCreations.current.add(chat_id);

        try {
          const newChatData = await crmChatsService.getChat(chat_id);

          // ... (Your existing mapping logic) ...
          const newChat: Chat = {
            id: newChatData.id,
            customerId: newChatData.customer_id,
            customerName:
              newChatData.customer_name || data.customer_name || "Unknown",
            lastMessage: newChatData.last_message?.content || message_content,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            unreadCount: 1,
            isAssigned: newChatData.handled_by === "human",
            assignedTo:
              (newChatData.handled_by === "human"
                ? newChatData.human_agent_name
                : newChatData.ai_agent_name) || "-",
            aiAgentId: newChatData.ai_agent_id,
            aiAgentName: newChatData.ai_agent_name,
            humanAgentId: newChatData.human_agent_id,
            humanAgentName: newChatData.human_agent_name,
            humanId: newChatData.human_agent_id,
            handledBy: newChatData.handled_by,
            escalatedAt: newChatData.escalated_at,
            escalationReason: newChatData.escalation_reason,
            channel: newChatData.channel || "telegram",
            status: newChatData.status as any,
            messages: [],
            labels: [],
            createdDate: new Date(newChatData.created_at).toLocaleDateString(),
            tickets: [],
          };

          setChats((prev) => {
            // Double-safety check inside updater
            if (prev.some((c) => c.id === newChat.id)) return prev;
            return [newChat, ...prev];
          });

          playNotificationSound("message", 0.5);
          toast.info(`New chat from ${newChat.customerName}`, {
            action: {
              label: "View",
              onClick: () => setActiveChat(newChat.id),
            },
            duration: 5000,
          });
        } catch (error) {
          console.error("Failed to fetch new chat details:", error);
        } finally {
          // Release the lock
          pendingChatCreations.current.delete(chat_id);
        }
        return;
      }

      // === 4. EXISTING CHAT UPDATE LOGIC ===
      setChats((prevChats) => {
        const chatIndex = prevChats.findIndex((chat) => chat.id === chat_id);
        if (chatIndex === -1) return prevChats;

        const updatedChats = [...prevChats];
        const chat = updatedChats[chatIndex];

        updatedChats[chatIndex] = {
          ...chat,
          lastMessage: message_content,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          unreadCount:
            chat.id === activeChatRef.current
              ? chat.unreadCount
              : chat.unreadCount + 1,
        };

        const [updatedChat] = updatedChats.splice(chatIndex, 1);
        updatedChats.unshift(updatedChat);
        return updatedChats;
      });

      // === 5. APPEND MESSAGE TO ACTIVE VIEW ===
      if (chat_id === activeChatRef.current) {
        const transformedMessage: Message = {
          id: message_id,
          sender: finalSender,
          senderName: senderName || data.customer_name || "Unknown",
          content: message_content,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          ticketId: ticket_id || undefined,
        };

        setCurrentChatMessages((prev) => {
          if (prev.some((msg) => msg.id === message_id)) return prev;
          return [...prev, transformedMessage];
        });
      } else {
        // Only play sound if not active chat (moved here to avoid duplicate sound on new chat creation)
        playNotificationSound("message", 0.5);
      }
    },
    [fetchAndAddTicket]
  );

  const handleChatUpdateNotification = useCallback(
    (notification: WebSocketChatUpdate) => {
      const { data, update_type } = notification;
      const { chat_id } = data;

      console.log("🔄 Chat update received:", update_type, data);

      // === NEW: Handle Ticket Creation Event ===
      if (update_type === "ticket_created" && data.ticket_id) {
        console.log(
          "🎫 WebSocket triggered ticket creation:",
          data.ticket_number
        );
        // This helper (which we added previously) fetches the full ticket
        // and adds it to the chat's ticket list instantly.
        fetchAndAddTicket(data.ticket_id, chat_id);

        // Optional: Show a toast so the agent notices
        toast.info(
          `New Ticket Auto-Created: ${data.ticket_number || "Ticket"}`
        );
      }
      // =========================================

      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.id !== chat_id) return chat;

          const updatedChat = { ...chat };

          if (update_type === "assigned" && data.to_agent) {
            updatedChat.humanAgentId = data.to_agent;
            updatedChat.handledBy = "human";
            updatedChat.isAssigned = true;
          }

          if (update_type === "escalated") {
            updatedChat.humanAgentId = data.to_agent;
            updatedChat.handledBy = "human";
            updatedChat.escalatedAt = new Date().toISOString();
            updatedChat.escalationReason = data.reason;
            toast.info(
              `Chat escalated: ${data.reason || "No reason provided"}`
            );
          }

          if (update_type === "status_changed" && data.status) {
            updatedChat.status = data.status;
            if (data.status === "resolved") {
              toast.success("Chat resolved");
            }
          }

          return updatedChat;
        })
      );

      if (chat_id === activeChatRef.current) {
        if (update_type === "assigned") {
          toast.info("Chat assignment updated");
        }
      }
    },
    [fetchAndAddTicket] // Ensure this dependency is present!
  );

  const handleWebSocketMessage = useCallback(
    (notification: WebSocketNotification) => {
      switch (notification.type) {
        case "connection_established":
          console.log(
            "✅ WebSocket connection established:",
            notification.message
          );
          break;
        case "new_message":
          handleNewMessageNotification(notification);
          break;
        case "chat_update":
          handleChatUpdateNotification(notification);
          break;
        default:
          console.log("📩 Unknown notification type:", notification);
      }
    },
    [handleNewMessageNotification, handleChatUpdateNotification]
  );

  useEffect(() => {
    console.log("📡 CustomerService: Subscribing to WebSocket messages");
    const unsubscribe = subscribeToMessages((notification) => {
      handleWebSocketMessage(notification);
    });
    return () => {
      console.log("📡 CustomerService: Unsubscribing from WebSocket messages");
      unsubscribe();
    };
  }, [subscribeToMessages, handleWebSocketMessage]);

  useEffect(() => {
    const state = location.state as { openChatId?: string } | null;
    if (state?.openChatId) {
      console.log("📂 Opening chat from navigation state:", state.openChatId);
      setActiveChat(state.openChatId);
      resetUnreadCount();
      window.history.replaceState({}, document.title);
    }
  }, [location.state, resetUnreadCount]);

  useEffect(() => {
    if (activeChat) {
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === activeChat ? { ...chat, unreadCount: 0 } : chat
        )
      );
      resetUnreadCount();
    }
  }, [activeChat, resetUnreadCount]);

  const selectedChat = chats.find((chat) => chat.id === activeChat);

  const handleSendMessage = async (message: string) => {
    if (!activeChat) return;

    try {
      const selectedChat = chats.find((c) => c.id === activeChat);
      if (!selectedChat) return;

      if (!user?.id) {
        toast.error("Anda harus login untuk mengirim pesan");
        return;
      }

      if (selectedChat.humanId && selectedChat.humanId !== user.id) {
        toast.error(
          "Hanya agent yang ditugaskan yang dapat mengirim pesan ke chat ini"
        );
        return;
      }

      const fallbackName = user.email ? user.email.split("@")[0] : "Agent";
      const agentName = user.user_metadata?.name || fallbackName;

      const metadata = {
        agent_name: agentName,
        agent_email: user.email,
        handled_by: selectedChat.handledBy,
        chat_status: selectedChat.status,
        sent_at: new Date().toISOString(),
        source: "web_ui",
        user_agent: navigator.userAgent,
      };

      const sentMessage = await crmChatsService.sendMessage(
        activeChat,
        message,
        "agent",
        user.id,
        undefined,
        metadata
      );

      if (sentMessage.ticket_id) {
        fetchAndAddTicket(sentMessage.ticket_id, activeChat);
      }

      const transformedMessage: Message = {
        id: sentMessage.id,
        sender: "agent",
        senderName: agentName,
        content: sentMessage.content,
        timestamp: new Date(sentMessage.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        ticketId: sentMessage.ticket_id || undefined,
      };

      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.id !== activeChat) return chat;

          const existingMsgIndex = chat.messages.findIndex(
            (m) => m.id === transformedMessage.id
          );

          let newMessages;
          if (existingMsgIndex !== -1) {
            newMessages = [...chat.messages];
            newMessages[existingMsgIndex] = transformedMessage;
          } else {
            newMessages = [...chat.messages, transformedMessage];
          }

          return {
            ...chat,
            messages: newMessages,
            lastMessage: message,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
        })
      );

      setCurrentChatMessages((prev) => {
        const existingMsgIndex = prev.findIndex(
          (m) => m.id === transformedMessage.id
        );
        if (existingMsgIndex !== -1) {
          const updated = [...prev];
          updated[existingMsgIndex] = transformedMessage;
          return updated;
        }
        return [...prev, transformedMessage];
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Gagal mengirim pesan");
    }
  };

  const handleAssignToAgent = async () => {
    if (!activeChat) return;

    try {
      const updatedChat = await crmChatsService.assignChat(activeChat, null, {
        assignToMe: true,
        reason: "Taking this conversation",
      });

      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === activeChat
            ? {
                ...chat,
                isAssigned: updatedChat.handled_by === "human",
                assignedTo:
                  updatedChat.human_agent_name ||
                  updatedChat.ai_agent_name ||
                  "You",
                humanAgentId: updatedChat.human_agent_id,
                humanAgentName: updatedChat.human_agent_name,
                handledBy: updatedChat.handled_by,
                status: updatedChat.status as
                  | "open"
                  | "pending"
                  | "assigned"
                  | "resolved",
              }
            : chat
        )
      );

      toast.success("Chat berhasil diassign ke Anda");
    } catch (error) {
      console.error("Error assigning chat:", error);
      toast.error("Gagal assign chat");
    }
  };

  const handleMarkResolved = async () => {
    if (!activeChat) return;

    try {
      await crmChatsService.resolveChat(activeChat);

      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === activeChat
            ? {
                ...chat,
                status: "resolved",
              }
            : chat
        )
      );

      toast.success("Chat berhasil diresolve");
    } catch (error) {
      console.error("Error resolving chat:", error);
      toast.error("Gagal resolve chat");
    }
  };

  const handleEscalateChat = async (humanAgentId: string, reason?: string) => {
    if (!activeChat) return;

    try {
      const updatedChat = await crmChatsService.escalateChat(activeChat, {
        human_agent_id: humanAgentId,
        reason,
      });

      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === activeChat
            ? {
                ...chat,
                humanAgentId: updatedChat.human_agent_id || undefined,
                humanAgentName: updatedChat.human_agent_name || undefined,
                handledBy: updatedChat.handled_by,
                escalatedAt: updatedChat.escalated_at || undefined,
                escalationReason: updatedChat.escalation_reason || undefined,
                isAssigned: true,
                assignedTo: updatedChat.human_agent_name || undefined,
                status: "assigned",
              }
            : chat
        )
      );

      toast.success("Chat berhasil di-escalate ke human agent");
    } catch (error: any) {
      console.error("Error escalating chat:", error);
      const errorMessage =
        error?.response?.data?.detail || "Gagal escalate chat";
      toast.error(errorMessage);
    }
  };

  const handleAddAgent = async (
    agentData: Omit<
      Agent,
      | "id"
      | "assignedChats"
      | "resolvedToday"
      | "avgResponseTime"
      | "lastActive"
    >
  ) => {
    try {
      const newAgent = await crmAgentsService.createAgent(agentData);
      setAgents((prev) => [...prev, newAgent]);
      toast.success("Agent berhasil ditambahkan");
    } catch (error) {
      console.error("Error adding agent:", error);
      toast.error("Gagal menambahkan agent. Silakan coba lagi.");
    }
  };

  const handleUpdateAgentStatus = async (
    agentId: string,
    status: "active" | "inactive" | "busy"
  ) => {
    try {
      const updatedAgent = await crmAgentsService.updateAgentStatus(
        agentId,
        status as AgentStatus
      );
      setAgents((prev) =>
        prev.map((agent) => (agent.id === agentId ? updatedAgent : agent))
      );
      toast.success("Status agent berhasil diupdate");
    } catch (error) {
      console.error("Error updating agent status:", error);
      toast.error("Gagal mengupdate status agent. Silakan coba lagi.");
    }
  };

  const handleSaveAgentSettings = async (agentId: string, settings: any) => {
    try {
      await crmAgentsService.updateAgentSettings(agentId, settings);
      setAgents((prev) =>
        prev.map((agent) =>
          agent.id === agentId ? { ...agent, settings } : agent
        )
      );
      toast.success("Settings agent berhasil disimpan");
    } catch (error) {
      console.error("Error saving agent settings:", error);
      toast.error("Gagal menyimpan settings agent. Silakan coba lagi.");
    }
  };

  const handleCreateTicket = async (
    ticket: Omit<
      Ticket,
      "id" | "ticketNumber" | "createdAt" | "updatedAt" | "relatedMessages"
    >
  ) => {
    if (!activeChat) return;

    const selectedChat = chats.find((c) => c.id === activeChat);
    if (!selectedChat) {
      toast.error("Chat data not found");
      return;
    }

    try {
      let assignedAgentId = undefined;

      if (ticket.assignedTo) {
        const agent = agents.find((a) => a.name === ticket.assignedTo);
        assignedAgentId = agent?.id;
      }

      const createdTicket = await crmChatsService.createTicket({
        chat_id: activeChat,
        customer_id: selectedChat.customerId,
        title: ticket.title,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority as crmChatsService.TicketPriority,
        tags: ticket.tags,
        assigned_agent_id: assignedAgentId,
      });

      const newTicket: Ticket = {
        id: createdTicket.id,
        ticketNumber: createdTicket.ticket_number,
        title: createdTicket.title,
        description: createdTicket.description || "",
        category: createdTicket.category || "Uncategorized",
        priority: createdTicket.priority as
          | "low"
          | "medium"
          | "high"
          | "urgent",
        status: createdTicket.status as
          | "open"
          | "in_progress"
          | "resolved"
          | "closed",
        createdAt: new Date(createdTicket.created_at).toLocaleString(),
        updatedAt: new Date(createdTicket.updated_at).toLocaleString(),
        assignedTo: ticket.assignedTo || undefined,
        tags: createdTicket.tags,
        relatedMessages: [],
      };

      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === activeChat
            ? {
                ...chat,
                tickets: [...(chat.tickets || []), newTicket],
              }
            : chat
        )
      );

      toast.success("Ticket berhasil dibuat");
    } catch (error) {
      let errorMessage = "An unexpected error occurred";
      try {
        if (error instanceof Error && error.message) {
          const parsedError = JSON.parse(error.message);
          errorMessage = parsedError?.detail || "An unknown error occurred";
        }
      } catch (parseError) {
        console.error("Error parsing message:", parseError);
      }
      console.error("Error creating ticket:", errorMessage);
      toast.error("Gagal membuat ticket: " + errorMessage);
    }
  };

  const handleCreateChat = async (data: {
    channel: CommunicationChannel;
    contact: string;
    customerName: string;
    initialMessage: string;
    assignedAgentId?: string;
  }) => {
    try {
      const createdChat = await crmChatsService.createChat({
        customer_name: data.customerName,
        contact: data.contact,
        channel: data.channel,
        initial_message: data.initialMessage,
      });

      if (data.assignedAgentId) {
        try {
          await crmChatsService.assignChat(
            createdChat.id,
            data.assignedAgentId,
            { assignToMe: false }
          );
        } catch (error) {
          console.error("Failed to assign chat to agent:", error);
        }
      }

      const assignedAgent = data.assignedAgentId
        ? agents.find((a) => a.id === data.assignedAgentId)
        : undefined;

      const newChat: Chat = {
        id: createdChat.id,
        customerId: createdChat.customer_id,
        customerName: data.customerName,
        lastMessage: data.initialMessage,
        timestamp: new Date(createdChat.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        unreadCount: 0,
        isAssigned: !!data.assignedAgentId,
        assignedTo: assignedAgent?.name || "-",
        handledBy: data.assignedAgentId ? "human" : "unassigned",
        channel: data.channel || "-",
        status: data.assignedAgentId
          ? "assigned"
          : (createdChat.status as
              | "open"
              | "pending"
              | "assigned"
              | "resolved"),
        messages: [],
        labels: [],
        createdDate: new Date(createdChat.created_at).toLocaleDateString(),
        tickets: [],
      };

      setChats((prevChats) => [newChat, ...prevChats]);
      setActiveChat(createdChat.id);
      toast.success("Chat baru berhasil dibuat!");
    } catch (error: any) {
      console.error("Error creating chat:", error);
      toast.error(error?.message || "Gagal membuat chat baru");
      throw error;
    }
  };

  const handleUpdateTicket = async (
    ticketId: string,
    updates: Partial<Ticket>
  ) => {
    try {
      const apiUpdates: any = {};
      if (updates.title) apiUpdates.title = updates.title;
      if (updates.description) apiUpdates.description = updates.description;
      if (updates.category) apiUpdates.category = updates.category;
      if (updates.priority) apiUpdates.priority = updates.priority;
      if (updates.status) apiUpdates.status = updates.status;
      if (updates.assignedTo) {
        const agent = agents.find((a) => a.name === updates.assignedTo);
        if (agent) apiUpdates.assigned_agent_id = agent.id;
      }
      if (updates.tags) apiUpdates.tags = updates.tags;

      const updatedTicket = await crmChatsService.updateTicket(
        ticketId,
        apiUpdates
      );

      setChats((prevChats) =>
        prevChats.map((chat) => ({
          ...chat,
          tickets: (chat.tickets || []).map((ticket) =>
            ticket.id === ticketId
              ? {
                  ...ticket,
                  ...updates,
                  updatedAt: new Date(
                    updatedTicket.updated_at
                  ).toLocaleString(),
                  ...(updates.status === "resolved" && !ticket.resolvedAt
                    ? { resolvedAt: new Date().toLocaleString() }
                    : {}),
                  ...(updates.status === "closed" && !ticket.closedAt
                    ? { closedAt: new Date().toLocaleString() }
                    : {}),
                }
              : ticket
          ),
        }))
      );

      // Update kanban tickets as well if in ticketing view
      if (viewMode === "ticketing") {
        setKanbanTickets((prev) =>
          prev.map((ticket) =>
            ticket.id === ticketId ? { ...ticket, ...updates } : ticket
          )
        );
      }

      toast.success("Ticket berhasil diupdate");
    } catch (error) {
      console.error("Error updating ticket:", error);
      toast.error("Gagal update ticket");
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    try {
      await crmAgentsService.deleteAgent(agentId);

      // Update local state to remove the agent immediately
      setAgents((prev) => prev.filter((agent) => agent.id !== agentId));

      toast.success("Agent berhasil dihapus");
    } catch (error) {
      console.error("Error deleting agent:", error);
      toast.error("Gagal menghapus agent. Silakan coba lagi.");
    }
  };

  const allTickets = chats.flatMap((chat) =>
    (chat.tickets || []).map((ticket) => ({
      ...ticket,
      customerName: chat.customerName,
      chatId: chat.id,
    }))
  );

  return (
    <div
      className="flex flex-col h-[calc(100vh-10rem)] border rounded-lg overflow-hidden"
      onClick={enableAudioNotifications}
    >
      {/* View Mode Selector */}
      <div className="border-b bg-card p-2">
        <Tabs
          value={viewMode}
          onValueChange={(value) => setViewMode(value as "chat" | "ticketing")}
        >
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 h-9 p-1">
            <TabsTrigger
              value="chat"
              className="flex items-center justify-center gap-1.5 text-xs data-[state=active]:bg-background"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Chat View
            </TabsTrigger>
            <TabsTrigger
              value="ticketing"
              className="flex items-center justify-center gap-1.5 text-xs data-[state=active]:bg-background"
            >
              <TicketIcon className="h-3.5 w-3.5" />
              Ticketing View
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {viewMode === "chat" ? (
          <>
            {/* Sidebar for Chat View */}
            <div className="w-64 flex flex-col border-r">
              {/* Header - Fixed */}
              <div className="p-2 border-b bg-card space-y-2 flex-shrink-0">
                {/* WebSocket Status Indicator */}
                <div className="flex justify-center">
                  <WebSocketStatusIndicator
                    status={wsStatus}
                    reconnectAttempts={reconnectAttempts}
                  />
                </div>

                <Tabs
                  value={filterType}
                  onValueChange={(value) =>
                    onFilterChange(value as "assigned" | "unassigned")
                  }
                >
                  <TabsList className="grid w-full grid-cols-2 h-9 p-1">
                    <TabsTrigger
                      value="unassigned"
                      className="text-xs data-[state=active]:bg-background"
                    >
                      Unassigned
                    </TabsTrigger>
                    <TabsTrigger
                      value="assigned"
                      className="text-xs data-[state=active]:bg-background"
                    >
                      Assigned
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Agent Management Button */}
                <Button
                  variant="outline"
                  className="w-full h-8 text-xs"
                  size="sm"
                  onClick={() => setAgentModalOpen(true)}
                >
                  <Users className="h-3.5 w-3.5 mr-1.5" />
                  Manage Agents
                </Button>
              </div>

              {/* Chat List - Scrollable */}
              <div className="flex-1 min-h-0">
                <CustomerServiceSidebar
                  chats={chats}
                  activeChat={activeChat}
                  onChatSelect={setActiveChat}
                  filterType={filterType}
                  filters={filters}
                  onFiltersChange={setFilters}
                  isLoading={chatsLoading}
                />
              </div>

              {/* New Chat Button - Fixed at Bottom */}
              <div className="p-3 border-t bg-card flex-shrink-0">
                <Button
                  className="w-full h-9 text-sm shadow-sm"
                  size="sm"
                  onClick={() => setNewChatModalOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Chat
                </Button>
              </div>
            </div>

            {/* Chat Window */}
            <ChatWindow
              chatId={activeChat}
              customerName={selectedChat?.customerName || ""}
              status={selectedChat?.status || "open"}
              isAssigned={selectedChat?.isAssigned || false}
              assignedTo={selectedChat?.assignedTo}
              isOwnChat={selectedChat?.humanId === user?.id}
              aiAgentName={selectedChat?.aiAgentName}
              humanAgentName={selectedChat?.humanAgentName}
              handledBy={selectedChat?.handledBy || "unassigned"}
              escalatedAt={selectedChat?.escalatedAt}
              escalationReason={selectedChat?.escalationReason}
              tickets={selectedChat?.tickets || []}
              isLoading={messagesLoading}
              agents={agents}
              onSendMessage={handleSendMessage}
              onAssignToAgent={handleAssignToAgent}
              onMarkResolved={handleMarkResolved}
              onEscalateToHuman={handleEscalateChat}
              onCreateTicket={handleCreateTicket}
              onUpdateTicket={handleUpdateTicket}
              messages={currentChatMessages}
            />
          </>
        ) : (
          <TicketingKanban
            tickets={kanbanTickets}
            agents={agents}
            onUpdateTicket={handleUpdateTicket}
            isLoading={isKanbanLoading}
          />
        )}
      </div>

      <AgentManagementModal
        open={agentModalOpen}
        onClose={() => setAgentModalOpen(false)}
        agents={agents}
        onAddAgent={handleAddAgent}
        onUpdateAgentStatus={handleUpdateAgentStatus}
        onSaveAgentSettings={handleSaveAgentSettings}
        onDeleteAgent={handleDeleteAgent}
      />

      <NewChatModal
        open={newChatModalOpen}
        onClose={() => setNewChatModalOpen(false)}
        agents={agents}
        onCreateChat={handleCreateChat}
      />
    </div>
  );
};
