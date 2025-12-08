import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, User, MessageSquare } from "lucide-react";

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
  assignedTo?: string;
  tags?: string[];
  relatedMessages: string[];
  customerName?: string;
  chatId?: string;
}

interface TicketKanbanCardProps {
  ticket: Ticket;
  onClick?: () => void;
}

export const TicketKanbanCard = ({ ticket, onClick }: TicketKanbanCardProps) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500 text-white hover:bg-red-600";
      case "high":
        return "bg-orange-500 text-white hover:bg-orange-600";
      case "medium":
        return "bg-yellow-500 text-white hover:bg-yellow-600";
      case "low":
        return "bg-green-500 text-white hover:bg-green-600";
      default:
        return "bg-gray-500 text-white";
    }
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all duration-200 border-l-2"
      style={{ borderLeftColor: getPriorityColor(ticket.priority).replace("bg-", "#") }}
      onClick={onClick}
    >
      <CardContent className="p-2.5 space-y-2">
        {/* Ticket Number & Priority */}
        <div className="flex items-start justify-between gap-1.5">
          <span className="font-mono text-[10px] font-semibold text-muted-foreground">
            {ticket.ticketNumber}
          </span>
          <Badge className={`${getPriorityBadgeColor(ticket.priority)} text-[9px] h-4 px-1.5`} variant="default">
            {ticket.priority.toUpperCase()}
          </Badge>
        </div>

        {/* Title */}
        <h4 className="font-semibold text-xs line-clamp-2 leading-tight">
          {ticket.title}
        </h4>

        {/* Description */}
        <p className="text-[10px] text-muted-foreground line-clamp-1">
          {ticket.description}
        </p>

        {/* Category */}
        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
          {ticket.category}
        </Badge>

        {/* Customer Name */}
        {ticket.customerName && (
          <div className="flex items-center gap-1.5 text-[10px]">
            <User className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="text-muted-foreground truncate">{ticket.customerName}</span>
          </div>
        )}

        {/* Footer: Assigned Agent & Related Messages */}
        <div className="pt-1.5 border-t flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {ticket.assignedTo ? (
              <>
                <Avatar className="w-5 h-5">
                  <AvatarFallback className="bg-primary/10 text-primary text-[9px]">
                    {ticket.assignedTo.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[10px] font-medium truncate max-w-[100px]">{ticket.assignedTo}</span>
              </>
            ) : (
              <span className="text-[10px] text-muted-foreground italic">Unassigned</span>
            )}
          </div>

          {ticket.relatedMessages.length > 0 && (
            <div className="flex items-center gap-0.5 text-muted-foreground">
              <MessageSquare className="h-2.5 w-2.5" />
              <span className="text-[10px]">{ticket.relatedMessages.length}</span>
            </div>
          )}
        </div>

        {/* Created time */}
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          <span>{ticket.createdAt}</span>
        </div>

        {/* Tags */}
        {ticket.tags && ticket.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {ticket.tags.slice(0, 2).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-[9px] h-4 px-1.5 py-0">
                {tag}
              </Badge>
            ))}
            {ticket.tags.length > 2 && (
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 py-0">
                +{ticket.tags.length - 2}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
