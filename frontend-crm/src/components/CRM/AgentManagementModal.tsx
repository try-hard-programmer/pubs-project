import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  UserPlus,
  Search,
  Mail,
  Phone,
  Clock,
  MessageSquare,
  MoreVertical,
  Settings,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddAgentDialog } from "./AddAgentDialog";
import { AgentSettingsModal } from "./AgentSettingsModal";

interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "busy";
  avatar?: string;
  assignedChats: number;
  resolvedToday: number;
  avgResponseTime: string;
  lastActive: string;
  settings?: any;
}

interface AgentManagementModalProps {
  open: boolean;
  onClose: () => void;
  agents: Agent[];
  onAddAgent: (agent: Omit<Agent, "id" | "assignedChats" | "resolvedToday" | "avgResponseTime" | "lastActive">) => void;
  onUpdateAgentStatus: (agentId: string, status: "active" | "inactive" | "busy") => void;
  onSaveAgentSettings: (agentId: string, settings: any) => void;
}

export const AgentManagementModal = ({
  open,
  onClose,
  agents,
  onAddAgent,
  onUpdateAgentStatus,
  onSaveAgentSettings,
}: AgentManagementModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "busy">("all");
  const [addAgentOpen, setAddAgentOpen] = useState(false);
  const [settingsAgent, setSettingsAgent] = useState<Agent | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500 hover:bg-green-600 text-white">
            <div className="w-2 h-2 rounded-full bg-white mr-1.5" />
            Active
          </Badge>
        );
      case "busy":
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
            <div className="w-2 h-2 rounded-full bg-white mr-1.5" />
            Busy
          </Badge>
        );
      case "inactive":
        return (
          <Badge variant="secondary">
            <div className="w-2 h-2 rounded-full bg-gray-400 mr-1.5" />
            Inactive
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Filter agents
  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || agent.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Stats
  const activeAgents = agents.filter((a) => a.status === "active").length;
  const busyAgents = agents.filter((a) => a.status === "busy").length;
  const inactiveAgents = agents.filter((a) => a.status === "inactive").length;

  const handleAddAgent = (agentData: Omit<Agent, "id" | "assignedChats" | "resolvedToday" | "avgResponseTime" | "lastActive">) => {
    onAddAgent(agentData);
    setAddAgentOpen(false);
  };

  const handleOpenSettings = (agent: Agent) => {
    setSettingsAgent(agent);
    setSettingsOpen(true);
  };

  const handleSaveSettings = (agentId: string, settings: any) => {
    onSaveAgentSettings(agentId, settings);
    setSettingsOpen(false);
    setSettingsAgent(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold">Agent Management</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Kelola agents customer service Anda
                </p>
              </div>
              <Button onClick={() => setAddAgentOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Agent
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Stats Bar */}
            <div className="px-6 py-4 border-b bg-muted/30">
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{agents.length}</p>
                  <p className="text-xs text-muted-foreground">Total Agents</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{activeAgents}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">{busyAgents}</p>
                  <p className="text-xs text-muted-foreground">Busy</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-muted-foreground">{inactiveAgents}</p>
                  <p className="text-xs text-muted-foreground">Inactive</p>
                </div>
              </div>
            </div>

            {/* Search & Filter */}
            <div className="px-6 py-4 border-b space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search agents by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                >
                  All ({agents.length})
                </Button>
                <Button
                  variant={statusFilter === "active" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("active")}
                >
                  Active ({activeAgents})
                </Button>
                <Button
                  variant={statusFilter === "busy" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("busy")}
                >
                  Busy ({busyAgents})
                </Button>
                <Button
                  variant={statusFilter === "inactive" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("inactive")}
                >
                  Inactive ({inactiveAgents})
                </Button>
              </div>
            </div>

            {/* Agent List */}
            <ScrollArea className="flex-1 px-6">
              <div className="py-4 space-y-3">
                {filteredAgents.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No agents found</p>
                  </div>
                ) : (
                  filteredAgents.map((agent) => (
                    <Card key={agent.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <Avatar className="w-16 h-16">
                            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                              {agent.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-semibold text-lg">{agent.name}</h3>
                                {getStatusBadge(agent.status)}
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleOpenSettings(agent)}
                                  >
                                    <Settings className="h-4 w-4 mr-2" />
                                    Settings
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => onUpdateAgentStatus(agent.id, "active")}
                                  >
                                    Set as Active
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => onUpdateAgentStatus(agent.id, "busy")}
                                  >
                                    Set as Busy
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => onUpdateAgentStatus(agent.id, "inactive")}
                                  >
                                    Set as Inactive
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-red-600">
                                    Remove Agent
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-3">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="h-3.5 w-3.5" />
                                <span className="truncate">{agent.email}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="h-3.5 w-3.5" />
                                <span>{agent.phone}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>{agent.assignedChats} assigned chats</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                <span>Last active: {agent.lastActive}</span>
                              </div>
                            </div>

                            <div className="flex gap-4 pt-3 border-t">
                              <div className="text-center">
                                <p className="text-lg font-bold text-green-600">
                                  {agent.resolvedToday}
                                </p>
                                <p className="text-xs text-muted-foreground">Resolved Today</p>
                              </div>
                              <div className="text-center">
                                <p className="text-lg font-bold">{agent.avgResponseTime}</p>
                                <p className="text-xs text-muted-foreground">Avg Response</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="px-6 py-4 border-t flex justify-end gap-2 flex-shrink-0">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Agent Dialog */}
      <AddAgentDialog
        open={addAgentOpen}
        onClose={() => setAddAgentOpen(false)}
        onAdd={handleAddAgent}
      />

      {/* Agent Settings Modal */}
      <AgentSettingsModal
        open={settingsOpen}
        onClose={() => {
          setSettingsOpen(false);
          setSettingsAgent(null);
        }}
        agent={settingsAgent}
        onSave={handleSaveSettings}
      />
    </>
  );
};
