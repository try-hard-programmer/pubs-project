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
  Search,
  Zap,
} from "lucide-react";
import {
  type CommunicationChannel,
  type Customer,
  getCustomers,
} from "@/services/crmChatsService";

export interface ExistingChatSnippet {
  id: string;
  customerName: string;
  contact: string;
  customerId?: string;
}

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
  existingChats: ExistingChatSnippet[];
  onOpenExistingChat: (chatId: string) => void;
  onCreateChat: (data: {
    channel: CommunicationChannel;
    contact: string;
    customerName: string;
    initialMessage: string;
    assignedAgentId?: string;
    using_agent_integration_id?: string; // FIX: Rename this to match backend
  }) => Promise<void>;
}

export const NewChatModal = ({
  open,
  onClose,
  agents,
  existingChats = [],
  onOpenExistingChat,
  onCreateChat,
}: NewChatModalProps) => {
  const [channel, setChannel] = useState<CommunicationChannel>("whatsapp");
  const [initialMessage, setInitialMessage] = useState("");
  const [assignedAgentId, setAssignedAgentId] = useState<string>("unassigned");
  const [integrationAgentId, setIntegrationAgentId] =
    useState<string>("unassigned");
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<"existing" | "manual">("existing");
  const [manualName, setManualName] = useState("");
  const [manualContact, setManualContact] = useState("");
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
      placeholder: "+62 812...",
    },
    {
      value: "telegram",
      label: "Telegram",
      icon: Send,
      placeholder: "@username...",
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

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setSearchResults([]);
      setSelectedCustomer(null);
      setManualName("");
      setManualContact("");
      setInitialMessage("");
      setErrors({});
      setActiveTab("existing");
      setAssignedAgentId("select agent");
      setIntegrationAgentId("select agent integration");
    }
  }, [open]);

  // Handle Search Debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await getCustomers({ search: searchQuery, limit: 10 });

        const filteredResults = results.filter((customer) => {
          if (channel === "whatsapp") return !!customer.phone;
          if (channel === "telegram")
            return !!(customer.metadata?.telegram_id || customer.phone);
          if (channel === "email") return !!customer.email;
          return true;
        });

        setSearchResults(filteredResults.slice(0, 5));
      } catch (error) {
        console.error("Failed to search customers", error);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, channel]);

  const handleSelectCustomer = (customer: Customer) => {
    let isValid = true;
    if (channel === "whatsapp" && !customer.phone) isValid = false;
    else if (channel === "email" && !customer.email) isValid = false;
    else if (
      channel === "telegram" &&
      !customer.metadata?.telegram_id &&
      !customer.phone
    )
      isValid = false;

    if (!isValid) {
      setErrors((prev) => ({
        ...prev,
        selection: `Customer ini tidak valid untuk channel ${channel}`,
      }));
      return;
    }

    setSelectedCustomer(customer);
    setSearchQuery("");
    setSearchResults([]);
    setErrors((prev) => ({ ...prev, selection: "" }));
  };

  // --- Helper Functions ---

  const hasEmoji = (str: string) =>
    /(\p{Extended_Pictographic}|\p{Emoji_Presentation})/gu.test(str);

  // STRICT Regex FIX: Removed invalid escape characters.
  // Allowed: Letters, Numbers, Spaces, Hyphen (-), Apostrophe ('), Dot (.)
  const isValidName = (name: string) => {
    // FIX: Removed backslash before ' and . (only needed for hyphen if not at start/end)
    // Note: In [] hyphen is special, so we keep \- or move it to end.
    // ' and . do NOT need escaping in []
    const validNameRegex = /^[\p{L}\p{N}\s\-''.]+$/u;
    return validNameRegex.test(name);
  };

  const handleNameChange = (value: string) => {
    // 1. Allow clearing the input
    if (value === "") {
      setManualName("");
      setErrors((prev) => ({ ...prev, customerName: "" }));
      return;
    }

    // 2. INPUT MASKING: If invalid character, REJECT change immediately
    if (!isValidName(value)) {
      setErrors((prev) => ({
        ...prev,
        customerName:
          "Karakter tidak diizinkan. Hanya huruf, angka, titik, dan spasi.",
      }));
      return; // Stop execution, do not update state
    }

    // 3. Valid input
    setErrors((prev) => ({ ...prev, customerName: "" }));
    setManualName(value);
  };

  const handleContactChange = (value: string) => {
    if (hasEmoji(value)) {
      setErrors((prev) => ({
        ...prev,
        contact: "Kontak tidak boleh mengandung emoticon",
      }));
      return;
    }
    setManualContact(value);
    setErrors((prev) => ({ ...prev, contact: "" }));
  };

  // --- Validation ---

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (activeTab === "manual") {
      if (channel === "telegram") {
        newErrors.selection = "Manual input tidak diperbolehkan untuk Telegram";
      }

      // Name Validation
      if (!manualName.trim()) {
        newErrors.customerName = "Nama wajib diisi";
      } else if (!isValidName(manualName)) {
        newErrors.customerName = "Nama mengandung karakter tidak valid";
      }

      // Contact Validation
      if (!manualContact.trim()) {
        newErrors.contact = "Kontak wajib diisi";
      } else if (hasEmoji(manualContact)) {
        newErrors.contact = "Kontak tidak boleh mengandung emoticon";
      }
    } else {
      if (!selectedCustomer) {
        newErrors.selection = "Pilih customer dari database";
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
      let finalName = "",
        finalContact = "";

      if (activeTab === "existing" && selectedCustomer) {
        finalName = selectedCustomer.name;
        if (channel === "email") finalContact = selectedCustomer.email || "";
        else if (channel === "telegram")
          finalContact =
            selectedCustomer.metadata?.telegram_id ||
            selectedCustomer.phone ||
            "";
        else finalContact = selectedCustomer.phone || "";
      } else {
        finalName = manualName.trim();
        finalContact = manualContact.trim();
      }

      if (channel === "whatsapp" && finalContact.startsWith("+"))
        finalContact = finalContact.replace(/^\+/, "");

      // Check for duplicates
      const cleanNew = finalContact.replace(/[^a-zA-Z0-9]/g, "");
      const duplicate = existingChats.find((c) => {
        if (selectedCustomer?.id && c.customerId === selectedCustomer.id)
          return true;
        const cleanExisting = (c.contact || "").replace(/[^a-zA-Z0-9]/g, "");
        return cleanExisting && cleanExisting === cleanNew;
      });

      if (duplicate && onOpenExistingChat) {
        onOpenExistingChat(duplicate.id);
      }

      await onCreateChat({
        channel,
        contact: finalContact,
        customerName: finalName,
        initialMessage: initialMessage.trim(),
        assignedAgentId:
          assignedAgentId !== "unassigned" ? assignedAgentId : undefined,
        using_agent_integration_id:
          integrationAgentId !== "unassigned" ? integrationAgentId : undefined,
      });
      handleClose();
    } catch (error) {
      console.error(error);
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
            Pilih customer sesuai channel yang valid.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Channel Select */}
          <div className="space-y-2">
            <Label>Channel</Label>
            <Select
              value={channel}
              onValueChange={(v) => {
                setChannel(v as any);
                setSelectedCustomer(null);
                setErrors({});
                if (v === "telegram") setActiveTab("existing");
              }}
              disabled={isCreating}
            >
              <SelectTrigger>
                <SelectValue>
                  <div className="flex gap-2 items-center">
                    <ChannelIcon className="w-4 h-4" />
                    {selectedChannel?.label}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {channels.map((ch) => (
                  <SelectItem key={ch.value} value={ch.value}>
                    <div className="flex gap-2 items-center">
                      <ch.icon className="w-4 h-4" />
                      {ch.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              if (channel !== "telegram") {
                setActiveTab(v as any);
                setErrors({});
              }
            }}
            className="w-full"
          >
            <div className="space-y-2">
              <Label>Metode Input</Label>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing">Cari Database</TabsTrigger>
                <TabsTrigger value="manual" disabled={channel === "telegram"}>
                  Input Manual
                </TabsTrigger>
              </TabsList>
              {channel === "telegram" && (
                <p className="text-xs text-amber-600">
                  Telegram membutuhkan ID valid dari database existing customer
                </p>
              )}
            </div>

            {/* TAB: Existing Customer */}
            <TabsContent value="existing" className="mt-4 space-y-2">
              <Label>Customer</Label>
              <div className="relative">
                {!selectedCustomer ? (
                  <>
                    <Input
                      placeholder={`Cari nama atau kontak customer...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin" />
                    )}
                    {searchResults.length > 0 && (
                      <div className="absolute top-full mt-1 w-full bg-popover border rounded-md shadow-lg z-50 max-h-[200px] overflow-auto">
                        {searchResults.map((c) => (
                          <div
                            key={c.id}
                            className="p-3 hover:bg-accent cursor-pointer"
                            onClick={() => handleSelectCustomer(c)}
                          >
                            <div className="flex justify-between items-center">
                              <div className="text-sm font-medium">
                                {c.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {channel === "email"
                                  ? c.email
                                  : c.phone || c.metadata?.telegram_id}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex justify-between items-center p-3 border rounded bg-green-50">
                    <div>
                      <div className="text-sm font-medium">
                        {selectedCustomer.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {channel === "email"
                          ? selectedCustomer.email
                          : selectedCustomer.phone ||
                            selectedCustomer.metadata?.telegram_id}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCustomer(null);
                        setErrors((prev) => ({ ...prev, selection: "" }));
                      }}
                    >
                      Ganti
                    </Button>
                  </div>
                )}
              </div>
              {errors.selection && (
                <p className="text-xs text-red-500">{errors.selection}</p>
              )}
            </TabsContent>

            {/* TAB: Manual Input */}
            <TabsContent value="manual" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>Nama Customer</Label>
                <Input
                  value={manualName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Masukkan nama customer..."
                  disabled={isCreating}
                />
                {errors.customerName && (
                  <p className="text-xs text-red-500">{errors.customerName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Kontak</Label>
                <Input
                  value={manualContact}
                  onChange={(e) => handleContactChange(e.target.value)}
                  placeholder={selectedChannel?.placeholder}
                  disabled={isCreating}
                />
                {errors.contact && (
                  <p className="text-xs text-red-500">{errors.contact}</p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label>Assign ke Agent</Label>
            <Select
              value={assignedAgentId}
              onValueChange={setAssignedAgentId}
              disabled={isCreating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Tidak assign agent</SelectItem>
                {agents
                  .filter((agent) => agent.status === "active")
                  .map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Assign ke Contact Integration Agent</Label>
            <Select
              value={integrationAgentId}
              onValueChange={setIntegrationAgentId}
              disabled={isCreating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">
                  Tidak assign agent integration
                </SelectItem>
                {agents
                  .filter((agent) => agent.status === "active")
                  .map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Pesan Awal</Label>
            <Textarea
              value={initialMessage}
              onChange={(e) => {
                setInitialMessage(e.target.value);
                if (e.target.value.trim()) {
                  setErrors((prev) => ({ ...prev, initialMessage: "" }));
                }
              }}
              rows={3}
              placeholder="Tulis pesan pembuka untuk customer..."
              disabled={isCreating}
            />
            {errors.initialMessage && (
              <p className="text-xs text-red-500">{errors.initialMessage}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Memproses...
              </>
            ) : (
              "Buat Chat"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
