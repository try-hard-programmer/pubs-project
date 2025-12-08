import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plug2,
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  Info,
  Server,
  Eye,
  EyeOff,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface MCPIntegrationProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  config: Record<string, any>;
  onConfigUpdate: (config: Record<string, any>) => void;
}

type ConnectionStatus = "disconnected" | "testing" | "connected" | "error";

interface MCPServer {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  description: string;
  transport: "stdio" | "sse" | "http";
  status: ConnectionStatus;
  capabilities?: string[];
  lastConnected?: string;
}

export const MCPIntegration = ({
  enabled,
  onToggle,
  config,
  onConfigUpdate,
}: MCPIntegrationProps) => {
  const [servers, setServers] = useState<MCPServer[]>(config.servers || []);
  const [isAddingServer, setIsAddingServer] = useState(false);
  const [testingServerId, setTestingServerId] = useState<string | null>(null);

  // New server form state
  const [newServer, setNewServer] = useState<Partial<MCPServer>>({
    name: "",
    url: "",
    apiKey: "",
    description: "",
    transport: "http",
  });

  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState("");

  const validateServerForm = (): boolean => {
    if (!newServer.name?.trim()) {
      setErrorMessage("Server name tidak boleh kosong");
      return false;
    }

    if (!newServer.url?.trim()) {
      setErrorMessage("Server URL tidak boleh kosong");
      return false;
    }

    // URL validation
    try {
      new URL(newServer.url);
    } catch {
      setErrorMessage("Format URL tidak valid");
      return false;
    }

    return true;
  };

  const handleAddServer = () => {
    setErrorMessage("");

    if (!validateServerForm()) {
      return;
    }

    const server: MCPServer = {
      id: Date.now().toString(),
      name: newServer.name!,
      url: newServer.url!,
      apiKey: newServer.apiKey || "",
      description: newServer.description || "",
      transport: (newServer.transport as "stdio" | "sse" | "http") || "http",
      status: "disconnected",
    };

    const updatedServers = [...servers, server];
    setServers(updatedServers);
    onConfigUpdate({ ...config, servers: updatedServers });

    // Reset form
    setNewServer({
      name: "",
      url: "",
      apiKey: "",
      description: "",
      transport: "http",
    });
    setIsAddingServer(false);
  };

  const handleTestConnection = async (serverId: string) => {
    setTestingServerId(serverId);
    setErrorMessage("");

    // Update server status to testing
    const updatedServers = servers.map((s) =>
      s.id === serverId ? { ...s, status: "testing" as ConnectionStatus } : s
    );
    setServers(updatedServers);

    // Simulate MCP server connection test (in real app, this would call backend)
    setTimeout(() => {
      // Simulate 80% success rate
      if (Math.random() > 0.2) {
        const connectedServers = servers.map((s) =>
          s.id === serverId
            ? {
                ...s,
                status: "connected" as ConnectionStatus,
                lastConnected: new Date().toISOString(),
                capabilities: [
                  "tools/list",
                  "tools/call",
                  "prompts/list",
                  "resources/list",
                  "resources/read",
                ],
              }
            : s
        );
        setServers(connectedServers);
        onConfigUpdate({ ...config, servers: connectedServers });
      } else {
        const errorServers = servers.map((s) =>
          s.id === serverId ? { ...s, status: "error" as ConnectionStatus } : s
        );
        setServers(errorServers);
        setErrorMessage(`Failed to connect to ${servers.find((s) => s.id === serverId)?.name}`);
      }
      setTestingServerId(null);
    }, 2000);
  };

  const handleRemoveServer = (serverId: string) => {
    const updatedServers = servers.filter((s) => s.id !== serverId);
    setServers(updatedServers);
    onConfigUpdate({ ...config, servers: updatedServers });
  };

  const toggleApiKeyVisibility = (serverId: string) => {
    setShowApiKeys((prev) => ({
      ...prev,
      [serverId]: !prev[serverId],
    }));
  };

  const getStatusBadge = (status: ConnectionStatus) => {
    switch (status) {
      case "connected":
        return (
          <Badge className="bg-green-500 gap-1">
            <CheckCircle className="h-3 w-3" />
            Connected
          </Badge>
        );
      case "testing":
        return (
          <Badge className="bg-blue-500 gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Testing...
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="h-3 w-3" />
            Not Connected
          </Badge>
        );
    }
  };

  const getTransportBadge = (transport: string) => {
    const colors = {
      stdio: "bg-purple-100 text-purple-700 border-purple-200",
      sse: "bg-blue-100 text-blue-700 border-blue-200",
      http: "bg-green-100 text-green-700 border-green-200",
    };
    return (
      <Badge variant="outline" className={colors[transport as keyof typeof colors]}>
        {transport.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Plug2 className="h-5 w-5 text-indigo-600" />
            <div>
              <CardTitle>MCP (Model Context Protocol)</CardTitle>
              <CardDescription>
                Connect agent dengan external MCP servers untuk extended capabilities
              </CardDescription>
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-4">
          {/* Info Alert */}
          <Alert className="bg-indigo-50 border-indigo-200">
            <Info className="h-4 w-4 text-indigo-600" />
            <AlertDescription className="text-indigo-800 text-xs">
              <strong>MCP (Model Context Protocol)</strong> memungkinkan agent terhubung ke
              external servers untuk mengakses tools, prompts, dan resources tambahan. Baca
              dokumentasi di{" "}
              <a
                href="https://modelcontextprotocol.io"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline inline-flex items-center gap-1"
              >
                modelcontextprotocol.io
                <ExternalLink className="h-3 w-3" />
              </a>
            </AlertDescription>
          </Alert>

          {/* Connected Servers Count */}
          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Connected Servers:</span>
            </div>
            <Badge variant="outline">
              {servers.filter((s) => s.status === "connected").length} / {servers.length}
            </Badge>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Server List */}
          {servers.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Configured MCP Servers</Label>
              {servers.map((server) => (
                <Card key={server.id} className="border-2">
                  <CardContent className="p-4 space-y-3">
                    {/* Server Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{server.name}</h4>
                          {getTransportBadge(server.transport)}
                        </div>
                        {server.description && (
                          <p className="text-xs text-muted-foreground mb-2">
                            {server.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <code className="bg-muted px-2 py-0.5 rounded">
                            {server.url}
                          </code>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(server.status)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveServer(server.id)}
                          disabled={testingServerId === server.id}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    {/* API Key (if exists) */}
                    {server.apiKey && (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">API Key:</Label>
                        <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                          {showApiKeys[server.id]
                            ? server.apiKey
                            : "•".repeat(Math.min(server.apiKey.length, 32))}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleApiKeyVisibility(server.id)}
                        >
                          {showApiKeys[server.id] ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Capabilities (if connected) */}
                    {server.status === "connected" && server.capabilities && (
                      <div className="space-y-1">
                        <Label className="text-xs">Capabilities:</Label>
                        <div className="flex flex-wrap gap-1">
                          {server.capabilities.map((cap, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs py-0">
                              {cap}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Last Connected */}
                    {server.lastConnected && (
                      <p className="text-xs text-muted-foreground">
                        Last connected:{" "}
                        {new Date(server.lastConnected).toLocaleString()}
                      </p>
                    )}

                    {/* Test Connection Button */}
                    <Button
                      size="sm"
                      variant={server.status === "connected" ? "outline" : "default"}
                      onClick={() => handleTestConnection(server.id)}
                      disabled={testingServerId === server.id}
                      className="w-full gap-2"
                    >
                      {testingServerId === server.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Testing Connection...
                        </>
                      ) : server.status === "connected" ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Reconnect
                        </>
                      ) : (
                        <>
                          <Plug2 className="h-4 w-4" />
                          Test Connection
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Add Server Button */}
          {!isAddingServer && (
            <Button
              variant="outline"
              onClick={() => setIsAddingServer(true)}
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" />
              Add MCP Server
            </Button>
          )}

          {/* Add Server Form */}
          {isAddingServer && (
            <Card className="border-2 border-dashed">
              <CardHeader>
                <CardTitle className="text-base">Add New MCP Server</CardTitle>
                <CardDescription>
                  Configure connection to external MCP server
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Server Name */}
                <div className="space-y-2">
                  <Label htmlFor="serverName">
                    Server Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="serverName"
                    placeholder="e.g., Filesystem Tools, Database Access"
                    value={newServer.name}
                    onChange={(e) =>
                      setNewServer((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>

                {/* Transport Type */}
                <div className="space-y-2">
                  <Label htmlFor="transport">Transport Protocol</Label>
                  <Select
                    value={newServer.transport}
                    onValueChange={(value) =>
                      setNewServer((prev) => ({ ...prev, transport: value }))
                    }
                  >
                    <SelectTrigger id="transport">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="http">HTTP (REST API)</SelectItem>
                      <SelectItem value="sse">SSE (Server-Sent Events)</SelectItem>
                      <SelectItem value="stdio">STDIO (Standard I/O)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    HTTP untuk most cases, SSE untuk real-time, STDIO untuk local processes
                  </p>
                </div>

                {/* Server URL */}
                <div className="space-y-2">
                  <Label htmlFor="serverUrl">
                    Server URL <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="serverUrl"
                    placeholder="https://mcp.example.com or ws://localhost:3000"
                    value={newServer.url}
                    onChange={(e) =>
                      setNewServer((prev) => ({ ...prev, url: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    HTTP/HTTPS untuk REST, WS/WSS untuk WebSocket, atau command untuk STDIO
                  </p>
                </div>

                {/* API Key (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key (Optional)</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Enter API key if required"
                    value={newServer.apiKey}
                    onChange={(e) =>
                      setNewServer((prev) => ({ ...prev, apiKey: e.target.value }))
                    }
                  />
                </div>

                {/* Description (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this MCP server provides..."
                    rows={2}
                    value={newServer.description}
                    onChange={(e) =>
                      setNewServer((prev) => ({ ...prev, description: e.target.value }))
                    }
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddingServer(false);
                      setNewServer({
                        name: "",
                        url: "",
                        apiKey: "",
                        description: "",
                        transport: "http",
                      });
                      setErrorMessage("");
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddServer}
                    disabled={!newServer.name || !newServer.url}
                    className="flex-1 gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Server
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* MCP Examples */}
          {servers.length === 0 && !isAddingServer && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <h4 className="font-semibold text-sm">Example MCP Servers:</h4>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="p-2 bg-background rounded border">
                  <p className="font-medium text-foreground mb-1">Filesystem Server</p>
                  <code className="text-xs">npx -y @modelcontextprotocol/server-filesystem</code>
                  <p className="mt-1">Provides file read/write capabilities</p>
                </div>
                <div className="p-2 bg-background rounded border">
                  <p className="font-medium text-foreground mb-1">GitHub Server</p>
                  <code className="text-xs">npx -y @modelcontextprotocol/server-github</code>
                  <p className="mt-1">Access GitHub repositories and issues</p>
                </div>
                <div className="p-2 bg-background rounded border">
                  <p className="font-medium text-foreground mb-1">PostgreSQL Server</p>
                  <code className="text-xs">npx -y @modelcontextprotocol/server-postgres</code>
                  <p className="mt-1">Database query and management</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                Visit{" "}
                <a
                  href="https://github.com/modelcontextprotocol/servers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  MCP Servers Repository
                </a>{" "}
                for more examples.
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
