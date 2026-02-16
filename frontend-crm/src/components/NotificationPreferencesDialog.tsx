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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Filter,
  TestTube2,
} from "lucide-react";
import { toast } from "sonner";
import { useNotificationPreferences } from "@/contexts/NotificationPreferencesContext";
import { playNotificationSound } from "@/utils/audioNotification";

interface NotificationPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NotificationPreferencesDialog: React.FC<
  NotificationPreferencesDialogProps
> = ({ open, onOpenChange }) => {
  const {
    preferences,
    updatePreferences,
    requestBrowserNotificationPermission,
    browserNotificationPermission,
    resetToDefaults,
  } = useNotificationPreferences();

  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  /**
   * Handle browser notification permission request
   */
  const handleRequestBrowserPermission = async () => {
    setIsRequestingPermission(true);

    try {
      const permission = await requestBrowserNotificationPermission();

      if (permission === "granted") {
        toast.success("Browser notifications enabled!");
      } else if (permission === "denied") {
        toast.error(
          "Browser notifications denied. Please enable them in your browser settings.",
        );
      } else {
        toast.info("Browser notification permission not granted.");
      }
    } catch (error) {
      toast.error("Failed to request notification permission");
    } finally {
      setIsRequestingPermission(false);
    }
  };

  /**
   * Test notification
   */
  const handleTestNotification = () => {
    // Show toast notification
    if (preferences.enableToast) {
      toast.info("This is a test notification!", {
        description: "If you can see this, toast notifications are working.",
      });
    }

    // Show browser notification
    if (
      preferences.enableBrowserNotification &&
      browserNotificationPermission === "granted"
    ) {
      try {
        const notification = new Notification("Test Notification", {
          body: "This is a test notification from Palapa CRM",
          icon: "/favicon.ico",
        });

        setTimeout(() => notification.close(), 5000);
      } catch (error) {
        console.error("Failed to show test browser notification:", error);
      }
    }

    // Play sound
    if (preferences.enableSound) {
      playNotificationSound("message", 0.5);
    }

    // If nothing is enabled
    if (
      !preferences.enableToast &&
      !preferences.enableBrowserNotification &&
      !preferences.enableSound
    ) {
      toast.error(
        "All notifications are disabled. Enable at least one to test.",
      );
    }
  };

  /**
   * Handle reset to defaults
   */
  const handleResetToDefaults = () => {
    resetToDefaults();
    toast.success("Settings reset to defaults");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </DialogTitle>
          <DialogDescription>
            Customize how you receive chat notifications across the application.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Toast Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label
                htmlFor="toast-notifications"
                className="text-base flex items-center gap-2"
              >
                {preferences.enableToast ? (
                  <Bell className="h-4 w-4" />
                ) : (
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                )}
                Toast Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Show popup notifications in the corner of the screen
              </p>
            </div>
            <Switch
              id="toast-notifications"
              checked={preferences.enableToast}
              onCheckedChange={(checked) =>
                updatePreferences({ enableToast: checked })
              }
            />
          </div>

          <Separator />

          {/* Browser Notifications */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label
                  htmlFor="browser-notifications"
                  className="text-base flex items-center gap-2"
                >
                  {preferences.enableBrowserNotification ? (
                    <Bell className="h-4 w-4" />
                  ) : (
                    <BellOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  Browser Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Show native browser notifications (even when tab is not
                  active)
                </p>
              </div>
              <Switch
                id="browser-notifications"
                checked={preferences.enableBrowserNotification}
                onCheckedChange={(checked) =>
                  updatePreferences({ enableBrowserNotification: checked })
                }
                disabled={browserNotificationPermission === "denied"}
              />
            </div>

            {/* Browser Permission Status */}
            {browserNotificationPermission === "default" && (
              <div className="bg-muted p-3 rounded-md space-y-2">
                <p className="text-sm">
                  Browser notification permission not granted yet.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRequestBrowserPermission}
                  disabled={isRequestingPermission}
                >
                  {isRequestingPermission
                    ? "Requesting..."
                    : "Grant Permission"}
                </Button>
              </div>
            )}

            {browserNotificationPermission === "denied" && (
              <div className="bg-destructive/10 p-3 rounded-md">
                <p className="text-sm text-destructive">
                  Browser notifications are blocked. Please enable them in your
                  browser settings.
                </p>
              </div>
            )}

            {browserNotificationPermission === "granted" &&
              preferences.enableBrowserNotification && (
                <div className="bg-green-500/10 p-3 rounded-md">
                  <p className="text-sm text-green-600 dark:text-green-400">
                    ✓ Browser notifications are enabled
                  </p>
                </div>
              )}
          </div>

          <Separator />

          {/* Sound Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label
                htmlFor="sound-notifications"
                className="text-base flex items-center gap-2"
              >
                {preferences.enableSound ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                )}
                Sound Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Play a sound when new notifications arrive
              </p>
            </div>
            <Switch
              id="sound-notifications"
              checked={preferences.enableSound}
              onCheckedChange={(checked) =>
                updatePreferences({ enableSound: checked })
              }
            />
          </div>

          <Separator />

          {/* Filter: Assigned Only */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label
                htmlFor="filter-assigned"
                className="text-base flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Assigned Chats Only
              </Label>
              <p className="text-sm text-muted-foreground">
                Only notify for chats assigned to you
              </p>
            </div>
            <Switch
              id="filter-assigned"
              checked={preferences.filterAssignedOnly}
              onCheckedChange={(checked) =>
                updatePreferences({ filterAssignedOnly: checked })
              }
            />
          </div>

          <Separator />

          {/* Test Notification Button */}
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestNotification}
              className="w-full"
            >
              <TestTube2 className="h-4 w-4 mr-2" />
              Test Notification
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Test your current notification settings
            </p>
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center">
          <Button variant="ghost" size="sm" onClick={handleResetToDefaults}>
            Reset to Defaults
          </Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
