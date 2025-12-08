import { apiClient } from './apiClient';

/**
 * Documents API Client
 * Handles ChromaDB integration for semantic search and embeddings
 */

// Types based on API documentation
export interface DocumentUploadResponse {
  message: string;
  filename: string;
  chunks_created: number;
  collection_id: string;
}

export interface DocumentDeleteResponse {
  message: string;
  deleted_count: number;
}

export interface QueryResult {
  document: string;
  metadata: {
    filename: string;
    chunk_index: number;
    total_chunks: number;
    file_id?: string;
  };
  distance: number;
  relevance_score: number;
}

export interface QueryResponse {
  query: string;
  results: QueryResult[];
  total_results: number;
}

/**
 * Upload document for embedding generation
 * Automatically generates embeddings and stores in ChromaDB
 */
export async function uploadDocument(
  file: File,
  fileId?: string
): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  if (fileId) {
    formData.append('file_id', fileId);
  }

  return apiClient.post<DocumentUploadResponse>('/filemanager/documents/upload', formData);
}

/**
 * Delete document and its embeddings from ChromaDB
 */
export async function deleteDocument(
  filename: string
): Promise<DocumentDeleteResponse> {
  return apiClient.delete<DocumentDeleteResponse>('/filemanager/documents/delete', {
    filename
  });
}

/**
 * Query documents using semantic search
 * Returns most relevant document chunks based on query
 */
export async function queryDocuments(
  query: string,
  topK: number = 5
): Promise<QueryResponse> {
  return apiClient.post<QueryResponse>('/filemanager/documents/query', {
    query,
    top_k: topK
  });
}

/**
 * Helper function to upload file with embeddings
 * Combines file upload and document processing
 */
export async function uploadFileWithEmbedding(
  file: File,
  parentFolderId?: string | null
): Promise<{
  fileItem: any;
  documentResponse: DocumentUploadResponse;
}> {
  // First upload the file to get file metadata
  const fileManagerApi = await import('./fileManagerApi');
  const fileItem = await fileManagerApi.uploadFile(file, parentFolderId, {
    has_embeddings: true
  });

  // Then upload to ChromaDB for embedding generation
  const documentResponse = await uploadDocument(file, fileItem.id);

  return {
    fileItem,
    documentResponse
  };
}

/**
 * Helper function to delete file and its embeddings
 */
export async function deleteFileWithEmbeddings(
  fileId: string,
  filename: string,
  permanent: boolean = false
): Promise<void> {
  const fileManagerApi = await import('./fileManagerApi');

  // Delete from file manager
  await fileManagerApi.deleteFile(fileId, permanent);

  // Delete embeddings if permanent delete
  if (permanent) {
    try {
      await deleteDocument(filename);
    } catch (error) {
      console.warn('Failed to delete embeddings:', error);
      // Don't throw - file is already deleted from main storage
    }
  }
}
