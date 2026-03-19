import { apiClient } from "@/lib/apiClient";
import { organizationStorage } from "@/lib/organizationStorage";

// ============= Type Definitions =============

export interface SubscriptionPlan {
  id: number;
  organization_id: string;
  plan_name: string;
  status: "active" | "inactive" | "past_due" | "canceled";
  total_credits: number;
  used_credits: number;
  total_cost: number;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export interface BillingStats {
  total_spent: number;
  total_transactions: number;
  by_type: Record<string, number>;
  by_provider: Record<string, number>;
}

export interface Transaction {
  id: string;
  organization_id: string;
  created_at: string;

  // --- New Payload Fields ---
  query_type?: "text_query" | "upload_file" | string;
  query_text?: string;
  credits_used?: number;
  status?: "completed" | "failed" | "pending" | string;
  input_tokens?: number;
  output_tokens?: number;
  cost?: number;

  // --- Legacy / Billing Top-up Fields (Optional fallbacks) ---
  amount?: number;
  description?: string;
  transaction_type?: "usage" | "top_up" | "refund";
  balance_after?: number | null;

  metadata?: {
    agent_id?: string;
    provider?: string;
    chat_id?: string;
    message_id?: string;
    escrow_status?: "reserved" | "committed" | "refunded" | string;
    provider_cogs_usd?: number;
    [key: string]: any;
  };
}

// ============= API Functions =============

/**
 * Helper to get the request body with the active organization
 */
const getBillingPayload = () => {
  const orgId = organizationStorage.getCurrentOrgId();
  if (!orgId) {
    console.warn("No active organization ID found for billing request.");
  }
  return { organization_id: orgId };
};

/**
 * Get active subscription plan (Now a POST request)
 */
export const getSubscription = async (): Promise<SubscriptionPlan> => {
  return apiClient.post<SubscriptionPlan>(
    "/billing/subscription",
    getBillingPayload(),
  );
};

/**
 * Get usage and billing statistics (Now a POST request)
 */
export const getStats = async (): Promise<BillingStats> => {
  return apiClient.post<BillingStats>("/billing/stats", getBillingPayload());
};

/**
 * Get transaction history (Now a POST request, keeps pagination in URL query params)
 */
export const getTransactions = async (params?: {
  limit?: number;
  offset?: number;
}): Promise<Transaction[]> => {
  const queryParams = new URLSearchParams();
  if (params?.limit !== undefined)
    queryParams.append("limit", params.limit.toString());
  if (params?.offset !== undefined)
    queryParams.append("offset", params.offset.toString());

  const url = `/billing/transactions${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

  return apiClient.post<Transaction[]>(url, getBillingPayload());
};

export const exportUsageReport = async (): Promise<Blob> => {
  return apiClient.postBlob("/billing/usage/export", getBillingPayload());
};

export const downloadInvoicePdf = async (
  transactionId: string,
): Promise<Blob> => {
  return apiClient.postBlob("/billing/invoice/pdf", {
    ...getBillingPayload(),
    transaction_id: transactionId,
  });
};

export const downloadBillingStatementPdf = async (params?: {
  year?: number;
  month?: number;
}): Promise<Blob> => {
  return apiClient.postBlob("/billing/invoices/export-all", {
    ...getBillingPayload(),
    ...params,
  });
};
