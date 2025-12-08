import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  OrganizationRolesService,
  OrganizationMemberWithRole,
} from '@/lib/organizationRolesService';
import { RoleManagement } from './RoleManagement';
import { useRole } from '@/contexts/RoleContext';
import { toast } from 'sonner';
import { Users, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const { canManageRoles } = useRole();

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await OrganizationRolesService.getMembersWithRoles(organizationId);
      setMembers(response.members);
    } catch (err: any) {
      console.error('Error fetching members:', err);
      setError(err.message || 'Failed to load members');
      toast.error('Failed to load organization members');
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
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
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
          {members.length} {members.length === 1 ? 'member' : 'members'}
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
    </Card>
  );
};