import { apiClient } from './client';

interface ApiResponse<T> { data: T; }

export interface SearchResultItem {
  _id: string;
  type: 'task' | 'note' | 'wiki';
  title: string;
  subtitle: string;
  url: string;
}

export interface SearchResult {
  tasks: SearchResultItem[];
  notes: SearchResultItem[];
  wiki: SearchResultItem[];
}

export async function globalSearch(spaceId: string, q: string): Promise<SearchResult> {
  const res = await apiClient.get<ApiResponse<SearchResult>>(
    `/spaces/${spaceId}/search?q=${encodeURIComponent(q)}`,
  );
  return res.data.data;
}
