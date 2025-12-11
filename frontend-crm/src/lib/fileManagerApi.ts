import { apiClient } from "./apiClient";
import { supabase } from "@/integrations/supabase/client";
import { env } from "@/config/env";

/**
 * File Manager API Client
 * Handles all file and folder operations via REST API
 */

export type ShareType = "user" | "group" | "public";
export type PermissionType = "view" | "edit" | "delete" | "share" | "manage";
// Types based on API documentation
export interface FileItem {
  id: string;
  name: string;
  type: "file" | "folder";
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
  type: "folder";
  children_count?: number;
}

export interface BrowseResponse {
  items: FileItem[];
  current_folder: FolderItem | null;
  breadcrumbs: FolderItem[];
  total_count: number;
}

export interface FolderResponse {
  id: string;
  name: string;
  organization_id: string;
  user_id: string;
  parent_folder_id: string | null;
  parent_path: string | null;
  is_folder: boolean;
  is_trashed: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  metadata: Record<string, any> | null;
  url: string | null;
  children_count: number; // Jumlah file di dalam folder
  folder_children_count: number; // Jumlah folder di dalam folder
  has_subfolders: boolean; // Apakah ada subfolder
}

export interface CreateFolderRequest {
  name: string;
  parent_folder_id?: string;
  metadata?: Record<string, any>;
}

export interface UpdateFolderRequest {
  name: string;
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
  file_id: string;
  share_type: ShareType; // default "user"
  shared_with_email?: string | null; // required if share_type === "user"
  group_id?: string | null; // required if share_type === "group"
  access_level?: PermissionType; // default "view"
  expires_at?: string | null; // ISO 8601 or null
  metadata?: Record<string, any>; // optional
}

export interface ShareResponse {
  id: string;
  file_id: string;
  shared_by: string;
  shared_with_user_id?: string;
  shared_with_email?: string;
  share_type: string;
  share_token?: string;
  access_level: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
  file?: FileItem | null;
}

export interface PublicShareResponse {
  id: string;
  file_id: string;
  access_level: PermissionType;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  share_token: string;
  share_url: string;
}

/**
 * Browse files and folders
 */
export async function browseFolder(
  folderId?: string | null,
  filters?: {
    type?: "file" | "folder";
    is_starred?: boolean;
    is_trashed?: boolean;
    search?: string;
    sort_by?: "name" | "size" | "created_at";
    sort_order?: "asc" | "desc";
  }
): Promise<BrowseResponse> {
  const params = new URLSearchParams();

  if (folderId) {
    params.append("folder_id", folderId);
  }

  if (filters?.type) {
    params.append("type", filters.type);
  }

  if (filters?.is_starred !== undefined) {
    params.append("is_starred", String(filters.is_starred));
  }

  if (filters?.is_trashed !== undefined) {
    params.append("is_trashed", String(filters.is_trashed));
  }

  if (filters?.search) {
    params.append("search", filters.search);
  }

  if (filters?.sort_by) {
    params.append("sort_by", filters.sort_by);
  }

  if (filters?.sort_order) {
    params.append("sort_order", filters.sort_order);
  }

  const queryString = params.toString();
  const endpoint = `/filemanager/browse${queryString ? `?${queryString}` : ""}`;

  return apiClient.get<BrowseResponse>(endpoint);
}

/**
 * Detail folders
 */
export async function detailFolder(folderId: string): Promise<FolderResponse> {
  if (!folderId) {
    throw new Error("folderId is required");
  }
  try {
    console.log(folderId);
    const response = await apiClient.get<FolderResponse>(
      `/filemanager/folders/${folderId}`
    );
    console.log(`Folder ${folderId} details:`, response);
    return response;
  } catch (error: any) {
    console.error(`Failed to fetch folder ${folderId}:`, error);
    throw error;
  }
}

/**
 * Create a new folder
 */
export async function createFolder(
  data: CreateFolderRequest
): Promise<FolderItem> {
  return apiClient.post<FolderItem>("/filemanager/folders", data);
}

/**
 * Update a folder
 */
export async function updateFolder(
  folderId: string,
  data: UpdateFolderRequest
): Promise<FolderItem> {
  return apiClient.put<FolderItem>(`/filemanager/folders/${folderId}`, data);
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

  // Validasi file type - blokir ekstensi berbahaya
  const fileName = file.name.toLowerCase();
  const blockedExtensions = [".exe", ".app", ".application", ".zip"];

  const hasBlockedExtension = blockedExtensions.some((ext) =>
    fileName.endsWith(ext)
  );

  if (hasBlockedExtension) {
    throw new Error(
      `File type tidak diizinkan. Ekstensi ${fileName
        .split(".")
        .pop()} diblokir karena alasan keamanan.`
    );
  }

  // Validasi MIME type (double check)
  const blockedMimeTypes = [
    "application/x-msdownload", // .exe
    "application/vnd.android.package-archive", // .apk
    "application/zip", // .apk kadang terdeteksi sebagai zip
  ];

  if (blockedMimeTypes.includes(file.type)) {
    throw new Error(`MIME type ${file.type} tidak diizinkan untuk upload.`);
  }

  const formData = new FormData();
  formData.append("file", file);

  if (parentFolderId) {
    console.log("Adding parent_folder_id to FormData:", parentFolderId);
    formData.append("parent_folder_id", parentFolderId);
  } else {
    console.log("No parent_folder_id - file will go to root");
  }

  if (metadata) {
    formData.append("metadata", JSON.stringify(metadata));
  }

  console.log("Sending API request to /filemanager/files with FormData");
  return apiClient.post<FileItem>("/filemanager/files", formData);
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
  return apiClient.post<FileItem>(`/filemanager/files/${fileId}/move`, {
    new_parent_folder_id: targetFolderId,
  });
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
  const endpoint = `/filemanager/files/${fileId}${
    permanent ? "?permanent=true" : "?permanent=false"
  }`;
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
  const endpoint = `/filemanager/folders/${folderId}${
    permanent ? "?permanent=true" : "?permanent=false"
  }`;
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
    headers["Authorization"] = `Bearer ${token}`;
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
  data: ShareFileRequest
): Promise<ShareResponse> {
  return apiClient.post<ShareResponse>(`/filemanager/shares`, data);
}

/**
 * Update Share file
 */
export async function updateShare(
  share_id: string,
  access_level?: PermissionType, // default "view"
  expires_at?: string | null,
  metadata?: Record<string, any>
): Promise<ShareResponse> {
  return apiClient.put<ShareResponse>(`/filemanager/shares/${share_id}`, {
    access_level: access_level,
    expires_at: expires_at,
    metadata: metadata,
  });
}

/**
 * Delete Share file
 */
export async function deleteShare(share_id: string): Promise<[string, string]> {
  return apiClient.delete<[string, string]>(`/filemanager/shares/${share_id}`);
}

/**
 * List share file
 */
export async function listShareFile(
  file_id?: string
): Promise<[ShareResponse]> {
  return apiClient.get<[ShareResponse]>(
    `/filemanager/shares${file_id ? `?file_id=${file_id}` : ""}`
  );
}

/**
 * Create Url Public share file
 */
export async function publicShareFile(
  file_id: string,
  permission?: PermissionType,
  expires_in_hours?: number
): Promise<PublicShareResponse> {
  return apiClient.post<PublicShareResponse>(
    `/filemanager/shares/public?file_id=${file_id}&permission=${permission}&expires_in_hours=${expires_in_hours}`
  );
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
  return apiClient.post<FileItem>(
    `/filemanager/folders/${folderId}/restore`,
    {}
  );
}

/**
 * Toggle star status
 */
export async function toggleStar(
  fileId: string,
  isStarred: boolean
): Promise<FileItem> {
  return apiClient.put<FileItem>(
    `/filemanager/files/${fileId}/favorite?is_starred=${isStarred}` // Kirim sebagai query
  );
}

// Helper functions
async function getAuthToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
}

function getBaseUrl(): string {
  return env.agentApiUrl.replace(/\/$/, "");
}
