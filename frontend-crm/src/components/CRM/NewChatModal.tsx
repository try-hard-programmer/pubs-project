import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageCircle,
  Send,
  Mail,
  Globe,
  Loader2,
  User,
  Search,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  type CommunicationChannel,
  type Customer,
  getCustomers,
} from "@/services/crmChatsService";
import { cn } from "@/lib/utils";

interface Agent {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive" | "busy";
}

interface NewChatModalProps {
  open: boolean;
  onClose: () => void;
  agents: Agent[];
  onCreateChat: (data: {
    channel: CommunicationChannel;
    contact: string;
    customerName: string;
    initialMessage: string;
    assignedAgentId?: string;
  }) => Promise<void>;
}

export const NewChatModal = ({
  open,
  onClose,
  agents,
  onCreateChat,
}: NewChatModalProps) => {
  // Shared State
  const [channel, setChannel] = useState<CommunicationChannel>("whatsapp");
  const [initialMessage, setInitialMessage] = useState("");
  const [assignedAgentId, setAssignedAgentId] = useState<string>("unassigned");
  const [isCreating, setIsCreating] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<"existing" | "manual">("existing");

  // Manual Input State
  const [manualName, setManualName] = useState("");
  const [manualContact, setManualContact] = useState("");

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const channels = [
    {
      value: "whatsapp",
      label: "WhatsApp",
      icon: MessageCircle,
      placeholder: "+62 812 3456 7890",
    },
    {
      value: "telegram",
      label: "Telegram",
      icon: Send,
      placeholder: "@username, ID (843...), atau +62...",
    },
    {
      value: "email",
      label: "Email",
      icon: Mail,
      placeholder: "customer@example.com",
    },
    {
      value: "web",
      label: "Web Chat",
      icon: Globe,
      placeholder: "customer@example.com",
    },
  ] as const;

  const selectedChannel = channels.find((c) => c.value === channel);

  // Reset when modal opens/closes
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setSearchResults([]);
      setSelectedCustomer(null);
      setManualName("");
      setManualContact("");
      setErrors({});
      setActiveTab("existing");
    }
  }, [open]);

  // Handle Customer Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Fetch from API
        const results = await getCustomers({ search: searchQuery, limit: 5 });
        setSearchResults(results);
      } catch (error) {
        console.error("Failed to search customers", error);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  const handleSelectCustomer = (customer: Customer) => {
    // Validate compatibility immediately
    let isValid = true;
    let errorMsg = "";

    if (channel === "whatsapp" && !customer.phone) {
      isValid = false;
      errorMsg = "Customer ini tidak memiliki nomor telepon untuk WhatsApp.";
    } else if (channel === "email" && !customer.email) {
      isValid = false;
      errorMsg = "Customer ini tidak memiliki alamat email.";
    } else if (channel === "telegram") {
      // For Telegram, we check metadata ID OR phone
      const hasTeleId = customer.metadata?.telegram_id;
      if (!customer.phone && !hasTeleId) {
        isValid = false;
        errorMsg = "Customer ini tidak memiliki Phone atau Telegram ID.";
      }
    }

    if (!isValid) {
      setErrors((prev) => ({ ...prev, selection: errorMsg }));
      return; // Don't select
    }

    setSelectedCustomer(customer);
    setSearchQuery("");
    setSearchResults([]);
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (activeTab === "manual") {
      if (!manualName.trim())
        newErrors.customerName = "Nama customer wajib diisi";
      if (!manualContact.trim()) newErrors.contact = "Kontak wajib diisi";

      // Basic format check
      if (manualContact.trim()) {
        if (
          (channel === "email" || channel === "web") &&
          !manualContact.includes("@")
        ) {
          newErrors.contact = "Format email tidak valid";
        }
      }
    } else {
      if (!selectedCustomer) {
        newErrors.selection = "Silakan pilih customer dari database";
      }
    }

    if (!initialMessage.trim()) {
      newErrors.initialMessage = "Pesan awal wajib diisi";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsCreating(true);
    try {
      let finalName = "";
      let finalContact = "";

      if (activeTab === "existing" && selectedCustomer) {
        finalName = selectedCustomer.name;

        // Smart Contact Selection
        if (channel === "email" || channel === "web") {
          finalContact = selectedCustomer.email || "";
        } else if (channel === "telegram") {
          // Prefer Telegram ID if available (Ghost users), otherwise Phone
          finalContact =
            selectedCustomer.metadata?.telegram_id ||
            selectedCustomer.phone ||
            "";
        } else {
          // WhatsApp
          finalContact = selectedCustomer.phone || "";
        }
      } else {
        finalName = manualName.trim();
        finalContact = manualContact.trim();
      }

      // Sanitize Phone Numbers (remove leading +)
      // But keep Telegram IDs intact (unless they look like phones with +)
      if (channel === "whatsapp" || channel === "telegram") {
        if (finalContact.startsWith("+")) {
          finalContact = finalContact.replace(/^\+/, "");
        }
      }

      await onCreateChat({
        channel,
        contact: finalContact,
        customerName: finalName,
        initialMessage: initialMessage.trim(),
        assignedAgentId:
          assignedAgentId !== "unassigned" ? assignedAgentId : undefined,
      });

      handleClose();
    } catch (error) {
      console.error("Error creating chat:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setManualName("");
      setManualContact("");
      setInitialMessage("");
      setSelectedCustomer(null);
      setSearchQuery("");
      setAssignedAgentId("unassigned");
      setErrors({});
      onClose();
    }
  };

  const ChannelIcon = selectedChannel?.icon || MessageCircle;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] overflow-visible">
        <DialogHeader>
          <DialogTitle>Buat Chat Baru</DialogTitle>
          <DialogDescription>
            Pilih customer dari database atau masukkan kontak manual.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 1. Channel Selection */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Channel</Label>
            <Select
              value={channel}
              onValueChange={(value) => {
                setChannel(value as CommunicationChannel);
                setSelectedCustomer(null); // Reset selection on channel change
                setErrors({});
              }}
              disabled={isCreating}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <ChannelIcon className="h-4 w-4" />
                    <span>{selectedChannel?.label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {channels.map((ch) => {
                  const Icon = ch.icon;
                  return (
                    <SelectItem key={ch.value} value={ch.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{ch.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            className="w-full"
          >
            <div className="grid grid-cols-4 gap-4">
              <Label className="text-right pt-2">Metode</Label>
              <div className="col-span-3">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="existing">Cari Database</TabsTrigger>
                  <TabsTrigger value="manual">Input Manual</TabsTrigger>
                </TabsList>
              </div>
            </div>

            {/* TAB 1: EXISTING */}
            <TabsContent value="existing" className="mt-4 space-y-4">
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2.5">Customer</Label>
                <div className="col-span-3 space-y-2">
                  {!selectedCustomer ? (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Ketik nama / email / telepon..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setErrors({});
                        }}
                      />
                      {isSearching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}

                      {/* Search Results */}
                      {searchResults.length > 0 && (
                        <div className="absolute top-full mt-1 w-full bg-popover border rounded-md shadow-lg z-50 max-h-[200px] overflow-auto">
                          {searchResults.map((customer) => (
                            <div
                              key={customer.id}
                              className="px-3 py-2.5 hover:bg-accent cursor-pointer flex items-center justify-between border-b last:border-0"
                              onClick={() => handleSelectCustomer(customer)}
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium text-sm">
                                  {customer.name}
                                </span>
                                <span className="text-xs text-muted-foreground flex items-center gap-2">
                                  {customer.phone ||
                                  customer.metadata?.telegram_id ? (
                                    <span className="flex items-center gap-1">
                                      <MessageCircle className="h-3 w-3" />
                                      {customer.phone ||
                                        customer.metadata?.telegram_id}
                                    </span>
                                  ) : null}
                                  {customer.email && (
                                    <span className="flex items-center gap-1 border-l pl-2 border-border">
                                      <Mail className="h-3 w-3" />
                                      {customer.email}
                                    </span>
                                  )}
                                </span>
                              </div>
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 border rounded-md bg-green-50/50 border-green-200">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">
                            {selectedCustomer.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {channel === "telegram"
                              ? selectedCustomer.metadata?.telegram_id ||
                                selectedCustomer.phone
                              : selectedCustomer.phone ||
                                selectedCustomer.email}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCustomer(null)}
                      >
                        Ganti
                      </Button>
                    </div>
                  )}
                  {errors.selection && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.selection}
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: MANUAL */}
            <TabsContent value="manual" className="mt-4 space-y-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Nama</Label>
                <div className="col-span-3">
                  <Input
                    placeholder="Nama customer baru"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                  />
                  {errors.customerName && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.customerName}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Kontak</Label>
                <div className="col-span-3">
                  <Input
                    placeholder={selectedChannel?.placeholder}
                    value={manualContact}
                    onChange={(e) => setManualContact(e.target.value)}
                  />
                  {errors.contact && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.contact}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {channel === "telegram"
                      ? "Bisa nomor HP, Username (@...), atau ID (123...)"
                      : "Masukkan nomor/email yang valid"}
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* 3. Assign & Message */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Assign</Label>
            <Select
              value={assignedAgentId}
              onValueChange={setAssignedAgentId}
              disabled={isCreating}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Pilih agent">
                  {assignedAgentId === "unassigned" ? (
                    <span className="text-muted-foreground">
                      Tidak assign (AI)
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>
                        {agents.find((a) => a.id === assignedAgentId)?.name}
                      </span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    <span>Tidak assign (AI)</span>
                  </div>
                </SelectItem>
                {agents
                  .filter((agent) => agent.status === "active")
                  .map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{agent.name}</span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Pesan</Label>
            <div className="col-span-3">
              <Textarea
                placeholder="Halo, ada yang bisa kami bantu?"
                value={initialMessage}
                onChange={(e) => {
                  setInitialMessage(e.target.value);
                  setErrors((prev) => ({ ...prev, initialMessage: "" }));
                }}
                rows={3}
              />
              {errors.initialMessage && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.initialMessage}
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isCreating}
            className="gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Buat Chat
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
