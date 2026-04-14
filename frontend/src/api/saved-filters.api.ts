import { apiClient } from './client';
import type { FilterState } from '../hooks/useTaskFilter';

interface ApiResponse<T> { data: T; }

export interface SavedFilter {
  _id: string;
  spaceId: string;
  createdBy: string;
  name: string;
  filters: Partial<Omit<FilterState, 'groupBy'>> & { groupBy?: string };
  createdAt: string;
  updatedAt: string;
}

export async function getSavedFilters(spaceId: string): Promise<SavedFilter[]> {
  const res = await apiClient.get<ApiResponse<SavedFilter[]>>(
    `/spaces/${spaceId}/saved-filters`,
  );
  return res.data.data;
}

export async function createSavedFilter(
  spaceId: string,
  payload: { name: string; filters: Partial<FilterState> },
): Promise<SavedFilter> {
  const res = await apiClient.post<ApiResponse<SavedFilter>>(
    `/spaces/${spaceId}/saved-filters`,
    payload,
  );
  return res.data.data;
}

export async function updateSavedFilter(
  spaceId: string,
  id: string,
  payload: { name: string },
): Promise<SavedFilter> {
  const res = await apiClient.patch<ApiResponse<SavedFilter>>(
    `/spaces/${spaceId}/saved-filters/${id}`,
    payload,
  );
  return res.data.data;
}

export async function deleteSavedFilter(spaceId: string, id: string): Promise<void> {
  await apiClient.delete(`/spaces/${spaceId}/saved-filters/${id}`);
}
