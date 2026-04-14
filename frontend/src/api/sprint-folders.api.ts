import { apiClient } from './client';

interface ApiResponse<T> { data: T; }

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface SprintFolder {
  _id: string;
  spaceId: string;
  name: string;
  /** 0 = Sunday, 1 = Monday … 6 = Saturday */
  startDayOfWeek: DayOfWeek;
  durationWeeks: number;
  autoComplete: boolean;
  openFutureSprints: number;
  folderEndDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSprintFolderPayload {
  name: string;
  startDayOfWeek: DayOfWeek;
  durationWeeks: number;
  autoComplete: boolean;
  openFutureSprints: number;
  folderEndDate?: string | null;
}

export async function getSprintFolders(spaceId: string): Promise<SprintFolder[]> {
  const res = await apiClient.get<ApiResponse<SprintFolder[]>>(
    `/spaces/${spaceId}/sprint-folders`,
  );
  return res.data.data;
}

export async function createSprintFolder(
  spaceId: string,
  payload: CreateSprintFolderPayload,
): Promise<SprintFolder> {
  const res = await apiClient.post<ApiResponse<SprintFolder>>(
    `/spaces/${spaceId}/sprint-folders`,
    payload,
  );
  return res.data.data;
}

export async function updateSprintFolder(
  spaceId: string,
  folderId: string,
  payload: Partial<CreateSprintFolderPayload>,
): Promise<SprintFolder> {
  const res = await apiClient.patch<ApiResponse<SprintFolder>>(
    `/spaces/${spaceId}/sprint-folders/${folderId}`,
    payload,
  );
  return res.data.data;
}

export async function deleteSprintFolder(spaceId: string, folderId: string): Promise<void> {
  await apiClient.delete(`/spaces/${spaceId}/sprint-folders/${folderId}`);
}
