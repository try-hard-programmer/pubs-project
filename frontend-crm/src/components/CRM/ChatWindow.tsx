import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  MoreVertical,
  User,
  Bot,
  Paperclip,
  Phone,
  Video,
  Info,
  Ticket as TicketIcon,
  Loader2,
  ArrowUp,
  CheckCircle2,
  Archive,
  File as FileIcon,
  X,
  Download,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TicketPanel } from "./TicketPanel";

/**
 * Message interface (mapped from API response)
 */
interface Message {
  id: string;
  sender: "customer" | "agent" | "ai";
  senderName: string;
  content: string;
  timestamp: string;
  ticketId?: string;
  // Add metadata back to support your current payload
  metadata?: any;
  attachment?: {
    name: string;
    url: string;
    type: string;
  };
}

/**
 * Ticket interface for support tickets
 */
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

/**
 * Agent interface for human agents
 */
interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "busy";
}

/**
 * Props for ChatWindow component
 */
interface ChatWindowProps {
  chatId: string | null;
  customerName: string;
  status: "open" | "pending" | "assigned" | "resolved" | "closed";
  isAssigned: boolean;
  assignedTo?: string;
  isOwnChat: boolean;

  // FIX: Add aiAgentId to the interface
  aiAgentId?: string;
  aiAgentName?: string;
  humanAgentName?: string;

  handledBy: "ai" | "human" | "unassigned";
  escalatedAt?: string;
  escalationReason?: string;
  agents: Agent[];
  onEscalateToHuman: (humanAgentId: string, reason?: string) => void;

  messages: Message[];
  tickets?: Ticket[];
  isLoading?: boolean;
  onSendMessage: (message: string, file?: File) => void;
  onAssignToAgent: () => void;
  onMarkResolved: () => void;
  onCreateTicket?: (
    ticket: Omit<
      Ticket,
      "id" | "ticketNumber" | "createdAt" | "updatedAt" | "relatedMessages"
    >
  ) => void;
  onUpdateTicket?: (ticketId: string, updates: Partial<Ticket>) => void;
}

/**
 * ============================================================================
 * ChatWindow Component
 * ============================================================================
 */
export const ChatWindow = ({
  chatId,
  customerName,
  status,
  isAssigned,
  assignedTo,
  isOwnChat,
  // FIX: Destructure aiAgentId
  aiAgentId,
  aiAgentName,
  humanAgentName,
  handledBy,
  escalatedAt,
  agents,
  onEscalateToHuman,
  messages,
  tickets = [],
  isLoading = false,
  onSendMessage,
  onAssignToAgent,
  onMarkResolved,
  onCreateTicket,
  onUpdateTicket,
}: ChatWindowProps) => {
  // ==========================================================================
  // STATE & REFS
  // ==========================================================================

  const [messageInput, setMessageInput] = useState("");
  const [showTicketPanel, setShowTicketPanel] = useState(false);
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [escalationReason, setEscalationReason] = useState("");
  const [isEscalating, setIsEscalating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Ref for the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ==========================================================================
  // AUTO-SCROLL EFFECT
  // ==========================================================================

  useEffect(() => {
    if (messagesEndRef.current && !isLoading) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  const handleSend = () => {
    if (messageInput.trim() || selectedFile) {
      onSendMessage(messageInput, selectedFile || undefined);
      setMessageInput("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePaperclipClick = () => {
    // This will now work because the input is rendered below
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEscalate = async () => {
    if (!selectedAgentId) return;

    setIsEscalating(true);
    try {
      await onEscalateToHuman(selectedAgentId, escalationReason || undefined);
      setShowEscalateDialog(false);
      setSelectedAgentId("");
      setEscalationReason("");
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsEscalating(false);
    }
  };

  const humanAgents = agents.filter((agent) => {
    // 1. Must have a status (Basic check)
    if (!agent.status) return false;

    // 2. Exclude by ID (Strongest check)
    if (aiAgentId && agent.id === aiAgentId) return false;

    // 3. Exclude by Name (Fallback)
    if (aiAgentName && agent.name === aiAgentName) return false;

    // 4. Exclude generic AI names (Safety net)
    if (agent.name === "AI Agent" || agent.name.toLowerCase().includes("bot"))
      return false;

    return true;
  });

  // RENDER HELPERS

  const renderAttachment = (attachment: {
    name: string;
    url: string;
    type: string;
  }) => {
    if (!attachment || !attachment.url) return null;

    // LOGIC:
    // 1. Is the MIME type explicitly an image? (e.g. "image/png")
    // 2. OR is the MIME type generic ("file") but the name looks like an image?
    const isImage =
      (attachment.type && attachment.type.startsWith("image")) ||
      (attachment.type && attachment.type.startsWith("image/")) ||
      (attachment.type === "file" &&
        /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(attachment.name)) ||
      /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(attachment.url); // Last resort: check URL

    if (isImage) {
      return (
        <div className="mb-2 rounded-lg overflow-hidden border bg-background/50">
          <img
            src={attachment.url}
            alt={attachment.name}
            className="max-w-[240px] max-h-[240px] w-auto h-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(attachment.url, "_blank")}
          />
        </div>
      );
    }

    return (
      <div
        className="flex items-center gap-2 p-3 mb-2 rounded border bg-background/50 hover:bg-background/80 transition-colors group cursor-pointer"
        onClick={() => window.open(attachment.url, "_blank")}
      >
        <div className="p-2 bg-muted rounded-full">
          <FileIcon className="w-4 h-4 text-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-medium truncate max-w-[150px]"
            title={attachment.name}
          >
            {attachment.name}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase">
            {attachment.type && attachment.type !== "file"
              ? attachment.type.split("/").pop()
              : "FILE"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Download className="w-3 h-3" />
        </Button>
      </div>
    );
  };

  // Empty State
  if (!chatId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
            <Bot className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold text-foreground">
            Select a conversation
          </p>
          <p className="text-sm text-muted-foreground">
            Choose a chat from the list to start messaging
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex bg-background">
      {/* Hidden File Input - This was missing in your code! */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 border-b bg-card px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {customerName ? customerName.charAt(0).toUpperCase() : "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base">{customerName}</h3>
                {status === "resolved" && (
                  <Badge
                    variant="outline"
                    className="text-xs flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-300"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Resolved
                  </Badge>
                )}
                {status === "closed" && (
                  <Badge
                    variant="outline"
                    className="text-xs flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300"
                  >
                    <Archive className="w-3 h-3" />
                    Closed
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {handledBy === "human" ? (
                  <>
                    <Badge
                      variant="secondary"
                      className="text-xs flex items-center gap-1"
                    >
                      <User className="w-3 h-3" />
                      {humanAgentName || "Human Agent"}
                    </Badge>
                    {escalatedAt && aiAgentName && (
                      <Badge
                        variant="outline"
                        className="text-xs flex items-center gap-1 text-muted-foreground"
                        title={`Previously handled by ${aiAgentName}. Escalated at ${new Date(
                          escalatedAt
                        ).toLocaleString()}`}
                      >
                        <Bot className="w-3 h-3" />
                        Previously: {aiAgentName}
                      </Badge>
                    )}
                  </>
                ) : handledBy === "ai" ? (
                  <Badge
                    variant="outline"
                    className="text-xs flex items-center gap-1"
                  >
                    <Bot className="w-3 h-3" />
                    {aiAgentName || "AI Agent"}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-xs flex items-center gap-1 text-orange-500"
                  >
                    Unassigned
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Phone className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Video className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Info className="w-4 h-4" />
            </Button>

            <Button
              variant={showTicketPanel ? "default" : "ghost"}
              size="icon"
              onClick={() => setShowTicketPanel(!showTicketPanel)}
              className="relative"
            >
              <TicketIcon className="w-4 h-4" />
              {tickets.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {tickets.length}
                </span>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {handledBy === "ai" && !escalatedAt && (
                  <DropdownMenuItem onClick={() => setShowEscalateDialog(true)}>
                    <User className="w-4 h-4 mr-2" />
                    Escalate to Human Agent
                  </DropdownMenuItem>
                )}
                {!isAssigned && (
                  <DropdownMenuItem onClick={onAssignToAgent}>
                    <User className="w-4 h-4 mr-2" />
                    Assign to Me
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onMarkResolved}>
                  Mark as Resolved
                </DropdownMenuItem>
                <DropdownMenuItem>View Customer Profile</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Message List */}
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4 max-w-4xl mx-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Loading messages...
                  </p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                    <Bot className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No messages yet
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Start the conversation below
                  </p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => {
                  const isCustomer = message.sender === "customer";
                  const isAI = message.sender === "ai";

                  // CHANGE: Use the helper here
                  const attachment = message.attachment;

                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        isCustomer ? "" : "flex-row-reverse"
                      }`}
                    >
                      {/* ... Avatar code remains the same ... */}
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback
                          className={
                            isCustomer
                              ? "bg-primary/10 text-primary"
                              : isAI
                              ? "bg-blue-500/10 text-blue-500"
                              : "bg-green-500/10 text-green-500"
                          }
                        >
                          {isCustomer ? (
                            message.senderName ? (
                              message.senderName.charAt(0).toUpperCase()
                            ) : (
                              "?"
                            )
                          ) : isAI ? (
                            <Bot className="w-4 h-4" />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>

                      <div
                        className={`flex-1 ${
                          isCustomer ? "" : "flex flex-col items-end"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-foreground">
                            {message.senderName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {message.timestamp}
                          </span>
                        </div>

                        <div
                          className={`inline-block max-w-[70%] rounded-lg px-4 py-2 ${
                            isCustomer
                              ? "bg-muted"
                              : isAI
                              ? "bg-blue-500/10 border border-blue-500/20"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          {/* CHANGE: Use the variable 'attachment' instead of 'message.attachment' */}
                          {attachment && renderAttachment(attachment)}

                          {message.content && (
                            <p className="text-sm whitespace-pre-wrap">
                              {message.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="border-t bg-card p-4">
          <div className="max-w-4xl mx-auto space-y-2">
            {/* FILE PREVIEW AREA - ADDED THIS FOR BETTER UX */}
            {selectedFile && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md w-fit">
                <div className="p-2 bg-background rounded-full">
                  <FileIcon className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium max-w-[200px] truncate">
                    {selectedFile.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 ml-2"
                  onClick={removeSelectedFile}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}

            <div className="flex items-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0"
                onClick={handlePaperclipClick}
              >
                <Paperclip className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder={
                    !isOwnChat
                      ? "Only the assigned agent can reply"
                      : "Type your message..."
                  }
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={!isOwnChat}
                  className={`min-h-[40px] ${!isOwnChat ? "opacity-60" : ""}`}
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={(!messageInput.trim() && !selectedFile) || !isOwnChat}
                className="flex-shrink-0"
              >
                <Send className="w-4 h-4 mr-2" />
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Panel */}
      {showTicketPanel && (
        <div className="w-96 border-l bg-card flex flex-col">
          <TicketPanel
            tickets={tickets}
            onCreateTicket={onCreateTicket || (() => {})}
            onUpdateTicket={onUpdateTicket || (() => {})}
          />
        </div>
      )}

      {/* Escalate Dialog */}
      <Dialog open={showEscalateDialog} onOpenChange={setShowEscalateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUp className="w-5 h-5" />
              Escalate to Human Agent
            </DialogTitle>
            <DialogDescription>
              Transfer this chat from AI to a human agent for personalized
              assistance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {aiAgentName && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Bot className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Currently handled by: <strong>{aiAgentName}</strong>
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  AI agent information will be preserved after escalation
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="agent">Select Human Agent *</Label>
              <Select
                value={selectedAgentId}
                onValueChange={setSelectedAgentId}
              >
                <SelectTrigger id="agent">
                  <SelectValue placeholder="Choose an agent..." />
                </SelectTrigger>
                <SelectContent>
                  {humanAgents.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No human agents available
                    </SelectItem>
                  ) : (
                    humanAgents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>{agent.name}</span>
                          <Badge
                            variant={
                              agent.status === "active"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {agent.status}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="Why are you escalating this chat? (e.g., Customer requested human agent, Complex technical issue, etc.)"
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEscalateDialog(false);
                setSelectedAgentId("");
                setEscalationReason("");
              }}
              disabled={isEscalating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEscalate}
              disabled={!selectedAgentId || isEscalating}
            >
              {isEscalating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Escalating...
                </>
              ) : (
                <>
                  <ArrowUp className="w-4 h-4 mr-2" />
                  Escalate Chat
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
