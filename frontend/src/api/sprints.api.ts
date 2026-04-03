import { apiClient } from './client';

interface ApiResponse<T> { data: T; }

export interface Sprint {
  _id: string;
  spaceId: string;
  number: number;
  name: string;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed';
}

export async function getSprints(spaceId: string): Promise<Sprint[]> {
  const res = await apiClient.get<ApiResponse<Sprint[]>>(`/spaces/${spaceId}/sprints`);
  return res.data.data;
}

export async function createSprint(spaceId: string, payload: { name: string; startDate: string; endDate: string }): Promise<Sprint> {
  const res = await apiClient.post<ApiResponse<Sprint>>(`/spaces/${spaceId}/sprints`, payload);
  return res.data.data;
}

export async function updateSprint(spaceId: string, sprintId: string, payload: Partial<{ name: string; startDate: string; endDate: string; status: string }>): Promise<Sprint> {
  const res = await apiClient.patch<ApiResponse<Sprint>>(`/spaces/${spaceId}/sprints/${sprintId}`, payload);
  return res.data.data;
}

export async function deleteSprint(spaceId: string, sprintId: string): Promise<void> {
  await apiClient.delete(`/spaces/${spaceId}/sprints/${sprintId}`);
}
