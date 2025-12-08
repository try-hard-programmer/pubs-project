import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Ticket as TicketIcon,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { CreateTicketDialog } from "./CreateTicketDialog";
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
}

interface TicketPanelProps {
  tickets: Ticket[];
  onCreateTicket: (
    ticket: Omit<
      Ticket,
      "id" | "ticketNumber" | "createdAt" | "updatedAt" | "relatedMessages"
    >
  ) => void;
  onUpdateTicket: (ticketId: string, updates: Partial<Ticket>) => void;
}

export const TicketPanel = ({
  tickets,
  onCreateTicket,
  onUpdateTicket,
}: TicketPanelProps) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500 text-white";
      case "high":
        return "bg-orange-500 text-white";
      case "medium":
        return "bg-yellow-500 text-white";
      case "low":
        return "bg-green-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "resolved":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "closed":
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="secondary">Open</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500 text-white">In Progress</Badge>;
      case "resolved":
        return <Badge className="bg-green-500 text-white">Resolved</Badge>;
      case "closed":
        return <Badge variant="outline">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setDetailDialogOpen(true);
  };

  const handleCreateTicket = (
    ticketData: Omit<
      Ticket,
      "id" | "ticketNumber" | "createdAt" | "updatedAt" | "relatedMessages"
    >
  ) => {
    onCreateTicket(ticketData);
    setCreateDialogOpen(false);
  };

  const handleUpdateTicket = (ticketId: string, updates: Partial<Ticket>) => {
    onUpdateTicket(ticketId, updates);
    setDetailDialogOpen(false);
    setSelectedTicket(null);
  };

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TicketIcon className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">
                Tickets ({tickets.length})
              </CardTitle>
            </div>
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Ticket
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto min-h-0 space-y-4 p-4">
          {tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <TicketIcon className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Tidak ada ticket untuk chat ini
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Ticket
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {tickets.map((ticket) => (
                  <Card
                    key={ticket.id}
                    className="cursor-pointer hover:shadow-md transition-all border-l-4"
                    style={{
                      borderLeftColor:
                        ticket.priority === "urgent"
                          ? "#ef4444"
                          : ticket.priority === "high"
                          ? "#f97316"
                          : ticket.priority === "medium"
                          ? "#eab308"
                          : "#22c55e",
                    }}
                    onClick={() => handleTicketClick(ticket)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(ticket.status)}
                          <span className="font-mono text-xs font-semibold text-muted-foreground">
                            {ticket.ticketNumber}
                          </span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>

                      <h4 className="font-semibold text-sm mb-1 line-clamp-1">
                        {ticket.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {ticket.description}
                      </p>

                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(ticket.status)}
                        <Badge
                          variant="outline"
                          className={getPriorityColor(ticket.priority)}
                        >
                          {ticket.priority.toUpperCase()}
                        </Badge>
                        <Badge variant="secondary">{ticket.category}</Badge>
                      </div>

                      <div className="mt-2 pt-2 border-t flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Created: {ticket.createdAt}
                        </span>
                        {ticket.assignedTo && (
                          <span className="text-xs font-medium text-primary">
                            {ticket.assignedTo}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Create Ticket Dialog */}
      <CreateTicketDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={handleCreateTicket}
      />

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
