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

type UIColumn = { key: string; label: string };

type UITable = {
  type: "table";
  title?: string | null;
  columns: UIColumn[];
  data: Record<string, any>[];
};

type UIText = {
  type: "text";
  title?: string | null;
  text: string;
};

type UIResponse = UITable | UIText;

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string; // fallback/legacy text
  ui?: UIResponse; // NEW structured response for assistant
  reference_documents?: ReferenceDocument[];
  images?: string[];
  timestamp: Date;
  metadata?: {
    narrative?: any; // Table structure {type, columns, data}
    response?: any;
    reference_documents?: ReferenceDocument[];
    session_id?: string;
    agent?: string;
    organization_id?: string;
    num_references?: number;
    [key: string]: any;
  };
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

function uiToClipboardText(ui?: UIResponse, fallback?: string) {
  if (!ui) return fallback ?? "";
  if (ui.type === "text") return ui.text;

  const headers = ui.columns.map((c) => c.label).join("\t");
  const rows = ui.data.map((r) =>
    ui.columns.map((c) => String(r?.[c.key] ?? "")).join("\t"),
  );
  return [headers, ...rows].join("\n");
}

function AssistantContent({ message }) {
  console.log("MESSAGE FULL:", message.metadata); // Debug

  // Helper: Ambil table data dari source manapun
  const getTableData = () => {
    // 1. Prioritas: narrative (history utama)
    if (message.metadata?.narrative && message.metadata.narrative !== "None") {
      return message.metadata.narrative;
    }
    // 2. ✅ BARU: response jika narrative kosong
    if (
      message.metadata?.response &&
      message.metadata.response.type === "table"
    ) {
      return {
        ...message.metadata.response,
        data: message.metadata.response.data || [], // Pastikan ada data array
      };
    }
    // 3. Fallback: ui real-time
    if (message.ui?.type === "table") {
      return message.ui;
    }
    return null;
  };

  const tableData = getTableData();
  if (tableData) {
    return (
      <div className="space-y-2">
        {tableData.title && (
          <p className="text-sm font-medium whitespace-pre-wrap break-words">
            {tableData.title}
          </p>
        )}
        {/* Table dari metadata */}
        <div className="w-full overflow-x-auto rounded-lg border border-border bg-background">
          <table className="min-w-full text-sm">
            <thead className="bg-muted">
              <tr>
                {tableData.columns?.map((col: UIColumn) => (
                  <th key={col.key} className="px-3 py-2 text-left font-medium">
                    {col.label}
                  </th>
                )) || <th className="px-3 py-2">Data</th>}
              </tr>
            </thead>
            <tbody>
              {tableData.data?.map((row: any, idx: number) => (
                <tr key={idx} className="border-t border-border">
                  {tableData.columns?.map((col: UIColumn) => (
                    <td key={col.key} className="px-3 py-2 align-top">
                      {String(row?.[col.key] ?? row?.nama ?? "—")}
                    </td>
                  )) || <td className="px-3 py-2">{JSON.stringify(row)}</td>}
                </tr>
              )) || (
                <tr>
                  <td className="px-3 py-2 text-muted-foreground italic">
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* References dari metadata */}
        {message.metadata?.referencedocuments?.length > 0 && (
          <div className="mt-2 w-full">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              Reference
            </p>
            {/* Render ref_docs table/list */}
            <div className="flex flex-wrap gap-1.5">
              {message.metadata.reference_documents.map((ref, idx) => (
                <button
                  key={idx}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs hover:border-primary/50 transition-colors max-w-[140px]"
                >
                  <span>{ref.filename}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // FALLBACK: UI response (real-time chat)
  if (message.ui?.type === "table") {
    const t = message.ui;
    return (
      <div className="space-y-2">
        {t.title && (
          <p className="text-sm font-medium whitespace-pre-wrap break-words">
            {t.title}
          </p>
        )}
        <div className="w-full overflow-x-auto rounded-lg border border-border bg-background">
          <table className="min-w-full text-sm">
            {/* Existing table logic... */}
          </table>
        </div>
      </div>
    );
  }

  // Text fallback
  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
      {message.content}
    </p>
  );
}

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
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  // Chat history states (API-based)
  const [topics, setTopics] = useState<Topic[]>([]);
  const [currentTopicId, setCurrentTopicId] = useState<string | null>(null);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [isTemporarySession, setIsTemporarySession] = useState(false);
  const [skipNextLoad, setSkipNextLoad] = useState(false);
  const activeTopicIdRef = useRef<string | null>(null);
  const [activeTopicForHighlight, setActiveTopicForHighlight] = useState<
    string | null
  >(null);
  const isCreatingTopicRef = useRef<boolean>(false);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTopicId, setDeletingTopicId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deletingTitle, setDeletingTitle] = useState<string | undefined>(
    undefined,
  );

  // for preview image
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const handleImageClick = (imageUrl: string) => {
    setPreviewImageUrl(imageUrl);
  };

  const { toast } = useToast();
  const { files, error } = useFiles("all", null, "name", "asc");

  // Desktop: sidebar considered open always; Mobile: default closed
  React.useEffect(() => {
    if (isDesktop) {
      setIsSidebarOpen(true);
    } else {
      setIsSidebarOpen(false);
      setIsSidebarCollapsed(false);
    }
  }, [isDesktop]);

  // Helper: show "more" button for references
  const shouldShowMore = (itemsLen: number, isExpanded: boolean) =>
    !isExpanded && itemsLen > 3;

  // Load topics from API on mount
  useEffect(() => {
    const loadTopics = async () => {
      if (!open) return;

      try {
        setIsLoadingTopics(true);
        const fetchedTopics = await ChatHistoryService.getTopics();

        console.log("[Topics] fetched:", fetchedTopics);

        if (Array.isArray(fetchedTopics)) {
          setTopics(fetchedTopics);
        } else {
          console.error("[Topics] invalid response:", fetchedTopics);
          setTopics([]);
          toast({
            title: "Warning",
            description: "Invalid topics response format",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("[Topics] failed:", error);
        setTopics([]);
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

  // Load messages when topic changes
  useEffect(() => {
    const loadMessages = async () => {
      if (isCreatingTopicRef.current) {
        console.log("[Load Messages] topic creation in progress, skipping");
        return;
      }

      if (skipNextLoad) {
        console.log("[Load Messages] skipping (skipNextLoad)");
        setSkipNextLoad(false);
        return;
      }

      if (isTemporarySession) {
        console.log("[Load Messages] temporary session, skipping");
        return;
      }

      if (!currentTopicId && activeTopicIdRef.current) {
        console.log("[Load Messages] topic being created, skipping");
        return;
      }

      if (!currentTopicId) {
        console.log("[Load Messages] no currentTopicId, clearing messages");
        setMessages([]);
        return;
      }

      console.log("[Load Messages] loading for topic:", currentTopicId);

      try {
        setIsLoadingMessages(true);
        const fetchedMessages =
          await ChatHistoryService.getMessages(currentTopicId);

        console.log("[Load Messages] fetched count:", fetchedMessages.length);

        const uiMessages: Message[] = fetchedMessages.map((msg: any) => {
          const referenceDocumentsRaw: ReferenceDocument[] = Array.isArray(
            msg.reference_documents,
          )
            ? msg.reference_documents
            : [];

          const referenceDocuments: ReferenceDocument[] = uniqReferences(
            referenceDocumentsRaw,
            "file",
          );
          console.log("LOAD REFERENCES : ", referenceDocuments);
          return {
            id: msg.id,
            role: msg.role,
            content: msg.content,
            metadata: msg.metadata,
            // Real-time UI (jika ada)
            ui: msg.ui_response ?? undefined,
            reference_documents: referenceDocuments,
            images: msg.metadata?.images,
            timestamp: new Date(msg.created_at),
          };
        });

        setMessages(uiMessages);
      } catch (error) {
        console.error("[Load Messages] failed:", error);
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

  // Create new chat - start temporary session
  const createNewChat = () => {
    console.log("[New Chat] temporary session");
    setIsTemporarySession(true);
    setCurrentTopicId(null);
    activeTopicIdRef.current = null;
    setActiveTopicForHighlight(null);
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

      toast({ title: "Success", description: "Chat deleted" });
    } catch (error) {
      console.error("[Delete Chat] failed:", error);
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
      if (messages.length > 0) return;
      if (isCreatingTopicRef.current || isLoading) return;

      if (!currentTopicId && !isTemporarySession) {
        console.log("[Modal Open] starting temporary session");
        setIsTemporarySession(true);
      }
    }

    if (!open) {
      console.log("[Modal] closing, clearing state");
      setInput("");
      setImages([]);
      setIsLoading(false);
      setIsTemporarySession(false);
      activeTopicIdRef.current = null;
      setActiveTopicForHighlight(null);
      setMessages([]);
    }
  }, [open, currentTopicId, isTemporarySession, isLoadingTopics]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      ) as HTMLElement | null;
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

  const handlePreview = async (file_id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    files.forEach((f: any) => {
      if (f.id === file_id) setPreviewFile(f);
    });
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify.success("Berhasil disalin");
    } catch (e) {
      notify.error("Gagal menyalin");
    }
  };

  const handleConfirmDeleteChat = async () => {
    if (!deletingTopicId) return;
    try {
      setDeleting(true);
      await deleteChat(deletingTopicId);
    } finally {
      setDeleting(false);
      setDeletingTopicId(null);
    }
  };

  function uniqReferences(
    refs: ReferenceDocument[],
    mode: "file" | "chunk" = "file",
  ): ReferenceDocument[] {
    const m = new Map<string, ReferenceDocument>();

    for (const r of refs) {
      if (!r?.file_id) continue;
      const key = mode === "file" ? r.file_id : `${r.file_id}:${r.chunk_index}`;
      if (!m.has(key)) m.set(key, r); // keep first occurrence
    }

    return Array.from(m.values());
  }

  const handleSend = async () => {
    if (!input.trim() && images.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      images: images.length > 0 ? [...images] : undefined,
      timestamp: new Date(),
    };

    const userQuery = input;
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
          isCreatingTopicRef.current = true;
          setIsTemporarySession(false);

          const newTitle =
            userQuery.slice(0, 25) + (userQuery.length > 25 ? "..." : "");
          const newTopic = await ChatHistoryService.createTopic(newTitle);

          activeTopicIdRef.current = newTopic.id;
          setTopics((prev) => [newTopic, ...prev]);

          topicId = newTopic.id;
        } catch (error) {
          console.error("[First Message] createTopic failed:", error);
          toast({
            title: "Error",
            description: "Failed to create chat topic",
            variant: "destructive",
          });
          setIsLoading(false);
          isCreatingTopicRef.current = false;
          setIsTemporarySession(true);
          return;
        }
      } else {
        console.log("[Subsequent Message] using existing topic:", topicId);
      }

      const data: any = await ChatHistoryService.askAgent(
        userQuery,
        topicId,
        true, // save_history
      );

      console.log("[Agent Response] raw:", data);
      setConversationLoading(false);

      // NEW contract: data.response (structured)
      const ui: UIResponse | undefined = data?.response;

      // Legacy fallback
      const answerText: string =
        (ui?.type === "text" ? ui.text : "") ||
        data?.answer ||
        "Tidak ada jawaban dari server.";

      const referenceDocumentsRaw: ReferenceDocument[] = Array.isArray(
        data?.reference_documents,
      )
        ? data.reference_documents
        : Array.isArray(data?.referencedocuments)
          ? data.referencedocuments
          : [];

      const referenceDocuments: ReferenceDocument[] = uniqReferences(
        referenceDocumentsRaw,
        "file",
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: answerText,
        ui: ui,
        reference_documents: referenceDocuments,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (shouldCreateTopic && activeTopicIdRef.current) {
        setSkipNextLoad(true);
        setActiveTopicForHighlight(activeTopicIdRef.current);
        setCurrentTopicId(activeTopicIdRef.current);
        isCreatingTopicRef.current = false;
      }
    } catch (error) {
      console.error("[Send] error:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      isCreatingTopicRef.current = false;
    } finally {
      setIsLoading(false);
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
              flex flex-col bg-background border-r border-border transition-all duration-300 ease-in-out
              ${
                isDesktop
                  ? `relative shrink-0 ${isSidebarCollapsed ? "w-34" : "w-64 lg:w-72"}`
                  : `fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] shadow-2xl ${
                      isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                    }`
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
                        group relative rounded-lg border cursor-pointer transition-colors duration-150
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
                                    className="rounded-lg max-h-32 w-full object-cover border border-border/50 cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => handleImageClick(img)}
                                  />
                                ))}
                              </div>
                            )}

                            {message.role === "assistant" ? (
                              <AssistantContent message={message} />
                            ) : (
                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                            )}

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
                                    const items =
                                      message.reference_documents || [];
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
                                onClick={() =>
                                  handleCopy(
                                    uiToClipboardText(
                                      message.ui,
                                      message.content,
                                    ),
                                  )
                                }
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
                        // Tambahkan class cursor-pointer dan hover effect
                        className="h-14 w-14 sm:h-16 sm:w-16 object-cover rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity"
                        // Panggil fungsi handleImageClick yang sama
                        onClick={() => handleImageClick(img)}
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
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
                  className="flex-1 min-h-[36px] sm:min-h-[40px] max-h-32 resize-none py-2 px-3 text-sm sm:text-base rounded-xl border-border"
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
        onOpenChange={(o) => {
          if (!o) {
            setDeletingTopicId(null);
            setDeletingTitle(undefined);
          }
          setDeleteDialogOpen(o);
        }}
        onConfirm={handleConfirmDeleteChat}
        loading={deleting}
        topicTitle={deletingTitle}
      />

      {/* Image Preview Modal */}
      <Dialog
        open={!!previewImageUrl}
        onOpenChange={(open) => !open && setPreviewImageUrl(null)}
      >
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-none">
          <div className="relative flex items-center justify-center min-h-[50vh] max-h-[90vh]">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-white hover:bg-white/20 z-50 bg-black/40 rounded-full"
              onClick={() => setPreviewImageUrl(null)}
            >
              <X className="h-5 w-5" />
            </Button>
            {previewImageUrl && (
              <img
                src={previewImageUrl}
                alt="Preview"
                className="w-auto h-auto max-w-full max-h-[90vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <FilePreview
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </Dialog>
  );
};
