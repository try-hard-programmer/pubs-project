import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { OrganizationMembersList } from "@/components/OrganizationMembersList";
import { UserOrganizationsCard } from "@/components/UserOrganizationsCard";
import { PermissionGate, OwnerGate } from "@/components/PermissionGate";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import {
  Settings,
  Users,
  Building2,
  Shield,
  UserPlus,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Copy,
  Trash2,
  Edit,
  Eye,
  Lock,
  FolderLock,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { Sidebar } from "@/components/FileManager/Sidebar";
import { FloatingAIButton } from "@/components/FloatingAIButton";
import { useUserManagement } from "@/hooks/useUserManagement";
import { useGroups, PermissionType } from "@/hooks/useGroups";
import { OrganizationService } from "@/lib/organizationRolesService";

export const OrganizationSettings = () => {
  const { user } = useAuth();
  const { userRoles, loading: rolesLoading } = useRole();
  const [currentOrg, setCurrentOrg] = useState<any>(null);
  const [loadingOrg, setLoadingOrg] = useState(false);
  const [activeSection, setActiveSection] = useState("organization");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // User Invitation states
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  // Group Management states
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState(false);
  const [isEditGroupDialogOpen, setIsEditGroupDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [groupName, setGroupName] = useState("");
  const [groupNameValid, setGroupNameValid] = useState(true);
  const [groupDescription, setGroupDescription] = useState("");

  // Organization Edit states
  const [isEditOrgDialogOpen, setIsEditOrgDialogOpen] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgNameValid, setorgNameValid] = useState(true);
  const [orgDescription, setOrgDescription] = useState("");
  const [updatingOrg, setUpdatingOrg] = useState(false);

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
  };

  // Get first organization (or you can let user select)
  const firstOrg = userRoles.length > 0 ? userRoles[0] : null;

  useEffect(() => {
    if (orgName) {
      // Only allow letters (including Unicode letters for international names) and spaces
      const isValid = /^[a-zA-Z\s\u00C0-\u024F\u1E00-\u1EFF]+$/.test(orgName);
      setorgNameValid(isValid);
    } else {
      setorgNameValid(true); // Empty is valid (will be caught by required)
    }
    if (groupNameValid) {
      // Only allow letters (including Unicode letters for international names) and spaces
      const isValid = /^[a-zA-Z\s\u00C0-\u024F\u1E00-\u1EFF]+$/.test(groupName);
      setGroupNameValid(isValid);
    } else {
      setGroupNameValid(true); // Empty is valid (will be caught by required)
    }
  }, [orgName, groupNameValid]);

  // Check if string contains emoji or invalid characters
  const isValidOrgName = (text: string): boolean => {
    // Kosong atau terlalu pendek
    if (!text || text.trim().length < 2) return false;

    // Terlalu panjang
    if (text.length > 100) return false;

    // Check emoji dan karakter spesial
    const validRegex = /^[a-zA-Z0-9\s\-._&()]+$/;
    return validRegex.test(text);
  };

  // User Management hooks
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

  // Group Management hooks
  const {
    groups,
    isLoadingGroups,
    createGroup,
    creatingGroup,
    updateGroup,
    updatingGroup,
    deleteGroup,
    deletingGroup,
  } = useGroups();

  // User Invitation handlers
  const handleSendInvitation = async () => {
    if (!inviteEmail) {
      toast.error("Please enter an email address");
      return;
    }

    try {
      const result = await sendInvitation(inviteEmail);
      toast.success("Invitation sent successfully!");

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

  // Group Management handlers
  const handleCreateGroup = async () => {
    if (!groupName) {
      toast.error("Nama group harus diisi");
      return;
    }

    if (!groupNameValid) {
      toast.error("Nama Group hanya boleh berisi huruf");
      return;
    }

    try {
      await createGroup({ name: groupName, description: groupDescription });
      toast.success("Group berhasil dibuat");
      setGroupName("");
      setGroupDescription("");
      setIsCreateGroupDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Gagal membuat group");
    }
  };

  const handleUpdateGroup = async () => {
    if (!groupNameValid) {
      toast.error("Nama Group hanya boleh berisi huruf");
      return;
    }

    if (!selectedGroup || !groupName) {
      toast.error("Nama group harus diisi");
      return;
    }

    try {
      await updateGroup({
        groupId: selectedGroup.id,
        name: groupName,
        description: groupDescription,
      });
      toast.success("Group berhasil diupdate");
      setIsEditGroupDialogOpen(false);
      setSelectedGroup(null);
    } catch (error: any) {
      toast.error(error.message || "Gagal update group");
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    try {
      await deleteGroup(groupId);
      toast.success("Group berhasil dihapus");
    } catch (error: any) {
      toast.error(error.message || "Gagal menghapus group");
    }
  };

  const openEditDialog = (group: any) => {
    setSelectedGroup(group);
    setGroupName(group.name);
    setGroupDescription(group.description || "");
    setIsEditGroupDialogOpen(true);
  };

  // Organization Edit handlers
  const handleUpdateOrganization = async () => {
    if (!orgNameValid) {
      toast.error("Nama Organization hanya boleh berisi huruf");
      return;
    }

    if (!firstOrg || !orgName) {
      toast.error("Organization name is required");
      return;
    }

    if (!isValidOrgName(orgName)) {
      toast.error("Nama organisasi tidak valid");
      return;
    }

    setUpdatingOrg(true);
    try {
      const result = await OrganizationService.updateOrganization(
        firstOrg.organization_id,
        {
          name: orgName,
          description: orgDescription || null,
        }
      );

      toast.success("Organization updated successfully");
      setIsEditOrgDialogOpen(false);

      // Refresh organization data
      const updatedOrg = await apiClient.get(
        `/organizations/${firstOrg.organization_id}`
      );
      setCurrentOrg(updatedOrg);
    } catch (error: any) {
      toast.error(error.message || "Failed to update organization");
    } finally {
      setUpdatingOrg(false);
    }
  };

  const openEditOrgDialog = () => {
    setOrgName(currentOrg?.name || firstOrg.organization_name);
    setOrgDescription(currentOrg?.description || "");
    setIsEditOrgDialogOpen(true);
  };

  // Helper functions
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

  const getPermissionBadge = (permission: PermissionType) => {
    const badges = {
      view: {
        icon: Eye,
        label: "Lihat",
        class: "bg-blue-100 text-blue-800 border-blue-200",
      },
      edit: {
        icon: Edit,
        label: "Edit",
        class: "bg-green-100 text-green-800 border-green-200",
      },
      delete: {
        icon: Trash2,
        label: "Hapus",
        class: "bg-red-100 text-red-800 border-red-200",
      },
      full: {
        icon: Lock,
        label: "Full Access",
        class: "bg-purple-100 text-purple-800 border-purple-200",
      },
    };

    const badge = badges[permission];
    const Icon = badge.icon;

    return (
      <Badge variant="outline" className={badge.class}>
        <Icon className="w-3 h-3 mr-1" />
        {badge.label}
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

  useEffect(() => {
    const fetchOrgDetails = async () => {
      if (!firstOrg) return;

      setLoadingOrg(true);
      try {
        const org = await apiClient.get(
          `/organizations/${firstOrg.organization_id}`
        );
        setCurrentOrg(org);
      } catch (error: any) {
        console.error("Error fetching organization:", error);
        toast.error("Failed to load organization details");
      } finally {
        setLoadingOrg(false);
      }
    };

    if (firstOrg && !rolesLoading) {
      fetchOrgDetails();
    }
  }, [firstOrg, rolesLoading]);

  if (rolesLoading || loadingOrg) {
    return (
      <>
        <Sidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          onCollapseChange={setIsSidebarCollapsed}
        />

        <div className={`min-h-screen bg-background ${isSidebarCollapsed ? 'ml-20' : 'ml-64'} transition-all duration-300`}>
          <div className="overflow-auto bg-background p-6">
            <div className="max-w-7xl mx-auto">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-muted rounded w-64"></div>
                <div className="h-96 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        </div>

        <FloatingAIButton />
      </>
    );
  }

  if (!firstOrg) {
    return (
      <>
        <Sidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          onCollapseChange={setIsSidebarCollapsed}
        />

        <div className={`min-h-screen bg-background ${isSidebarCollapsed ? 'ml-20' : 'ml-64'} transition-all duration-300`}>
          <div className="overflow-auto bg-background p-6">
            <div className="max-w-7xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-6 h-6" />
                    No Organization
                  </CardTitle>
                  <CardDescription>
                    You are not part of any organization yet. Create one or wait
                    for an invitation.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>

        <FloatingAIButton />
      </>
    );
  }

  return (
    <>
      <Sidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        onCollapseChange={setIsSidebarCollapsed}
      />

      <div className={`min-h-screen bg-background ${isSidebarCollapsed ? 'ml-20' : 'ml-64'} transition-all duration-300`}>
        <div className="overflow-auto bg-background p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Settings className="w-8 h-8" />
                Organization Settings
              </h1>
              <p className="text-muted-foreground">
                Manage your organization settings, members, and roles
              </p>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 lg:w-auto">
                <TabsTrigger
                  value="overview"
                  className="flex items-center gap-2"
                >
                  <Building2 className="w-4 h-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="members"
                  className="flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Members
                </TabsTrigger>
                <TabsTrigger
                  value="invitations"
                  className="flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Invitations
                </TabsTrigger>
                {/* <TabsTrigger value="groups" className="flex items-center gap-2">
                  <FolderLock className="w-4 h-4" />
                  Groups
                </TabsTrigger> */}
                <TabsTrigger value="roles" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  My Roles
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Organization Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Organization Information</CardTitle>
                      <CardDescription>
                        Basic information about your organization
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Name
                        </p>
                        <p className="text-lg font-semibold">
                          {currentOrg?.name || firstOrg.organization_name}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Category
                        </p>
                        <p className="capitalize">
                          {currentOrg?.category || "N/A"}
                        </p>
                      </div>
                      {currentOrg?.description && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Description
                          </p>
                          <p className="text-sm">{currentOrg.description}</p>
                        </div>
                      )}

                      <OwnerGate
                        organizationId={firstOrg.organization_id}
                        fallback={
                          <p className="text-xs text-muted-foreground italic">
                            Only the owner can edit organization information
                          </p>
                        }
                      >
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={openEditOrgDialog}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Organization
                        </Button>
                      </OwnerGate>
                    </CardContent>
                  </Card>

                  {/* Quick Stats */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Stats</CardTitle>
                      <CardDescription>
                        Overview of your organization
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-primary" />
                          <span className="font-medium">Total Members</span>
                        </div>
                        <span className="text-2xl font-bold">
                          {currentOrg?.member_count || "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-blue-500" />
                          <span className="font-medium">Your Role</span>
                        </div>
                        <span className="text-sm font-semibold capitalize">
                          {firstOrg.role}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-green-500" />
                          <span className="font-medium">Status</span>
                        </div>
                        <span className="text-sm font-semibold text-green-600">
                          Active
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Members Tab */}
              <TabsContent value="members">
                <OrganizationMembersList
                  organizationId={firstOrg.organization_id}
                  organizationName={firstOrg.organization_name}
                />
              </TabsContent>

              {/* Invitations Tab */}
              <TabsContent value="invitations" className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">User Invitations</h2>
                    <p className="text-muted-foreground">
                      Manage user invitations and downlines
                    </p>
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
                          Send an invitation email to add a new user as your
                          downline
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

                <Tabs defaultValue="downlines" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="downlines">
                      <Users className="w-4 h-4 mr-2" />
                      Downlines ({downlines?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="invitations-list">
                      <Mail className="w-4 h-4 mr-2" />
                      Invitations ({invitations?.length || 0})
                    </TabsTrigger>
                  </TabsList>

                  {/* Downlines Sub-Tab */}
                  <TabsContent value="downlines" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Your Downlines</CardTitle>
                        <CardDescription>
                          Users who accepted your invitation and are part of
                          your network
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
                                  <TableCell>
                                    {getRoleBadge(downline.role)}
                                  </TableCell>
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

                  {/* Invitations List Sub-Tab */}
                  <TabsContent value="invitations-list" className="mt-6">
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
                                <TableHead className="text-right">
                                  Actions
                                </TableHead>
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
                                    {new Date(invitation.expires_at) >
                                    new Date()
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
                                              const link = `${window.location.origin}/accept-invitation?token=${invitation.invitation_token}`;
                                              navigator.clipboard.writeText(
                                                link
                                              );
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
                                              handleCancelInvitation(
                                                invitation.id
                                              )
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
              </TabsContent>

              {/* Groups Tab */}
              <TabsContent value="groups" className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Group Management</h2>
                    <p className="text-muted-foreground">
                      Manage groups and permissions for files/folders
                    </p>
                  </div>
                  <Dialog
                    open={isCreateGroupDialogOpen}
                    onOpenChange={setIsCreateGroupDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button>
                        <Users className="w-4 h-4 mr-2" />
                        Create Group
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Group</DialogTitle>
                        <DialogDescription>
                          Create a group to manage file/folder access
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="group-name">Group Name</Label>
                          <Input
                            id="group-name"
                            placeholder="e.g., Marketing Team"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="group-description">
                            Description (Optional)
                          </Label>
                          <Textarea
                            id="group-description"
                            placeholder="Group description..."
                            value={groupDescription}
                            onChange={(e) =>
                              setGroupDescription(e.target.value)
                            }
                            rows={3}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsCreateGroupDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreateGroup}
                          disabled={creatingGroup}
                        >
                          {creatingGroup ? "Creating..." : "Create Group"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Groups List</CardTitle>
                    <CardDescription>
                      Manage groups and configure members and permissions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingGroups ? (
                      <div className="text-center py-8">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-muted-foreground">
                          Loading groups...
                        </p>
                      </div>
                    ) : groups && groups.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Group Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groups.map((group) => (
                            <TableRow key={group.id}>
                              <TableCell className="font-medium">
                                {group.name}
                              </TableCell>
                              <TableCell>{group.description || "-"}</TableCell>
                              <TableCell>
                                {new Date(group.created_at).toLocaleDateString(
                                  "id-ID",
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  }
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditDialog(group)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleDeleteGroup(group.id, group.name)
                                    }
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">
                          No groups yet
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          Create your first group to manage file/folder access
                        </p>
                        <Button
                          onClick={() => setIsCreateGroupDialogOpen(true)}
                        >
                          <Users className="w-4 h-4 mr-2" />
                          Create Group
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Edit Group Dialog */}
                <Dialog
                  open={isEditGroupDialogOpen}
                  onOpenChange={setIsEditGroupDialogOpen}
                >
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Group</DialogTitle>
                      <DialogDescription>
                        Update group information
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-group-name">Group Name</Label>
                        <Input
                          id="edit-group-name"
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-group-description">
                          Description
                        </Label>
                        <Textarea
                          id="edit-group-description"
                          value={groupDescription}
                          onChange={(e) => setGroupDescription(e.target.value)}
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditGroupDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleUpdateGroup}
                        disabled={updatingGroup}
                      >
                        {updatingGroup ? "Updating..." : "Update"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </TabsContent>

              {/* My Roles Tab */}
              <TabsContent value="roles">
                <UserOrganizationsCard />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Edit Organization Dialog */}
      <Dialog open={isEditOrgDialogOpen} onOpenChange={setIsEditOrgDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>
              Update your organization information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-org-name">Organization Name</Label>
              <Input
                id="edit-org-name"
                placeholder="e.g., Acme Corporation"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-org-description">
                Description (Optional)
              </Label>
              <Textarea
                id="edit-org-description"
                placeholder="Organization description..."
                value={orgDescription}
                onChange={(e) => setOrgDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditOrgDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateOrganization} disabled={updatingOrg}>
              {updatingOrg ? "Updating..." : "Update Organization"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FloatingAIButton />
    </>
  );
};
