import { apiClient } from './apiClient';
import { supabase } from '@/integrations/supabase/client';
import { env } from '@/config/env';

/**
 * File Manager API Client
 * Handles all file and folder operations via REST API
 */

// Types based on API documentation
export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parent_folder_id: string | null;
  size?: number;
  mime_type?: string;
  storage_path?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  organization_id: string;
  is_starred?: boolean;
  is_trashed?: boolean;
  metadata?: Record<string, any>;
  shared_with_user_ids?: string[];
  shared_with_group_ids?: string[];
}

export interface FolderItem extends FileItem {
  type: 'folder';
  children_count?: number;
}

export interface BrowseResponse {
  items: FileItem[];
  current_folder: FolderItem | null;
  breadcrumbs: FolderItem[];
  total_count: number;
}

export interface CreateFolderRequest {
  name: string;
  parent_folder_id?: string;
  metadata?: Record<string, any>;
}

export interface UpdateFileRequest {
  name?: string;
  parent_folder_id?: string;
  is_starred?: boolean;
  metadata?: Record<string, any>;
  shared_with_user_ids?: string[];
  shared_with_group_ids?: string[];
}

export interface MoveFileRequest {
  target_folder_id: string | null;
}

export interface ShareFileRequest {
  user_ids?: string[];
  group_ids?: string[];
}

/**
 * Browse files and folders
 */
export async function browseFolder(
  folderId?: string | null,
  filters?: {
    type?: 'file' | 'folder';
    is_starred?: boolean;
    is_trashed?: boolean;
    search?: string;
  }
): Promise<BrowseResponse> {
  const params = new URLSearchParams();

  if (folderId) {
    params.append('folder_id', folderId);
  }

  if (filters?.type) {
    params.append('type', filters.type);
  }

  if (filters?.is_starred !== undefined) {
    params.append('is_starred', String(filters.is_starred));
  }

  if (filters?.is_trashed !== undefined) {
    params.append('is_trashed', String(filters.is_trashed));
  }

  if (filters?.search) {
    params.append('search', filters.search);
  }

  const queryString = params.toString();
  const endpoint = `/filemanager/browse${queryString ? `?${queryString}` : ''}`;

  return apiClient.get<BrowseResponse>(endpoint);
}

/**
 * Create a new folder
 */
export async function createFolder(
  data: CreateFolderRequest
): Promise<FolderItem> {
  return apiClient.post<FolderItem>('/filemanager/folders', data);
}

/**
 * Upload a file
 */
export async function uploadFile(
  file: File,
  parentFolderId?: string | null,
  metadata?: Record<string, any>
): Promise<FileItem> {
  console.log("fileManagerApi.uploadFile called with:", {
    fileName: file.name,
    parentFolderId,
    hasParentFolder: !!parentFolderId,
  });

  const formData = new FormData();
  formData.append('file', file);

  if (parentFolderId) {
    console.log("Adding parent_folder_id to FormData:", parentFolderId);
    formData.append('parent_folder_id', parentFolderId);
  } else {
    console.log("No parent_folder_id - file will go to root");
  }

  if (metadata) {
    formData.append('metadata', JSON.stringify(metadata));
  }

  console.log("Sending API request to /filemanager/files with FormData");
  return apiClient.post<FileItem>('/filemanager/files', formData);
}

/**
 * Get file details
 */
export async function getFileDetails(fileId: string): Promise<FileItem> {
  return apiClient.get<FileItem>(`/filemanager/files/${fileId}`);
}

/**
 * Update file metadata
 */
export async function updateFile(
  fileId: string,
  data: UpdateFileRequest
): Promise<FileItem> {
  return apiClient.put<FileItem>(`/filemanager/files/${fileId}`, data);
}

/**
 * Move file to another folder
 */
export async function moveFile(
  fileId: string,
  targetFolderId: string | null
): Promise<FileItem> {
  return apiClient.post<FileItem>(
    `/filemanager/files/${fileId}/move`,
    { target_folder_id: targetFolderId }
  );
}

/**
 * Delete a file (not folder - use deleteFolder for folders)
 * @param fileId - ID of the file to delete
 * @param permanent - If true, permanently delete. If false, move to trash.
 */
export async function deleteFile(
  fileId: string,
  permanent: boolean = false
): Promise<void> {
  const endpoint = `/filemanager/files/${fileId}${permanent ? '?permanent=true' : '?permanent=false'}`;
  return apiClient.delete(endpoint);
}

/**
 * Delete a folder
 * @param folderId - ID of the folder to delete
 * @param permanent - If true, permanently delete. If false, move to trash.
 */
export async function deleteFolder(
  folderId: string,
  permanent: boolean = false
): Promise<void> {
  const endpoint = `/filemanager/folders/${folderId}${permanent ? '?permanent=true' : '?permanent=false'}`;
  return apiClient.delete(endpoint);
}

/**
 * Download a file
 * Returns the file URL or blob
 */
export async function downloadFile(fileId: string): Promise<Blob> {
  const token = await getAuthToken();
  const headers: HeadersInit = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(
    `${getBaseUrl()}/filemanager/files/${fileId}/download`,
    { headers }
  );

  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }

  return response.blob();
}

/**
 * Share file with users or groups
 */
export async function shareFile(
  fileId: string,
  data: ShareFileRequest
): Promise<FileItem> {
  return apiClient.post<FileItem>(`/filemanager/files/${fileId}/share`, data);
}

/**
 * Restore a file from trash
 * @param fileId - ID of the file to restore
 */
export async function restoreFile(fileId: string): Promise<FileItem> {
  console.log("Restoring file:", fileId);
  return apiClient.post<FileItem>(`/filemanager/files/${fileId}/restore`, {});
}

/**
 * Restore a folder from trash
 * @param folderId - ID of the folder to restore
 */
export async function restoreFolder(folderId: string): Promise<FileItem> {
  console.log("Restoring folder:", folderId);
  return apiClient.post<FileItem>(`/filemanager/folders/${folderId}/restore`, {});
}

/**
 * Toggle star status
 */
export async function toggleStar(
  fileId: string,
  isStarred: boolean
): Promise<FileItem> {
  return updateFile(fileId, { is_starred: isStarred });
}

// Helper functions
async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

function getBaseUrl(): string {
  return env.agentApiUrl.replace(/\/$/, '');
}
