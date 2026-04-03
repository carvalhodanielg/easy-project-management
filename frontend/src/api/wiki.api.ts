import { apiClient } from './client';

interface ApiResponse<T> { data: T; }

export interface WikiFolder {
  _id: string;
  spaceId: string;
  name: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface WikiDocument {
  _id: string;
  folderId: string;
  spaceId: string;
  title: string;
  content: string;
  createdBy: string;
  lastEditedBy: string;
  createdAt: string;
  updatedAt: string;
}

export async function getFolders(spaceId: string): Promise<WikiFolder[]> {
  const res = await apiClient.get<ApiResponse<WikiFolder[]>>(`/spaces/${spaceId}/wiki/folders`);
  return res.data.data;
}

export async function createFolder(spaceId: string, name: string): Promise<WikiFolder> {
  const res = await apiClient.post<ApiResponse<WikiFolder>>(`/spaces/${spaceId}/wiki/folders`, { name });
  return res.data.data;
}

export async function updateFolder(spaceId: string, folderId: string, name: string): Promise<WikiFolder> {
  const res = await apiClient.patch<ApiResponse<WikiFolder>>(`/spaces/${spaceId}/wiki/folders/${folderId}`, { name });
  return res.data.data;
}

export async function deleteFolder(spaceId: string, folderId: string): Promise<void> {
  await apiClient.delete(`/spaces/${spaceId}/wiki/folders/${folderId}`);
}

export async function getDocuments(spaceId: string, folderId: string): Promise<WikiDocument[]> {
  const res = await apiClient.get<ApiResponse<WikiDocument[]>>(`/spaces/${spaceId}/wiki/folders/${folderId}/documents`);
  return res.data.data;
}

export async function createDocument(spaceId: string, folderId: string, title: string): Promise<WikiDocument> {
  const res = await apiClient.post<ApiResponse<WikiDocument>>(`/spaces/${spaceId}/wiki/folders/${folderId}/documents`, { title });
  return res.data.data;
}

export async function getDocument(spaceId: string, documentId: string): Promise<WikiDocument> {
  const res = await apiClient.get<ApiResponse<WikiDocument>>(`/spaces/${spaceId}/wiki/documents/${documentId}`);
  return res.data.data;
}

export async function updateDocument(spaceId: string, documentId: string, payload: { title?: string; content?: string }): Promise<WikiDocument> {
  const res = await apiClient.patch<ApiResponse<WikiDocument>>(`/spaces/${spaceId}/wiki/documents/${documentId}`, payload);
  return res.data.data;
}

export async function deleteDocument(spaceId: string, documentId: string): Promise<void> {
  await apiClient.delete(`/spaces/${spaceId}/wiki/documents/${documentId}`);
}
