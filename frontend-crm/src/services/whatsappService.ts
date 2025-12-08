import { apiClient } from '@/lib/apiClient';
import { env } from '@/config/env';

/**
 * WhatsApp Integration Service
 * Handles WhatsApp Web session management via backend API
 */

export interface WhatsAppSessionResponse {
  status: 'active' | 'inactive' | 'connecting';
  agent_id: string;
  message?: string;
}

export interface WhatsAppStatusResponse {
  status: 'authenticated' | 'inactive' | 'connecting';
  agent_id: string;
  phone_number?: string;
  connected_at?: string;
}

export interface WhatsAppQRResponse {
  success: boolean;
  session_id: string;
  format: string;
  qr_code: string;
  data?: any;
}

/**
 * Check if WhatsApp session exists for an agent
 */
export const checkSessionStatus = async (agentId: string): Promise<WhatsAppStatusResponse> => {
  return apiClient.get<WhatsAppStatusResponse>(`/whatsapp/status/${agentId}`);
};

/**
 * Activate WhatsApp session for an agent
 */
export const activateSession = async (agentId: string): Promise<WhatsAppSessionResponse> => {
  return apiClient.post<WhatsAppSessionResponse>('/whatsapp/activate', {
    agent_id: agentId,
  });
};

/**
 * Get QR code string for scanning
 */
export const getQRCode = async (agentId: string): Promise<string> => {
  const response = await apiClient.get<WhatsAppQRResponse>(`/whatsapp/qr/${agentId}`);
  return response.qr_code;
};

/**
 * Terminate WhatsApp session for an agent
 */
export const terminateSession = async (agentId: string): Promise<void> => {
  return apiClient.delete<void>(`/whatsapp/terminate/${agentId}`);
};
