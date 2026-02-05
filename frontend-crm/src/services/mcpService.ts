import { apiClient } from "@/lib/apiClient";

/**
 * MCP Integration Service
 * Handles Model Context Protocol server connection testing
 */

export interface MCPServerConfig {
  url: string;
  transport: "http" | "sse" | "stdio"; // stdio might need tunneling, but keeping type definition
  apiKey?: string;
}

export interface MCPConnectionTestResponse {
  success: boolean;
  status: "connected" | "error";
  capabilities: string[]; // e.g. ["tools/list", "resources/read"]
  latency_ms: number;
}

/**
 * Test connection to an external MCP server via the Backend
 * Endpoint: POST /crm/agents/mcp/test-connection
 */
export const testConnection = async (
  config: MCPServerConfig,
): Promise<MCPConnectionTestResponse> => {
  return apiClient.post<MCPConnectionTestResponse>(
    "/crm/agents/mcp/test-connection",
    {
      url: config.url,
      transport: config.transport,
      apiKey: config.apiKey,
    },
  );
};
