import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserManagement } from "@/hooks/useUserManagement";
import { toast } from "sonner";
import {
  UserPlus,
  Users,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Copy,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export const UserManagement = () => {
  const navigate = useNavigate();
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const {
    invitations,
    isLoadingInvitations,
    downlines,
    isLoadingDownlines,
    sendInvitation,
    sendingInvitation,
    cancelInvitation,
    resendInvitation,
  } = useUserManagement();

  const handleSendInvitation = async () => {
    if (!inviteEmail) {
      toast.error("Please enter an email address");
      return;
    }

    try {
      const result = await sendInvitation(inviteEmail);
      toast.success("Invitation sent successfully!");

      // Show invitation link for testing
      if (result.invitationLink) {
        toast.info("Invitation link copied to clipboard", {
          description: "You can share this link directly",
        });
        navigator.clipboard.writeText(result.invitationLink);
      }

      setInviteEmail("");
      setIsInviteDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitation");
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await cancelInvitation(invitationId);
      toast.success("Invitation cancelled");
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel invitation");
    }
  };

  const handleResendInvitation = async (email: string) => {
    try {
      await resendInvitation(email);
      toast.success("Invitation resent successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to resend invitation");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200"
          >
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "accepted":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Accepted
          </Badge>
        );
      case "expired":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200"
          >
            <XCircle className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        );
      case "cancelled":
        return (
          <Badge
            variant="outline"
            className="bg-gray-50 text-gray-700 border-gray-200"
          >
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: "bg-purple-100 text-purple-800 border-purple-200",
      moderator: "bg-blue-100 text-blue-800 border-blue-200",
      user: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return (
      <Badge
        variant="outline"
        className={colors[role as keyof typeof colors] || ""}
      >
        {role}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                User Management
              </h1>
              <p className="text-muted-foreground">
                Manage user invitations and downlines
              </p>
            </div>
          </div>
          <Dialog
            open={isInviteDialogOpen}
            onOpenChange={setIsInviteDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New User</DialogTitle>
                <DialogDescription>
                  Send an invitation email to add a new user as your downline
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSendInvitation();
                      }
                    }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsInviteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendInvitation}
                  disabled={sendingInvitation}
                >
                  {sendingInvitation ? "Sending..." : "Send Invitation"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Content */}
      <main className="p-6">
        <Tabs defaultValue="downlines" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="downlines">
              <Users className="w-4 h-4 mr-2" />
              Downlines ({downlines?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="invitations">
              <Mail className="w-4 h-4 mr-2" />
              Invitations ({invitations?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Downlines Tab */}
          <TabsContent value="downlines" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Downlines</CardTitle>
                <CardDescription>
                  Users who accepted your invitation and are part of your
                  network
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingDownlines ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-muted-foreground">
                      Loading downlines...
                    </p>
                  </div>
                ) : downlines && downlines.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {downlines.map((downline) => (
                        <TableRow key={downline.user_id}>
                          <TableCell className="font-medium">
                            {downline.email}
                          </TableCell>
                          <TableCell>{getRoleBadge(downline.role)}</TableCell>
                          <TableCell>
                            {formatDate(downline.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      No downlines yet
                    </h3>
                    <p className="text-muted-foreground">
                      Send invitations to add users to your network
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invitations Tab */}
          <TabsContent value="invitations" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Invitation History</CardTitle>
                <CardDescription>
                  Track all invitations you've sent
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingInvitations ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-muted-foreground">
                      Loading invitations...
                    </p>
                  </div>
                ) : invitations && invitations.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sent Date</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitations.map((invitation) => (
                        <TableRow key={invitation.id}>
                          <TableCell className="font-medium">
                            {invitation.invited_email}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(invitation.status)}
                          </TableCell>
                          <TableCell>
                            {formatDate(invitation.created_at)}
                          </TableCell>
                          <TableCell>
                            {new Date(invitation.expires_at) > new Date()
                              ? formatDate(invitation.expires_at)
                              : "Expired"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {invitation.status === "pending" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleResendInvitation(
                                        invitation.invited_email
                                      )
                                    }
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const link = `${window.location.origin}/#/accept-invitation?token=${invitation.invitation_token}`;
                                      navigator.clipboard.writeText(link);
                                      toast.success(
                                        "Invitation link copied to clipboard"
                                      );
                                    }}
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleCancelInvitation(invitation.id)
                                    }
                                  >
                                    <XCircle className="w-4 h-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Mail className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      No invitations sent
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Start by sending your first invitation
                    </p>
                    <Button onClick={() => setIsInviteDialogOpen(true)}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Send Invitation
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};
