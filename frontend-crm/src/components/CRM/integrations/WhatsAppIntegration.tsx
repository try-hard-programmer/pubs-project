import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageCircle, CheckCircle, XCircle, RefreshCw, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import * as whatsappService from "@/services/whatsappService";
import * as crmAgentsService from "@/services/crmAgentsService";

interface WhatsAppIntegrationProps {
  agentId: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  config: Record<string, string>;
  onConfigUpdate: (config: Record<string, string>) => void;
}

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export const WhatsAppIntegration = ({
  agentId,
  enabled,
  onToggle,
  config,
  onConfigUpdate,
}: WhatsAppIntegrationProps) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    config.status as ConnectionStatus || "disconnected"
  );
  const [qrCode, setQrCode] = useState<string>("");
  const [isActivating, setIsActivating] = useState(false);
  const statusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
      }
    };
  }, []);

  // Trigger connection when user enables WhatsApp
  useEffect(() => {
    if (enabled && connectionStatus === "disconnected") {
      handleConnect();
    }
  }, [enabled]);

  const startStatusPolling = () => {
    // Clear any existing interval
    if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current);
    }

    // Poll status every 3 seconds
    statusCheckIntervalRef.current = setInterval(async () => {
      try {
        const status = await whatsappService.checkSessionStatus(agentId);

        if (status.status === 'authenticated') {
          // Session is now active
          setConnectionStatus("connected");
          setQrCode("");

          // Clear polling interval
          if (statusCheckIntervalRef.current) {
            clearInterval(statusCheckIntervalRef.current);
            statusCheckIntervalRef.current = null;
          }

          // Update local config
          onConfigUpdate({
            ...config,
            status: "connected",
            connectedAt: status.connected_at || new Date().toISOString(),
            phoneNumber: status.phone_number || "",
          });

          // Update CRM agent integration
          try {
            await crmAgentsService.updateAgentIntegration(agentId, 'whatsapp', {
              enabled: true,
              config: {
                status: "connected",
                connectedAt: status.connected_at || new Date().toISOString(),
                phoneNumber: status.phone_number || "",
              }
            });
            toast.success("WhatsApp berhasil terhubung!");
          } catch (error) {
            console.error("Failed to update agent integration:", error);
            toast.error("WhatsApp terhubung, tapi gagal update database");
          }
        }
      } catch (error) {
        console.error("Failed to check WhatsApp status:", error);
        // Continue polling even on error
      }
    }, 3000);
  };

  const handleConnect = async () => {
    setIsActivating(true);
    setConnectionStatus("connecting");

    try {
      // 1. Check existing session
      const status = await whatsappService.checkSessionStatus(agentId);

      // 2. Terminate if exists (for clean session)
      if (status.status === 'authenticated') {
        await whatsappService.terminateSession(agentId);
        toast.info("Menutup sesi WhatsApp sebelumnya...");
      }

      // 3. Activate new session
      await whatsappService.activateSession(agentId);

      // 4. Get QR code string
      const qrString = await whatsappService.getQRCode(agentId);
      setQrCode(qrString);

      // 5. Start status polling
      startStatusPolling();

      toast.success("QR Code berhasil di-generate. Silakan scan!");
    } catch (error: any) {
      console.error("Failed to activate WhatsApp session:", error);
      setConnectionStatus("error");
      setQrCode("");
      toast.error(error?.message || "Gagal mengaktifkan WhatsApp session");
    } finally {
      setIsActivating(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      // Clear polling interval
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
        statusCheckIntervalRef.current = null;
      }

      // Terminate WhatsApp session
      await whatsappService.terminateSession(agentId);

      // Update CRM agent integration
      await crmAgentsService.updateAgentIntegration(agentId, 'whatsapp', {
        enabled: false,
        config: {
          status: "disconnected",
          connectedAt: "",
          phoneNumber: "",
        }
      });

      // Update local state
      setConnectionStatus("disconnected");
      setQrCode("");
      onConfigUpdate({
        ...config,
        status: "disconnected",
        connectedAt: "",
        phoneNumber: "",
      });
      onToggle(false);

      toast.success("WhatsApp berhasil di-disconnect");
    } catch (error: any) {
      console.error("Failed to disconnect WhatsApp:", error);
      toast.error(error?.message || "Gagal disconnect WhatsApp");
    }
  };

  const handleRetry = () => {
    // Clear any existing interval
    if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current);
      statusCheckIntervalRef.current = null;
    }

    setConnectionStatus("disconnected");
    setQrCode("");
    setTimeout(() => handleConnect(), 100);
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
      case "connecting":
        return (
          <Badge className="bg-blue-500 gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Connecting...
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
            <MessageCircle className="h-5 w-5 text-green-600" />
            <div>
              <CardTitle>WhatsApp</CardTitle>
              <CardDescription>
                Connect menggunakan WhatsApp Web (QR Code)
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            disabled={connectionStatus === "connecting"}
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

          {/* Disconnected State */}
          {connectionStatus === "disconnected" && (
            <Alert>
              <AlertDescription>
                Klik tombol "Connect WhatsApp" untuk memulai koneksi. Anda akan diminta untuk
                scan QR code menggunakan WhatsApp di smartphone Anda.
              </AlertDescription>
            </Alert>
          )}

          {/* Connecting State - Show QR Code */}
          {connectionStatus === "connecting" && qrCode && (
            <div className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-blue-800">
                  <strong>Scan QR Code:</strong> Buka WhatsApp di smartphone Anda, pilih{" "}
                  <strong>Linked Devices</strong>, lalu scan QR code di bawah ini.
                </AlertDescription>
              </Alert>

              {/* QR Code Display */}
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg bg-muted/30">
                {isActivating ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Generating QR Code...</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <QRCode
                        value={qrCode}
                        size={256}
                        level="H"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-4 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Menunggu scan...
                    </p>
                  </>
                )}
              </div>

              <div className="text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Generate QR Code Baru
                </Button>
              </div>
            </div>
          )}

          {/* Connected State */}
          {connectionStatus === "connected" && (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  WhatsApp berhasil terhubung! Agent sekarang dapat menerima dan membalas
                  pesan WhatsApp.
                </AlertDescription>
              </Alert>

              {/* Connection Info */}
              <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Phone Number:</span>
                  <span className="font-medium">{config.phoneNumber}</span>
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
                  <span className="text-muted-foreground">Session Status:</span>
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
                Disconnect WhatsApp
              </Button>
            </div>
          )}

          {/* Error State */}
          {connectionStatus === "error" && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Connection Timeout:</strong> QR code tidak di-scan dalam waktu yang
                  ditentukan. Silakan coba lagi.
                </AlertDescription>
              </Alert>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="w-full gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Coba Lagi
              </Button>
            </div>
          )}

          {/* Instructions */}
          {connectionStatus === "disconnected" && (
            <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
              <h4 className="font-semibold text-sm">Cara Koneksi WhatsApp:</h4>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Aktifkan toggle di atas untuk enable WhatsApp integration</li>
                <li>QR code akan muncul secara otomatis</li>
                <li>Buka WhatsApp di smartphone Anda</li>
                <li>Tap Menu (⋮) atau Settings → Linked Devices</li>
                <li>Tap "Link a Device" dan scan QR code yang muncul</li>
                <li>Tunggu hingga status berubah menjadi "Connected"</li>
              </ol>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
