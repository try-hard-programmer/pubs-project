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
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowUp,
  CheckCircle2,
  Archive,
  File as FileIcon,
  X,
  Image as ImageIcon,
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
 *
 * Represents a single chat message from the API.
 * Data transformation from API happens in parent component (CustomerService.tsx)
 *
 * @interface Message
 * @property {string} id - Unique message identifier
 * @property {string} sender - Message sender type (from API: sender_type)
 * @property {string} senderName - Display name of sender (from API: sender_name)
 * @property {string} content - Message content text
 * @property {string} timestamp - Formatted timestamp (from API: created_at, formatted)
 * @property {string} [ticketId] - Optional ticket ID if message linked to ticket (from API: ticket_id)
 */
interface Message {
  id: string;
  sender: "customer" | "agent" | "ai";
  senderName: string;
  content: string;
  timestamp: string;
  ticketId?: string;
  // ADDED
  attachment?: {
    name: string;
    url: string;
    type: string;
  };
}

/**
 * Ticket interface for support tickets
 *
 * @interface Ticket
 * @property {string} id - Unique ticket identifier
 * @property {string} ticketNumber - Human-readable ticket number (e.g., TKT-001)
 * @property {string} title - Ticket title/summary
 * @property {string} description - Detailed description of the issue
 * @property {string} category - Ticket category/type
 * @property {string} priority - Priority level: low, medium, high, or urgent
 * @property {string} status - Current ticket status
 * @property {string} createdAt - Creation timestamp
 * @property {string} updatedAt - Last update timestamp
 * @property {string} [resolvedAt] - Resolution timestamp (if resolved)
 * @property {string} [closedAt] - Closure timestamp (if closed)
 * @property {string} [assignedTo] - Name of assigned agent
 * @property {string[]} [tags] - Optional ticket tags for categorization
 * @property {string[]} relatedMessages - Array of message IDs related to this ticket
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
 *
 * @interface Agent
 * @property {string} id - Agent unique identifier
 * @property {string} name - Agent full name
 * @property {string} email - Agent email address
 * @property {string} phone - Agent phone number
 * @property {string} status - Agent availability status
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
 *
 * ChatWindow is a presentational component that receives all data and handlers from parent.
 * No API calls are made directly in this component.
 *
 * @interface ChatWindowProps
 *
 * Chat Identification:
 * @property {string | null} chatId - ID of current chat (null if no chat selected)
 * @property {string} customerName - Name of the customer
 *
 * Assignment Status (Legacy):
 * @property {boolean} isAssigned - Whether chat is assigned to human agent
 * @property {string} [assignedTo] - Name of assigned agent
 *
 * Dual Agent Tracking:
 * @property {string} [aiAgentName] - Name of AI agent handling chat
 * @property {string} [humanAgentName] - Name of human agent handling chat
 * @property {string} handledBy - Current handler: ai, human, or unassigned
 * @property {string} [escalatedAt] - Timestamp when chat was escalated
 * @property {string} [escalationReason] - Reason for escalation
 *
 * Data Collections:
 * @property {Agent[]} agents - Available agents for escalation
 * @property {Message[]} messages - Chat messages (from API, transformed by parent)
 * @property {Ticket[]} [tickets] - Related tickets (optional)
 *
 * UI State:
 * @property {boolean} [isLoading] - Loading state for messages
 *
 * Event Handlers (managed by parent component - CustomerService.tsx):
 * @property {function} onSendMessage - Handler for sending new messages
 * @property {function} onAssignToAgent - Handler for agent self-assignment
 * @property {function} onMarkResolved - Handler for marking chat as resolved
 * @property {function} onEscalateToHuman - Handler for escalating chat to human agent
 * @property {function} [onCreateTicket] - Handler for creating new tickets
 * @property {function} [onUpdateTicket] - Handler for updating existing tickets
 */
interface ChatWindowProps {
  chatId: string | null;
  customerName: string;
  status: "open" | "pending" | "assigned" | "resolved" | "closed";
  isAssigned: boolean;
  assignedTo?: string;
  isOwnChat: boolean; // NEW: Whether this chat belongs to the current logged-in user

  // NEW: Dual agent tracking
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
 *
 * Presentational component for displaying chat interface.
 * Handles message display, input, and ticket panel.
 *
 * Features:
 * - Real-time message display with sender avatars
 * - Dual agent tracking (AI + Human) badges and information
 * - Message input with keyboard shortcuts (Enter to send, Shift+Enter for new line)
 * - Ticket panel slide-in from right
 * - Chat escalation dialog for transferring AI chats to human agents
 * - Empty states and loading states
 * - Customer profile header with actions
 *
 * Data Flow:
 * - Receives all data via props from parent component (CustomerService.tsx)
 * - No direct API calls in this component
 * - All data mutations handled by parent through callback props
 * - Messages already transformed from API format by parent
 *
 * Design Pattern:
 * - Presentational Component (no business logic)
 * - Container/Presentational Pattern
 * - Parent (CustomerService) = Container
 * - ChatWindow = Presentational
 *
 * @component
 * @param {ChatWindowProps} props - Component props
 * @returns {JSX.Element} Rendered chat window interface
 */
export const ChatWindow = ({
  chatId,
  customerName,
  status,
  isAssigned,
  assignedTo,
  isOwnChat,
  // NEW: Dual agent tracking
  aiAgentName,
  humanAgentName,
  handledBy,
  escalatedAt,
  // escalationReason,
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Ref to the end of messages container for auto-scrolling */
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ==========================================================================
  // AUTO-SCROLL EFFECT
  // ==========================================================================

  /**
   * Auto-scroll to bottom when messages change
   * Triggers when:
   * - New messages arrive
   * - Chat is loaded for the first time
   * - Loading state changes to false (chat finished loading)
   */
  useEffect(() => {
    // Scroll to bottom after messages render
    if (messagesEndRef.current && !isLoading) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  /**
   * Handle sending a message
   * Validates input and calls parent handler to send message
   */
  const handleSend = () => {
    // MODIFIED: Check for selectedFile as well
    if (messageInput.trim() || selectedFile) {
      onSendMessage(messageInput, selectedFile || undefined);
      setMessageInput("");
      setSelectedFile(null); // ADDED: Clear file state
      // ADDED: Reset file input value to allow selecting the same file again
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ADDED: Triggers the hidden file input
  const handlePaperclipClick = () => {
    fileInputRef.current?.click();
  };

  // ADDED: Handles file selection from the input
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // ADDED: Clears the selected file
  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /**
   * Handle Enter key press for sending message
   * - Enter: Send message
   * - Shift+Enter: New line in message
   * @param {React.KeyboardEvent} e - Keyboard event
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * Handle chat escalation to human agent
   * Validates selection and calls parent handler
   * Shows loading state during escalation
   */
  const handleEscalate = async () => {
    if (!selectedAgentId) return;

    setIsEscalating(true);
    try {
      await onEscalateToHuman(selectedAgentId, escalationReason || undefined);
      setShowEscalateDialog(false);
      setSelectedAgentId("");
      setEscalationReason("");
    } catch (error) {
      // Error already handled by parent component
    } finally {
      setIsEscalating(false);
    }
  };

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  /** Filter only human agents (those with status defined) for escalation dropdown */
  const humanAgents = agents.filter((agent) => agent.status !== undefined);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  // Empty State: No chat selected
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
      {/* ====================================================================
          MAIN CHAT AREA
          ==================================================================== */}
      <div className="flex-1 flex flex-col">
        {/* ================================================================
            CHAT HEADER - Customer info, agent badges, and action buttons
            ================================================================ */}
        <div className="h-16 border-b bg-card px-6 flex items-center justify-between">
          {/* Customer Info & Agent Status */}
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {customerName ? customerName.charAt(0).toUpperCase() : "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base">{customerName}</h3>
                {/* Resolved Status Badge (Existing) */}
                {status === "resolved" && (
                  <Badge
                    variant="outline"
                    className="text-xs flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-300"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Resolved
                  </Badge>
                )}
                {/* === ADD THIS BLOCK === */}
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
                {/* Dual Agent Tracking Display */}
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

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Quick Action Buttons */}
            <Button variant="ghost" size="icon">
              <Phone className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Video className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Info className="w-4 h-4" />
            </Button>

            {/* Ticket Panel Toggle */}
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

            {/* More Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* Escalate to Human (only if handled by AI and not escalated) */}
                {handledBy === "ai" && !escalatedAt && (
                  <DropdownMenuItem onClick={() => setShowEscalateDialog(true)}>
                    <User className="w-4 h-4 mr-2" />
                    Escalate to Human Agent
                  </DropdownMenuItem>
                )}
                {/* Assign to Me (only if unassigned) */}
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

        {/* ================================================================
          MESSAGES AREA - Scrollable message list with states
          ================================================================ */}
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4 max-w-4xl mx-auto">
            {/* Loading State */}
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
              /* Empty State: No messages */
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
              /* Message List */
              <>
                {messages.map((message) => {
                  const isCustomer = message.sender === "customer";
                  const isAI = message.sender === "ai";

                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        isCustomer ? "" : "flex-row-reverse"
                      }`}
                    >
                      {/* Message Avatar */}
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

                      {/* Message Content */}
                      <div
                        className={`flex-1 ${
                          isCustomer ? "" : "flex flex-col items-end"
                        }`}
                      >
                        {/* Sender Name & Timestamp */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-foreground">
                            {message.senderName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {message.timestamp}
                          </span>
                        </div>

                        {/* Message Bubble */}
                        <div
                          className={`inline-block max-w-[70%] rounded-lg px-4 py-2 ${
                            isCustomer
                              ? "bg-muted"
                              : isAI
                              ? "bg-blue-500/10 border border-blue-500/20"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Auto-scroll anchor: invisible div at the end of messages */}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </ScrollArea>

        {/* ================================================================
          MESSAGE INPUT - Text input with send button
          ================================================================ */}
        <div className="border-t bg-card p-4">
          <div className="flex items-end gap-2 max-w-4xl mx-auto">
            <Button variant="ghost" size="icon" className="flex-shrink-0">
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
              disabled={!messageInput.trim() || !isOwnChat}
              className="flex-shrink-0"
            >
              <Send className="w-4 h-4 mr-2" />
              Send
            </Button>
          </div>
        </div>
      </div>

      {/* ====================================================================
          TICKET PANEL - Slide-in sidebar from right
          ==================================================================== */}
      {showTicketPanel && (
        <div className="w-96 border-l bg-card flex flex-col">
          <TicketPanel
            tickets={tickets}
            onCreateTicket={onCreateTicket || (() => {})}
            onUpdateTicket={onUpdateTicket || (() => {})}
          />
        </div>
      )}

      {/* ====================================================================
          ESCALATE DIALOG - Transfer chat to human agent
          ==================================================================== */}
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
            {/* Current AI Agent Info */}
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

            {/* Select Human Agent */}
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

            {/* Escalation Reason (Optional) */}
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
