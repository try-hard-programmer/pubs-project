import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { OrganizationService } from "@/services/organizationService";

type InvitationRow = Database["public"]["Tables"]["user_invitations"]["Row"];
export interface Invitation extends InvitationRow {}
export interface Downline {
  user_id: string;
  email: string;
  created_at: string;
  role: "admin" | "moderator" | "user";
}

export const useUserManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all invitations created by the current user
  const {
    data: invitations,
    isLoading: isLoadingInvitations,
    error: invitationsError,
  } = useQuery({
    queryKey: ["invitations", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_invitations")
        .select("*")
        .eq("invited_by", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Invitation[];
    },
    enabled: !!user,
  });

  // Fetch downlines (users invited by the current user)
  const {
    data: downlines,
    isLoading: isLoadingDownlines,
    error: downlinesError,
  } = useQuery({
    queryKey: ["downlines", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");

      // Fetch accepted invitations to get email addresses
      const { data: acceptedInvitations, error: invError } = await supabase
        .from("user_invitations")
        .select("invited_email, accepted_at")
        .eq("invited_by", user.id)
        .eq("status", "accepted")
        .order("accepted_at", { ascending: false });

      if (invError) throw invError;

      if (!acceptedInvitations || acceptedInvitations.length === 0) {
        return [];
      }

      // Get emails
      const emails = acceptedInvitations.map((inv) => inv.invited_email);

      // Fetch user roles by matching emails through user_roles
      const { data: hierarchyData, error: hierarchyError } = await supabase
        .from("user_hierarchy")
        .select("child_user_id, created_at")
        .eq("parent_user_id", user.id);

      if (hierarchyError) throw hierarchyError;

      const userIds = hierarchyData?.map((h) => h.child_user_id) || [];

      if (userIds.length === 0) {
        return [];
      }

      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      if (rolesError) throw rolesError;

      // Create maps
      const rolesMap: Record<string, string> = {};
      rolesData?.forEach((r) => {
        rolesMap[r.user_id] = r.role;
      });

      const emailMap: Record<string, string> = {};

      // For each invitation, we need to find the corresponding user_id
      for (const inv of acceptedInvitations) {
        const matchingHierarchy = hierarchyData?.find((h) => {
          const hierarchyDate = new Date(h.created_at);
          const invitationDate = new Date(inv.accepted_at || "");
          return (
            Math.abs(hierarchyDate.getTime() - invitationDate.getTime()) < 60000
          );
        });

        if (matchingHierarchy) {
          emailMap[matchingHierarchy.child_user_id] = inv.invited_email;
        }
      }

      const downlines: Downline[] =
        hierarchyData?.map((h) => ({
          user_id: h.child_user_id,
          email: emailMap[h.child_user_id] || "Unknown",
          created_at: h.created_at,
          role:
            (rolesMap[h.child_user_id] as "admin" | "moderator" | "user") ||
            "user",
        })) || [];

      return downlines;
    },
    enabled: !!user,
  });

  // Create and send invitation
  const sendInvitationMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!user) throw new Error("Not authenticated");

      // Use the centralized Service instead of direct apiClient call
      return await OrganizationService.sendInvitation({
        email,
        invited_by: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations", user?.id] });
      toast.success("Invitation sent successfully");
    },
    onError: (error: any) => {
      console.error("Invitation failed:", error);
      toast.error(error.message || "Failed to send invitation");
    },
  });

  // Cancel invitation
  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from("user_invitations")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations", user?.id] });
    },
  });

  // Resend invitation
  const resendInvitationMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!user) throw new Error("Not authenticated");

      // First, cancel any pending invitations for this email
      await supabase
        .from("user_invitations")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("invited_email", email)
        .eq("status", "pending");

      // Then create a brand new invitation using the main mutation
      return sendInvitationMutation.mutateAsync(email);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations", user?.id] });
    },
  });

  // Verify invitation token
  const verifyInvitationToken = async (token: string) => {
    const { data, error } = await supabase
      .from("user_invitations")
      .select("*")
      .eq("invitation_token", token)
      .eq("status", "pending")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new Error("Invalid or expired invitation token");
      }
      throw error;
    }

    const invitation = data as Invitation;
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt.getTime() - new Date().getTime() < -60000) {
      throw new Error("Invitation has expired");
    }
    return invitation;
  };

  // Accept invitation
  const acceptInvitationMutation = useMutation({
    mutationFn: async ({
      token,
      userId,
    }: {
      token: string;
      userId: string;
    }) => {
      const { data, error } = await supabase.rpc("accept_invitation", {
        p_token: token,
        p_user_id: userId,
      });

      if (error) {
        console.error("Error accepting invitation:", error);
        throw new Error(error.message || "Failed to accept invitation");
      }
      return true;
    },
  });

  return {
    invitations,
    isLoadingInvitations,
    invitationsError,
    downlines,
    isLoadingDownlines,
    downlinesError,
    sendInvitation: sendInvitationMutation.mutateAsync,
    sendingInvitation: sendInvitationMutation.isPending,
    cancelInvitation: cancelInvitationMutation.mutateAsync,
    cancellingInvitation: cancelInvitationMutation.isPending,
    resendInvitation: resendInvitationMutation.mutateAsync,
    resendingInvitation: resendInvitationMutation.isPending,
    verifyInvitationToken,
    acceptInvitation: acceptInvitationMutation.mutateAsync,
    acceptingInvitation: acceptInvitationMutation.isPending,
  };
};
