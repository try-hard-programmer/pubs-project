import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Share2, Mail, Calendar, Shield, Link, Copy } from "lucide-react";
import { FileItem } from "@/hooks/useFiles";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileItem | null;
}

export const ShareDialog = ({ open, onOpenChange, file }: ShareDialogProps) => {
  const [email, setEmail] = useState("");
  const [accessLevel, setAccessLevel] = useState<'view' | 'download' | 'edit'>('view');
  const [message, setMessage] = useState("");
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDays, setExpirationDays] = useState(7);
  const [isSharing, setIsSharing] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const { toast } = useToast();

  const handleShare = async () => {
    if (!file || !email) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setIsSharing(true);
    try {
      const { data, error } = await supabase.functions.invoke('share-file', {
        body: {
          fileId: file.id,
          email: email.trim(),
          accessLevel,
          message: message.trim() || undefined,
          expiresIn: hasExpiration ? expirationDays : undefined,
        }
      });

      if (error) throw error;

      if (data.success) {
        setShareLink(data.shareLink);
        toast({
          title: "File shared successfully!",
          description: `${file.name} has been shared with ${email}`,
        });
        
        // Reset form
        setEmail("");
        setMessage("");
        setHasExpiration(false);
        setExpirationDays(7);
      } else {
        throw new Error(data.error || 'Failed to share file');
      }
    } catch (error: any) {
      console.error('Share error:', error);
      toast({
        title: "Failed to share file",
        description: error.message || "An error occurred while sharing the file",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const copyShareLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      toast({
        title: "Link copied!",
        description: "Share link copied to clipboard",
      });
    }
  };

  const resetDialog = () => {
    setEmail("");
    setMessage("");
    setHasExpiration(false);
    setExpirationDays(7);
    setShareLink("");
    setAccessLevel('view');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetDialog();
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
              <Share2 className="w-5 h-5 text-primary-foreground" />
            </div>
            Share {file?.name}
          </DialogTitle>
        </DialogHeader>

        {shareLink ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
              <Mail className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-700 dark:text-green-400">File shared successfully!</span>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Share Link</Label>
              <div className="flex gap-2">
                <Input
                  value={shareLink}
                  readOnly
                  className="text-sm h-10 bg-muted"
                />
                <Button size="default" onClick={copyShareLink} variant="outline">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={() => handleOpenChange(false)} className="flex-1 bg-primary hover:bg-primary/90">
                Done
              </Button>
              <Button variant="outline" onClick={resetDialog} className="flex-1">
                Share Again
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
                <Mail className="w-4 h-4" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Shield className="w-4 h-4" />
                Access Level
              </Label>
              <Select value={accessLevel} onValueChange={(value: any) => setAccessLevel(value)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View only</SelectItem>
                  <SelectItem value="download">View and download</SelectItem>
                  <SelectItem value="edit">View, download and edit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="text-sm font-medium">Message (optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a personal message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="w-4 h-4" />
                  Set expiration
                </Label>
                <Switch
                  checked={hasExpiration}
                  onCheckedChange={setHasExpiration}
                />
              </div>

              {hasExpiration && (
                <div className="space-y-2">
                  <Label htmlFor="expiration" className="text-sm font-medium">Expires in (days)</Label>
                  <Select value={expirationDays.toString()} onValueChange={(value) => setExpirationDays(parseInt(value))}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => handleOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleShare} disabled={isSharing} className="flex-1 bg-primary hover:bg-primary/90">
                {isSharing ? "Sharing..." : "Share File"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};