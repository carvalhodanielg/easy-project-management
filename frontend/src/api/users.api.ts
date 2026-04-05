import { apiClient } from './client';
import type { User } from '../types/user.types';

interface ApiResponse<T> { data: T; }

export async function searchUsers(q: string): Promise<User[]> {
  const res = await apiClient.get<ApiResponse<User[]>>('/users/search', { params: { q } });
  return res.data.data;
}
