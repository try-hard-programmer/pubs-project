import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  OrganizationRolesService,
  OrganizationMemberWithRole,
} from "@/lib/organizationRolesService";
import { RoleManagement } from "./RoleManagement";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Users, AlertCircle, Trash2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface OrganizationMembersListProps {
  organizationId: string;
  organizationName?: string;
}

export const OrganizationMembersList = ({
  organizationId,
  organizationName,
}: OrganizationMembersListProps) => {
  const [members, setMembers] = useState<OrganizationMemberWithRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [memberToRemove, setMemberToRemove] =
    useState<OrganizationMemberWithRole | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const { canManageRoles } = useRole();
  const { user } = useAuth(); // Ambil data current user untuk mencegah self-deletion

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);

    try {
      const response =
        await OrganizationRolesService.getMembersWithRoles(organizationId);
      setMembers(response.members);
    } catch (err: any) {
      console.error("Error fetching members:", err);
      setError(err.message || "Failed to load members");
      toast.error("Failed to load organization members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) {
      fetchMembers();
    }
  }, [organizationId]);

  const handleRoleUpdated = () => {
    // Refresh members list after role update
    fetchMembers();
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    setIsRemoving(true);
    try {
      await OrganizationRolesService.removeMember(
        organizationId,
        memberToRemove.user_id,
      );
      toast.success("Member successfully removed from organization");
      setMemberToRemove(null);
      fetchMembers(); // Refresh list
    } catch (err: any) {
      console.error("Error removing member:", err);
      toast.error(err.message || "Failed to remove member");
    } finally {
      setIsRemoving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Organization Members
          </CardTitle>
          <CardDescription>Loading members...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Organization Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Organization Members
        </CardTitle>
        <CardDescription>
          {organizationName && `${organizationName} • `}
          {members.length} {members.length === 1 ? "member" : "members"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No members found</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {member.email || member.user_id.substring(0, 8)}
                      </p>
                      {member.is_owner && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          Owner
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(member.joined_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <RoleManagement
                      member={member}
                      orgId={organizationId}
                      onRoleUpdated={handleRoleUpdated}
                    />

                    {/* IMPLEMENTATION OF DISPLAY RULES */}
                    {canManageRoles(organizationId) &&
                      member.user_id !== user?.id &&
                      !member.is_owner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setMemberToRemove(member)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {canManageRoles(organizationId) && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              💡 You can manage member roles. Click on a role to change it.
            </p>
          </div>
        )}
      </CardContent>

      {/* CONFIRMATION MODAL */}
      <Dialog
        open={!!memberToRemove}
        onOpenChange={(open) => {
          if (!open && !isRemoving) setMemberToRemove(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Remove{" "}
              {memberToRemove?.email || memberToRemove?.user_id.substring(0, 8)}{" "}
              from the organization?
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-4 text-foreground">
              <p>This action will:</p>
              <ul className="list-disc pl-5 space-y-2 font-medium">
                <li>Revoke their access to the organization immediately.</li>
                <li>Archive their Agent profile.</li>
                <li>
                  Return any of their active, open chats back to the unassigned
                  queue.
                </li>
              </ul>
              <p className="text-sm text-muted-foreground italic mt-4">
                (Note: Their historical closed chats and uploaded files will
                remain intact for company records).
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setMemberToRemove(null)}
              disabled={isRemoving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Yes, Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
