import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import { useGroups, PermissionType } from '@/hooks/useGroups';
import { toast } from 'sonner';
import {
  Users,
  FolderLock,
  UserPlus,
  Settings,
  Trash2,
  Shield,
  ArrowLeft,
  Eye,
  Edit,
  Lock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const GroupManagement = () => {
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');

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

  const handleCreateGroup = async () => {
    if (!groupName) {
      toast.error('Nama group harus diisi');
      return;
    }

    try {
      await createGroup({ name: groupName, description: groupDescription });
      toast.success('Group berhasil dibuat');
      setGroupName('');
      setGroupDescription('');
      setIsCreateDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Gagal membuat group');
    }
  };

  const handleUpdateGroup = async () => {
    if (!selectedGroup || !groupName) {
      toast.error('Nama group harus diisi');
      return;
    }

    try {
      await updateGroup({
        groupId: selectedGroup.id,
        name: groupName,
        description: groupDescription,
      });
      toast.success('Group berhasil diupdate');
      setIsEditDialogOpen(false);
      setSelectedGroup(null);
    } catch (error: any) {
      toast.error(error.message || 'Gagal update group');
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus group "${groupName}"?`)) {
      return;
    }

    try {
      await deleteGroup(groupId);
      toast.success('Group berhasil dihapus');
    } catch (error: any) {
      toast.error(error.message || 'Gagal menghapus group');
    }
  };

  const openEditDialog = (group: any) => {
    setSelectedGroup(group);
    setGroupName(group.name);
    setGroupDescription(group.description || '');
    setIsEditDialogOpen(true);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Group Management</h1>
              <p className="text-muted-foreground">Kelola group dan permission untuk file/folder</p>
            </div>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Users className="w-4 h-4 mr-2" />
                Buat Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Buat Group Baru</DialogTitle>
                <DialogDescription>
                  Buat group untuk mengelola akses file/folder
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="group-name">Nama Group</Label>
                  <Input
                    id="group-name"
                    placeholder="Contoh: Tim Marketing"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="group-description">Deskripsi (Opsional)</Label>
                  <Textarea
                    id="group-description"
                    placeholder="Deskripsi group..."
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Batal
                </Button>
                <Button onClick={handleCreateGroup} disabled={creatingGroup}>
                  {creatingGroup ? 'Membuat...' : 'Buat Group'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Content */}
      <main className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Daftar Group</CardTitle>
            <CardDescription>
              Kelola group dan atur member serta permission
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingGroups ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading groups...</p>
              </div>
            ) : groups && groups.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Group</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Dibuat</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell>{group.description || '-'}</TableCell>
                      <TableCell>
                        {new Date(group.created_at).toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/groups/${group.id}`)}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
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
                            onClick={() => handleDeleteGroup(group.id, group.name)}
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
                  Belum ada group
                </h3>
                <p className="text-muted-foreground mb-4">
                  Buat group pertama Anda untuk mengelola akses file/folder
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Users className="w-4 h-4 mr-2" />
                  Buat Group
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Group</DialogTitle>
              <DialogDescription>
                Update informasi group
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-group-name">Nama Group</Label>
                <Input
                  id="edit-group-name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-group-description">Deskripsi</Label>
                <Textarea
                  id="edit-group-description"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleUpdateGroup} disabled={updatingGroup}>
                {updatingGroup ? 'Updating...' : 'Update'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};
