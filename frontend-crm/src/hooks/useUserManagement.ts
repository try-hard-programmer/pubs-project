import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Database } from "@/integrations/supabase/types";

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
      // We'll need to get user_id first by email through invitations table
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

      const createdAtMap: Record<string, string> = {};
      hierarchyData?.forEach((h) => {
        createdAtMap[h.child_user_id] = h.created_at;
      });

      // Get emails from invitations by matching with hierarchy
      const emailMap: Record<string, string> = {};

      // For each invitation, we need to find the corresponding user_id
      for (const inv of acceptedInvitations) {
        // Find the hierarchy entry that was created around the same time
        const matchingHierarchy = hierarchyData?.find((h) => {
          const hierarchyDate = new Date(h.created_at);
          const invitationDate = new Date(inv.accepted_at || "");
          const timeDiff = Math.abs(
            hierarchyDate.getTime() - invitationDate.getTime()
          );
          return timeDiff < 60000; // Within 1 minute
        });

        if (matchingHierarchy) {
          emailMap[matchingHierarchy.child_user_id] = inv.invited_email;
        }
      }

      // Combine data
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

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("Invalid email format");
      }

      // Check if user already exists (by checking existing invitations accepted)
      const { data: existingUser, error: checkError } = await supabase
        .from("user_invitations")
        .select("id")
        .eq("invited_email", email)
        .eq("status", "accepted")
        .maybeSingle();

      if (checkError) {
        console.error("Error checking existing user:", checkError);
      }

      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      // Check for pending invitations
      const { data: pendingInvitation, error: pendingError } = await supabase
        .from("user_invitations")
        .select("id, expires_at")
        .eq("invited_email", email)
        .eq("status", "pending")
        .maybeSingle();

      if (pendingError) {
        console.error("Error checking pending invitation:", pendingError);
      }

      if (pendingInvitation) {
        const expiresAt = new Date(pendingInvitation.expires_at);
        if (expiresAt > new Date()) {
          throw new Error("Pending invitation already exists for this email");
        }
      }

      // Generate a unique token
      const generateToken = () => {
        const array = new Uint8Array(24);
        crypto.getRandomValues(array);
        const base64 = btoa(String.fromCharCode(...array));
        return base64.replace(/[+/=]/g, "");
      };

      const invitationToken = generateToken();

      // Calculate expiry date
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days instead of 30

      console.log("Creating invitation:", {
        email,
        token: invitationToken.substring(0, 10) + "...",
        now: now.toISOString(),
        nowTimestamp: now.getTime(),
        expiresAt: expiresAt.toISOString(),
        expiresAtTimestamp: expiresAt.getTime(),
        daysUntilExpiry:
          (expiresAt.getTime() - now.getTime()) / 1000 / 60 / 60 / 24,
      });

      // Validation: Ensure expires_at is in the future
      if (expiresAt.getTime() <= now.getTime()) {
        throw new Error(
          "Invalid date calculation: expiry date is not in the future"
        );
      }

      // Validation: Ensure expires_at is exactly 7 days from now
      const expectedDays = 7;
      const actualDays =
        (expiresAt.getTime() - now.getTime()) / 1000 / 60 / 60 / 24;
      if (Math.abs(actualDays - expectedDays) > 0.1) {
        // Allow 0.1 day tolerance
        console.warn(
          `Expiry calculation may be incorrect. Expected: ${expectedDays} days, Got: ${actualDays} days`
        );
      }

      // Create invitation
      const { data: invitation, error: createError } = await supabase
        .from("user_invitations")
        .insert({
          invited_email: email,
          invited_by: user.id,
          invitation_token: invitationToken,
          status: "pending",
          expires_at: expiresAt.toISOString(), // 7 days
        })
        .select()
        .single();

      if (createError) {
        throw new Error(createError.message || "Failed to create invitation");
      }

      // Validate database stored values
      const storedCreatedAt = new Date(invitation.created_at);
      const storedExpiresAt = new Date(invitation.expires_at);

      console.log("Invitation created in database:", {
        id: invitation.id,
        created_at: invitation.created_at,
        expires_at: invitation.expires_at,
        createdAtParsed: storedCreatedAt.toISOString(),
        expiresAtParsed: storedExpiresAt.toISOString(),
        timeDiff:
          (storedExpiresAt.getTime() - storedCreatedAt.getTime()) /
          1000 /
          60 /
          60 /
          24, // days
        expiresAfterCreated:
          storedExpiresAt.getTime() > storedCreatedAt.getTime(),
        // Token verification
        tokenSent: invitationToken,
        tokenStored: invitation.invitation_token,
        tokenMatch: invitationToken === invitation.invitation_token,
        tokenSentLength: invitationToken.length,
        tokenStoredLength: invitation.invitation_token.length,
      });

      // Critical validation: expires_at must be AFTER created_at
      if (storedExpiresAt.getTime() <= storedCreatedAt.getTime()) {
        console.error(
          "CRITICAL: Database stored expires_at before or equal to created_at!"
        );
        throw new Error(
          "Database date integrity error: expiry date is not after creation date"
        );
      }

      // Create invitation link
      const invitationLink = `${window.location.origin}/#/accept-invitation?token=${invitation.invitation_token}`;

      return {
        success: true,
        message: "Invitation created successfully",
        invitationId: invitation.id,
        invitationLink,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations", user?.id] });
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

      // Then send a new invitation
      return sendInvitationMutation.mutateAsync(email);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations", user?.id] });
    },
  });

  // Verify invitation token
  const verifyInvitationToken = async (token: string) => {
    console.log("Verifying invitation token:", {
      token,
      tokenLength: token.length,
    });

    const { data, error } = await supabase
      .from("user_invitations")
      .select("*")
      .eq("invitation_token", token)
      .eq("status", "pending")
      .single();

    console.log("Supabase query result:", {
      hasData: !!data,
      error: error?.message,
      errorCode: error?.code,
      errorDetails: error?.details,
    });

    if (error) {
      console.error("Error fetching invitation:", error);

      // If no row found, try without status filter to see if invitation exists
      if (error.code === "PGRST116") {
        const { data: anyStatus, error: checkError } = await supabase
          .from("user_invitations")
          .select("invitation_token, status, expires_at")
          .eq("invitation_token", token)
          .maybeSingle();

        console.log("Checking invitation with any status:", {
          found: !!anyStatus,
          status: anyStatus?.status,
          expires_at: anyStatus?.expires_at,
        });

        if (anyStatus) {
          if (anyStatus.status !== "pending") {
            throw new Error(`Invitation has already been ${anyStatus.status}`);
          }
        } else {
          throw new Error("Invitation token not found in database");
        }
      }

      throw new Error("Invalid invitation token");
    }

    const invitation = data as Invitation;

    // Check if expired with better logging
    const expiresAt = new Date(invitation.expires_at);
    const now = new Date();

    console.log("Invitation validation:", {
      token: token.substring(0, 10) + "...",
      expires_at: invitation.expires_at,
      expiresAtDate: expiresAt.toISOString(),
      now: now.toISOString(),
      isExpired: expiresAt.getTime() <= now.getTime(),
      timeDiff: (expiresAt.getTime() - now.getTime()) / 1000 / 60 / 60, // hours
    });

    // Use getTime() for more accurate comparison and give 1 minute buffer
    if (expiresAt.getTime() - now.getTime() < -60000) {
      // Allow 1 minute buffer
      throw new Error("Invitation has expired");
    }

    return invitation;
  };

  // Accept invitation (called after user signs up)
  const acceptInvitationMutation = useMutation({
    mutationFn: async ({
      token,
      userId,
    }: {
      token: string;
      userId: string;
    }) => {
      // Get invitation details
      const { data: invitation, error: invError } = await supabase
        .from("user_invitations")
        .select("*")
        .eq("invitation_token", token)
        .eq("status", "pending")
        .maybeSingle();

      if (invError) throw new Error(invError.message);
      if (!invitation) throw new Error("Invalid or expired invitation token");

      // Check if expired with buffer
      const expiresAt = new Date(invitation.expires_at);
      const now = new Date();

      console.log("Accept invitation validation:", {
        expires_at: invitation.expires_at,
        expiresAtDate: expiresAt.toISOString(),
        now: now.toISOString(),
        timeDiff: (expiresAt.getTime() - now.getTime()) / 1000 / 60 / 60, // hours
      });

      // Allow 1 minute buffer for time sync issues
      if (expiresAt.getTime() - now.getTime() < -60000) {
        throw new Error("Invitation has expired");
      }

      // Update invitation status
      const { error: updateError } = await supabase
        .from("user_invitations")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", invitation.id);

      if (updateError) throw new Error(updateError.message);

      // Create user hierarchy relationship
      const { error: hierarchyError } = await supabase
        .from("user_hierarchy")
        .insert({
          parent_user_id: invitation.invited_by,
          child_user_id: userId,
        });

      if (hierarchyError) throw new Error(hierarchyError.message);

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
