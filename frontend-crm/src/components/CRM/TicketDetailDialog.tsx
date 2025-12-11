import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Ticket as TicketIcon,
  Calendar,
  User,
  Tag,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Edit,
  Bot,
  Laptop,
  History,
  Loader2,
} from "lucide-react";
import * as crmChatsService from "@/services/crmChatsService";
import { Input } from "@/components/ui/input";

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

interface TicketDetailDialogProps {
  open: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  onUpdate: (ticketId: string, updates: Partial<Ticket>) => void;
}

export const TicketDetailDialog = ({
  open,
  onClose,
  ticket,
  onUpdate,
}: TicketDetailDialogProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTicket, setEditedTicket] = useState<Ticket | null>(null);

  // Activity Log State
  const [activities, setActivities] = useState<
    crmChatsService.TicketActivity[]
  >([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    if (ticket) {
      setEditedTicket(ticket);
    }
  }, [ticket]);

  // Fetch activities when switching to 'activity' tab
  useEffect(() => {
    if (open && ticket && activeTab === "activity") {
      const fetchActivities = async () => {
        try {
          setLoadingActivities(true);
          const data = await crmChatsService.getTicketActivities(ticket.id);
          setActivities(data);
        } catch (error) {
          console.error("Failed to load activities", error);
        } finally {
          setLoadingActivities(false);
        }
      };
      fetchActivities();
    }
  }, [open, ticket, activeTab]);

  if (!ticket || !editedTicket) return null;

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Open
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-blue-500 text-white flex items-center gap-1">
            <Clock className="h-3 w-3" />
            In Progress
          </Badge>
        );
      case "resolved":
        return (
          <Badge className="bg-green-500 text-white flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Resolved
          </Badge>
        );
      case "closed":
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Closed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getActorIcon = (type: string) => {
    switch (type) {
      case "ai":
        return <Bot className="h-4 w-4 text-purple-500" />;
      case "human":
        return <User className="h-4 w-4 text-blue-500" />;
      case "system":
        return <Laptop className="h-4 w-4 text-gray-500" />;
      default:
        return <History className="h-4 w-4 text-gray-400" />;
    }
  };

  const handleSave = () => {
    onUpdate(ticket.id, {
      status: editedTicket.status,
      priority: editedTicket.priority,
      assignedTo: editedTicket.assignedTo,
      description: editedTicket.description,
      category: editedTicket.category,
    });
    setIsEditing(false);
  };

  const handleClose = () => {
    setIsEditing(false);
    setActiveTab("details"); // Reset tab
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <TicketIcon className="h-5 w-5 text-primary" />
                <span className="font-mono text-sm font-semibold text-muted-foreground">
                  {ticket.ticketNumber}
                </span>
              </div>
              <DialogTitle className="text-2xl">{ticket.title}</DialogTitle>
            </div>
            <Button
              variant={isEditing ? "default" : "outline"}
              size="sm"
              onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
            >
              <Edit className="h-4 w-4 mr-2" />
              {isEditing ? "Save" : "Edit"}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="related">
                Related Messages ({ticket.relatedMessages.length})
              </TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4">
              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <Label className="text-sm text-muted-foreground mb-2 block">
                      Status
                    </Label>
                    {isEditing ? (
                      <Select
                        value={editedTicket.status}
                        onValueChange={(
                          value: "open" | "in_progress" | "resolved" | "closed"
                        ) =>
                          setEditedTicket({ ...editedTicket, status: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">
                            In Progress
                          </SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      getStatusBadge(ticket.status)
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <Label className="text-sm text-muted-foreground mb-2 block">
                      Priority
                    </Label>
                    {isEditing ? (
                      <Select
                        value={editedTicket.priority}
                        onValueChange={(
                          value: "low" | "medium" | "high" | "urgent"
                        ) =>
                          setEditedTicket({ ...editedTicket, priority: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={getPriorityColor(ticket.priority)}>
                        {ticket.priority.toUpperCase()}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Description */}
              <Card>
                <CardContent className="p-4">
                  <Label className="text-sm text-muted-foreground mb-2 block">
                    Description
                  </Label>
                  {isEditing ? (
                    <Textarea
                      value={editedTicket.description}
                      onChange={(e) =>
                        setEditedTicket({
                          ...editedTicket,
                          description: e.target.value,
                        })
                      }
                      rows={4}
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">
                      {ticket.description}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Category & Assigned To */}
              <div className="grid grid-cols-2 gap-4">
                {/* Category Card */}
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Tag className="h-4 w-4" />
                      <Label className="text-sm">Category</Label>
                    </div>

                    {/* CONDITIONAL RENDERING FIX */}
                    {isEditing ? (
                      <Input
                        value={editedTicket.category || ""}
                        onChange={(e) =>
                          setEditedTicket({
                            ...editedTicket,
                            category: e.target.value,
                          })
                        }
                        className="h-8 text-sm"
                        placeholder="Enter category"
                      />
                    ) : (
                      <Badge variant="secondary">{ticket.category}</Badge>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <Label className="text-sm">Assigned To</Label>
                    </div>
                    {ticket.assignedTo ? (
                      <span className="text-sm font-medium">
                        {ticket.assignedTo}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Unassigned
                      </span>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Timestamps */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Calendar className="h-4 w-4" />
                    <Label className="text-sm">Timeline</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Created:</span>
                      <span className="ml-2 font-medium">
                        {ticket.createdAt}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Updated:</span>
                      <span className="ml-2 font-medium">
                        {ticket.updatedAt}
                      </span>
                    </div>
                    {ticket.resolvedAt && (
                      <div>
                        <span className="text-muted-foreground">Resolved:</span>
                        <span className="ml-2 font-medium">
                          {ticket.resolvedAt}
                        </span>
                      </div>
                    )}
                    {ticket.closedAt && (
                      <div>
                        <span className="text-muted-foreground">Closed:</span>
                        <span className="ml-2 font-medium">
                          {ticket.closedAt}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tags */}
              {ticket.tags && ticket.tags.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <Label className="text-sm text-muted-foreground mb-2 block">
                      Tags
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {ticket.tags.map((tag, index) => (
                        <Badge key={index} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Activity Tab - IMPLEMENTED */}
            <TabsContent value="activity">
              <Card className="h-[400px]">
                <CardContent className="p-0 h-full">
                  <ScrollArea className="h-full p-4">
                    {loadingActivities ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
                        <span className="text-sm text-muted-foreground">
                          Loading history...
                        </span>
                      </div>
                    ) : activities.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <History className="h-10 w-10 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No activity recorded yet.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {activities.map((activity, index) => (
                          <div
                            key={activity.id || index}
                            className="flex gap-3"
                          >
                            <div className="mt-1">
                              {getActorIcon(activity.actor_type)}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">
                                  {activity.actor_name || "Unknown"}
                                </p>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(
                                    activity.created_at
                                  ).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {activity.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Related Messages Tab */}
            <TabsContent value="related">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    {ticket.relatedMessages.length} messages related to this
                    ticket
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-2 flex-shrink-0">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          {isEditing && <Button onClick={handleSave}>Save Changes</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
};
