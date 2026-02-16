import React, { useState, useRef, useEffect } from "react";
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
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  List,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { FileItem, useFiles } from "@/hooks/useFiles";
import { FilePreview } from "./FileManager/FilePreview";
import { ChatHistoryService, Topic } from "@/lib/chatHistoryService";
import { ConfirmDeleteChatDialog } from "./ConfirmDeleteChatDialog";
import { toast as notify } from "sonner";

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
  const isDesktop = useMediaQuery("(min-width: 768px)"); // md breakpoint default Tailwind [web:63]
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false); // khusus mobile drawer
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false); // khusus desktop collapse

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

  function useMediaQuery(query: string) {
    const [matches, setMatches] = React.useState(false);

    React.useEffect(() => {
      const mql = window.matchMedia(query);
      const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);

      setMatches(mql.matches);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }, [query]);

    return matches;
  }

  // Desktop: sidebar dianggap "open" selalu; Mobile: default closed
  React.useEffect(() => {
    if (isDesktop) {
      setIsSidebarOpen(true); // desktop selalu “open” (tidak off-canvas)
    } else {
      setIsSidebarOpen(false); // mobile default tertutup
      setIsSidebarCollapsed(false); // reset biar tidak aneh saat pindah mode
    }
  }, [isDesktop]);

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
        setConversationLoading(true);
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

      setConversationLoading(false);
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

  const handleCopy = async (messages: string) => {
    try {
      await navigator.clipboard.writeText(messages);
      notify.success("Berhasil disalin");
    } catch (e) {
      notify.error("Gagal menyalin");
    }
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
        className={`
          flex flex-col p-0 gap-0 bg-background border-border overflow-hidden
          ${
            isFullscreen
              ? "w-screen h-screen max-w-none rounded-none"
              : "w-[95vw] h-[95vh] sm:w-[90vw] sm:h-[85vh] md:max-w-4xl lg:max-w-6xl md:h-[80vh]"
          }
        `}
        showCloseButton={false}
      >
        <DialogHeader className="shrink-0 px-3 py-2 sm:px-4 sm:py-3 border-b border-border">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h2 className="font-semibold text-sm sm:text-base truncate">
                AI Agent Chat
              </h2>
              <span className="hidden sm:inline-flex text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {selectedAgent === "default" ? "Default Agent" : "Agent"}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </Button>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        <div className="relative flex flex-1 min-h-0 overflow-hidden">
          {!isDesktop && isSidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          <aside
            className={`
              flex flex-col bg-background border-r border-border
              transition-all duration-300 ease-in-out
              ${
                isDesktop
                  ? `relative shrink-0 ${isSidebarCollapsed ? "w-34" : "w-64 lg:w-72"}`
                  : `fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] shadow-2xl
                   ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`
              }
            `}
          >
            <div className="shrink-0 p-2 sm:p-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    createNewChat();
                    if (!isDesktop) setIsSidebarOpen(false);
                  }}
                  size="sm"
                  className={`
                    h-9 gap-2 bg-primary text-primary-foreground hover:bg-primary/90
                    ${isDesktop && isSidebarCollapsed ? "w-24p-0 justify-center" : "flex-1 justify-start"}
                  `}
                >
                  <MessageSquarePlus className="h-4 w-4 shrink-0" />
                  {!(isDesktop && isSidebarCollapsed) && (
                    <span className="text-sm">New Chat</span>
                  )}
                </Button>

                {!isDesktop && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}

                {isDesktop && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => setIsSidebarCollapsed((v) => !v)}
                  >
                    {isSidebarCollapsed ? (
                      <ChevronsRight className="h-4 w-4" />
                    ) : (
                      <ChevronsLeft className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {isLoadingTopics ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <p className="text-xs text-muted-foreground mt-2">
                      Loading...
                    </p>
                  </div>
                ) : !Array.isArray(topics) || topics.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 px-4">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      No chat history yet
                    </p>
                  </div>
                ) : (
                  topics.map((topic) => (
                    <div
                      key={topic.id}
                      className={`
                        group relative rounded-lg border cursor-pointer
                        transition-colors duration-150
                        ${
                          currentTopicId === topic.id ||
                          activeTopicForHighlight === topic.id
                            ? "bg-primary/10 border-primary/30"
                            : "bg-card border-transparent hover:bg-muted/50 hover:border-border"
                        }
                      `}
                      onClick={() => {
                        setCurrentTopicId(topic.id);
                        activeTopicIdRef.current = topic.id;
                        setActiveTopicForHighlight(topic.id);
                        setIsTemporarySession(false);
                        if (!isDesktop) setIsSidebarOpen(false);
                      }}
                      title={
                        isDesktop && isSidebarCollapsed
                          ? topic.title
                          : undefined
                      }
                    >
                      <div
                        className={`p-2.5 ${!(isDesktop && isSidebarCollapsed) ? "pr-8" : ""}`}
                      >
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          {!(isDesktop && isSidebarCollapsed) && (
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {topic.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {new Date(
                                  topic.updated_at,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 
                                     hover:bg-destructive/10 hover:text-destructive transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingTopicId(topic.id);
                          setDeletingTitle(topic.title);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </aside>

          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <div className="shrink-0 md:hidden border-b border-border px-3 py-2 flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setIsSidebarOpen(true)}
              >
                <List className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground truncate">
                {selectedAgent === "default" ? "Default Agent" : "Agent"}
              </span>
            </div>

            <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0">
              <div className="p-3 sm:p-4 lg:p-6">
                {conversationLoading || isLoadingMessages ? (
                  <div className="flex flex-col items-center justify-center min-h-[50vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p className="text-sm text-muted-foreground">
                      Loading conversation...
                    </p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
                    <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
                      <Bot className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      Selamat datang di AI Agent Chat
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Mulai percakapan dengan mengetik pertanyaan atau query.
                      Chat session akan berakhir ketika modal ditutup.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 sm:space-y-6">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-2 sm:gap-3 ${
                          message.role === "user"
                            ? "flex-row-reverse"
                            : "flex-row"
                        }`}
                      >
                        <Avatar className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 flex items-center justify-center">
                          {message.role === "assistant" ? (
                            <Bot className="h-4 w-4 text-primary" />
                          ) : (
                            <User className="h-4 w-4 text-secondary-foreground" />
                          )}
                        </Avatar>

                        <div
                          className={`
                            flex flex-col min-w-0
                            max-w-[85%] sm:max-w-[75%] lg:max-w-[70%]
                            ${message.role === "user" ? "items-end" : "items-start"}
                          `}
                        >
                          <Card
                            className={`
                              px-3 py-2 sm:px-4 sm:py-3 shadow-sm
                              ${
                                message.role === "user"
                                  ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
                                  : "bg-muted rounded-2xl rounded-tl-sm"
                              }
                            `}
                          >
                            {message.images && message.images.length > 0 && (
                              <div className="grid grid-cols-2 gap-2 mb-3">
                                {message.images.map((img, idx) => (
                                  <img
                                    key={idx}
                                    src={img}
                                    alt={`Upload ${idx + 1}`}
                                    className="rounded-lg max-h-32 w-full object-cover border border-border/50"
                                  />
                                ))}
                              </div>
                            )}

                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                              {message.content}
                            </p>

                            <p
                              className={`text-[10px] sm:text-xs mt-1.5 opacity-60 ${
                                message.role === "user"
                                  ? "text-primary-foreground"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </Card>

                          {message.role === "assistant" &&
                            Array.isArray(message.reference_documents) &&
                            message.reference_documents.length > 0 && (
                              <div className="mt-2 w-full">
                                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                                  Reference
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {(() => {
                                    const isExpanded =
                                      !!expandedRefs[message.id];
                                    const items = message.reference_documents;
                                    const displayItems = isExpanded
                                      ? items
                                      : items.slice(0, 3);

                                    return (
                                      <>
                                        {displayItems.map((ref, idx) => (
                                          <button
                                            key={idx}
                                            type="button"
                                            onClick={(e) =>
                                              handlePreview(ref.file_id, e)
                                            }
                                            className="inline-flex items-center gap-1.5 rounded-md border border-border 
                                                       bg-background px-2 py-1 text-xs hover:border-primary/50 
                                                       transition-colors max-w-[140px] sm:max-w-[180px]"
                                          >
                                            <span>📄</span>
                                            <span className="truncate">
                                              {ref.filename}
                                            </span>
                                          </button>
                                        ))}
                                        {shouldShowMore(
                                          items.length,
                                          isExpanded,
                                        ) && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 px-2 text-xs"
                                            onClick={() =>
                                              setExpandedRefs((prev) => ({
                                                ...prev,
                                                [message.id]: true,
                                              }))
                                            }
                                          >
                                            +{items.length - 3} more
                                          </Button>
                                        )}
                                        {isExpanded && items.length > 3 && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 text-xs"
                                            onClick={() =>
                                              setExpandedRefs((prev) => ({
                                                ...prev,
                                                [message.id]: false,
                                              }))
                                            }
                                          >
                                            Show less
                                          </Button>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            )}

                          {message.role === "assistant" && (
                            <div className="flex items-center gap-1 mt-1.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleCopy(message.content)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                              >
                                <ThumbsUp className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                              >
                                <ThumbsDown className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {isLoading && (
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8 shrink-0 flex items-center justify-center bg-primary/10">
                          <Bot className="h-4 w-4 text-primary" />
                        </Avatar>
                        <Card className="px-4 py-3 bg-muted">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              AI sedang memproses...
                            </span>
                          </div>
                        </Card>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="shrink-0 border-t border-border bg-background p-2 sm:p-3 lg:p-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              {images.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative shrink-0 group">
                      <img
                        src={img}
                        alt={`Preview ${idx + 1}`}
                        className="h-14 w-14 sm:h-16 sm:w-16 object-cover rounded-lg border border-border"
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 opacity-0 group-hover:opacity-100 
                                   transition-opacity shadow-sm"
                        onClick={() => removeImage(idx)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 sm:h-10 sm:w-10 shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                >
                  <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>

                <Textarea
                  ref={textareaRef}
                  placeholder="Ketik query atau pertanyaan..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={isLoading}
                  className="flex-1 min-h-[36px] sm:min-h-[40px] max-h-32 resize-none py-2 px-3 
                             text-sm sm:text-base rounded-xl border-border"
                  rows={1}
                />

                <Button
                  size="icon"
                  className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-xl"
                  onClick={handleSend}
                  disabled={isLoading || (!input.trim() && images.length === 0)}
                >
                  <Send className="h-4 w-4 sm:h-5 sm:w-5" />
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
