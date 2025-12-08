import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User,
  FileText,
  Clock,
  Plug,
  Upload,
  Trash2,
  Plus,
  Download,
  Zap,
  AlertTriangle,
  X,
  Ticket,
  Loader2,
} from "lucide-react";
import { WhatsAppIntegration } from "./integrations/WhatsAppIntegration";
import { TelegramIntegration } from "./integrations/TelegramIntegration";
import { EmailIntegration } from "./integrations/EmailIntegration";
import { MCPIntegration } from "./integrations/MCPIntegration";
import { toast } from "sonner";
import * as crmAgentsService from "@/services/crmAgentsService";
import type {
  AgentSettingsFrontend,
  KnowledgeDocument as KnowledgeDocumentAPI,
} from "@/services/crmAgentsService";

interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "busy";
  settings?: AgentSettings;
}

interface AgentSettings {
  persona: {
    name: string;
    language: string;
    tone: string;
    customInstructions: string;
  };
  knowledgeBase: KnowledgeDocument[];
  schedule: {
    enabled: boolean;
    timezone: string;
    workingHours: WorkingHours[];
  };
  integrations: {
    whatsapp: ChannelIntegration;
    telegram: ChannelIntegration;
    email: ChannelIntegration;
    mcp: ChannelIntegration;
  };
  advanced: {
    temperature: "consistent" | "balanced" | "creative";
    historyLimit: number;
    handoffTriggers: {
      enabled: boolean;
      keywords: string[];
      sentimentThreshold: number;
      unansweredQuestions: number;
      escalationMessage: string;
    };
  };
  ticketing: {
    enabled: boolean;
    autoCreateTicket: boolean;
    ticketPrefix: string;
    requireCategory: boolean;
    requirePriority: boolean;
    autoCloseAfterResolved: boolean;
    autoCloseDelay: number; // in hours
    categories: string[];
  };
}

interface KnowledgeDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedAt: string;
}

interface WorkingHours {
  day: string;
  enabled: boolean;
  start: string;
  end: string;
}

interface ChannelIntegration {
  enabled: boolean;
  config: Record<string, string>;
}

interface AgentSettingsModalProps {
  open: boolean;
  onClose: () => void;
  agent: Agent | null;
  onSave: (agentId: string, settings: AgentSettings) => void;
}

export const AgentSettingsModal = ({
  open,
  onClose,
  agent,
  onSave,
}: AgentSettingsModalProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const saveInProgressRef = useRef(false);
  const [settings, setSettings] = useState<AgentSettings>({
    persona: {
      name: "Customer Support Assistant",
      language: "id",
      tone: "friendly",
      customInstructions: "",
    },
    knowledgeBase: [],
    schedule: {
      enabled: false,
      timezone: "Asia/Jakarta",
      // When scheduling is disabled we keep workingHours empty. When enabled, we'll populate defaults or use API values.
      workingHours: [],
    },
    integrations: {
      whatsapp: { enabled: false, config: {} },
      telegram: { enabled: false, config: {} },
      email: { enabled: false, config: {} },
      mcp: { enabled: false, config: {} },
    },
    advanced: {
      temperature: "balanced",
      historyLimit: 10,
      handoffTriggers: {
        enabled: true,
        keywords: [],
        sentimentThreshold: -0.5,
        unansweredQuestions: 3,
        escalationMessage: "",
      },
    },
    ticketing: {
      enabled: false,
      autoCreateTicket: true,
      ticketPrefix: "TKT-",
      requireCategory: true,
      requirePriority: false,
      autoCloseAfterResolved: true,
      autoCloseDelay: 24,
      categories: [],
    },
  });

  // Fetch agent settings from API when modal opens
  useEffect(() => {
    if (open && agent?.id) {
      setLoading(true);
      Promise.all([
        crmAgentsService.getAgentSettings(agent.id),
        crmAgentsService.getKnowledgeDocuments(agent.id),
        crmAgentsService.getAgentIntegrations(agent.id),
      ])
        .then(([apiSettings, apiDocuments, apiIntegrations]) => {
          // Transform integrations array to object keyed by channel
          const integrationsObj = {
            whatsapp: { enabled: false, config: {} },
            telegram: { enabled: false, config: {} },
            email: { enabled: false, config: {} },
            mcp: { enabled: false, config: {} },
          };

          apiIntegrations.forEach((integration) => {
            if (integration.channel in integrationsObj) {
              integrationsObj[integration.channel] = {
                enabled: integration.enabled,
                config: integration.config || {},
              };
            }
          });

          // Build workingHours depending on whether scheduling is enabled in API.
          const dayNames = [
            "Senin",
            "Selasa",
            "Rabu",
            "Kamis",
            "Jumat",
            "Sabtu",
            "Minggu",
          ];
          const defaultWorkingHours = dayNames.map((day, index) => ({
            index: index,
            dayIndex: index,
            day,
            enabled: false, // Senin-Jumat enabled by default
            start: "09:00",
            end: "17:00",
          }));

          // Mapping from English day names (from API) to Indonesian + index
          const dayMapping: Record<string, { name: string; index: number }> = {
            monday: { name: "Senin", index: 0 },
            tuesday: { name: "Selasa", index: 1 },
            wednesday: { name: "Rabu", index: 2 },
            thursday: { name: "Kamis", index: 3 },
            friday: { name: "Jumat", index: 4 },
            saturday: { name: "Sabtu", index: 5 },
            sunday: { name: "Minggu", index: 6 },
          };

          // Define a local type for API working hours entries (as produced by getAgentSettings)
          type ApiWorkingHour = {
            dayIndex: number;
            day?: string | number;
            enabled?: boolean;
            start?: string;
            end?: string;
          };

          let workingHours: WorkingHours[];
          if (apiSettings.schedule.enabled) {
            workingHours = [...defaultWorkingHours];

            // If the API provided workingHours, merge them into the defaults by day index or name.
            if (
              apiSettings.schedule.workingHours &&
              apiSettings.schedule.workingHours.length > 0
            ) {
              // Start with defaults

              // Override with API data
              (apiSettings.schedule.workingHours as ApiWorkingHour[]).forEach(
                (apiHour) => {
                  if (apiHour.day && typeof apiHour.day === "string") {
                    const dayKey = apiHour.day.toLowerCase();
                    const mapping = dayMapping[dayKey];

                    if (mapping) {
                      workingHours[mapping.index] = {
                        day: mapping.name,
                        enabled: apiHour.enabled,
                        start: apiHour.start || "09:00",
                        end: apiHour.end || "17:00",
                      };
                    }
                  }
                }
              );
            } else {
              // No API workingHours but schedule enabled -> use default 7-day template
              workingHours = defaultWorkingHours;
            }
          } else {
            // Scheduling globally disabled -> do not expose per-day settings
            workingHours = [];
          }

          // Transform API settings to local AgentSettings format
          setSettings({
            persona: apiSettings.persona,
            knowledgeBase: (apiDocuments as KnowledgeDocumentAPI[]).map(
              (doc) => ({
                id: doc.id,
                name: doc.name,
                // service returns snake_case fields
                type: doc.file_type,
                size: `${doc.file_size_kb} KB`,
                uploadedAt: new Date(doc.uploaded_at).toLocaleString(),
              })
            ),
            schedule: {
              enabled: apiSettings.schedule.enabled,
              timezone: apiSettings.schedule.timezone,
              workingHours: workingHours,
            },
            integrations: integrationsObj,
            advanced: apiSettings.advanced,
            ticketing: apiSettings.ticketing,
          });
        })
        .catch((error) => {
          console.error("Failed to fetch agent settings:", error);
          toast.error("Gagal memuat pengaturan agent");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, agent?.id]);

  const handleSave = useCallback(async () => {
    // Double guard: check both state and ref to prevent concurrent calls
    if (saving || saveInProgressRef.current) return;

    saveInProgressRef.current = true;
    setSaving(true);
    try {
      // Create Indonesian to English day mapping for API
      const indonesianToEnglishDay: Record<string, string> = {
        Senin: "monday",
        Selasa: "tuesday",
        Rabu: "wednesday",
        Kamis: "thursday",
        Jumat: "friday",
        Sabtu: "saturday",
        Minggu: "sunday",
      };

      // Transform local settings to API format
      const apiSettings: Omit<AgentSettingsFrontend, "id" | "agentId"> = {
        persona: settings.persona,
        schedule: {
          enabled: settings.schedule.enabled,
          timezone: settings.schedule.timezone,
          // If schedule disabled, send empty array; otherwise send all 7 days with proper day attribute
          workingHours: settings.schedule.enabled
            ? settings.schedule.workingHours.map((wh, index) => ({
                day: indonesianToEnglishDay[wh.day] || wh.day.toLowerCase(), // Convert Indonesian day to English lowercase
                dayIndex: index, // Map index to dayIndex (0=Monday, 6=Sunday)
                enabled: wh.enabled,
                start: wh.start,
                end: wh.end,
              }))
            : [], // Empty array when schedule is disabled
        },
        advanced: settings.advanced,
        ticketing: settings.ticketing,
      };

      // Save settings to API
      await crmAgentsService.updateAgentSettings(agent.id, {
        id: "", // Will be filled by API
        agentId: agent.id,
        ...apiSettings,
      });

      toast.success("Pengaturan agent berhasil disimpan");
      onClose();
    } catch (error) {
      console.error("Failed to save agent settings:", error);
      toast.error("Gagal menyimpan pengaturan agent");
    } finally {
      setSaving(false);
      saveInProgressRef.current = false;
    }
  }, [saving, settings, agent, onSave, onClose]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`File ${file.name} terlalu besar (max 10MB)`);
          return null;
        }

        // Upload to API
        const uploadedDoc = (await crmAgentsService.uploadKnowledgeDocument(
          agent.id,
          file
        )) as KnowledgeDocumentAPI;

        // Transform to local format (service returns snake_case)
        return {
          id: uploadedDoc.id,
          name: uploadedDoc.name,
          type: uploadedDoc.file_type,
          size: `${uploadedDoc.file_size_kb} KB`,
          uploadedAt: new Date(uploadedDoc.uploaded_at).toLocaleString(),
        };
      });

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(
        (doc) => doc !== null
      ) as KnowledgeDocument[];

      if (successfulUploads.length > 0) {
        setSettings((prev) => ({
          ...prev,
          knowledgeBase: [...prev.knowledgeBase, ...successfulUploads],
        }));
        toast.success(`${successfulUploads.length} dokumen berhasil diupload`);
      }
    } catch (error) {
      console.error("Failed to upload documents:", error);
      toast.error("Gagal mengupload dokumen");
    } finally {
      setUploading(false);
    }

    // Reset file input
    event.target.value = "";
  };

  const handleRemoveDocument = async (docId: string) => {
    try {
      await crmAgentsService.deleteKnowledgeDocument(agent.id, docId);
      setSettings((prev) => ({
        ...prev,
        knowledgeBase: prev.knowledgeBase.filter((doc) => doc.id !== docId),
      }));
      toast.success("Dokumen berhasil dihapus");
    } catch (error) {
      console.error("Failed to delete document:", error);
      toast.error("Gagal menghapus dokumen");
    }
  };

  const updateWorkingHours = (
    index: number,
    field: keyof WorkingHours,
    value: string | boolean
  ) => {
    setSettings((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        workingHours: prev.schedule.workingHours.map((wh, i) =>
          i === index ? { ...wh, [field]: value } : wh
        ),
      },
    }));
  };

  const [newKeyword, setNewKeyword] = useState("");
  const [newCategory, setNewCategory] = useState("");

  // Guard: ensure hooks ordering is consistent — move early return here so hooks are always called
  if (!agent) return null;

  const handleAddKeyword = () => {
    if (newKeyword.trim()) {
      setSettings((prev) => ({
        ...prev,
        advanced: {
          ...prev.advanced,
          handoffTriggers: {
            ...prev.advanced.handoffTriggers,
            keywords: [
              ...prev.advanced.handoffTriggers.keywords,
              newKeyword.trim(),
            ],
          },
        },
      }));
      setNewKeyword("");
    }
  };

  const handleRemoveKeyword = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      advanced: {
        ...prev.advanced,
        handoffTriggers: {
          ...prev.advanced.handoffTriggers,
          keywords: prev.advanced.handoffTriggers.keywords.filter(
            (_, i) => i !== index
          ),
        },
      },
    }));
  };

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      setSettings((prev) => ({
        ...prev,
        ticketing: {
          ...prev.ticketing,
          categories: [...prev.ticketing.categories, newCategory.trim()],
        },
      }));
      setNewCategory("");
    }
  };

  const handleRemoveCategory = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      ticketing: {
        ...prev.ticketing,
        categories: prev.ticketing.categories.filter((_, i) => i !== index),
      },
    }));
  };

  const getTemperatureValue = (temp: string) => {
    switch (temp) {
      case "consistent":
        return 0.3;
      case "balanced":
        return 0.7;
      case "creative":
        return 1.0;
      default:
        return 0.7;
    }
  };

  const getTemperatureDescription = (temp: string) => {
    switch (temp) {
      case "consistent":
        return "Responses lebih konsisten dan predictable. Cocok untuk FAQ dan jawaban standard.";
      case "balanced":
        return "Balance antara konsistensi dan kreativitas. Recommended untuk most cases.";
      case "creative":
        return "Responses lebih variatif dan creative. Cocok untuk conversational dan brainstorming.";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-2xl font-bold">
            Agent Settings - {agent.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Konfigurasi lengkap untuk agent AI
          </p>
        </DialogHeader>

        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">
                Memuat pengaturan agent...
              </p>
            </div>
          </div>
        )}

        {!loading && (
          <>
            <Tabs
              defaultValue="persona"
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="px-6 pt-4 border-b">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger
                    value="persona"
                    className="flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    Persona
                  </TabsTrigger>
                  <TabsTrigger
                    value="knowledge"
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Knowledge Base
                  </TabsTrigger>
                  <TabsTrigger
                    value="schedule"
                    className="flex items-center gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    Schedule
                  </TabsTrigger>
                  <TabsTrigger
                    value="integrations"
                    className="flex items-center gap-2"
                  >
                    <Plug className="h-4 w-4" />
                    Integrations
                  </TabsTrigger>
                  <TabsTrigger
                    value="advanced"
                    className="flex items-center gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    Advanced
                  </TabsTrigger>
                  <TabsTrigger
                    value="ticketing"
                    className="flex items-center gap-2"
                  >
                    <Ticket className="h-4 w-4" />
                    Ticketing
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1 px-6 py-4">
                {/* PERSONA TAB */}
                <TabsContent value="persona" className="mt-0 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Persona Configuration</CardTitle>
                      <CardDescription>
                        Atur kepribadian dan gaya komunikasi agent AI
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Persona Name */}
                      <div className="space-y-2">
                        <Label htmlFor="personaName">Nama Persona</Label>
                        <Input
                          id="personaName"
                          placeholder="e.g., Customer Support Assistant"
                          value={settings.persona.name}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              persona: {
                                ...prev.persona,
                                name: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>

                      {/* Language */}
                      <div className="space-y-2">
                        <Label htmlFor="language">Bahasa</Label>
                        <Select
                          value={settings.persona.language}
                          onValueChange={(value) =>
                            setSettings((prev) => ({
                              ...prev,
                              persona: { ...prev.persona, language: value },
                            }))
                          }
                        >
                          <SelectTrigger id="language">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="id">Bahasa Indonesia</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="multi">Multilingual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Tone */}
                      <div className="space-y-2">
                        <Label htmlFor="tone">Tone</Label>
                        <Select
                          value={settings.persona.tone}
                          onValueChange={(value) =>
                            setSettings((prev) => ({
                              ...prev,
                              persona: { ...prev.persona, tone: value },
                            }))
                          }
                        >
                          <SelectTrigger id="tone">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="friendly">
                              Friendly & Casual
                            </SelectItem>
                            <SelectItem value="professional">
                              Professional
                            </SelectItem>
                            <SelectItem value="formal">Formal</SelectItem>
                            <SelectItem value="empathetic">
                              Empathetic
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Custom Instructions */}
                      <div className="space-y-2">
                        <Label htmlFor="instructions">
                          Custom Instructions / Prompt
                        </Label>
                        <Textarea
                          id="instructions"
                          placeholder="Masukkan instruksi khusus untuk agent..."
                          rows={8}
                          value={settings.persona.customInstructions}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              persona: {
                                ...prev.persona,
                                customInstructions: e.target.value,
                              },
                            }))
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Instruksi ini akan menjadi panduan utama agent dalam
                          berinteraksi dengan customer.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* KNOWLEDGE BASE TAB */}
                <TabsContent value="knowledge" className="mt-0 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Knowledge Base Documents</CardTitle>
                      <CardDescription>
                        Upload dokumen yang akan menjadi sumber pengetahuan
                        agent
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Upload Area */}
                      <div className="border-2 border-dashed rounded-lg p-6 text-center">
                        <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-sm font-medium mb-1">
                          Upload Knowledge Documents
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">
                          PDF, DOCX, TXT, CSV (Max 10MB per file)
                        </p>
                        <input
                          type="file"
                          id="fileUpload"
                          multiple
                          accept=".pdf,.doc,.docx,.txt,.csv"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            document.getElementById("fileUpload")?.click()
                          }
                          disabled={uploading}
                        >
                          {uploading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Choose Files
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Upload Skeleton - shown during upload */}
                      {uploading && (
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            Uploading documents...
                          </Label>
                          <div className="space-y-2">
                            {[1, 2].map((index) => (
                              <Card key={index} className="animate-pulse">
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className="h-8 w-8 bg-muted rounded" />
                                      <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-muted rounded w-3/4" />
                                        <div className="h-3 bg-muted rounded w-1/2" />
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <div className="h-8 w-8 bg-muted rounded" />
                                      <div className="h-8 w-8 bg-muted rounded" />
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Document List */}
                      {settings.knowledgeBase.length > 0 && (
                        <div className="space-y-2">
                          <Label>
                            Uploaded Documents ({settings.knowledgeBase.length})
                          </Label>
                          <div className="space-y-2">
                            {settings.knowledgeBase.map((doc) => (
                              <Card key={doc.id}>
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <FileText className="h-8 w-8 text-primary" />
                                      <div>
                                        <p className="font-medium text-sm">
                                          {doc.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {doc.size} • {doc.uploadedAt}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button variant="ghost" size="sm">
                                        <Download className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleRemoveDocument(doc.id)
                                        }
                                      >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* SCHEDULE TAB */}
                <TabsContent value="schedule" className="mt-0 space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Working Hours</CardTitle>
                          <CardDescription>
                            Atur jadwal aktif agent untuk melayani customer
                          </CardDescription>
                        </div>
                        <Switch
                          checked={settings.schedule.enabled}
                          onCheckedChange={(checked) =>
                            setSettings((prev) => {
                              // When disabling scheduling, clear per-day workingHours so UI and payload reflect empty array
                              if (!checked) {
                                return {
                                  ...prev,
                                  schedule: {
                                    ...prev.schedule,
                                    enabled: false,
                                    workingHours: [],
                                  },
                                };
                              }

                              // When enabling scheduling, restore defaults if there are no existing workingHours
                              const dayNamesLocal = [
                                "Senin",
                                "Selasa",
                                "Rabu",
                                "Kamis",
                                "Jumat",
                                "Sabtu",
                                "Minggu",
                              ];
                              const defaultWorkingHoursLocal =
                                dayNamesLocal.map((day, index) => ({
                                  day,
                                  enabled: index < 5,
                                  start: "09:00",
                                  end: "17:00",
                                }));

                              return {
                                ...prev,
                                schedule: {
                                  ...prev.schedule,
                                  enabled: true,
                                  workingHours:
                                    prev.schedule.workingHours &&
                                    prev.schedule.workingHours.length > 0
                                      ? prev.schedule.workingHours
                                      : defaultWorkingHoursLocal,
                                },
                              };
                            })
                          }
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Timezone */}
                      <div className="space-y-2">
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select
                          value={settings.schedule.timezone}
                          onValueChange={(value) =>
                            setSettings((prev) => ({
                              ...prev,
                              schedule: { ...prev.schedule, timezone: value },
                            }))
                          }
                        >
                          <SelectTrigger id="timezone">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Asia/Jakarta">
                              WIB - Jakarta
                            </SelectItem>
                            <SelectItem value="Asia/Makassar">
                              WITA - Makassar
                            </SelectItem>
                            <SelectItem value="Asia/Jayapura">
                              WIT - Jayapura
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Working Hours per Day - only show when scheduling is enabled */}
                      {settings.schedule.enabled ? (
                        <div className="space-y-3">
                          <Label>Jam Kerja per Hari</Label>
                          {settings.schedule.workingHours.map((wh, index) => (
                            <div
                              key={wh.day}
                              className="flex items-center gap-3 p-3 border rounded-lg"
                            >
                              <Switch
                                checked={wh.enabled}
                                onCheckedChange={(checked) =>
                                  updateWorkingHours(index, "enabled", checked)
                                }
                              />
                              <span className="w-20 text-sm font-medium">
                                {wh.day}
                              </span>
                              <Input
                                type="time"
                                value={wh.start}
                                disabled={!wh.enabled}
                                onChange={(e) =>
                                  updateWorkingHours(
                                    index,
                                    "start",
                                    e.target.value
                                  )
                                }
                                className="w-32"
                              />
                              <span className="text-muted-foreground">-</span>
                              <Input
                                type="time"
                                value={wh.end}
                                disabled={!wh.enabled}
                                onChange={(e) =>
                                  updateWorkingHours(
                                    index,
                                    "end",
                                    e.target.value
                                  )
                                }
                                className="w-32"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          Scheduling tidak aktif — aktifkan "Working Hours"
                          untuk mengatur jam per-hari.
                        </div>
                      )}

                      {settings.schedule.enabled && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs text-blue-800">
                            <strong>Note:</strong> Agent hanya akan merespons
                            chat di luar jam kerja dengan auto-reply message.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* INTEGRATIONS TAB */}
                <TabsContent value="integrations" className="mt-0 space-y-4">
                  {/* WhatsApp Integration */}
                  <WhatsAppIntegration
                    agentId={agent.id}
                    enabled={settings.integrations.whatsapp.enabled}
                    onToggle={(enabled) =>
                      setSettings((prev) => ({
                        ...prev,
                        integrations: {
                          ...prev.integrations,
                          whatsapp: { ...prev.integrations.whatsapp, enabled },
                        },
                      }))
                    }
                    config={settings.integrations.whatsapp.config}
                    onConfigUpdate={(config) =>
                      setSettings((prev) => ({
                        ...prev,
                        integrations: {
                          ...prev.integrations,
                          whatsapp: { ...prev.integrations.whatsapp, config },
                        },
                      }))
                    }
                  />

                  {/* Telegram Integration */}
                  <TelegramIntegration
                    agentId={agent.id}
                    agentPhoneNumber={agent.phone}
                    enabled={settings.integrations.telegram.enabled}
                    onToggle={(enabled) =>
                      setSettings((prev) => ({
                        ...prev,
                        integrations: {
                          ...prev.integrations,
                          telegram: { ...prev.integrations.telegram, enabled },
                        },
                      }))
                    }
                    config={settings.integrations.telegram.config}
                    onConfigUpdate={(config) =>
                      setSettings((prev) => ({
                        ...prev,
                        integrations: {
                          ...prev.integrations,
                          telegram: { ...prev.integrations.telegram, config },
                        },
                      }))
                    }
                  />

                  {/* Email Integration */}
                  <EmailIntegration
                    enabled={settings.integrations.email.enabled}
                    onToggle={(enabled) =>
                      setSettings((prev) => ({
                        ...prev,
                        integrations: {
                          ...prev.integrations,
                          email: { ...prev.integrations.email, enabled },
                        },
                      }))
                    }
                    config={settings.integrations.email.config}
                    onConfigUpdate={(config) =>
                      setSettings((prev) => ({
                        ...prev,
                        integrations: {
                          ...prev.integrations,
                          email: { ...prev.integrations.email, config },
                        },
                      }))
                    }
                  />

                  {/* MCP Integration */}
                  <MCPIntegration
                    enabled={settings.integrations.mcp.enabled}
                    onToggle={(enabled) =>
                      setSettings((prev) => ({
                        ...prev,
                        integrations: {
                          ...prev.integrations,
                          mcp: { ...prev.integrations.mcp, enabled },
                        },
                      }))
                    }
                    config={settings.integrations.mcp.config}
                    onConfigUpdate={(config) =>
                      setSettings((prev) => ({
                        ...prev,
                        integrations: {
                          ...prev.integrations,
                          mcp: { ...prev.integrations.mcp, config },
                        },
                      }))
                    }
                  />
                </TabsContent>

                {/* ADVANCED TAB */}
                <TabsContent value="advanced" className="mt-0 space-y-4">
                  {/* AI Temperature */}
                  <Card>
                    <CardHeader>
                      <CardTitle>AI Temperature</CardTitle>
                      <CardDescription>
                        Atur tingkat kreativitas dan variasi response AI
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        {[
                          {
                            value: "consistent",
                            label: "Consistent",
                            emoji: "🎯",
                          },
                          { value: "balanced", label: "Balanced", emoji: "⚖️" },
                          { value: "creative", label: "Creative", emoji: "🎨" },
                        ].map((option) => (
                          <div
                            key={option.value}
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              settings.advanced.temperature === option.value
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                            onClick={() =>
                              setSettings((prev) => ({
                                ...prev,
                                advanced: {
                                  ...prev.advanced,
                                  temperature: option.value as
                                    | "consistent"
                                    | "balanced"
                                    | "creative",
                                },
                              }))
                            }
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-2xl">{option.emoji}</span>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="font-semibold">
                                    {option.label}
                                  </h4>
                                  <Badge variant="outline">
                                    Temp: {getTemperatureValue(option.value)}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {getTemperatureDescription(option.value)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* History Limit */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Conversation History Limit</CardTitle>
                      <CardDescription>
                        Jumlah pesan sebelumnya yang AI ingat dalam percakapan
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="historyLimit">History Messages</Label>
                          <Badge>
                            {settings.advanced.historyLimit} messages
                          </Badge>
                        </div>
                        <Input
                          id="historyLimit"
                          type="range"
                          min="5"
                          max="50"
                          step="5"
                          value={settings.advanced.historyLimit}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              advanced: {
                                ...prev.advanced,
                                historyLimit: parseInt(e.target.value),
                              },
                            }))
                          }
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>5 (Short memory)</span>
                          <span>50 (Long memory)</span>
                        </div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-blue-800">
                          <strong>Note:</strong> History yang lebih panjang =
                          context yang lebih baik, tapi biaya API lebih tinggi.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Human Handoff Triggers */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-600" />
                            Human Handoff Triggers
                          </CardTitle>
                          <CardDescription>
                            Kondisi yang memicu AI untuk transfer chat ke agent
                            manusia
                          </CardDescription>
                        </div>
                        <Switch
                          checked={settings.advanced.handoffTriggers.enabled}
                          onCheckedChange={(checked) =>
                            setSettings((prev) => ({
                              ...prev,
                              advanced: {
                                ...prev.advanced,
                                handoffTriggers: {
                                  ...prev.advanced.handoffTriggers,
                                  enabled: checked,
                                },
                              },
                            }))
                          }
                        />
                      </div>
                    </CardHeader>
                    {settings.advanced.handoffTriggers.enabled && (
                      <CardContent className="space-y-4">
                        {/* Keywords */}
                        <div className="space-y-2">
                          <Label>Trigger Keywords</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Masukkan keyword..."
                              value={newKeyword}
                              onChange={(e) => setNewKeyword(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddKeyword();
                                }
                              }}
                            />
                            <Button type="button" onClick={handleAddKeyword}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {settings.advanced.handoffTriggers.keywords.map(
                              (keyword, index) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="gap-1"
                                >
                                  {keyword}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveKeyword(index)}
                                    className="ml-1 hover:text-red-500"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              )
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Jika customer mengetik keyword ini, AI akan otomatis
                            transfer ke agent.
                          </p>
                        </div>

                        {/* Sentiment Threshold */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Sentiment Threshold</Label>
                            <Badge variant="outline">
                              {
                                settings.advanced.handoffTriggers
                                  .sentimentThreshold
                              }
                            </Badge>
                          </div>
                          <Input
                            type="range"
                            min="-1"
                            max="0"
                            step="0.1"
                            value={
                              settings.advanced.handoffTriggers
                                .sentimentThreshold
                            }
                            onChange={(e) =>
                              setSettings((prev) => ({
                                ...prev,
                                advanced: {
                                  ...prev.advanced,
                                  handoffTriggers: {
                                    ...prev.advanced.handoffTriggers,
                                    sentimentThreshold: parseFloat(
                                      e.target.value
                                    ),
                                  },
                                },
                              }))
                            }
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>-1.0 (Very Negative)</span>
                            <span>0.0 (Neutral)</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Transfer jika sentiment customer di bawah threshold
                            ini.
                          </p>
                        </div>

                        {/* Unanswered Questions */}
                        <div className="space-y-2">
                          <Label htmlFor="unansweredQuestions">
                            Unanswered Questions Limit
                          </Label>
                          <div className="flex items-center gap-3">
                            <Input
                              id="unansweredQuestions"
                              type="number"
                              min="1"
                              max="10"
                              value={
                                settings.advanced.handoffTriggers
                                  .unansweredQuestions
                              }
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  advanced: {
                                    ...prev.advanced,
                                    handoffTriggers: {
                                      ...prev.advanced.handoffTriggers,
                                      unansweredQuestions:
                                        parseInt(e.target.value) || 1,
                                    },
                                  },
                                }))
                              }
                              className="w-24"
                            />
                            <span className="text-sm text-muted-foreground">
                              questions
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Transfer jika AI gagal menjawab pertanyaan customer
                            sebanyak ini.
                          </p>
                        </div>

                        {/* Escalation Message */}
                        <div className="space-y-2">
                          <Label htmlFor="escalationMessage">
                            Escalation Message
                          </Label>
                          <Textarea
                            id="escalationMessage"
                            placeholder="Pesan yang dikirim saat transfer ke agent..."
                            rows={3}
                            value={
                              settings.advanced.handoffTriggers
                                .escalationMessage
                            }
                            onChange={(e) =>
                              setSettings((prev) => ({
                                ...prev,
                                advanced: {
                                  ...prev.advanced,
                                  handoffTriggers: {
                                    ...prev.advanced.handoffTriggers,
                                    escalationMessage: e.target.value,
                                  },
                                },
                              }))
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Pesan ini akan dikirim ke customer sebelum transfer
                            ke agent manusia.
                          </p>
                        </div>

                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <p className="text-xs text-orange-800">
                            <strong>Warning:</strong> Pastikan ada agent manusia
                            yang available untuk handle transfer. Jika tidak
                            ada, chat akan tetap di queue.
                          </p>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </TabsContent>

                {/* TICKETING TAB */}
                <TabsContent value="ticketing" className="mt-0 space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Ticket className="h-5 w-5 text-primary" />
                            Ticketing System
                          </CardTitle>
                          <CardDescription>
                            Kelola sistem ticketing untuk tracking issue
                            customer
                          </CardDescription>
                        </div>
                        <Switch
                          checked={settings.ticketing.enabled}
                          onCheckedChange={(checked) =>
                            setSettings((prev) => ({
                              ...prev,
                              ticketing: {
                                ...prev.ticketing,
                                enabled: checked,
                              },
                            }))
                          }
                        />
                      </div>
                    </CardHeader>
                    {settings.ticketing.enabled && (
                      <CardContent className="space-y-4">
                        {/* Info Box */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-semibold text-blue-900 mb-2">
                            Tentang Ticketing System
                          </h4>
                          <p className="text-sm text-blue-800">
                            Sistem ticketing memungkinkan 1 chat/percakapan
                            memiliki multiple tickets untuk berbagai issue yang
                            berbeda. Setiap ticket dapat di-track secara
                            terpisah dengan status, kategori, dan prioritasnya
                            masing-masing.
                          </p>
                        </div>

                        {/* Auto Create Ticket */}
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="space-y-1">
                            <Label
                              htmlFor="autoCreateTicket"
                              className="text-base font-medium"
                            >
                              Auto Create Ticket
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Otomatis buat ticket baru ketika percakapan
                              dimulai
                            </p>
                          </div>
                          <Switch
                            id="autoCreateTicket"
                            checked={settings.ticketing.autoCreateTicket}
                            onCheckedChange={(checked) =>
                              setSettings((prev) => ({
                                ...prev,
                                ticketing: {
                                  ...prev.ticketing,
                                  autoCreateTicket: checked,
                                },
                              }))
                            }
                          />
                        </div>

                        {/* Ticket Prefix */}
                        <div className="space-y-2">
                          <Label htmlFor="ticketPrefix">Ticket ID Prefix</Label>
                          <Input
                            id="ticketPrefix"
                            placeholder="e.g., TKT-, SUPPORT-, CS-"
                            value={settings.ticketing.ticketPrefix}
                            onChange={(e) =>
                              setSettings((prev) => ({
                                ...prev,
                                ticketing: {
                                  ...prev.ticketing,
                                  ticketPrefix: e.target.value,
                                },
                              }))
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Contoh: Dengan prefix "TKT-", ticket ID akan menjadi
                            TKT-001, TKT-002, dst.
                          </p>
                        </div>

                        {/* Ticket Categories */}
                        <div className="space-y-2">
                          <Label>Ticket Categories</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Tambah kategori baru..."
                              value={newCategory}
                              onChange={(e) => setNewCategory(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddCategory();
                                }
                              }}
                            />
                            <Button type="button" onClick={handleAddCategory}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {settings.ticketing.categories.map(
                              (category, index) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="gap-1"
                                >
                                  {category}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCategory(index)}
                                    className="ml-1 hover:text-red-500"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              )
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Kategori ini akan digunakan untuk mengklasifikasikan
                            ticket.
                          </p>
                        </div>

                        {/* Require Category & Priority */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-1">
                              <Label
                                htmlFor="requireCategory"
                                className="text-base font-medium"
                              >
                                Require Category
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Wajibkan pemilihan kategori saat membuat ticket
                              </p>
                            </div>
                            <Switch
                              id="requireCategory"
                              checked={settings.ticketing.requireCategory}
                              onCheckedChange={(checked) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  ticketing: {
                                    ...prev.ticketing,
                                    requireCategory: checked,
                                  },
                                }))
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-1">
                              <Label
                                htmlFor="requirePriority"
                                className="text-base font-medium"
                              >
                                Require Priority
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Wajibkan pemilihan prioritas saat membuat ticket
                              </p>
                            </div>
                            <Switch
                              id="requirePriority"
                              checked={settings.ticketing.requirePriority}
                              onCheckedChange={(checked) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  ticketing: {
                                    ...prev.ticketing,
                                    requirePriority: checked,
                                  },
                                }))
                              }
                            />
                          </div>
                        </div>

                        {/* Auto Close Settings */}
                        <Card className="border-2">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">
                                Auto-Close Resolved Tickets
                              </CardTitle>
                              <Switch
                                checked={
                                  settings.ticketing.autoCloseAfterResolved
                                }
                                onCheckedChange={(checked) =>
                                  setSettings((prev) => ({
                                    ...prev,
                                    ticketing: {
                                      ...prev.ticketing,
                                      autoCloseAfterResolved: checked,
                                    },
                                  }))
                                }
                              />
                            </div>
                            <CardDescription>
                              Otomatis close ticket setelah status resolved
                              dalam waktu tertentu
                            </CardDescription>
                          </CardHeader>
                          {settings.ticketing.autoCloseAfterResolved && (
                            <CardContent>
                              <div className="space-y-2">
                                <Label htmlFor="autoCloseDelay">
                                  Auto-Close Delay (Hours)
                                </Label>
                                <div className="flex items-center gap-3">
                                  <Input
                                    id="autoCloseDelay"
                                    type="number"
                                    min="1"
                                    max="168"
                                    value={settings.ticketing.autoCloseDelay}
                                    onChange={(e) =>
                                      setSettings((prev) => ({
                                        ...prev,
                                        ticketing: {
                                          ...prev.ticketing,
                                          autoCloseDelay:
                                            parseInt(e.target.value) || 24,
                                        },
                                      }))
                                    }
                                    className="w-24"
                                  />
                                  <span className="text-sm text-muted-foreground">
                                    jam
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Ticket akan otomatis closed setelah{" "}
                                  {settings.ticketing.autoCloseDelay} jam dari
                                  status resolved (max 168 jam/7 hari)
                                </p>
                              </div>
                            </CardContent>
                          )}
                        </Card>

                        {/* Status Lifecycle Info */}
                        <Card className="bg-muted">
                          <CardHeader>
                            <CardTitle className="text-base">
                              Ticket Status Lifecycle
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">Open</Badge>
                                <span className="text-sm">→</span>
                                <Badge className="bg-blue-500">
                                  In Progress
                                </Badge>
                                <span className="text-sm">→</span>
                                <Badge className="bg-green-500">Resolved</Badge>
                                <span className="text-sm">→</span>
                                <Badge variant="outline">Closed</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-3">
                                <strong>Open:</strong> Ticket baru dibuat
                                <br />
                                <strong>In Progress:</strong> Agent sedang
                                menangani ticket
                                <br />
                                <strong>Resolved:</strong> Issue sudah
                                diselesaikan, menunggu konfirmasi
                                <br />
                                <strong>Closed:</strong> Ticket selesai dan
                                arsip
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </CardContent>
                    )}
                  </Card>
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <div className="px-6 py-4 border-t flex justify-end gap-2 flex-shrink-0">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saving ? "Menyimpan..." : "Save Settings"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
