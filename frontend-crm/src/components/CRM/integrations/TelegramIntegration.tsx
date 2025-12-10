import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Smartphone,
  MessageSquare,
  LogOut,
  ArrowRight,
  Info,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import * as telegramService from "@/services/telegramServices";
import * as crmAgentsService from "@/services/crmAgentsService";

interface TelegramIntegrationProps {
  agentId: string;
  agentPhoneNumber: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  config: Record<string, string>;
  onConfigUpdate: (config: Record<string, string>) => void;
}

type ConnectionStep =
  | "credentials"
  | "otp_request"
  | "otp_verification"
  | "connected";

export const TelegramIntegration = ({
  agentId,
  agentPhoneNumber,
  enabled,
  onToggle,
  config,
  onConfigUpdate,
}: TelegramIntegrationProps) => {
  // --- 1. SAFE CONFIG READER ---
  const getConfigValue = (keySnake: string, keyCamel: string) => {
    return config[keySnake] || config[keyCamel] || "";
  };

  const getInitialStep = (): ConnectionStep => {
    if (config.session_string || config.status === "connected") {
      return "connected";
    }
    const hasId = getConfigValue("api_id", "apiId");
    const hasHash = getConfigValue("api_hash", "apiHash");

    if (hasId && hasHash && config.status === "configured") {
      return "otp_request";
    }
    return "credentials";
  };

  const [step, setStep] = useState<ConnectionStep>(getInitialStep());
  const [loading, setLoading] = useState(false);

  // Initialize Inputs
  const [apiId, setApiId] = useState(getConfigValue("api_id", "apiId"));
  const [apiHash, setApiHash] = useState(getConfigValue("api_hash", "apiHash"));

  const [phoneCode, setPhoneCode] = useState("");
  const [phoneCodeHash, setPhoneCodeHash] = useState("");

  // Sync state when config updates
  useEffect(() => {
    const savedId = getConfigValue("api_id", "apiId");
    const savedHash = getConfigValue("api_hash", "apiHash");

    if (savedId) setApiId(savedId);
    if (savedHash) setApiHash(savedHash);

    // Update Step Logic
    if (config.session_string || config.status === "connected") {
      setStep("connected");
    } else if (savedId && savedHash && config.status === "configured") {
      // PREVENT OVERWRITING "otp_verification" if the user is already there
      setStep((current) => {
        if (current === "otp_verification") return current;
        return current === "credentials" ? "otp_request" : current;
      });
    }
  }, [config]);

  // --- ACTION HANDLERS ---

  const handleSaveCredentials = async () => {
    if (!apiId || !apiHash) {
      toast.error("API ID dan Hash harus diisi");
      return;
    }

    setLoading(true);
    try {
      await crmAgentsService.updateAgentIntegration(agentId, "telegram", {
        enabled: true,
        config: {
          api_id: apiId,
          api_hash: apiHash,
          session: "",
          status: "configured",
        },
      });

      onConfigUpdate({
        ...config,
        api_id: apiId,
        apiId: apiId,
        api_hash: apiHash,
        apiHash: apiHash,
        status: "configured",
      });

      toast.success("Kredensial tersimpan");
      setStep("otp_request");
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal menyimpan kredensial");
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!agentPhoneNumber) {
      toast.error("Nomor telepon agent tidak ditemukan");
      return;
    }

    setLoading(true);
    try {
      const response = await telegramService.sendAuthCode(
        agentId,
        agentPhoneNumber
      );

      // UPDATED: Check for status "code_sent"
      if (response.status === "code_sent" && response.phone_code_hash) {
        setPhoneCodeHash(response.phone_code_hash);
        toast.success(`OTP dikirim ke ${agentPhoneNumber}`);
        setStep("otp_verification");
      } else {
        // Use 'detail' for error message if available
        throw new Error(response.detail || "Gagal mengirim kode");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Gagal mengirim OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!phoneCode) return;

    setLoading(true);
    try {
      const response = await telegramService.verifyAuthCode(
        agentId,
        agentPhoneNumber,
        phoneCode,
        phoneCodeHash
      );

      // UPDATED: Check for status "success"
      if (response.status === "success") {
        const connectedAt = new Date().toISOString();
        const newConfig = {
          ...config,
          api_id: apiId,
          api_hash: apiHash,
          session_string: response.session_string || "", // Save the session string!
          status: "connected",
          connectedAt,
        };

        // ---------------------------------------------------------
        // CRITICAL UPDATE: Start the session listener immediately
        // ---------------------------------------------------------
        try {
          // Wait for 1 second to ensure backend has fully committed session
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await telegramService.startSession(agentId);
          toast.success("Telegram Listener Started!");
        } catch (startError) {
          console.error("Listener start failed:", startError);
          toast.warning(
            "Connected, but failed to auto-start listener. Check backend logs."
          );
        }
        // ---------------------------------------------------------

        onConfigUpdate(newConfig);
        setStep("connected");
        toast.success("Telegram Berhasil Terhubung!");
      } else {
        throw new Error(response.detail || "Verifikasi gagal");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Kode OTP salah atau kadaluarsa");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      await telegramService.terminateTelegramSession(agentId);

      onConfigUpdate({
        ...config,
        status: "disconnected",
        session_string: "",
        connectedAt: "",
      });
      setStep("credentials");
      onToggle(false);
      toast.success("Disconnected");
    } catch (e) {
      toast.error("Gagal disconnect");
    } finally {
      setLoading(false);
    }
  };

  // --- RENDERERS ---

  const renderCredentials = () => (
    <div className="space-y-4 animate-in fade-in">
      {/* 🔹 MANUAL GUIDANCE SECTION */}
      <div className="rounded-md bg-blue-50 p-4 border border-blue-100 text-sm space-y-3">
        <div className="flex items-center gap-2 font-semibold text-blue-800">
          <Info className="h-4 w-4" />
          Panduan Mendapatkan API ID & Hash
        </div>
        <ol className="list-decimal list-inside space-y-1 text-blue-700 text-xs">
          <li>
            Buka website{" "}
            <a
              href="https://my.telegram.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium hover:text-blue-900"
            >
              my.telegram.org
            </a>
          </li>
          <li>
            Login menggunakan nomor HP agent ini:{" "}
            <span className="font-mono font-bold bg-blue-100 px-1 rounded text-blue-900">
              {agentPhoneNumber}
            </span>
          </li>
          <li>
            Pilih menu <strong>"API development tools"</strong>.
          </li>
          <li>
            Isi form <em>App title</em> dan <em>Shortname</em> (bebas).
          </li>
          <li>
            Salin <strong>api_id</strong> dan <strong>api_hash</strong> ke form
            di bawah ini.
          </li>
        </ol>
      </div>

      <div className="space-y-2">
        <Label>App api_id</Label>
        <Input
          value={apiId}
          onChange={(e) => setApiId(e.target.value)}
          placeholder="123456"
          className="font-mono"
        />
      </div>
      <div className="space-y-2">
        <Label>App api_hash</Label>
        <Input
          type="password"
          value={apiHash}
          onChange={(e) => setApiHash(e.target.value)}
          placeholder="abcdef..."
          className="font-mono"
        />
      </div>
      <Button
        type="button"
        onClick={handleSaveCredentials}
        disabled={loading}
        className="w-full"
      >
        {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
        Simpan & Lanjut
      </Button>
    </div>
  );

  const renderOtpRequest = () => (
    <div className="space-y-4 animate-in fade-in">
      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription className="text-blue-800">
          Akan mengirim kode ke: <strong>{agentPhoneNumber}</strong>
        </AlertDescription>
      </Alert>

      <div className="p-3 bg-muted rounded text-xs font-mono text-muted-foreground break-all">
        ID: {apiId} | Hash: {apiHash.substring(0, 5)}...
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep("credentials")}
        >
          Edit Config
        </Button>
        <Button
          type="button"
          onClick={handleSendCode}
          disabled={loading}
          className="flex-1"
        >
          {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
          Kirim OTP
        </Button>
      </div>
    </div>
  );

  const renderOtpVerify = () => (
    <div className="space-y-4 animate-in fade-in">
      <Alert className="bg-green-50 border-green-200">
        <AlertDescription className="text-green-800">
          Cek Telegram Anda (di HP atau App) untuk kode login.
        </AlertDescription>
      </Alert>
      <div className="space-y-2">
        <Label>Kode Login</Label>
        <Input
          value={phoneCode}
          onChange={(e) => setPhoneCode(e.target.value)}
          placeholder="12345"
          className="text-lg tracking-widest text-center"
        />
      </div>
      <Button
        type="button"
        onClick={handleVerifyCode}
        disabled={loading || !phoneCode}
        className="w-full"
      >
        {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
        Verifikasi & Connect
      </Button>
    </div>
  );

  const renderConnected = () => (
    <div className="space-y-4 animate-in fade-in">
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800 font-medium">
          Telegram Terhubung
        </AlertDescription>
      </Alert>
      <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">App api_id:</span>
          <span className="font-mono">{apiId}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Connected Number:</span>
          <span className="font-mono">{agentPhoneNumber}</span>
        </div>
      </div>
      <Button
        type="button"
        variant="destructive"
        onClick={handleDisconnect}
        disabled={loading}
        className="w-full"
      >
        Disconnect
      </Button>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex gap-3 items-center">
            <Smartphone className="h-5 w-5 text-sky-600" />
            <div>
              <CardTitle className="text-base">Telegram Client</CardTitle>
              <CardDescription className="text-xs">
                Userbot / MTProto
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            disabled={loading}
          />
        </div>
      </CardHeader>
      {enabled && (
        <CardContent>
          {step === "credentials" && renderCredentials()}
          {step === "otp_request" && renderOtpRequest()}
          {step === "otp_verification" && renderOtpVerify()}
          {step === "connected" && renderConnected()}
        </CardContent>
      )}
    </Card>
  );
};
