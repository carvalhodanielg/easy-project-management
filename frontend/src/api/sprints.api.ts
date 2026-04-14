import { apiClient } from './client';

interface ApiResponse<T> { data: T; }

export interface Sprint {
  _id: string;
  spaceId: string;
  folderId: string | null;
  number: number;
  folderNumber: number | null;
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

export interface SprintStats {
  totalTasks: number;
  doneTasks: number;
  totalPoints: number;
  donePoints: number;
  tasksByStatus: Record<string, { count: number; points: number }>;
  tasksByAssignee: Array<{
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    count: number;
    points: number;
  }>;
  burndown: Array<{ date: string; ideal: number; remaining: number }>;
  previousSprintPoints: number | null;
}

export async function getSprintStats(spaceId: string, sprintId: string): Promise<SprintStats> {
  const res = await apiClient.get<ApiResponse<SprintStats>>(
    `/spaces/${spaceId}/sprints/${sprintId}/stats`,
  );
  return res.data.data;
}
