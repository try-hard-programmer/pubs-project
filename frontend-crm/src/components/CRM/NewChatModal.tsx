import { useState } from "react";
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
import { MessageCircle, Send, Mail, Globe, Loader2, User } from "lucide-react";
import type { CommunicationChannel } from "@/services/crmChatsService";

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

export const NewChatModal = ({ open, onClose, agents, onCreateChat }: NewChatModalProps) => {
    const [channel, setChannel] = useState<CommunicationChannel>("whatsapp");
    const [contact, setContact] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [initialMessage, setInitialMessage] = useState("");
    const [assignedAgentId, setAssignedAgentId] = useState<string>("unassigned");
    const [isCreating, setIsCreating] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const channels = [
        { value: "whatsapp", label: "WhatsApp", icon: MessageCircle, placeholder: "+62 812 3456 7890" },
        { value: "telegram", label: "Telegram", icon: Send, placeholder: "@username atau +62..." },
        { value: "email", label: "Email", icon: Mail, placeholder: "customer@example.com" },
        { value: "web", label: "Web Chat", icon: Globe, placeholder: "customer@example.com" },
    ] as const;

    const selectedChannel = channels.find(c => c.value === channel);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!customerName.trim()) {
            newErrors.customerName = "Nama customer wajib diisi";
        }

        if (!contact.trim()) {
            newErrors.contact = "Kontak tujuan wajib diisi";
        } else {
            // Validate based on channel
            if (channel === "email" || channel === "web") {
                const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailPattern.test(contact)) {
                    newErrors.contact = "Format email tidak valid";
                }
            } else if (channel === "whatsapp") {
                // Basic phone number validation
                const phonePattern = /^[\d\s\-\+\(\)]+$/;
                if (!phonePattern.test(contact)) {
                    newErrors.contact = "Format nomor telepon tidak valid";
                }
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
            await onCreateChat({
                channel,
                contact: contact.trim(),
                customerName: customerName.trim(),
                initialMessage: initialMessage.trim(),
                assignedAgentId: assignedAgentId !== "unassigned" ? assignedAgentId : undefined,
            });

            // Reset form
            setContact("");
            setCustomerName("");
            setInitialMessage("");
            setAssignedAgentId("unassigned");
            setChannel("whatsapp");
            setErrors({});
            onClose();
        } catch (error) {
            console.error("Error creating chat:", error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleClose = () => {
        if (!isCreating) {
            setContact("");
            setCustomerName("");
            setInitialMessage("");
            setAssignedAgentId("unassigned");
            setChannel("whatsapp");
            setErrors({});
            onClose();
        }
    };

    const ChannelIcon = selectedChannel?.icon || MessageCircle;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Buat Chat Baru</DialogTitle>
                    <DialogDescription>
                        Pilih channel komunikasi dan masukkan detail customer untuk memulai percakapan baru.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Channel Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="channel">
                            Channel Komunikasi <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={channel}
                            onValueChange={(value) => {
                                setChannel(value as CommunicationChannel);
                                setContact(""); // Reset contact when channel changes
                                setErrors(prev => ({ ...prev, contact: "" }));
                            }}
                            disabled={isCreating}
                        >
                            <SelectTrigger id="channel">
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

                    {/* Customer Name */}
                    <div className="space-y-2">
                        <Label htmlFor="customerName">
                            Nama Customer <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="customerName"
                            placeholder="John Doe"
                            value={customerName}
                            onChange={(e) => {
                                setCustomerName(e.target.value);
                                setErrors(prev => ({ ...prev, customerName: "" }));
                            }}
                            disabled={isCreating}
                        />
                        {errors.customerName && (
                            <p className="text-xs text-red-500">{errors.customerName}</p>
                        )}
                    </div>

                    {/* Contact Input */}
                    <div className="space-y-2">
                        <Label htmlFor="contact">
                            {channel === "email" || channel === "web" ? "Email" : "Nomor Kontak"}{" "}
                            <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="contact"
                            placeholder={selectedChannel?.placeholder}
                            value={contact}
                            onChange={(e) => {
                                setContact(e.target.value);
                                setErrors(prev => ({ ...prev, contact: "" }));
                            }}
                            disabled={isCreating}
                        />
                        {errors.contact && (
                            <p className="text-xs text-red-500">{errors.contact}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            {channel === "whatsapp" && "Contoh: +62 812 3456 7890"}
                            {channel === "telegram" && "Contoh: @username atau nomor telepon"}
                            {(channel === "email" || channel === "web") && "Contoh: customer@example.com"}
                        </p>
                    </div>

                    {/* Agent Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="agent">
                            Assign to Agent (Opsional)
                        </Label>
                        <Select
                            value={assignedAgentId}
                            onValueChange={setAssignedAgentId}
                            disabled={isCreating}
                        >
                            <SelectTrigger id="agent">
                                <SelectValue placeholder="Pilih agent (atau biarkan kosong untuk AI)">
                                    {assignedAgentId === "unassigned" ? (
                                        <span className="text-muted-foreground">Tidak assign (AI akan menangani)</span>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4" />
                                            <span>{agents.find(a => a.id === assignedAgentId)?.name}</span>
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
                                    .filter(agent => agent.status === "active")
                                    .map((agent) => (
                                        <SelectItem key={agent.id} value={agent.id}>
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                <span>{agent.name}</span>
                                                <span className="text-xs text-muted-foreground">({agent.email})</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Pilih agent yang akan mengirim pesan pertama. Jika tidak dipilih, AI akan menangani chat.
                        </p>
                    </div>

                    {/* Initial Message */}
                    <div className="space-y-2">
                        <Label htmlFor="message">
                            Pesan Awal <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                            id="message"
                            placeholder="Halo, ada yang bisa kami bantu?"
                            value={initialMessage}
                            onChange={(e) => {
                                setInitialMessage(e.target.value);
                                setErrors(prev => ({ ...prev, initialMessage: "" }));
                            }}
                            disabled={isCreating}
                            rows={4}
                        />
                        {errors.initialMessage && (
                            <p className="text-xs text-red-500">{errors.initialMessage}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Pesan pertama yang akan dikirim ke customer
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isCreating}
                    >
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
                                Membuat Chat...
                            </>
                        ) : (
                            <>
                                <MessageCircle className="h-4 w-4" />
                                Buat Chat
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
