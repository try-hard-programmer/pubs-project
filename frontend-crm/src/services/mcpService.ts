import { apiClient } from "@/lib/apiClient";

/**
 * MCP Integration Service
 * Handles Model Context Protocol server connection testing and initialization.
 */

export interface MCPServerConfig {
  url: string;
  transport: "http" | "sse" | "stdio";
  apiKey?: string;
}

export interface MCPConnectionTestResponse {
  success: boolean;
  status: "connected" | "error";
  capabilities: string[];
  tools_count?: number;
  latency_ms?: number;
}

export interface MCPInitializeResponse {
  success: boolean;
  message: string;
  tools_count: number;
  tools: any[];
}

/**
 * STEP 2: Test connection to an external MCP server
 * Endpoint: POST /crm/agents/{agent_id}/mcp/test-connection
 * Body: Empty (Relies on saved config from Step 1)
 */
export const testConnection = async (
  agentId: string,
): Promise<MCPConnectionTestResponse> => {
  return apiClient.post<MCPConnectionTestResponse>(
    `/crm/agents/${agentId}/mcp/test-connection`,
    {}, // MANDATORY: Empty body for SSRF protection
  );
};

/**
 * STEP 3: Initialize the server to fetch resources and build OpenAI tools
 * Endpoint: POST /crm/agents/{agent_id}/mcp/initialize
 * Body: Empty (Relies on saved config from Step 1)
 */
export const initializeServer = async (
  agentId: string,
): Promise<MCPInitializeResponse> => {
  return apiClient.post<MCPInitializeResponse>(
    `/crm/agents/${agentId}/mcp/initialize`,
    {}, // MANDATORY: Empty body for SSRF protection
  );
};
