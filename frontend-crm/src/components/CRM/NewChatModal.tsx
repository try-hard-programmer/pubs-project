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
  Info,
} from "lucide-react";
import {
  type CommunicationChannel,
  type Customer,
  getCustomers,
} from "@/services/crmChatsService";
import { cn } from "@/lib/utils";

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
    }
  }, [open]);

  // --- BEST PRACTICE: STRICT FILTERING IN SEARCH ---
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

        // 🛡️ FILTER: Only show customers valid for the selected channel
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
  }, [searchQuery, channel]); // Re-run if channel changes

  const handleSelectCustomer = (customer: Customer) => {
    // Double check (Guard Clause)
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
    setErrors({});
  };

  const hasEmoji = (str: string) =>
    /(\p{Extended_Pictographic}|\p{Emoji_Presentation})/gu.test(str);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (activeTab === "manual") {
      if (channel === "telegram")
        newErrors.selection = "Manual input not allowed for Telegram";
      if (!manualName.trim()) newErrors.customerName = "Nama wajib diisi";
      else if (hasEmoji(manualName))
        newErrors.customerName = "Nama tidak boleh emoticon";

      if (!manualContact.trim()) newErrors.contact = "Kontak wajib diisi";
      else if (hasEmoji(manualContact))
        newErrors.contact = "Kontak tidak boleh emoticon";
    } else {
      if (!selectedCustomer)
        newErrors.selection = "Pilih customer dari database";
    }

    if (!initialMessage.trim())
      newErrors.initialMessage = "Pesan awal wajib diisi";
    else if (hasEmoji(initialMessage))
      newErrors.initialMessage = "Pesan tidak boleh emoticon";

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

      // Non-Blocking Duplicate Check
      const cleanNew = finalContact.replace(/[^a-zA-Z0-9]/g, "");
      const duplicate = existingChats.find((c) => {
        if (selectedCustomer?.id && c.customerId === selectedCustomer.id)
          return true;
        const cleanExisting = (c.contact || "").replace(/[^a-zA-Z0-9]/g, "");
        return cleanExisting && cleanExisting === cleanNew;
      });

      if (duplicate && onOpenExistingChat) {
        onOpenExistingChat(duplicate.id); // UX Switch
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
          {/* Channel */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Channel</Label>
            <Select
              value={channel}
              onValueChange={(v) => {
                setChannel(v as any);
                setSelectedCustomer(null);
                if (v === "telegram") setActiveTab("existing");
              }}
              disabled={isCreating}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue>
                  <div className="flex gap-2">
                    <ChannelIcon className="w-4 h-4" />
                    {selectedChannel?.label}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {channels.map((ch) => (
                  <SelectItem key={ch.value} value={ch.value}>
                    {ch.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              if (channel !== "telegram") setActiveTab(v as any);
            }}
            className="w-full"
          >
            <div className="grid grid-cols-4 gap-4">
              <Label className="text-right pt-2">Metode</Label>
              <div className="col-span-3">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="existing">Cari Database</TabsTrigger>
                  <TabsTrigger
                    value="manual"
                    disabled={channel === "telegram"}
                    className={channel === "telegram" ? "opacity-50" : ""}
                  >
                    Input Manual
                  </TabsTrigger>
                </TabsList>
                {channel === "telegram" && (
                  <p className="text-[10px] text-amber-600 mt-2">
                    Telegram butuh ID valid (Existing Customer).
                  </p>
                )}
              </div>
            </div>

            <TabsContent value="existing" className="mt-4 space-y-4">
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2.5">Customer</Label>
                <div className="col-span-3 relative">
                  {!selectedCustomer ? (
                    <>
                      <Input
                        placeholder={`Cari customer ${selectedChannel?.label}...`}
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
                              className="p-2 hover:bg-accent cursor-pointer flex justify-between"
                              onClick={() => handleSelectCustomer(c)}
                            >
                              <div className="text-sm font-medium">
                                {c.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {channel === "email"
                                  ? c.email
                                  : c.phone || c.metadata?.telegram_id}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex justify-between p-2 border rounded bg-green-50">
                      <span className="text-sm font-medium">
                        {selectedCustomer.name}
                      </span>
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
                    <p className="text-xs text-red-500 mt-1">
                      {errors.selection}
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="mt-4 space-y-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Nama</Label>
                <Input
                  className="col-span-3"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Kontak</Label>
                <Input
                  className="col-span-3"
                  value={manualContact}
                  onChange={(e) => setManualContact(e.target.value)}
                  placeholder={selectedChannel?.placeholder}
                />
              </div>
              {(errors.customerName || errors.contact) && (
                <p className="text-xs text-red-500 text-right">
                  {errors.customerName || errors.contact}
                </p>
              )}
            </TabsContent>
          </Tabs>

          {/* Assign & Message */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Assign</Label>
            <Select value={assignedAgentId} onValueChange={setAssignedAgentId}>
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Tidak assign (AI)</SelectItem>
                {/* Removed Assign to Me option */}
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

          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Pesan</Label>
            <div className="col-span-3">
              <Textarea
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
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
          <Button variant="outline" onClick={handleClose}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={isCreating}>
            {isCreating ? "Memproses..." : "Buat Chat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
