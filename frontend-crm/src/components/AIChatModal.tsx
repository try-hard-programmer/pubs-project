import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Upload,
  Image as ImageIcon,
  User,
  Bot,
  Loader2,
  X,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Paperclip,
  Maximize,
  Minimize,
  MessageSquarePlus,
  Trash2,
  MessageSquare,
  Sparkles,
  Scale,
  Briefcase,
  Calculator as CalculatorIcon,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { FileItem, useFiles } from "@/hooks/useFiles";
import { FilePreview } from "./FileManager/FilePreview";
import { ChatHistoryService, Topic } from "@/lib/chatHistoryService";
import { ConfirmDeleteChatDialog } from "./ConfirmDeleteChatDialog";

type FileObj = {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  created_at: string;
  updated_at: string;
  storage_path: string;
  user_id: string;
  is_folder: boolean;
  is_starred: boolean;
  is_trashed: boolean;
  folder_id: string | null;
};

interface ReferenceDocument {
  file_id: string;
  filename: string;
  chunk_index: number;
  email?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  reference_documents?: ReferenceDocument[];
  images?: string[];
  timestamp: Date;
}

interface AIChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail?: string;
}

// Agent configurations
const AGENTS = [
  {
    id: "default",
    name: "Default Agent",
    icon: Sparkles,
    description: "General purpose AI assistant",
  },
  {
    id: "tax",
    name: "Tax Consultant",
    icon: CalculatorIcon,
    description: "Tax and financial advisor",
  },
  {
    id: "legal",
    name: "Legal Consultant",
    icon: Scale,
    description: "Legal advice and consultation",
  },
  {
    id: "finance",
    name: "Finance Consultant",
    icon: Briefcase,
    description: "Financial planning and advice",
  },
  {
    id: "marketing",
    name: "Marketing & Sales Consultant",
    icon: TrendingUp,
    description: "Marketing strategy and sales optimization",
  },
];

export const AIChatModal = ({
  open,
  onOpenChange,
  userEmail,
}: AIChatModalProps) => {
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>("default");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [expandedRefs, setExpandedRefs] = useState<Record<string, boolean>>({});

  // Chat history states (API-based)
  const [topics, setTopics] = useState<Topic[]>([]);
  const [currentTopicId, setCurrentTopicId] = useState<string | null>(null);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [isTemporarySession, setIsTemporarySession] = useState(false); // True jika sedang di temporary session (frontend only)
  const [skipNextLoad, setSkipNextLoad] = useState(false); // Flag to skip loading messages after sending
  const activeTopicIdRef = useRef<string | null>(null); // Ref to track active topic without causing re-render
  const [activeTopicForHighlight, setActiveTopicForHighlight] = useState<
    string | null
  >(null); // For sidebar highlight only
  const isCreatingTopicRef = useRef<boolean>(false); // Flag to prevent clearing messages during topic creation
  const [conversationLoading, setConversationLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTopicId, setDeletingTopicId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deletingTitle, setDeletingTitle] = useState<string | undefined>(
    undefined,
  );

  const { files, error } = useFiles("all", null, "name", "asc");

  // State untuk toggle expanded per message
  const toggleRefsView = (messageId: string) => {
    setExpandedRefs((prev) => ({ ...prev, [messageId]: !prev[messageId] }));
  };

  // Helper: menentukan apakah perlu tombol "..." (misal jika jumlah > 2)
  const shouldShowMore = (itemsLen: number, isExpanded: boolean) =>
    !isExpanded && itemsLen > 3;

  const { toast } = useToast();
  // ❌ BLEED STOPPED: Comment out the unused hook
  // const { files } = useFiles();

  // Load topics from API on mount
  useEffect(() => {
    const loadTopics = async () => {
      if (!open) return;

      try {
        setIsLoadingTopics(true);
        const fetchedTopics = await ChatHistoryService.getTopics();

        // Debug log
        console.log("Fetched topics:", fetchedTopics);

        // Validation: pastikan response adalah array
        if (Array.isArray(fetchedTopics)) {
          setTopics(fetchedTopics);
        } else {
          console.error("Topics response is not an array:", fetchedTopics);
          setTopics([]); // Fallback ke empty array
          toast({
            title: "Warning",
            description: "Invalid topics response format",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Failed to load topics:", error);
        setTopics([]); // Fallback ke empty array on error
        toast({
          title: "Error",
          description: "Failed to load chat history",
          variant: "destructive",
        });
      } finally {
        setIsLoadingTopics(false);
      }
    };

    loadTopics();
  }, [open, toast]);

  // Load messages when topic changes (only for real topics, not temporary)
  useEffect(() => {
    const loadMessages = async () => {
      // CRITICAL FIRST: Don't do ANYTHING if we're in the process of creating a topic
      // This prevents the race condition where messages get cleared before API response arrives
      // Check this BEFORE any other conditions!
      if (isCreatingTopicRef.current) {
        console.log(
          "[Load Messages] Topic creation in progress, skipping to preserve messages",
        );
        return;
      }

      // Skip if flag is set (after sending message)
      if (skipNextLoad) {
        console.log("[Load Messages] Skipping load (skipNextLoad flag set)");
        setSkipNextLoad(false);
        return;
      }

      // Don't load messages if we're in temporary session
      if (isTemporarySession) {
        console.log("[Load Messages] Temporary session, skipping API call");
        return;
      }

      // Don't load messages if we're creating a new topic (activeTopicIdRef has value but currentTopicId is null)
      // This prevents clearing messages when transitioning from temporary to real topic
      if (!currentTopicId && activeTopicIdRef.current) {
        console.log(
          "[Load Messages] Topic being created, skipping to prevent clearing messages",
        );
        return;
      }

      if (!currentTopicId) {
        console.log("[Load Messages] No currentTopicId, clearing messages");
        setMessages([]);
        return;
      }

      console.log(
        "[Load Messages] Loading messages for topic:",
        currentTopicId,
      );

      try {
        setIsLoadingMessages(true);
        const fetchedMessages =
          await ChatHistoryService.getMessages(currentTopicId);

        console.log(
          "[Load Messages] Fetched messages:",
          fetchedMessages.length,
        );

        // Convert API messages to UI messages
        const uiMessages: Message[] = fetchedMessages.map((msg) => {
          // Extract reference_documents from API response
          const referenceDocuments: ReferenceDocument[] =
            msg.reference_documents || [];

          console.log("[Load Messages] Processing message:", msg.id);
          console.log(
            "[Load Messages] reference_documents:",
            referenceDocuments,
          );

          return {
            id: msg.id,
            role: msg.role,
            content: msg.content,
            reference_documents: referenceDocuments,
            images: msg.metadata?.images,
            timestamp: new Date(msg.created_at),
          };
        });

        console.log("[Load Messages] Setting UI messages:", uiMessages.length);
        setMessages(uiMessages);
      } catch (error) {
        console.error("[Load Messages] Failed to load messages:", error);
        toast({
          title: "Error",
          description: "Failed to load messages",
          variant: "destructive",
        });
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadMessages();
  }, [currentTopicId, isTemporarySession, skipNextLoad, toast]);

  // Create new chat - start temporary session (frontend only)
  const createNewChat = () => {
    console.log("[New Chat] Starting temporary session");
    // Set temporary session flag - no API call yet
    setIsTemporarySession(true);
    setCurrentTopicId(null);
    activeTopicIdRef.current = null; // Clear ref
    setActiveTopicForHighlight(null); // Clear highlight
    setMessages([]);
    setInput("");
    setImages([]);
  };

  // Delete topic
  const deleteChat = async (topicId: string) => {
    try {
      await ChatHistoryService.deleteTopic(topicId);
      setTopics((prev) => prev.filter((t) => t.id !== topicId));

      if (currentTopicId === topicId) {
        setCurrentTopicId(null);
        setMessages([]);
      }

      toast({
        title: "Success",
        description: "Chat deleted",
      });
    } catch (error) {
      console.error("Failed to delete chat:", error);
      toast({
        title: "Error",
        description: "Failed to delete chat",
        variant: "destructive",
      });
    }
  };

  // Initialize temporary session when modal opens
  useEffect(() => {
    if (open && !isLoadingTopics) {
      // Jangan reset kalau sudah ada pesan (optimistic UI)
      if (messages.length > 0) return;

      // Jangan reset saat sedang create topic / sending
      if (isCreatingTopicRef.current || isLoading) return;
      // If no topic selected, start temporary session
      if (!currentTopicId && !isTemporarySession) {
        console.log(
          "[Modal Open] No topic selected, starting temporary session",
        );
        setIsTemporarySession(true);
        // setMessages([]);
      }
    }

    if (!open) {
      // Clear state on modal close
      console.log("[Modal] Closing, clearing state");
      setInput("");
      setImages([]);
      setIsLoading(false);
      setIsTemporarySession(false);
      activeTopicIdRef.current = null; // Clear ref on close
      setActiveTopicForHighlight(null); // Clear highlight on close
      setMessages([]);
    }
  }, [open, currentTopicId, isTemporarySession, isLoadingTopics]);

  // Auto scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          setImages((prev) => [...prev, result]);
        };
        reader.readAsDataURL(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload image files only",
          variant: "destructive",
        });
      }
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!input.trim() && images.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      images: images.length > 0 ? [...images] : undefined,
      timestamp: new Date(),
    };

    const userQuery = input; // Save before clearing
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setImages([]);
    setIsLoading(true);

    try {
      let topicId = currentTopicId || activeTopicIdRef.current;

      // ONLY create topic if:
      // 1. We're in temporary session (no real topic yet)
      // 2. AND we don't have any topicId yet (neither currentTopicId nor activeTopicIdRef)
      const shouldCreateTopic = isTemporarySession && !topicId;

      if (shouldCreateTopic) {
        // setConversationLoading(true);
        console.log("[First Message] Creating topic with title from query");
        try {
          // Set flag to prevent useEffect from clearing messages
          isCreatingTopicRef.current = true;

          // Exit temporary session IMMEDIATELY to prevent useEffect from running
          // when we update highlight later
          setIsTemporarySession(false);

          // Generate title from first 25 characters of the question
          const newTitle =
            userQuery.slice(0, 25) + (userQuery.length > 25 ? "..." : "");

          // Create topic with the generated title
          const newTopic = await ChatHistoryService.createTopic(newTitle);
          console.log("[First Message] Topic created:", newTopic.id);

          // Store in ref to avoid component re-render
          activeTopicIdRef.current = newTopic.id;

          // Update local topics state (add to sidebar) WITHOUT causing component reload
          setTopics((prev) => [newTopic, ...prev]);

          topicId = newTopic.id;
        } catch (error) {
          console.error("[First Message] Failed to create topic:", error);
          toast({
            title: "Error",
            description: "Failed to create chat topic",
            variant: "destructive",
          });
          setIsLoading(false);
          isCreatingTopicRef.current = false; // Reset flag on error
          setIsTemporarySession(true); // Restore temporary session on error
          return;
        }
      } else {
        console.log("[Subsequent Message] Using existing topic:", topicId);
      }

      // Send to agent with topic_id - backend akan auto save conversation
      const data = await ChatHistoryService.askAgent(
        userQuery,
        topicId,
        true, // save_history = true
      );

      // setConversationLoading(false);
      // Validasi minimal
      const answer = data?.answer ?? "Tidak ada jawaban dari server.";
      const referenceDocuments: ReferenceDocument[] = Array.isArray(
        data?.reference_documents,
      )
        ? data.reference_documents
        : [];
      console.log("[Agent Response] reference_documents:", referenceDocuments);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: answer,
        reference_documents: referenceDocuments,
        timestamp: new Date(),
      };

      console.log(
        "[Agent Response] assistant message created:",
        assistantMessage,
      );

      // Add assistant message directly to UI with reference documents from agent response
      // This is more reliable than refetching from API which might have race condition
      console.log(
        "[Agent Response] Adding assistant message to UI with references",
      );
      setMessages((prev) => [...prev, assistantMessage]);

      console.log("MESSAGE KEDUA ", messages);

      // Only update UI state if this was the first message (topic just created)
      if (shouldCreateTopic && activeTopicIdRef.current) {
        setSkipNextLoad(true);
        console.log("[First Message] Topic created, updating UI state");
        setActiveTopicForHighlight(activeTopicIdRef.current);
        // Update currentTopicId to sync with the newly created topic
        setCurrentTopicId(activeTopicIdRef.current);
        // Reset the flag after successfully updating topic
        isCreatingTopicRef.current = false;
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      // Reset the flag on error as well
      isCreatingTopicRef.current = false;
    } finally {
      setIsLoading(false);
      // Auto-focus textarea after agent responds so user can type immediately
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDownload = async (file: FileItem) => {
    if (file.is_folder) {
      toast({
        title: "Error",
        description: "Cannot download folders",
        variant: "destructive",
      });
      return;
    }

    if (file.is_shared && file.access_level === "view") {
      toast({
        title: "Error",
        description: "Download not allowed for this shared file",
        variant: "destructive",
      });
      return;
    }

    if (file.url) {
      const link = document.createElement("a");
      link.href = file.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: "Success",
        description: "File download started",
        variant: "destructive",
      });
    }
  };
  const handlePreview = async (file_id: string, e: React.MouseEvent) => {
    console.log("FILES ", files);
    e.stopPropagation();
    files.forEach((f) => {
      if (f.id === file_id) {
        setPreviewFile(f);
      }
    });
  };

  const handleConfirmDeleteChat = async () => {
    if (!deletingTopicId) return;
    try {
      setDeleting(true);
      await deleteChat(deletingTopicId); // fungsi yang sudah ada di file
    } finally {
      setDeleting(false);
      setDeletingTopicId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${
          isFullscreen ? "max-w-full h-screen" : "max-w-6xl h-[80vh]"
        } flex flex-col p-0 bg-background border-border`}
        showCloseButton={false}
      >
        <DialogHeader className="relative p-4 pr-14 border-b border-border">
          <div className="flex items-center justify-between w-full gap-4">
            <div className="flex items-center gap-4">
              <DialogTitle className="flex items-center gap-2 text-foreground">
                AI Agent Chat
              </DialogTitle>

              {/* Agent Selector */}
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger className="w-[220px] h-9 bg-background">
                  <SelectValue>
                    {(() => {
                      const agent = AGENTS.find((a) => a.id === selectedAgent);
                      const Icon = agent?.icon || Sparkles;
                      return (
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-primary" />
                          <span className="text-sm">{agent?.name}</span>
                        </div>
                      );
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {AGENTS.map((agent) => {
                    const Icon = agent.icon;
                    const isDisabled = agent.id !== "default";
                    return (
                      <SelectItem
                        key={agent.id}
                        value={agent.id}
                        disabled={isDisabled}
                      >
                        <div className="flex items-center gap-2">
                          <Icon
                            className={`w-4 h-4 ${
                              isDisabled
                                ? "text-muted-foreground"
                                : "text-primary"
                            }`}
                          />
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-medium ${
                                  isDisabled ? "text-muted-foreground" : ""
                                }`}
                              >
                                {agent.name}
                              </span>
                              {isDisabled && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1 py-0 h-4"
                                >
                                  Coming Soon
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {agent.description}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Right actions (sejajar) */}
            <div className="absolute right-4 top-4 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-8 w-8 p-0 hover:bg-muted"
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize className="w-4 h-4" />
                ) : (
                  <Maximize className="w-4 h-4" />
                )}
              </Button>

              <DialogClose className="h-8 w-8 inline-flex items-center justify-center rounded-sm opacity-70 hover:opacity-100 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Chat History */}
          <div className="w-64 border-r border-border flex flex-col bg-muted/20">
            <div className="p-3 border-b border-border">
              <Button
                onClick={createNewChat}
                className="w-full justify-start gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                size="sm"
              >
                <MessageSquarePlus className="w-4 h-4" />
                <span className="text-sm">New Chat</span>
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {isLoadingTopics ? (
                  <div className="p-4 text-center">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-xs text-muted-foreground mt-2">
                      Loading...
                    </p>
                  </div>
                ) : !Array.isArray(topics) || topics.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      No chat history yet
                    </p>
                  </div>
                ) : (
                  Array.isArray(topics) &&
                  topics.map((topic) => (
                    <div
                      key={topic.id}
                      className={`group relative rounded-lg border transition-all cursor-pointer ${
                        currentTopicId === topic.id ||
                        activeTopicForHighlight === topic.id
                          ? "bg-primary/10 border-primary/20"
                          : "bg-card border-border hover:bg-muted/50"
                      }`}
                      onClick={() => {
                        console.log(
                          "[Topic Click] Switching to topic:",
                          topic.id,
                        );
                        setCurrentTopicId(topic.id);
                        activeTopicIdRef.current = topic.id; // Sync ref with state
                        setActiveTopicForHighlight(topic.id); // Update highlight
                        setIsTemporarySession(false); // Exit temporary session when switching to real topic
                      }}
                    >
                      <div className="p-3 pr-8">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {topic.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(topic.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingTopicId(topic.id);
                          setDeletingTitle(topic.title);
                          setDeleteDialogOpen(true);
                        }}
                        className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                        title="Delete chat"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Side - Chat Interface */}
          <div className="flex-1 flex flex-col">
            {/* Chat Messages */}
            <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
              {conversationLoading == true ? (
                <>
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                    <p className="text-sm text-muted-foreground">
                      Loading conversation...
                    </p>
                  </div>
                </>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="flex items-center justify-center w-16 h-16 mb-4 bg-primary/10 rounded-full">
                    <Bot className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Selamat datang di AI Agent Chat
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-md">
                    Mulai percakapan dengan mengetik pertanyaan atau query. Chat
                    session akan berakhir ketika modal ditutup.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex w-full ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`flex items-start gap-3 max-w-[80%] ${
                          message.role === "user"
                            ? "flex-row-reverse"
                            : "flex-row"
                        }`}
                      >
                        {message.role === "assistant" ? (
                          <Avatar className="w-8 h-8 bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-primary" />
                          </Avatar>
                        ) : (
                          <Avatar className="w-8 h-8 bg-secondary flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-secondary-foreground" />
                          </Avatar>
                        )}

                        <div
                          className={`flex-1 ${
                            message.role === "user" ? "text-right" : "text-left"
                          }`}
                        >
                          <Card
                            className={`p-3 ${
                              message.role === "user"
                                ? "bg-primary text-primary-foreground ml-4"
                                : "bg-muted mr-4"
                            }`}
                          >
                            {message.images && message.images.length > 0 && (
                              <div className="grid grid-cols-2 gap-2 mb-3 max-w-md">
                                {message.images.map((img, idx) => (
                                  <img
                                    key={idx}
                                    src={img}
                                    alt={`Upload ${idx + 1}`}
                                    className="rounded-lg max-h-32 object-cover border border-border"
                                  />
                                ))}
                              </div>
                            )}
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                              {message.content}
                            </p>
                            <div
                              className={`text-xs mt-2 opacity-70 ${
                                message.role === "user"
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {message.timestamp.toLocaleTimeString()}
                            </div>
                          </Card>

                          {/* Label Sumber */}
                          {message.role === "assistant" &&
                            Array.isArray(message.reference_documents) &&
                            message.reference_documents.length > 0 && (
                              <div className="mt-3 text-left">
                                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                                  Reference
                                </h4>

                                {(() => {
                                  const isExpanded = !!expandedRefs[message.id];
                                  const items = message.reference_documents;

                                  return (
                                    <div
                                      className={
                                        isExpanded
                                          ? "flex flex-col gap-2"
                                          : "flex flex-row flex-wrap gap-2"
                                      }
                                    >
                                      {items.map((ref, idx) => {
                                        return (
                                          <div
                                            key={idx}
                                            className="inline-flex items-center"
                                          >
                                            <button
                                              type="button"
                                              onClick={(e) =>
                                                handlePreview(ref.file_id, e)
                                              }
                                              className="group relative inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground shadow-sm hover:border-primary/50 cursor-pointer"
                                              style={{ width: "12rem" }}
                                            >
                                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                                📄
                                              </span>
                                              <span
                                                className="truncate text-xs"
                                                title={ref.filename}
                                              >
                                                {ref.filename}
                                              </span>
                                            </button>
                                          </div>
                                        );
                                      })}

                                      {shouldShowMore(
                                        items.length,
                                        isExpanded,
                                      ) && (
                                        <Button
                                          variant="outline"
                                          className="h-8 px-3 text-xs"
                                          onClick={() =>
                                            setExpandedRefs((prev) => ({
                                              ...prev,
                                              [message.id]: true,
                                            }))
                                          }
                                          title="Lihat semua"
                                        >
                                          ...
                                        </Button>
                                      )}

                                      {isExpanded && (
                                        <Button
                                          variant="ghost"
                                          className="h-8 px-3 text-xs self-start"
                                          onClick={() =>
                                            setExpandedRefs((prev) => ({
                                              ...prev,
                                              [message.id]: false,
                                            }))
                                          }
                                          title="Sembunyikan"
                                        >
                                          Sembunyikan
                                        </Button>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}

                          {message.role === "assistant" && (
                            <div className="flex items-center gap-2 mt-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-muted"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-muted"
                              >
                                <ThumbsUp className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-muted"
                              >
                                <ThumbsDown className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start w-full">
                      <div className="flex items-start gap-3 max-w-[80%]">
                        <Avatar className="w-8 h-8 bg-primary/10 flex items-center justify-center">
                          <Bot className="w-4 h-4 text-primary" />
                        </Avatar>
                        <Card className="p-3 bg-muted">
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              AI sedang memproses...
                            </span>
                          </div>
                        </Card>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t border-border p-4">
              {/* Image Preview */}
              {images.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={img}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-16 object-cover rounded-md border border-border"
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(idx)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="h-8 w-8 p-0 hover:bg-muted"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>

                <div className="flex-1 relative">
                  <Textarea
                    ref={textareaRef}
                    placeholder="Ketik query atau pertanyaan..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={isLoading}
                    className="resize-none min-h-10 max-h-32 pr-10 py-2 border-border bg-background text-foreground placeholder:text-muted-foreground"
                    rows={1}
                  />
                </div>

                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={isLoading || (!input.trim() && images.length === 0)}
                  className="h-8 w-8 p-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </DialogContent>
      <ConfirmDeleteChatDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingTopicId(null);
            setDeletingTitle(undefined);
          }
          setDeleteDialogOpen(open);
        }}
        onConfirm={handleConfirmDeleteChat}
        loading={deleting}
        topicTitle={deletingTitle}
      />
      <FilePreview
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </Dialog>
  );
};
