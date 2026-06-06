import { apiClient } from './client';
import type { User, UserPreferences } from '../types/user.types';

interface ApiResponse<T> { data: T; }

export async function searchUsers(q: string): Promise<User[]> {
  const res = await apiClient.get<ApiResponse<User[]>>('/users/search', { params: { q } });
  return res.data.data;
}

export async function updateMe(payload: { displayName?: string }): Promise<User> {
  const res = await apiClient.patch<ApiResponse<User>>('/users/me', payload);
  return res.data.data;
}

export async function updatePreferences(
  payload: Partial<UserPreferences>,
): Promise<User> {
  const res = await apiClient.patch<ApiResponse<User>>('/users/me/preferences', payload);
  return res.data.data;
}

export async function uploadAvatar(file: File): Promise<User> {
  const formData = new FormData();
  formData.append('avatar', file);
  const res = await apiClient.post<ApiResponse<User>>(
    '/users/me/avatar',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data.data;
}
