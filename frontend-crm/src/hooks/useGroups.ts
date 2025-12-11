import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PermissionType = "view" | "edit" | "delete" | "full";

export interface Group {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  user_email?: string;
  user_role?: string;
  added_by: string | null;
  added_at: string;
}

export interface GroupPermission {
  id: string;
  group_id: string;
  file_id: string;
  file_name?: string;
  permission: PermissionType;
  granted_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useGroups = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all groups (admin only)
  const {
    data: groups,
    isLoading: isLoadingGroups,
    error: groupsError,
  } = useQuery({
    queryKey: ["groups", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Group[];
    },
    enabled: !!user,
  });

  // Fetch group members by group ID
  const fetchGroupMembers = async (groupId: string) => {
    const { data: members, error: membersError } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", groupId);

    if (membersError) throw membersError;

    // Get user IDs
    const userIds = members?.map((m) => m.user_id) || [];

    if (userIds.length === 0) {
      return [];
    }

    // Get user roles
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", userIds);

    if (rolesError) throw rolesError;

    // Get emails from invitations (accepted ones)
    const { data: invitations, error: invError } = await supabase
      .from("user_invitations")
      .select("invited_email")
      .eq("status", "accepted")
      .in("invited_email", []); // We'll need to match by user_id through hierarchy

    // Get emails from user_hierarchy
    const { data: hierarchy, error: hierarchyError } = await supabase
      .from("user_hierarchy")
      .select("child_user_id")
      .in("child_user_id", userIds);

    if (hierarchyError) throw hierarchyError;

    // For now, we'll use accepted invitations to get emails
    const { data: acceptedInvitations, error: acceptedError } = await supabase
      .from("user_invitations")
      .select("invited_email, accepted_at")
      .eq("status", "accepted");

    if (acceptedError) throw acceptedError;

    // Map roles
    const rolesMap: Record<string, string> = {};
    roles?.forEach((r) => {
      rolesMap[r.user_id] = r.role;
    });

    // Combine data
    const enrichedMembers: GroupMember[] =
      members?.map((m) => ({
        ...m,
        user_role: rolesMap[m.user_id] || "user",
        user_email: "user@example.com", // We'll get this from another source
      })) || [];

    return enrichedMembers;
  };

  // Fetch group permissions by group ID
  const fetchGroupPermissions = async (groupId: string) => {
    const { data: permissions, error: permError } = await supabase
      .from("group_permissions")
      .select("*")
      .eq("group_id", groupId);

    if (permError) throw permError;

    // Get file IDs
    const fileIds = permissions?.map((p) => p.file_id) || [];

    if (fileIds.length === 0) {
      return [];
    }

    // Get file details
    const { data: files, error: filesError } = await supabase
      .from("files")
      .select("id, name")
      .in("id", fileIds);

    if (filesError) throw filesError;

    // Map file names
    const filesMap: Record<string, string> = {};
    files?.forEach((f) => {
      filesMap[f.id] = f.name;
    });

    // Combine data
    const enrichedPermissions: GroupPermission[] =
      permissions?.map((p) => ({
        ...p,
        file_name: filesMap[p.file_id] || "Unknown File",
      })) || [];

    return enrichedPermissions;
  };

  // Create group
  const createGroupMutation = useMutation({
    mutationFn: async ({
      name,
      description,
    }: {
      name: string;
      description?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("groups")
        .insert({
          name,
          description: description || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", user?.id] });
    },
  });

  // Update group
  const updateGroupMutation = useMutation({
    mutationFn: async ({
      groupId,
      name,
      description,
    }: {
      groupId: string;
      name: string;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from("groups")
        .update({
          name,
          description: description || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", groupId)
        .select()
        .single();

      if (error) throw error;
      return data as Group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", user?.id] });
    },
  });

  // Delete group
  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from("groups")
        .delete()
        .eq("id", groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", user?.id] });
    },
  });

  // Add member to group
  const addGroupMemberMutation = useMutation({
    mutationFn: async ({
      groupId,
      userId,
    }: {
      groupId: string;
      userId: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("group_members")
        .insert({
          group_id: groupId,
          user_id: userId,
          added_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", user?.id] });
    },
  });

  // Remove member from group
  const removeGroupMemberMutation = useMutation({
    mutationFn: async ({
      groupId,
      userId,
    }: {
      groupId: string;
      userId: string;
    }) => {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", user?.id] });
    },
  });

  // Set group permission for file/folder
  const setGroupPermissionMutation = useMutation({
    mutationFn: async ({
      groupId,
      fileId,
      permission,
    }: {
      groupId: string;
      fileId: string;
      permission: PermissionType;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Check if permission already exists
      const { data: existing, error: checkError } = await supabase
        .from("group_permissions")
        .select("id")
        .eq("group_id", groupId)
        .eq("file_id", fileId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        // Update existing permission
        const { data, error } = await supabase
          .from("group_permissions")
          .update({
            permission,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new permission
        const { data, error } = await supabase
          .from("group_permissions")
          .insert({
            group_id: groupId,
            file_id: fileId,
            permission,
            granted_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", user?.id] });
    },
  });

  // Remove group permission
  const removeGroupPermissionMutation = useMutation({
    mutationFn: async ({
      groupId,
      fileId,
    }: {
      groupId: string;
      fileId: string;
    }) => {
      const { error } = await supabase
        .from("group_permissions")
        .delete()
        .eq("group_id", groupId)
        .eq("file_id", fileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", user?.id] });
    },
  });

  return {
    groups,
    isLoadingGroups,
    groupsError,
    fetchGroupMembers,
    fetchGroupPermissions,
    createGroup: createGroupMutation.mutateAsync,
    creatingGroup: createGroupMutation.isPending,
    updateGroup: updateGroupMutation.mutateAsync,
    updatingGroup: updateGroupMutation.isPending,
    deleteGroup: deleteGroupMutation.mutateAsync,
    deletingGroup: deleteGroupMutation.isPending,
    addGroupMember: addGroupMemberMutation.mutateAsync,
    addingGroupMember: addGroupMemberMutation.isPending,
    removeGroupMember: removeGroupMemberMutation.mutateAsync,
    removingGroupMember: removeGroupMemberMutation.isPending,
    setGroupPermission: setGroupPermissionMutation.mutateAsync,
    settingGroupPermission: setGroupPermissionMutation.isPending,
    removeGroupPermission: removeGroupPermissionMutation.mutateAsync,
    removingGroupPermission: removeGroupPermissionMutation.isPending,
  };
};
