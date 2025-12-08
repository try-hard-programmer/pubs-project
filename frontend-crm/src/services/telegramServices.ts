import { apiClient } from "@/lib/apiClient";

/**
 * Telegram Integration Service
 * Handles Telegram MTProto authentication flow
 */

// Response for Step 1: Send OTP
export interface TelegramSendOtpResponse {
  status: string; // e.g., "code_sent"
  phone_code_hash?: string;
  detail?: string; // For error messages
}

// Response for Step 2: Verify OTP
export interface TelegramVerifyOtpResponse {
  status: string; // e.g., "success"
  session_string?: string;
  user_id?: number;
  detail?: string; // For error messages
}

// Response for Start Session
export interface TelegramStartSessionResponse {
  status: string;
  detail?: string;
}

/**
 * Step 1: Send Authentication Code to Phone Number
 * Endpoint: /telegram/auth/send-otp
 */
export const sendAuthCode = async (
  agentId: string,
  phoneNumber: string
): Promise<TelegramSendOtpResponse> => {
  return apiClient.post<TelegramSendOtpResponse>("/telegram/auth/send-otp", {
    agent_id: agentId,
    phone_number: phoneNumber,
  });
};

/**
 * Step 2: Verify the OTP Code received
 * Endpoint: /telegram/auth/verified-otp
 */
export const verifyAuthCode = async (
  agentId: string,
  phoneNumber: string,
  phoneCode: string,
  phoneCodeHash: string
): Promise<TelegramVerifyOtpResponse> => {
  return apiClient.post<TelegramVerifyOtpResponse>(
    "/telegram/auth/verified-otp",
    {
      agent_id: agentId,
      phone_number: phoneNumber,
      otp_code: phoneCode,
      phone_code_hash: phoneCodeHash,
    }
  );
};

/**
 * Step 3: Start the Listener Session (CRITICAL for receiving messages)
 * Endpoint: /telegram/session/start
 */
export const startSession = async (
  agentId: string
): Promise<TelegramStartSessionResponse> => {
  return apiClient.post<TelegramStartSessionResponse>(
    "/telegram/session/start",
    {
      agent_id: agentId,
    }
  );
};

/**
 * Step 4 (Optional): Verify 2FA Cloud Password
 */
export const verify2FAPassword = async (
  agentId: string,
  password: string
): Promise<TelegramVerifyOtpResponse> => {
  return apiClient.post<TelegramVerifyOtpResponse>("/telegram/auth/2fa", {
    agent_id: agentId,
    password: password,
  });
};

/**
 * Terminate Telegram session (Log out)
 */
export const terminateTelegramSession = async (
  agentId: string
): Promise<void> => {
  return apiClient.delete<void>(`/telegram/terminate/${agentId}`);
};
