import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  OrganizationRole,
  OrganizationRolesService,
  OrganizationMemberWithRole,
} from '@/lib/organizationRolesService';
import { useRole } from '@/contexts/RoleContext';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';
import { RoleBadge } from './RoleBadge';

interface RoleManagementProps {
  member: OrganizationMemberWithRole;
  orgId: string;
  onRoleUpdated?: () => void;
}

export const RoleManagement = ({ member, orgId, onRoleUpdated }: RoleManagementProps) => {
  const { getRoleInOrg, canManageRoles } = useRole();
  const [selectedRole, setSelectedRole] = useState<OrganizationRole>(member.role);
  const [loading, setLoading] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  const currentUserRole = getRoleInOrg(orgId);
  const canManage = canManageRoles(orgId);

  // If user cannot manage roles, just show badge
  if (!canManage) {
    return <RoleBadge role={member.role} isOwner={member.is_owner} />;
  }

  // Cannot change owner's role
  if (member.is_owner) {
    return <RoleBadge role={member.role} isOwner={member.is_owner} />;
  }

  const handleRoleChange = async (newRole: OrganizationRole) => {
    // Check if user can assign this role
    if (!OrganizationRolesService.canAssignRole(currentUserRole, newRole)) {
      toast.error('You do not have permission to assign this role');
      return;
    }

    setLoading(true);
    try {
      await OrganizationRolesService.assignRole(orgId, member.user_id, newRole);
      setSelectedRole(newRole);
      toast.success(`Role updated to ${OrganizationRolesService.getRoleDisplayName(newRole)}`);
      onRoleUpdated?.();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(error.message || 'Failed to update role');
      // Revert selection
      setSelectedRole(member.role);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRole = async () => {
    setLoading(true);
    try {
      await OrganizationRolesService.removeMemberRole(orgId, member.user_id);
      setSelectedRole('user');
      setShowRemoveDialog(false);
      toast.success('Role removed. User reverted to default role.');
      onRoleUpdated?.();
    } catch (error: any) {
      console.error('Error removing role:', error);
      toast.error(error.message || 'Failed to remove role');
    } finally {
      setLoading(false);
    }
  };

  const assignableRoles = OrganizationRolesService.getAssignableRoles(currentUserRole);

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedRole}
        onValueChange={handleRoleChange}
        disabled={loading || member.is_owner}
      >
        <SelectTrigger className="w-40">
          <SelectValue>
            <RoleBadge role={selectedRole} showIcon={false} className="text-xs" />
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {/* Always show current role */}
          <SelectItem value={selectedRole}>
            <div className="flex items-center gap-2">
              <RoleBadge role={selectedRole} showIcon={true} />
            </div>
          </SelectItem>

          {/* Show assignable roles */}
          {assignableRoles
            .filter((role) => role !== selectedRole)
            .map((role) => (
              <SelectItem key={role} value={role}>
                <div className="flex items-center gap-2">
                  <RoleBadge role={role} showIcon={true} />
                </div>
              </SelectItem>
            ))}

          {/* Show super_admin as disabled option */}
          {selectedRole !== 'super_admin' && (
            <SelectItem value="super_admin" disabled>
              <div className="flex items-center gap-2 opacity-50">
                <RoleBadge role="super_admin" showIcon={true} />
                <span className="text-xs">(Owner Only)</span>
              </div>
            </SelectItem>
          )}
        </SelectContent>
      </Select>

      {/* Remove role button - only show if role is not 'user' */}
      {selectedRole !== 'user' && !member.is_owner && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowRemoveDialog(true)}
          disabled={loading}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </Button>
      )}

      {/* Remove role confirmation dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the{' '}
              <strong>{OrganizationRolesService.getRoleDisplayName(selectedRole)}</strong> role from{' '}
              {member.email || member.user_id}? They will be reverted to the default User role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveRole}
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Role'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};