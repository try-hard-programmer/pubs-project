import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, CheckCircle, XCircle, Loader2, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface EmailIntegrationProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  config: Record<string, string>;
  onConfigUpdate: (config: Record<string, string>) => void;
}

type ConnectionStatus = "disconnected" | "testing" | "connected" | "error";

export const EmailIntegration = ({
  enabled,
  onToggle,
  config,
  onConfigUpdate,
}: EmailIntegrationProps) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    config.status as ConnectionStatus || "disconnected"
  );
  const [smtpHost, setSmtpHost] = useState(config.smtpHost || "");
  const [smtpPort, setSmtpPort] = useState(config.smtpPort || "587");
  const [encryption, setEncryption] = useState(config.encryption || "tls");
  const [emailAddress, setEmailAddress] = useState(config.emailAddress || "");
  const [password, setPassword] = useState(config.password || "");
  const [errorMessage, setErrorMessage] = useState("");
  const [isTesting, setIsTesting] = useState(false);

  // Common SMTP presets
  const smtpPresets = {
    gmail: { host: "smtp.gmail.com", port: "587", encryption: "tls" },
    outlook: { host: "smtp-mail.outlook.com", port: "587", encryption: "tls" },
    yahoo: { host: "smtp.mail.yahoo.com", port: "587", encryption: "tls" },
    office365: { host: "smtp.office365.com", port: "587", encryption: "tls" },
  };

  const validateFields = () => {
    if (!smtpHost.trim()) {
      setErrorMessage("SMTP host tidak boleh kosong");
      return false;
    }

    if (!smtpPort.trim()) {
      setErrorMessage("SMTP port tidak boleh kosong");
      return false;
    }

    if (!emailAddress.trim()) {
      setErrorMessage("Email address tidak boleh kosong");
      return false;
    }

    // Email format validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(emailAddress)) {
      setErrorMessage("Format email tidak valid");
      return false;
    }

    if (!password.trim()) {
      setErrorMessage("Password tidak boleh kosong");
      return false;
    }

    return true;
  };

  const handleTestConnection = async () => {
    setErrorMessage("");

    if (!validateFields()) {
      setConnectionStatus("error");
      return;
    }

    setIsTesting(true);
    setConnectionStatus("testing");

    // Simulate SMTP connection test (in real app, this would call backend)
    setTimeout(() => {
      // Simulate 85% success rate
      if (Math.random() > 0.15) {
        setConnectionStatus("connected");
        onConfigUpdate({
          smtpHost,
          smtpPort,
          encryption,
          emailAddress,
          password,
          status: "connected",
          connectedAt: new Date().toISOString(),
        });
      } else {
        setConnectionStatus("error");
        setErrorMessage(
          "Gagal terhubung ke SMTP server. Periksa kembali konfigurasi Anda."
        );
      }
      setIsTesting(false);
    }, 2500);
  };

  const handleDisconnect = () => {
    setConnectionStatus("disconnected");
    setSmtpHost("");
    setSmtpPort("587");
    setEncryption("tls");
    setEmailAddress("");
    setPassword("");
    setErrorMessage("");
    onConfigUpdate({
      smtpHost: "",
      smtpPort: "",
      encryption: "",
      emailAddress: "",
      password: "",
      status: "disconnected",
      connectedAt: "",
    });
    onToggle(false);
  };

  const handlePresetSelect = (preset: keyof typeof smtpPresets) => {
    const config = smtpPresets[preset];
    setSmtpHost(config.host);
    setSmtpPort(config.port);
    setEncryption(config.encryption);
    setErrorMessage("");
  };

  const handleRetry = () => {
    setConnectionStatus("disconnected");
    setErrorMessage("");
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case "connected":
        return (
          <Badge className="bg-green-500 gap-1">
            <CheckCircle className="h-3 w-3" />
            Connected
          </Badge>
        );
      case "testing":
        return (
          <Badge className="bg-blue-500 gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Testing Connection...
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Connection Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="h-3 w-3" />
            Disconnected
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-red-600" />
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Email</CardTitle>
                <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 border-amber-300">
                  Coming Soon
                </Badge>
              </div>
              <CardDescription>
                Connect menggunakan SMTP untuk send/receive email
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            disabled={true}
          />
        </div>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status:</span>
            {getStatusBadge()}
          </div>

          {/* Disconnected or Error State - Show Configuration Form */}
          {(connectionStatus === "disconnected" || connectionStatus === "error") && (
            <div className="space-y-4">
              {/* SMTP Presets */}
              <div className="space-y-2">
                <Label>Quick Setup (Preset)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetSelect("gmail")}
                    disabled={isTesting}
                  >
                    Gmail
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetSelect("outlook")}
                    disabled={isTesting}
                  >
                    Outlook
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetSelect("yahoo")}
                    disabled={isTesting}
                  >
                    Yahoo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetSelect("office365")}
                    disabled={isTesting}
                  >
                    Office 365
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Pilih preset untuk auto-fill konfigurasi SMTP
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Atau konfigurasi manual
                  </span>
                </div>
              </div>

              {/* SMTP Host */}
              <div className="space-y-2">
                <Label htmlFor="smtpHost">
                  SMTP Host <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="smtpHost"
                  placeholder="smtp.gmail.com"
                  value={smtpHost}
                  onChange={(e) => {
                    setSmtpHost(e.target.value);
                    setErrorMessage("");
                  }}
                  disabled={isTesting}
                />
              </div>

              {/* SMTP Port & Encryption */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">
                    SMTP Port <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="smtpPort"
                    placeholder="587"
                    value={smtpPort}
                    onChange={(e) => {
                      setSmtpPort(e.target.value);
                      setErrorMessage("");
                    }}
                    disabled={isTesting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="encryption">Encryption</Label>
                  <Select
                    value={encryption}
                    onValueChange={setEncryption}
                    disabled={isTesting}
                  >
                    <SelectTrigger id="encryption">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tls">TLS (587)</SelectItem>
                      <SelectItem value="ssl">SSL (465)</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-2">
                <Label htmlFor="emailAddress">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="emailAddress"
                  type="email"
                  placeholder="support@company.com"
                  value={emailAddress}
                  onChange={(e) => {
                    setEmailAddress(e.target.value);
                    setErrorMessage("");
                  }}
                  disabled={isTesting}
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password / App Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password or app-specific password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMessage("");
                  }}
                  disabled={isTesting}
                />
                <Alert className="bg-amber-50 border-amber-200">
                  <Info className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-xs text-amber-800">
                    <strong>Gmail/Google Workspace:</strong> Gunakan App Password, bukan
                    password akun utama. Generate di Google Account Settings → Security → App
                    passwords.
                  </AlertDescription>
                </Alert>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              {/* Test Connection Button */}
              <Button
                onClick={handleTestConnection}
                disabled={
                  isTesting ||
                  !smtpHost ||
                  !smtpPort ||
                  !emailAddress ||
                  !password
                }
                className="w-full gap-2"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Testing SMTP Connection...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Test Connection
                  </>
                )}
              </Button>

              {/* Configuration Tips */}
              <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                <h4 className="font-semibold text-sm">Tips Konfigurasi:</h4>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>
                    <strong>Port 587:</strong> Gunakan TLS encryption (paling umum)
                  </li>
                  <li>
                    <strong>Port 465:</strong> Gunakan SSL encryption
                  </li>
                  <li>
                    <strong>Port 25:</strong> Biasanya di-block oleh provider (hindari)
                  </li>
                  <li>
                    Aktifkan "Less secure app access" untuk beberapa provider
                  </li>
                  <li>
                    Gmail/Google: Wajib gunakan App Password, bukan password biasa
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Testing State */}
          {connectionStatus === "testing" && (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
              <div className="text-center">
                <p className="font-medium">Testing SMTP Connection...</p>
                <p className="text-sm text-muted-foreground">
                  Sedang mencoba terhubung ke {smtpHost}:{smtpPort}
                </p>
              </div>
            </div>
          )}

          {/* Connected State */}
          {connectionStatus === "connected" && (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Email SMTP berhasil terhubung! Agent sekarang dapat menerima dan mengirim
                  email melalui SMTP server.
                </AlertDescription>
              </Alert>

              {/* Connection Info */}
              <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">SMTP Server:</span>
                  <span className="font-medium">
                    {config.smtpHost}:{config.smtpPort}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Encryption:</span>
                  <Badge variant="outline">{config.encryption?.toUpperCase()}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Email Account:</span>
                  <span className="font-medium">{config.emailAddress}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Connected At:</span>
                  <span className="font-medium">
                    {config.connectedAt
                      ? new Date(config.connectedAt).toLocaleString()
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Active
                  </Badge>
                </div>
              </div>

              {/* Disconnect Button */}
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
                className="w-full"
              >
                Disconnect Email SMTP
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
