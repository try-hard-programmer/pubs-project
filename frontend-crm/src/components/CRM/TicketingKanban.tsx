import { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageCircle,
  Send,
  Mail,
  Globe,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Loader2,
} from "lucide-react";
import { TicketKanbanCard } from "./TicketKanbanCard";
import { TicketDetailDialog } from "./TicketDetailDialog";

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
  customerName?: string;
  chatId?: string;
  channel?: "whatsapp" | "telegram" | "email" | "web";
}

interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "busy";
}

interface TicketingKanbanProps {
  tickets: Ticket[];
  agents: Agent[];
  onUpdateTicket: (ticketId: string, updates: Partial<Ticket>) => void;
  isLoading?: boolean; // Added optional isLoading prop
}

interface Column {
  id: string;
  title: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  icon: React.ReactNode;
  color: string;
}

export const TicketingKanban = ({
  tickets,
  agents,
  onUpdateTicket,
  isLoading = false, // Default to false
}: TicketingKanbanProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAgent, setFilterAgent] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const columns: Column[] = [
    {
      id: "open",
      title: "Open",
      status: "open",
      icon: <AlertCircle className="h-4 w-4" />,
      color: "text-orange-500",
    },
    {
      id: "in_progress",
      title: "In Progress",
      status: "in_progress",
      icon: <Clock className="h-4 w-4" />,
      color: "text-blue-500",
    },
    {
      id: "resolved",
      title: "Resolved",
      status: "resolved",
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: "text-green-500",
    },
    {
      id: "closed",
      title: "Closed",
      status: "closed",
      icon: <XCircle className="h-4 w-4" />,
      color: "text-gray-500",
    },
  ];

  // Filter tickets
  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.customerName?.toLowerCase().includes(searchQuery.toLowerCase());

    // FIX: Added logic for "assigned" and "unassigned" filters
    const matchesAgent =
      filterAgent === "all" ||
      (filterAgent === "unassigned" && !ticket.assignedTo) ||
      (filterAgent === "assigned" && ticket.assignedTo) ||
      ticket.assignedTo === filterAgent;

    const matchesPriority =
      filterPriority === "all" || ticket.priority === filterPriority;

    return matchesSearch && matchesAgent && matchesPriority;
  });

  const handleDragEnd = (result: DropResult) => {
    const { destination, draggableId } = result;

    if (!destination) return;

    const newStatus = destination.droppableId as
      | "open"
      | "in_progress"
      | "resolved"
      | "closed";
    onUpdateTicket(draggableId, { status: newStatus });
  };

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setDetailDialogOpen(true);
  };

  const handleUpdateTicket = (ticketId: string, updates: Partial<Ticket>) => {
    onUpdateTicket(ticketId, updates);
    setDetailDialogOpen(false);
    setSelectedTicket(null);
  };

  // Get ticket count per column
  const getTicketCount = (status: string) => {
    return filteredTickets.filter((t) => t.status === status).length;
  };

  return (
    <>
      <div className="flex-1 flex flex-col bg-background p-3 min-w-0">
        {/* Header with filters */}
        <div className="mb-3 space-y-2">
          <div>
            <h2 className="text-lg font-bold">Ticket Management</h2>
            <p className="text-xs text-muted-foreground">
              Manage and track all customer tickets
            </p>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search tickets by number, title, or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>

            <Select value={filterAgent} onValueChange={setFilterAgent}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Filter by Agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All Agents
                </SelectItem>
                {/* FIX: Add Static Options Here */}
                <SelectItem value="unassigned" className="text-xs">
                  Unassigned
                </SelectItem>

                {/* Existing Agent List */}
                {agents
                  .filter((a) => a.status === "active")
                  .map((agent) => (
                    <SelectItem
                      key={agent.id}
                      value={agent.name}
                      className="text-xs"
                    >
                      {agent.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Filter by Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All Priorities
                </SelectItem>
                <SelectItem value="urgent" className="text-xs">
                  Urgent
                </SelectItem>
                <SelectItem value="high" className="text-xs">
                  High
                </SelectItem>
                <SelectItem value="medium" className="text-xs">
                  Medium
                </SelectItem>
                <SelectItem value="low" className="text-xs">
                  Low
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="flex gap-2">
            <Card className="flex-1">
              <CardContent className="p-2 flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-orange-100">
                  <AlertCircle className="h-3.5 w-3.5 text-orange-600" />
                </div>
                <div>
                  <p className="text-lg font-bold">{getTicketCount("open")}</p>
                  <p className="text-[10px] text-muted-foreground">Open</p>
                </div>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="p-2 flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-blue-100">
                  <Clock className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-bold">
                    {getTicketCount("in_progress")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Progress</p>
                </div>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="p-2 flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-green-100">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-bold">
                    {getTicketCount("resolved")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Resolved</p>
                </div>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="p-2 flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-gray-100">
                  <XCircle className="h-3.5 w-3.5 text-gray-600" />
                </div>
                <div>
                  <p className="text-lg font-bold">
                    {getTicketCount("closed")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Closed</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* LOADING STATE vs KANBAN BOARD */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Loading tickets...</p>
            </div>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex-1 overflow-x-auto pb-3 w-full">
              <div className="flex gap-3 min-w-max h-full">
                {columns.map((column) => {
                  const columnTickets = filteredTickets.filter(
                    (ticket) => ticket.status === column.status
                  );

                  return (
                    <Card
                      key={column.id}
                      className="w-72 flex-shrink-0 flex flex-col"
                    >
                      <CardHeader className="pb-2 pt-3 px-3 border-b">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className={column.color}>{column.icon}</div>
                            <CardTitle className="text-sm">
                              {column.title}
                            </CardTitle>
                          </div>
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-5"
                          >
                            {columnTickets.length}
                          </Badge>
                        </div>
                      </CardHeader>

                      <Droppable droppableId={column.id}>
                        {(provided, snapshot) => (
                          <ScrollArea className="flex-1">
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`p-2 space-y-2 min-h-[150px] ${
                                snapshot.isDraggingOver ? "bg-muted/50" : ""
                              }`}
                            >
                              {columnTickets.length === 0 ? (
                                <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                                  No tickets
                                </div>
                              ) : (
                                columnTickets.map((ticket, index) => (
                                  <Draggable
                                    key={ticket.id}
                                    draggableId={ticket.id}
                                    index={index}
                                  >
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        style={{
                                          ...provided.draggableProps.style,
                                          opacity: snapshot.isDragging
                                            ? 0.8
                                            : 1,
                                        }}
                                      >
                                        <TicketKanbanCard
                                          ticket={ticket}
                                          onClick={() =>
                                            handleTicketClick(ticket)
                                          }
                                        />
                                      </div>
                                    )}
                                  </Draggable>
                                ))
                              )}
                              {provided.placeholder}
                            </div>
                          </ScrollArea>
                        )}
                      </Droppable>
                    </Card>
                  );
                })}
              </div>
            </div>
          </DragDropContext>
        )}
      </div>

      {/* Ticket Detail Dialog */}
      <TicketDetailDialog
        open={detailDialogOpen}
        onClose={() => {
          setDetailDialogOpen(false);
          setSelectedTicket(null);
        }}
        ticket={selectedTicket}
        onUpdate={handleUpdateTicket}
      />
    </>
  );
};
