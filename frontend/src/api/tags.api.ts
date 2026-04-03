import { apiClient } from './client';
import { Tag } from '../types/task.types';

interface ApiResponse<T> { data: T; }

export async function getTags(spaceId: string): Promise<Tag[]> {
  const res = await apiClient.get<ApiResponse<Tag[]>>(`/spaces/${spaceId}/tags`);
  return res.data.data;
}

export async function createTag(spaceId: string, payload: { name: string; color?: string }): Promise<Tag> {
  const res = await apiClient.post<ApiResponse<Tag>>(`/spaces/${spaceId}/tags`, payload);
  return res.data.data;
}

export async function updateTag(spaceId: string, tagId: string, payload: { name?: string; color?: string }): Promise<Tag> {
  const res = await apiClient.patch<ApiResponse<Tag>>(`/spaces/${spaceId}/tags/${tagId}`, payload);
  return res.data.data;
}

export async function deleteTag(spaceId: string, tagId: string): Promise<void> {
  await apiClient.delete(`/spaces/${spaceId}/tags/${tagId}`);
}
