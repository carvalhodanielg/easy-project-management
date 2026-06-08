import { apiClient } from './client';

interface ApiResponse<T> { data: T; }

export interface List {
  _id: string;
  spaceId: string;
  name: string;
  position: number;
  archivedAt?: string | null;
}

export async function getLists(spaceId: string): Promise<List[]> {
  const res = await apiClient.get<ApiResponse<List[]>>(`/spaces/${spaceId}/lists`);
  return res.data.data;
}

export async function createList(spaceId: string, name: string): Promise<List> {
  const res = await apiClient.post<ApiResponse<List>>(`/spaces/${spaceId}/lists`, { name });
  return res.data.data;
}

export async function updateList(spaceId: string, listId: string, payload: { name?: string; position?: number }): Promise<List> {
  const res = await apiClient.patch<ApiResponse<List>>(`/spaces/${spaceId}/lists/${listId}`, payload);
  return res.data.data;
}

// Soft delete: moves the list (and its tasks) to the trash.
export async function deleteList(spaceId: string, listId: string): Promise<void> {
  await apiClient.delete(`/spaces/${spaceId}/lists/${listId}`);
}

export async function getArchivedLists(spaceId: string): Promise<List[]> {
  const res = await apiClient.get<ApiResponse<List[]>>(`/spaces/${spaceId}/lists/trash`);
  return res.data.data;
}

export async function restoreList(spaceId: string, listId: string): Promise<List> {
  const res = await apiClient.post<ApiResponse<List>>(`/spaces/${spaceId}/lists/${listId}/restore`);
  return res.data.data;
}

export async function permanentDeleteList(spaceId: string, listId: string): Promise<void> {
  await apiClient.delete(`/spaces/${spaceId}/lists/${listId}/permanent`);
}
