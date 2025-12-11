import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Share2,
  Mail,
  Shield,
  Copy,
  Trash2,
  Globe,
  Lock,
  Users,
  X,
  Check,
  ChevronDown,
  MoreVertical,
  Calendar,
} from "lucide-react";
import { FileItem, useFiles } from "@/hooks/useFiles";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionType } from "@/lib/fileManagerApi";

interface SharedUser {
  id: string;
  email: string;
  access_level: PermissionType;
  shared_at: string;
  expires_at?: string | null;
}
interface User {
  id: string;
  aud: string;
  role: string;
  email: string;
}

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileItem | null;
  previousRecipients?: string[];
  user?: User;
}

export const ShareDialog = ({
  open,
  onOpenChange,
  file,
  previousRecipients = [],
  user,
}: ShareDialogProps) => {
  const [activeTab, setActiveTab] = useState<"share" | "manage">("share");
  const [newEmail, setNewEmail] = useState("");
  const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
  const [accessLevel, setAccessLevel] = useState<PermissionType>("view");
  const [message, setMessage] = useState("");
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDays, setExpirationDays] = useState(7);
  const [isSharing, setIsSharing] = useState(false);
  // Public link state
  const [isPublic, setIsPublic] = useState(false);
  const [publicLink, setPublicLink] = useState("");
  const [publicAccessLevel, setPublicAccessLevel] =
    useState<PermissionType>("view");
  const [isCreatingPublicLink, setIsCreatingPublicLink] = useState(false);
  // Shared users list
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const toISOAfterDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + (Number.isFinite(days) ? days : 0));
    return d.toISOString();
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const addEmail = (raw: string) => {
    const email = raw.trim();
    if (!email) return;

    if (!emailRegex.test(email)) {
      toast.error(`Format email tidak valid: ${email}`);
      return;
    }
    if (recipientEmails.includes(email)) {
      toast.error(`Email sudah ada: ${email}`);
      return;
    }

    setRecipientEmails((prev) => [...prev, email]);
    setNewEmail("");
  };

  const removeEmail = (email: string) => {
    setRecipientEmails((prev) => prev.filter((e) => e !== email));
  };

  const {
    shareFile,
    updateFileShare,
    deleteFileShare,
    createPublicShareUrl,
    fetchFileShareDetail,
  } = useFiles();

  const accessLevelLabels = {
    view: "Viewer",
    edit: "Editor",
    delete: "Can delete",
    // share: "Can share",
    manage: "Manager",
  };

  const loadSharedUsers = async () => {
    if (!file) return;
    setIsLoadingUsers(true);
    try {
      const shares = await fetchFileShareDetail({
        file_id: file.id,
      });
      if (Array.isArray(shares) && shares.length > 0) {
        const mapped: SharedUser[] = shares
          .filter(
            (s) =>
              typeof s?.shared_with_email === "string" &&
              s.shared_with_email!.trim() !== "" &&
              s.shared_with_user_id !== user?.id // 🔹 filter agar tidak menampilkan email user login
          )
          .map((s) => ({
            id: s.id,
            email: s.shared_with_email!.trim(),
            access_level: (s.access_level as PermissionType) ?? "view",
            shared_at: s.created_at ?? new Date().toISOString(),
            expires_at: s.expires_at ?? null,
          }));

        setSharedUsers(mapped);
      } else if (previousRecipients.length > 0) {
        const fallback: SharedUser[] = previousRecipients.map((email, idx) => ({
          id: `temp-${idx}`,
          email,
          access_level: "view",
          shared_at: new Date().toISOString(),
          expires_at: null,
        }));
        setSharedUsers(fallback);
      } else {
        setSharedUsers([]);
      }
    } catch (err) {
      console.error("Error loading shared users:", err);
      if (previousRecipients.length > 0) {
        const fallback: SharedUser[] = previousRecipients.map((email, idx) => ({
          id: `temp-${idx}`,
          email,
          access_level: "view",
          shared_at: new Date().toISOString(),
          expires_at: null,
        }));
        setSharedUsers(fallback);
      } else {
        setSharedUsers([]);
      }
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Load saat dialog buka / file berubah
  useEffect(() => {
    if (open && file?.id) {
      loadSharedUsers();
    }
  }, [open, file?.id, previousRecipients]);

  const handleShare = async () => {
    if (!recipientEmails.length && newEmail.trim()) addEmail(newEmail);
    if (!file || !recipientEmails.length) {
      toast.error("Tambahkan minimal satu email penerima");
      return;
    }

    setIsSharing(true);
    try {
      const results = await Promise.allSettled(
        recipientEmails.map(
          (email) =>
            shareFile({
              file_id: file.id,
              shared_with_email: email,
              access_level: accessLevel,
              expires_at: hasExpiration ? toISOAfterDays(expirationDays) : null,
              metadata: { note: message },
            }).then(() => email) // value = email yang sukses
        )
      );

      const succeeded: string[] = [];
      const failed: { email: string; reason: string }[] = [];

      results.forEach((r, idx) => {
        const email =
          (r.status === "fulfilled" ? r.value : null) ?? recipientEmails[idx];
        if (r.status === "fulfilled") {
          succeeded.push(email);
        } else {
          const msg =
            (r.reason as any)?.message ||
            (typeof r.reason === "string" ? r.reason : "Unknown error");
          failed.push({ email, reason: msg });
        }
      });

      if (failed.length) {
        const failText = failed
          .map((f) => {
            let msg: string;

            // f.reason di sini diasumsikan string, misalnya: "Error: {\"detail\": \"Email not registered\"}"
            const raw = f.reason ?? "";

            try {
              // buang prefix "Error: " kalau ada
              const parsed = JSON.parse(String(raw).replace(/^Error:\s*/, ""));
              msg = parsed?.detail || String(raw);
            } catch {
              // kalau JSON.parse gagal, pakai teks asli
              msg = String(raw);
            }

            return `• ${msg}`;
          })
          .join("<br />");

        toast.error(
          <div
            dangerouslySetInnerHTML={{
              __html: `Beberapa email gagal:<br />${failText}<br /><br />Berhasil: ${succeeded.length}, Gagal: ${failed.length}`,
            }}
          />
        );
        setNewEmail("");
        setRecipientEmails([]);
        setMessage("");
        setHasExpiration(false);
        setExpirationDays(7);
        setAccessLevel("view");
        await loadSharedUsers();
        setActiveTab("manage");
        // tidak pindah tab, tidak reset form
        return;
      }

      // kalau semua berhasil
      toast.success(`Berhasil membagikan ke ${succeeded.length} email`);
      setNewEmail("");
      setRecipientEmails([]);
      setMessage("");
      setHasExpiration(false);
      setExpirationDays(7);
      setAccessLevel("view");
      await loadSharedUsers();
      setActiveTab("manage");
    } catch (err) {
      console.error(err);
      toast.error("Gagal membagikan file");
    } finally {
      setIsSharing(false);
    }
  };

  const handleUpdateAccess = async (level: PermissionType, shareId: string) => {
    setPendingId(shareId);
    setSharedUsers((prev) => {
      const next = prev.map((u) =>
        u.id === shareId ? { ...u, access_level: level } : u
      );
      return next;
    });
    try {
      await updateFileShare({
        share_id: shareId,
        access_level: level,
        expires_at: hasExpiration ? toISOAfterDays(expirationDays) : null,
        metadata: { note: message },
      });
      toast.success("Akses berhasil diperbarui");
    } catch (e) {
      await loadSharedUsers();
      toast.error("Gagal memperbarui akses");
    } finally {
      setPendingId(null);
    }
  };

  const handleRemoveAccess = async (email: string, shareId: string) => {
    const snapshot = sharedUsers;
    setSharedUsers((prev) => prev.filter((u) => u.id !== shareId));
    try {
      await deleteFileShare({ share_id: shareId });
      toast.success(`Akses ${email} dihapus`);
    } catch (e) {
      setSharedUsers(snapshot);
      toast.error("Gagal menghapus akses");
    }
  };

  const handleGeneratePublicLink = async () => {
    if (!file) return;
    setIsCreatingPublicLink(true);

    try {
      const res = await createPublicShareUrl({
        file_id: file.id,
        permission: publicAccessLevel,
        expires_in_hours: 24,
      });

      setPublicLink(res.share_url);

      toast.success("Link publik berhasil dibuat");
    } catch (error) {
      console.error("Generate public link error:", error);
      toast.error("Gagal membuat link publik");
    } finally {
      setIsCreatingPublicLink(false);
    }
  };

  const handleUpdatePublicAccess = async (newLevel: "view" | "edit") => {
    if (!file || !isPublic) return;

    try {
      setPublicAccessLevel(newLevel);
      toast.success("Akses publik diperbarui");
    } catch (error) {
      console.error("Update public access error:", error);
      toast.error("Gagal memperbarui akses publik");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Link disalin ke clipboard");
  };

  const getInitials = (email?: string | null) => {
    const s = (email ?? "").trim();
    if (!s) return "??";
    // Jika email valid, ambil 2 karakter pertama sebelum '@'
    const namePart = s.split("@")[0] || s;
    return namePart.slice(0, 2).toUpperCase();
  };

  const resetDialog = () => {
    setNewEmail("");
    setMessage("");
    setHasExpiration(false);
    setExpirationDays(7);
    setAccessLevel("view");
    setActiveTab("share");
    setPendingId(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetDialog();
    setPublicLink("");
    onOpenChange(newOpen);
  };

  const filteredPreviousRecipients = previousRecipients.filter(
    (email) => email !== user?.email
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl min-h-[90vh] bg-background flex flex-col">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-lg font-semibold">
                Bagikan "{file?.name}"
              </div>
              <div className="text-xs text-muted-foreground">
                Kelola siapa yang dapat mengakses file ini
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 py-4">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="relative w-full">
              <TabsList className="grid grid-cols-2 w-full relative">
                <TabsTrigger
                  value="share"
                  className="flex items-center justify-center gap-2 py-2"
                >
                  <Mail className="w-4 h-4" />
                  Bagikan
                </TabsTrigger>

                <TabsTrigger
                  value="manage"
                  className="flex items-center justify-center gap-2 py-2"
                >
                  <Users className="w-4 h-4" />
                  Kelola Akses ({sharedUsers.length})
                </TabsTrigger>

                <div
                  className={`
        absolute bottom-0 h-[2px] bg-primary transition-all duration-300
      `}
                  style={{
                    width: "50%",
                    left: activeTab === "share" ? "0%" : "50%",
                  }}
                ></div>
              </TabsList>
            </div>

            <TabsContent value="share" className="space-y-4 pt-4 pb-6">
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <Label className="text-sm font-medium">
                        Link Publik Sementara
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        Klik tombol di samping untuk menghasilkan link sekali
                        pakai
                      </span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleGeneratePublicLink}
                    disabled={isCreatingPublicLink}
                  >
                    {isCreatingPublicLink ? "Membuat..." : "Generate Link"}
                  </Button>
                </div>

                {publicLink && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
                      <Input
                        value={publicLink}
                        readOnly
                        placeholder="Link publik akan tampil di sini"
                        className="text-sm font-mono bg-background"
                      />
                      <Button
                        size="sm"
                        onClick={() => copyToClipboard(publicLink)}
                        variant="outline"
                        disabled={!publicLink}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Salin
                      </Button>
                      {publicLink && (
                        <Button size="sm" asChild>
                          <a
                            href={publicLink}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Buka
                          </a>
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">
                        Siapa saja dengan link dapat:
                      </Label>
                      <Select
                        value={publicAccessLevel}
                        onValueChange={(v: "view" | "edit") =>
                          handleUpdatePublicAccess(v)
                        }
                      >
                        <SelectTrigger className="h-8 w-36">
                          <SelectValue placeholder="Pilih akses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">Melihat</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Bagikan ke orang tertentu
                </Label>

                <div className="flex flex-col gap-2">
                  {/* Chips email */}
                  {recipientEmails.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {recipientEmails.map((email) => (
                        <Button
                          key={email}
                          variant="outline"
                          size="sm"
                          className="text-xs flex items-center gap-1"
                          type="button"
                          onClick={() => removeEmail(email)}
                        >
                          {email}
                          <X className="w-3 h-3" />
                        </Button>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder={
                        recipientEmails.length
                          ? "Ketik email lain lalu Enter / koma"
                          : "Masukkan email lalu Enter / koma"
                      }
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (["Enter", "Tab", ","].includes(e.key)) {
                          e.preventDefault();
                          addEmail(newEmail);
                        }
                      }}
                      className="flex-1"
                    />

                    <Select
                      value={accessLevel}
                      onValueChange={(value: any) => setAccessLevel(value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="view">Viewer</SelectItem>
                        <SelectItem value="edit">Editor</SelectItem>
                        <SelectItem value="delete">Can delete</SelectItem>
                        {/* <SelectItem value="share">Can share</SelectItem> */}
                        <SelectItem value="manage">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-sm">
                    Pesan (opsional)
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="Tambahkan pesan untuk penerima..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={2}
                    className="resize-none text-sm"
                  />
                </div>

                {/* <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <Calendar className="w-4 h-4" />
                    Atur masa berlaku
                  </Label>
                  <Switch
                    checked={hasExpiration}
                    onCheckedChange={setHasExpiration}
                  />
                </div>

                {hasExpiration && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="expiration"
                      className="text-xs text-muted-foreground"
                    >
                      Akses akan berakhir dalam:
                    </Label>
                    <Select
                      value={expirationDays.toString()}
                      onValueChange={(value) =>
                        setExpirationDays(parseInt(value))
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hari</SelectItem>
                        <SelectItem value="3">3 hari</SelectItem>
                        <SelectItem value="7">7 hari</SelectItem>
                        <SelectItem value="14">14 hari</SelectItem>
                        <SelectItem value="30">30 hari</SelectItem>
                        <SelectItem value="90">90 hari</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div> */}

                <Button
                  onClick={handleShare}
                  disabled={
                    isSharing || (!newEmail.trim() && !recipientEmails.length)
                  }
                  className="w-full"
                >
                  {isSharing ? "Membagikan..." : "Kirim Undangan"}
                </Button>
              </div>

              {filteredPreviousRecipients.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Pernah dibagikan ke:
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {filteredPreviousRecipients.slice(0, 3).map((email) => (
                      <Button
                        key={email}
                        variant="outline"
                        size="sm"
                        onClick={() => addEmail(email)}
                        className="text-xs"
                        type="button"
                      >
                        {email}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="manage"
              className="flex-1 overflow-y-auto space-y-2 pt-4 pb-6"
            >
              {isLoadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-muted-foreground">Memuat...</div>
                </div>
              ) : sharedUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="w-12 h-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Belum ada yang memiliki akses
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setActiveTab("share")}
                    className="mt-2"
                  >
                    Bagikan file ini
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {sharedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <Avatar className="h-9 w-9 bg-gradient-to-br from-blue-500 to-purple-500">
                        <AvatarFallback className="text-white text-xs font-semibold">
                          {getInitials(user.email)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {user.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Dibagikan{" "}
                          {new Date(user.shared_at).toLocaleDateString("id-ID")}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Select
                          value={user.access_level}
                          onValueChange={(v: PermissionType) => {
                            handleUpdateAccess(v, user.id);
                          }}
                          disabled={pendingId === user.id}
                        >
                          <SelectTrigger className="h-9 w-36 border-0 bg-transparent hover:bg-muted focus:ring-0 focus:ring-offset-0">
                            <SelectValue>
                              <span className="flex items-center gap-1.5">
                                <span className="text-sm">
                                  {accessLevelLabels[user.access_level]}
                                </span>
                              </span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="view">
                              <span className="flex items-center gap-2">
                                Viewer
                              </span>
                            </SelectItem>
                            <SelectItem value="edit">
                              <span className="flex items-center gap-2">
                                Editor
                              </span>
                            </SelectItem>
                            <SelectItem value="delete">
                              <span className="flex items-center gap-2">
                                Can delete
                              </span>
                            </SelectItem>
                            {/* <SelectItem value="share">
                            <span className="flex items-center gap-2">
                              Can share
                            </span>
                          </SelectItem> */}
                            <SelectItem value="manage">
                              <span className="flex items-center gap-2">
                                Manage
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleRemoveAccess(user.email, user.id)
                          }
                          disabled={pendingId === user.id}
                          className="h-9 w-9 p-0 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="p-4 border-t flex justify-end">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Selesai
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
