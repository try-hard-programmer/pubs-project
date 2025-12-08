import { apiClient } from '@/lib/apiClient';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Agent status enum matching backend
 */
export type AgentStatus = 'active' | 'inactive' | 'busy';

/**
 * Backend Agent entity (snake_case as returned by API)
 */
export interface AgentBackend {
  id: string;
  organization_id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string;
  status: AgentStatus;
  avatar_url: string | null;
  assigned_chats_count: number;
  resolved_today_count: number;
  avg_response_time_seconds: number;
  last_active_at: string; // ISO timestamp
  created_at: string;
  updated_at: string;
}

/**
 * Frontend Agent entity (camelCase as used in components)
 */
export interface AgentFrontend {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: AgentStatus;
  avatar?: string;
  assignedChats: number;
  resolvedToday: number;
  avgResponseTime: string; // Human-readable format like "2.5 min"
  lastActive: string; // Human-readable format like "Just now"
  settings?: any;
}

/**
 * Request payload for creating a new agent
 */
export interface CreateAgentRequest {
  name: string;
  email: string;
  phone: string;
  status?: AgentStatus;
  avatar_url?: string | null;
  user_id?: string | null;
}

/**
 * Request payload for updating an agent
 */
export interface UpdateAgentRequest {
  name?: string;
  email?: string;
  phone?: string;
  status?: AgentStatus;
  avatar_url?: string | null;
  user_id?: string | null;
}

/**
 * Request payload for updating agent status
 */
export interface UpdateAgentStatusRequest {
  status: AgentStatus;
}

/**
 * Agent settings configuration (backend response format - snake_case)
 */
export interface AgentSettingsBackend {
  id: string;
  agent_id: string;
  persona_config: {
    name: string;
    language: string;
    tone: string;
    customInstructions: string;
  };
  schedule_config: {
    enabled: boolean;
    timezone: string;
    workingHours: Array<{
      day: string; // 0=Monday, 6=Sunday
      enabled: boolean;
      start: string; // HH:mm format
      end: string; // HH:mm format
    }>;
  };
  advanced_config: {
    temperature: string; // "consistent" | "balanced" | "creative"
    historyLimit: number;
    handoffTriggers: {
      enabled: boolean;
      keywords: string[];
      sentimentThreshold: number;
      unansweredQuestions: number;
      escalationMessage: string;
    };
  };
  ticketing_config: {
    enabled: boolean;
    autoCreateTicket: boolean;
    ticketPrefix: string;
    requireCategory: boolean;
    requirePriority: boolean;
    autoCloseAfterResolved: boolean;
    autoCloseDelay: number; // in hours
    categories: string[];
  };
  created_at: string;
  updated_at: string;
}

/**
 * Agent settings for frontend (camelCase + transformed)
 */
export interface AgentSettingsFrontend {
  id: string;
  agentId: string;
  persona: {
    name: string;
    language: string;
    tone: string;
    customInstructions: string;
  };
  schedule: {
    enabled: boolean;
    timezone: string;
    workingHours: Array<{
      day: string; // "Senin", "Selasa", etc.
      dayIndex: number; // 0=Monday, 6=Sunday
      enabled: boolean;
      start: string;
      end: string;
    }>;
  };
  advanced: {
    temperature: "consistent" | "balanced" | "creative";
    historyLimit: number;
    handoffTriggers: {
      enabled: boolean;
      keywords: string[];
      sentimentThreshold: number;
      unansweredQuestions: number;
      escalationMessage: string;
    };
  };
  ticketing: {
    enabled: boolean;
    autoCreateTicket: boolean;
    ticketPrefix: string;
    requireCategory: boolean;
    requirePriority: boolean;
    autoCloseAfterResolved: boolean;
    autoCloseDelay: number;
    categories: string[];
  };
}

/**
 * Knowledge document entity
 */
export interface KnowledgeDocument {
  id: string;
  agent_id: string;
  name: string;
  file_url: string;
  file_type: string;
  file_size_kb: number;
  uploaded_at: string;
  metadata: Record<string, any>;
}

/**
 * Integration channel type
 */
export type IntegrationChannel = 'whatsapp' | 'telegram' | 'email' | 'web' | 'mcp';

/**
 * Integration status
 */
export type IntegrationStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

/**
 * Agent integration entity
 */
export interface AgentIntegration {
  id: string;
  agent_id: string;
  channel: IntegrationChannel;
  enabled: boolean;
  config: Record<string, any>;
  status: IntegrationStatus;
  last_connected_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * API Response wrapper for list endpoints
 */
export interface AgentsListResponse {
  agents: AgentBackend[];
  total: number;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Convert seconds to human-readable time format
 * @param seconds - Response time in seconds
 * @returns Formatted string like "2.5 min" or "30 sec"
 */
function formatResponseTime(seconds: number): string {
  if (seconds === 0) return 'N/A';
  if (seconds < 60) return `${seconds} sec`;
  const minutes = Math.round((seconds / 60) * 10) / 10;
  return `${minutes} min`;
}

/**
 * Convert ISO timestamp to relative time format
 * @param isoTimestamp - ISO 8601 timestamp string
 * @returns Formatted string like "Just now" or "5 min ago"
 */
function formatRelativeTime(isoTimestamp: string): string {
  const now = new Date();
  const timestamp = new Date(isoTimestamp);
  const diffMs = now.getTime() - timestamp.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

/**
 * Transform backend agent entity to frontend format
 * @param backendAgent - Agent data from API (snake_case)
 * @returns Agent data for frontend (camelCase)
 */
export function transformAgentToFrontend(backendAgent: AgentBackend): AgentFrontend {
  return {
    id: backendAgent.id,
    name: backendAgent.name,
    email: backendAgent.email,
    phone: backendAgent.phone,
    status: backendAgent.status,
    avatar: backendAgent.avatar_url || undefined,
    assignedChats: backendAgent.assigned_chats_count,
    resolvedToday: backendAgent.resolved_today_count,
    avgResponseTime: formatResponseTime(backendAgent.avg_response_time_seconds),
    lastActive: formatRelativeTime(backendAgent.last_active_at),
  };
}

/**
 * Transform frontend agent data to backend create request
 * @param frontendData - Agent data from frontend form
 * @returns Create request payload for API
 */
export function transformAgentToCreateRequest(
  frontendData: Omit<AgentFrontend, 'id' | 'assignedChats' | 'resolvedToday' | 'avgResponseTime' | 'lastActive'>
): CreateAgentRequest {
  return {
    name: frontendData.name,
    email: frontendData.email,
    phone: frontendData.phone,
    status: frontendData.status,
    avatar_url: frontendData.avatar || null,
  };
}

// ============================================
// API SERVICE FUNCTIONS
// ============================================

/**
 * Get list of agents with optional filters
 * @param statusFilter - Filter by agent status (active/inactive/busy)
 * @param search - Search by name or email
 * @returns Array of agents in frontend format
 */
export async function getAgents(
  statusFilter?: AgentStatus,
  search?: string
): Promise<AgentFrontend[]> {
  try {
    // Build query params
    const params = new URLSearchParams();
    if (statusFilter) params.append('status_filter', statusFilter);
    if (search) params.append('search', search);

    const queryString = params.toString();
    const endpoint = `/crm/agents/${queryString ? `?${queryString}` : ''}`;

    // API returns { agents: [...], total: number }
    const response = await apiClient.get<AgentsListResponse>(endpoint);
    return response.agents.map(transformAgentToFrontend);
  } catch (error) {
    console.error('[CRM Agents Service] Error fetching agents:', error);
    throw new Error('Failed to fetch agents. Please try again.');
  }
}

/**
 * Get a single agent by ID
 * @param agentId - Agent UUID
 * @returns Agent data in frontend format
 */
export async function getAgentById(agentId: string): Promise<AgentFrontend> {
  try {
    const backendAgent = await apiClient.get<AgentBackend>(`/crm/agents/${agentId}`);
    return transformAgentToFrontend(backendAgent);
  } catch (error) {
    console.error(`[CRM Agents Service] Error fetching agent ${agentId}:`, error);
    throw new Error('Failed to fetch agent details. Please try again.');
  }
}

/**
 * Create a new agent
 * @param agentData - Agent data from frontend form
 * @returns Created agent in frontend format
 */
export async function createAgent(
  agentData: Omit<AgentFrontend, 'id' | 'assignedChats' | 'resolvedToday' | 'avgResponseTime' | 'lastActive'>
): Promise<AgentFrontend> {
  try {
    const createRequest = transformAgentToCreateRequest(agentData);
    const backendAgent = await apiClient.post<AgentBackend>('/crm/agents/', createRequest);
    return transformAgentToFrontend(backendAgent);
  } catch (error) {
    console.error('[CRM Agents Service] Error creating agent:', error);
    throw new Error('Failed to create agent. Please try again.');
  }
}

/**
 * Update an existing agent
 * @param agentId - Agent UUID
 * @param agentData - Partial agent data to update
 * @returns Updated agent in frontend format
 */
export async function updateAgent(
  agentId: string,
  agentData: Partial<Omit<AgentFrontend, 'id' | 'assignedChats' | 'resolvedToday' | 'avgResponseTime' | 'lastActive'>>
): Promise<AgentFrontend> {
  try {
    const updateRequest: UpdateAgentRequest = {
      name: agentData.name,
      email: agentData.email,
      phone: agentData.phone,
      status: agentData.status,
      avatar_url: agentData.avatar || null,
    };

    const backendAgent = await apiClient.put<AgentBackend>(
      `/crm/agents/${agentId}`,
      updateRequest
    );
    return transformAgentToFrontend(backendAgent);
  } catch (error) {
    console.error(`[CRM Agents Service] Error updating agent ${agentId}:`, error);
    throw new Error('Failed to update agent. Please try again.');
  }
}

/**
 * Delete an agent
 * @param agentId - Agent UUID
 */
export async function deleteAgent(agentId: string): Promise<void> {
  try {
    await apiClient.delete(`/crm/agents/${agentId}`);
  } catch (error) {
    console.error(`[CRM Agents Service] Error deleting agent ${agentId}:`, error);
    throw new Error('Failed to delete agent. Please try again.');
  }
}

/**
 * Update agent status (active/inactive/busy)
 * @param agentId - Agent UUID
 * @param status - New agent status
 * @returns Updated agent in frontend format
 */
export async function updateAgentStatus(
  agentId: string,
  status: AgentStatus
): Promise<AgentFrontend> {
  try {
    const statusRequest: UpdateAgentStatusRequest = { status };
    const backendAgent = await apiClient.patch<AgentBackend>(
      `/crm/agents/${agentId}/status`,
      statusRequest
    );
    return transformAgentToFrontend(backendAgent);
  } catch (error) {
    console.error(`[CRM Agents Service] Error updating agent status ${agentId}:`, error);
    throw new Error('Failed to update agent status. Please try again.');
  }
}

/**
 * Transform backend settings to frontend format
 * @param backendSettings - Settings from API
 * @returns Frontend formatted settings
 */
export function transformSettingsToFrontend(backendSettings: AgentSettingsBackend): AgentSettingsFrontend {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const getDayIndex = (day: string): number => {
    const index = dayNames.indexOf(day.toLowerCase());
    return index === -1 ? 0 : index; // Default to 0 (Monday) if not found
  }

  return {
    id: backendSettings.id,
    agentId: backendSettings.agent_id,
    persona: {
      name: backendSettings.persona_config.name,
      language: backendSettings.persona_config.language,
      tone: backendSettings.persona_config.tone,
      customInstructions: backendSettings.persona_config.customInstructions,
    },
    schedule: {
      enabled: backendSettings.schedule_config.enabled,
      timezone: backendSettings.schedule_config.timezone,
      workingHours: (backendSettings.schedule_config.workingHours || []).map((wh) => ({
        day: wh.day,
        dayIndex: getDayIndex(wh.day),
        enabled: wh.enabled,
        start: wh.start,
        end: wh.end,
      })),
    },
    advanced: {
      temperature: backendSettings.advanced_config.temperature as any,
      historyLimit: backendSettings.advanced_config.historyLimit,
      handoffTriggers: {
        enabled: backendSettings.advanced_config.handoffTriggers.enabled,
        keywords: backendSettings.advanced_config.handoffTriggers.keywords || [],
        sentimentThreshold: backendSettings.advanced_config.handoffTriggers.sentimentThreshold,
        unansweredQuestions: backendSettings.advanced_config.handoffTriggers.unansweredQuestions,
        escalationMessage: backendSettings.advanced_config.handoffTriggers.escalationMessage,
      },
    },
    ticketing: {
      enabled: backendSettings.ticketing_config.enabled,
      autoCreateTicket: backendSettings.ticketing_config.autoCreateTicket,
      ticketPrefix: backendSettings.ticketing_config.ticketPrefix,
      requireCategory: backendSettings.ticketing_config.requireCategory,
      requirePriority: backendSettings.ticketing_config.requirePriority,
      autoCloseAfterResolved: backendSettings.ticketing_config.autoCloseAfterResolved,
      autoCloseDelay: backendSettings.ticketing_config.autoCloseDelay,
      categories: backendSettings.ticketing_config.categories || [],
    },
  };
}

/**
 * Transform frontend settings to backend format
 * @param frontendSettings - Settings from frontend
 * @returns Backend formatted settings (only configs, no id/timestamps)
 */
export function transformSettingsToBackend(frontendSettings: AgentSettingsFrontend): Omit<AgentSettingsBackend, 'id' | 'agent_id' | 'created_at' | 'updated_at'> {
  // Mapping from English day names to dayIndex (0=Monday, 6=Sunday)
  const dayNameToIndex: Record<string, number> = {
    'monday': 0,
    'tuesday': 1,
    'wednesday': 2,
    'thursday': 3,
    'friday': 4,
    'saturday': 5,
    'sunday': 6,
  };

  return {
    persona_config: {
      name: frontendSettings.persona.name,
      language: frontendSettings.persona.language,
      tone: frontendSettings.persona.tone,
      customInstructions: frontendSettings.persona.customInstructions,
    },
    schedule_config: {
      enabled: frontendSettings.schedule.enabled,
      timezone: frontendSettings.schedule.timezone,
      workingHours: frontendSettings.schedule.workingHours.map((wh) => {
        // Use dayIndex if available, otherwise try to derive from day name string
        let dayNum: number;
        if (typeof wh.dayIndex === 'number') {
          dayNum = wh.dayIndex;
        } else if (typeof wh.day === 'string') {
          const dayKey = wh.day.toLowerCase();
          dayNum = dayNameToIndex[dayKey] ?? 0; // Default to 0 (Monday) if not found
        } else {
          dayNum = 0; // Default fallback
        }

        return {
          day: dayNum,
          enabled: wh.enabled,
          start: wh.start,
          end: wh.end,
        };
      }),
    },
    advanced_config: {
      temperature: frontendSettings.advanced.temperature,
      historyLimit: frontendSettings.advanced.historyLimit,
      handoffTriggers: {
        enabled: frontendSettings.advanced.handoffTriggers.enabled,
        keywords: frontendSettings.advanced.handoffTriggers.keywords,
        sentimentThreshold: frontendSettings.advanced.handoffTriggers.sentimentThreshold,
        unansweredQuestions: frontendSettings.advanced.handoffTriggers.unansweredQuestions,
        escalationMessage: frontendSettings.advanced.handoffTriggers.escalationMessage,
      },
    },
    ticketing_config: {
      enabled: frontendSettings.ticketing.enabled,
      autoCreateTicket: frontendSettings.ticketing.autoCreateTicket,
      ticketPrefix: frontendSettings.ticketing.ticketPrefix,
      requireCategory: frontendSettings.ticketing.requireCategory,
      requirePriority: frontendSettings.ticketing.requirePriority,
      autoCloseAfterResolved: frontendSettings.ticketing.autoCloseAfterResolved,
      autoCloseDelay: frontendSettings.ticketing.autoCloseDelay,
      categories: frontendSettings.ticketing.categories,
    },
  };
}

/**
 * Get agent settings/configuration
 * @param agentId - Agent UUID
 * @returns Agent settings object in frontend format
 */
export async function getAgentSettings(agentId: string): Promise<AgentSettingsFrontend> {
  try {
    const backendSettings = await apiClient.get<AgentSettingsBackend>(`/crm/agents/${agentId}/settings`);
    return transformSettingsToFrontend(backendSettings);
  } catch (error) {
    console.error(`[CRM Agents Service] Error fetching agent settings ${agentId}:`, error);
    throw new Error('Failed to fetch agent settings. Please try again.');
  }
}

/**
 * Update agent settings/configuration
 * @param agentId - Agent UUID
 * @param settings - Settings object to update (frontend format)
 * @returns Updated settings object in frontend format
 */
export async function updateAgentSettings(
  agentId: string,
  settings: AgentSettingsFrontend
): Promise<AgentSettingsFrontend> {
  try {
    const backendPayload = transformSettingsToBackend(settings);
    const updatedSettings = await apiClient.put<AgentSettingsBackend>(
      `/crm/agents/${agentId}/settings`,
      backendPayload
    );
    return transformSettingsToFrontend(updatedSettings);
  } catch (error) {
    console.error(`[CRM Agents Service] Error updating agent settings ${agentId}:`, error);
    throw new Error('Failed to update agent settings. Please try again.');
  }
}

/**
 * Get agent knowledge documents
 * @param agentId - Agent UUID
 * @returns Array of knowledge documents
 */
export async function getKnowledgeDocuments(agentId: string): Promise<KnowledgeDocument[]> {
  try {
    const documents = await apiClient.get<KnowledgeDocument[]>(
      `/crm/agents/${agentId}/knowledge-documents`
    );
    return documents;
  } catch (error) {
    console.error(`[CRM Agents Service] Error fetching knowledge documents ${agentId}:`, error);
    throw new Error('Failed to fetch knowledge documents. Please try again.');
  }
}

/**
 * Upload a knowledge document for an agent
 * @param agentId - Agent UUID
 * @param file - File to upload
 * @returns Created knowledge document
 */
export async function uploadKnowledgeDocument(
  agentId: string,
  file: File
): Promise<KnowledgeDocument> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const document = await apiClient.post<KnowledgeDocument>(
      `/crm/agents/${agentId}/knowledge-documents`,
      formData
    );
    return document;
  } catch (error) {
    console.error(`[CRM Agents Service] Error uploading knowledge document ${agentId}:`, error);
    throw new Error('Failed to upload knowledge document. Please try again.');
  }
}

/**
 * Delete a knowledge document
 * @param agentId - Agent UUID
 * @param documentId - Document UUID
 */
export async function deleteKnowledgeDocument(
  agentId: string,
  documentId: string
): Promise<void> {
  try {
    await apiClient.delete(`/crm/agents/${agentId}/knowledge-documents/${documentId}`);
  } catch (error) {
    console.error(`[CRM Agents Service] Error deleting knowledge document ${documentId}:`, error);
    throw new Error('Failed to delete knowledge document. Please try again.');
  }
}

/**
 * Get agent integrations (WhatsApp, Telegram, Email, etc.)
 * @param agentId - Agent UUID
 * @returns Array of agent integrations
 */
export async function getAgentIntegrations(agentId: string): Promise<AgentIntegration[]> {
  try {
    const integrations = await apiClient.get<AgentIntegration[]>(
      `/crm/agents/${agentId}/integrations`
    );
    return integrations;
  } catch (error) {
    console.error(`[CRM Agents Service] Error fetching agent integrations ${agentId}:`, error);
    throw new Error('Failed to fetch agent integrations. Please try again.');
  }
}

/**
 * Update agent integration for a specific channel
 * @param agentId - Agent UUID
 * @param channel - Integration channel (whatsapp/telegram/email/web/mcp)
 * @param config - Integration configuration
 * @returns Updated integration
 */
export async function updateAgentIntegration(
  agentId: string,
  channel: IntegrationChannel,
  config: {
    enabled?: boolean;
    config?: Record<string, any>;
    status?: IntegrationStatus;
  }
): Promise<AgentIntegration> {
  try {
    const integration = await apiClient.put<AgentIntegration>(
      `/crm/agents/${agentId}/integrations/${channel}`,
      config
    );
    return integration;
  } catch (error) {
    console.error(`[CRM Agents Service] Error updating agent integration ${agentId}/${channel}:`, error);
    throw new Error('Failed to update agent integration. Please try again.');
  }
}
