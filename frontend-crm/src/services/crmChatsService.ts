import { apiClient } from "@/lib/apiClient";

/**
 * CRM Chats, Messages, and Tickets Service
 * Handles all CRM-related customer service API calls
 */

// ============= Type Definitions =============

export type ChatStatus =
  | "open"
  | "pending"
  | "assigned"
  | "resolved"
  | "closed";
export type CommunicationChannel =
  | "whatsapp"
  | "telegram"
  | "email"
  | "web"
  | "mcp";
export type SenderType = "customer" | "agent" | "ai";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type HandledBy = "ai" | "human" | "unassigned";

export interface Customer {
  id: string;
  organization_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Chat {
  human_id: any;
  id: string;
  organization_id: string;
  customer_id: string;

  // Legacy fields (backward compatibility)
  assigned_agent_id?: string | null;
  agent_name?: string | null;

  // NEW: Dual agent tracking
  ai_agent_id?: string | null;
  ai_agent_name?: string | null;
  human_agent_id?: string | null;
  human_agent_name?: string | null;
  handled_by: HandledBy;

  // NEW: Escalation tracking
  escalated_at?: string | null;
  escalation_reason?: string | null;

  // Existing fields
  status: ChatStatus;
  channel: CommunicationChannel;
  unread_count: number;
  last_message_at: string;
  created_at: string;
  resolved_at?: string | null;
  resolved_by_agent_id?: string | null;
  updated_at: string;

  // Populated fields
  customer?: Customer;
  assigned_agent?: any;
  customer_name?: string;
  last_message?: Message;
}

export interface ChatObject {
  chats: Chat[];
  total: number;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_type: SenderType;
  sender_id?: string | null;
  content: string;
  ticket_id?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Populated fields
  sender_name?: string;
}

export interface MessagesResponse {
  messages: Message[];
  total: number;
}

export interface Ticket {
  id: string;
  organization_id: string;
  ticket_number: string;
  chat_id: string;
  customer_id: string;
  assigned_agent_id?: string | null;
  title: string;
  description?: string | null;
  category?: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  tags: string[];
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  closed_at?: string | null;
  // Populated fields
  customer?: Customer;
  assigned_agent?: any;
  customer_name?: string;
}

export interface ChatWithDetails extends Chat {
  customer: Customer;
  messages?: Message[];
  tickets?: Ticket[];
}

// NEW: Chat Escalation Request
export interface ChatEscalationRequest {
  human_agent_id: string;
  reason?: string;
}

// NEW: Chat List Query Params
export interface ChatListParams {
  // Existing params...
  status_filter?: ChatStatus;
  channel?: CommunicationChannel;
  assigned_agent_id?: string;
  search?: string;
  skip?: number;
  limit?: number;
  handled_by?: HandledBy;
  ai_assigned_to?: string;
  human_assigned_to?: string;
  escalated?: boolean;
  unassigned?: boolean;

  // NEW: Date Range params
  created_after?: string;
  created_before?: string;
}

export interface TicketsResponse {
  tickets: Ticket[];
  total: number;
}

export interface TicketActivity {
  id: string;
  ticket_id: string;
  actor_type: "human" | "ai" | "system";
  action: string; // e.g. "status_change"
  description: string; // e.g. "Changed status to Closed"
  created_at: string;
  actor_name?: string;
  actor_email?: string;
}

interface CustomersApiResponse {
  customers: Customer[];
  total: number;
}

export interface SendMessageParams {
  chatId: string;
  content: string;
  senderType: SenderType;
  senderId: string;
  ticketId?: string;
  file?: File | null;
  metadata?: Record<string, any>;
}

// ============= API Functions =============

/**
 * Get all chats with optional filters
 */
export const getChats = async (
  params?: ChatListParams
): Promise<ChatObject> => {
  const queryParams = new URLSearchParams();

  // Existing filters
  if (params?.status_filter)
    queryParams.append("status_filter", params.status_filter);
  if (params?.channel) queryParams.append("channel", params.channel);
  if (params?.assigned_agent_id)
    queryParams.append("assigned_agent_id", params.assigned_agent_id);
  if (params?.search) queryParams.append("search", params.search);
  if (params?.skip !== undefined)
    queryParams.append("skip", params.skip.toString());
  if (params?.limit !== undefined)
    queryParams.append("limit", params.limit.toString());
  if (params?.handled_by) queryParams.append("handled_by", params.handled_by);
  if (params?.ai_assigned_to)
    queryParams.append("ai_assigned_to", params.ai_assigned_to);
  if (params?.human_assigned_to)
    queryParams.append("human_assigned_to", params.human_assigned_to);
  if (params?.escalated !== undefined)
    queryParams.append("escalated", params.escalated.toString());
  if (params?.unassigned !== undefined)
    queryParams.append("unassigned", params.unassigned.toString());

  // NEW: Append Date Params
  if (params?.created_after)
    queryParams.append("created_after", params.created_after);
  if (params?.created_before)
    queryParams.append("created_before", params.created_before);

  const url = `/crm/chats${
    queryParams.toString() ? `?${queryParams.toString()}` : ""
  }`;

  return apiClient.get<ChatObject>(url);
};

/**
 * Get a specific chat by ID
 */
export const getChat = async (chatId: string): Promise<ChatWithDetails> => {
  return apiClient.get<ChatWithDetails>(`/crm/chats/${chatId}`);
};

/**
 * Create a new chat
 */
export const createChat = async (chatData: {
  customer_name: string;
  contact: string;
  channel: CommunicationChannel;
  initial_message: string;
  assigned_agent_id?: string | null; // <--- ALLOW NULL
}): Promise<Chat> => {
  return apiClient.post<Chat>("/crm/chats", chatData);
};

/**
 * Assign chat to an agent
 * Supports two modes:
 * 1. Assign to specific agent: Pass agentId
 * 2. Assign to current user: Pass agentId as null and assignToMe as true
 */
export const assignChat = async (
  chatId: string,
  agentId: string | null,
  options?: {
    assignToMe?: boolean;
    reason?: string;
  }
): Promise<Chat> => {
  // If assignToMe is true, use assigned_to_me parameter
  if (options?.assignToMe) {
    return apiClient.put<Chat>(`/crm/chats/${chatId}/assign`, {
      assigned_to_me: true,
      reason: options.reason,
    });
  }

  // Otherwise, use assigned_agent_id for assigning to specific agent
  return apiClient.put<Chat>(`/crm/chats/${chatId}/assign`, {
    assigned_agent_id: agentId,
  });
};

/**
 * NEW: Escalate chat to human agent
 */
export const escalateChat = async (
  chatId: string,
  data: ChatEscalationRequest
): Promise<Chat> => {
  return apiClient.put<Chat>(`/crm/chats/${chatId}/escalate`, data);
};

/**
 * Mark chat as resolved
 */
export const resolveChat = async (chatId: string): Promise<Chat> => {
  return apiClient.put<Chat>(`/crm/chats/${chatId}/resolve`, {});
};

/**
 * Get messages for a specific chat
 */
export const getChatMessages = async (
  chatId: string,
  params?: { skip?: number; limit?: number }
): Promise<MessagesResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.skip !== undefined)
    queryParams.append("skip", params.skip.toString());
  if (params?.limit !== undefined)
    queryParams.append("limit", params.limit.toString());

  const url = `/crm/chats/${chatId}/messages${
    queryParams.toString() ? `?${queryParams.toString()}` : ""
  }`;
  return apiClient.get<MessagesResponse>(url);
};

/**
 * Send a message (Text or File).
 * Matches FastAPI Endpoint: /chats/{chat_id}/messages
 */
export const sendMessage = async ({
  chatId,
  content,
  senderType,
  senderId,
  ticketId,
  file,
  metadata,
}: SendMessageParams): Promise<Message> => {
  const formData = new FormData();

  // 1. Mandatory Fields (FastAPI: Form(...))
  // We ensure content is an empty string if null, as the backend requires a string.
  formData.append("content", content || "");
  formData.append("sender_type", senderType);
  formData.append("sender_id", senderId);

  // 2. Optional Fields
  if (ticketId) {
    formData.append("ticket_id", ticketId);
  }

  // 3. Metadata (FastAPI: expects JSON string in 'metadata' field)
  // We combine existing metadata with any frontend flags if needed
  const finalMetadata = metadata || {};
  formData.append("metadata", JSON.stringify(finalMetadata));

  // 4. File (FastAPI: UploadFile)
  if (file) {
    formData.append("file", file);
  }

  // 5. Send Request
  // No need to set Content-Type; browser sets multipart/form-data boundary automatically.
  return apiClient.post<Message>(`/crm/chats/${chatId}/messages`, formData);
};

/**
 * Get all tickets with optional filters
 */
export const getTickets = async (params?: {
  status_filter?: TicketStatus;
  priority?: TicketPriority;
  assigned_agent_id?: string;
  chat_id?: string; // <--- Previously added
  search?: string;
  skip?: number;
  limit?: number;
  // NEW: Date Filtering & Sorting (The missing props)
  updated_after?: string;
  created_after?: string;
  sort_by?: "created_at" | "updated_at" | "priority" | "status";
  sort_order?: "asc" | "desc";
}): Promise<TicketsResponse> => {
  const queryParams = new URLSearchParams();

  if (params?.status_filter)
    queryParams.append("status_filter", params.status_filter);
  if (params?.priority) queryParams.append("priority", params.priority);
  if (params?.assigned_agent_id)
    queryParams.append("assigned_agent_id", params.assigned_agent_id);
  if (params?.chat_id) queryParams.append("chat_id", params.chat_id);
  if (params?.search) queryParams.append("search", params.search);

  if (params?.skip !== undefined)
    queryParams.append("skip", params.skip.toString());
  if (params?.limit !== undefined)
    queryParams.append("limit", params.limit.toString());

  // Append new params
  if (params?.updated_after)
    queryParams.append("updated_after", params.updated_after);
  if (params?.created_after)
    queryParams.append("created_after", params.created_after);
  if (params?.sort_by) queryParams.append("sort_by", params.sort_by);
  if (params?.sort_order) queryParams.append("sort_order", params.sort_order);

  const url = `/crm/tickets${
    queryParams.toString() ? `?${queryParams.toString()}` : ""
  }`;

  // Ensure the return type matches the backend response structure { tickets: [], total: n }
  return apiClient.get<TicketsResponse>(url);
};

/**
 * Get a specific ticket by ID
 */
export const getTicket = async (ticketId: string): Promise<Ticket> => {
  return apiClient.get<Ticket>(`/crm/tickets/${ticketId}`);
};

/**
 * Create a new ticket
 */
export const createTicket = async (ticketData: {
  chat_id: string;
  customer_id: string;
  title: string;
  description?: string;
  category?: string;
  priority?: TicketPriority;
  tags?: string[];
  assigned_agent_id?: string;
}): Promise<Ticket> => {
  return apiClient.post<Ticket>("/crm/tickets", ticketData);
};

/**
 * Update a ticket
 */
export const updateTicket = async (
  ticketId: string,
  updates: {
    title?: string;
    description?: string;
    category?: string;
    priority?: TicketPriority;
    status?: TicketStatus;
    assigned_agent_id?: string;
    tags?: string[];
  }
): Promise<Ticket> => {
  return apiClient.put<Ticket>(`/crm/tickets/${ticketId}`, updates);
};

/**
 * Assign ticket to an agent
 */
export const assignTicket = async (
  ticketId: string,
  agentId: string
): Promise<Ticket> => {
  return apiClient.put<Ticket>(`/crm/tickets/${ticketId}/assign`, {
    assigned_agent_id: agentId,
  });
};

/**
 * Get all customers
 */
export const getCustomers = async (params?: {
  search?: string;
  skip?: number;
  limit?: number;
}): Promise<Customer[]> => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append("search", params.search);
  if (params?.skip !== undefined)
    queryParams.append("skip", params.skip.toString());
  if (params?.limit !== undefined)
    queryParams.append("limit", params.limit.toString());

  const url = `/crm/customers${
    queryParams.toString() ? `?${queryParams.toString()}` : ""
  }`;

  // FIX: Fetch as object, but return only the 'customers' array
  const response = await apiClient.get<CustomersApiResponse>(url);
  return response.customers;
};

/**
 * Get a specific customer by ID
 */
export const getCustomer = async (customerId: string): Promise<Customer> => {
  return apiClient.get<Customer>(`/crm/customers/${customerId}`);
};

/**
 * Get activity history for a specific ticket
 */
export const getTicketActivities = async (
  ticketId: string
): Promise<TicketActivity[]> => {
  return apiClient.get<TicketActivity[]>(`/crm/tickets/${ticketId}/activities`);
};
