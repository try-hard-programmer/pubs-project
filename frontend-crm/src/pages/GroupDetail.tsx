import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGroups, PermissionType, GroupMember, GroupPermission } from '@/hooks/useGroups';
import { useUserManagement } from '@/hooks/useUserManagement';
import { useFiles } from '@/hooks/useFiles';
import { toast } from 'sonner';
import {
  Users,
  FolderLock,
  UserPlus,
  Trash2,
  Eye,
  Edit,
  Lock,
  ArrowLeft,
  Shield,
} from 'lucide-react';

export const GroupDetail = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isAddPermissionDialogOpen, setIsAddPermissionDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedFileId, setSelectedFileId] = useState('');
  const [selectedPermission, setSelectedPermission] = useState<PermissionType>('view');
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [permissions, setPermissions] = useState<GroupPermission[]>([]);

  const {
    groups,
    fetchGroupMembers,
    fetchGroupPermissions,
    addGroupMember,
    addingGroupMember,
    removeGroupMember,
    setGroupPermission,
    settingGroupPermission,
    removeGroupPermission,
  } = useGroups();

  const { downlines } = useUserManagement();
  const { files } = useFiles('all');

  const currentGroup = groups?.find(g => g.id === groupId);

  useEffect(() => {
    if (groupId) {
      loadGroupData();
    }
  }, [groupId]);

  const loadGroupData = async () => {
    if (!groupId) return;

    try {
      const [membersData, permissionsData] = await Promise.all([
        fetchGroupMembers(groupId),
        fetchGroupPermissions(groupId),
      ]);
      setMembers(membersData);
      setPermissions(permissionsData);
    } catch (error: any) {
      toast.error(error.message || 'Gagal memuat data group');
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId || !groupId) {
      toast.error('Pilih user terlebih dahulu');
      return;
    }

    try {
      await addGroupMember({ groupId, userId: selectedUserId });
      toast.success('Member berhasil ditambahkan');
      setSelectedUserId('');
      setIsAddMemberDialogOpen(false);
      loadGroupData();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menambahkan member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!groupId) return;

    if (!confirm('Apakah Anda yakin ingin menghapus member ini?')) {
      return;
    }

    try {
      await removeGroupMember({ groupId, userId });
      toast.success('Member berhasil dihapus');
      loadGroupData();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menghapus member');
    }
  };

  const handleSetPermission = async () => {
    if (!selectedFileId || !groupId) {
      toast.error('Pilih file/folder terlebih dahulu');
      return;
    }

    try {
      await setGroupPermission({
        groupId,
        fileId: selectedFileId,
        permission: selectedPermission,
      });
      toast.success('Permission berhasil diset');
      setSelectedFileId('');
      setSelectedPermission('view');
      setIsAddPermissionDialogOpen(false);
      loadGroupData();
    } catch (error: any) {
      toast.error(error.message || 'Gagal set permission');
    }
  };

  const handleRemovePermission = async (fileId: string) => {
    if (!groupId) return;

    if (!confirm('Apakah Anda yakin ingin menghapus permission ini?')) {
      return;
    }

    try {
      await removeGroupPermission({ groupId, fileId });
      toast.success('Permission berhasil dihapus');
      loadGroupData();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menghapus permission');
    }
  };

  const getPermissionBadge = (permission: PermissionType) => {
    const badges = {
      view: { icon: Eye, label: 'Lihat', class: 'bg-blue-100 text-blue-800 border-blue-200' },
      edit: { icon: Edit, label: 'Edit', class: 'bg-green-100 text-green-800 border-green-200' },
      delete: { icon: Trash2, label: 'Hapus', class: 'bg-red-100 text-red-800 border-red-200' },
      full: { icon: Lock, label: 'Full Access', class: 'bg-purple-100 text-purple-800 border-purple-200' },
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

  if (!currentGroup) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Group tidak ditemukan</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/groups')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/groups')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{currentGroup.name}</h1>
              <p className="text-muted-foreground">
                {currentGroup.description || 'Kelola member dan permission group'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-6">
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="members">
              <Users className="w-4 h-4 mr-2" />
              Members ({members.length})
            </TabsTrigger>
            <TabsTrigger value="permissions">
              <FolderLock className="w-4 h-4 mr-2" />
              Permissions ({permissions.length})
            </TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Group Members</CardTitle>
                    <CardDescription>
                      Kelola user yang ada di group ini
                    </CardDescription>
                  </div>
                  <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Tambah Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Tambah Member</DialogTitle>
                        <DialogDescription>
                          Pilih user untuk ditambahkan ke group
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Pilih User</Label>
                          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih user" />
                            </SelectTrigger>
                            <SelectContent>
                              {downlines?.map((user) => (
                                <SelectItem key={user.user_id} value={user.user_id}>
                                  {user.email} ({user.role})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddMemberDialogOpen(false)}>
                          Batal
                        </Button>
                        <Button onClick={handleAddMember} disabled={addingGroupMember}>
                          {addingGroupMember ? 'Menambahkan...' : 'Tambah'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {members.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Ditambahkan</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">{member.user_email}</TableCell>
                          <TableCell>
                            <Badge>{member.user_role}</Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(member.added_at).toLocaleDateString('id-ID')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveMember(member.user_id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Belum ada member di group ini</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>File/Folder Permissions</CardTitle>
                    <CardDescription>
                      Kelola akses file/folder untuk group ini
                    </CardDescription>
                  </div>
                  <Dialog open={isAddPermissionDialogOpen} onOpenChange={setIsAddPermissionDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Shield className="w-4 h-4 mr-2" />
                        Tambah Permission
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Tambah Permission</DialogTitle>
                        <DialogDescription>
                          Set permission untuk file/folder
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Pilih File/Folder</Label>
                          <Select value={selectedFileId} onValueChange={setSelectedFileId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih file/folder" />
                            </SelectTrigger>
                            <SelectContent>
                              {files?.map((file) => (
                                <SelectItem key={file.id} value={file.id}>
                                  {file.is_folder ? '📁' : '📄'} {file.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Permission</Label>
                          <Select value={selectedPermission} onValueChange={(val) => setSelectedPermission(val as PermissionType)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="view">Lihat</SelectItem>
                              <SelectItem value="edit">Edit</SelectItem>
                              <SelectItem value="delete">Hapus</SelectItem>
                              <SelectItem value="full">Full Access</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddPermissionDialogOpen(false)}>
                          Batal
                        </Button>
                        <Button onClick={handleSetPermission} disabled={settingGroupPermission}>
                          {settingGroupPermission ? 'Setting...' : 'Set Permission'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {permissions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File/Folder</TableHead>
                        <TableHead>Permission</TableHead>
                        <TableHead>Dibuat</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {permissions.map((perm) => (
                        <TableRow key={perm.id}>
                          <TableCell className="font-medium">{perm.file_name}</TableCell>
                          <TableCell>{getPermissionBadge(perm.permission)}</TableCell>
                          <TableCell>
                            {new Date(perm.created_at).toLocaleDateString('id-ID')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemovePermission(perm.file_id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <FolderLock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Belum ada permission untuk group ini</p>
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
