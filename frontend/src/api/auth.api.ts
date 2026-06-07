import { apiClient } from './client';
import type { User } from '../types/user.types';

interface AuthResponse {
  data: { token: string };
}

interface MeResponse {
  data: User;
}

export async function register(payload: {
  email: string;
  password: string;
  displayName: string;
}): Promise<string> {
  const res = await apiClient.post<AuthResponse>('/auth/register', payload);
  return res.data.data.token;
}

export async function login(payload: {
  email: string;
  password: string;
}): Promise<string> {
  const res = await apiClient.post<AuthResponse>('/auth/login', payload);
  return res.data.data.token;
}

export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post('/auth/forgot-password', { email });
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<void> {
  await apiClient.post('/auth/reset-password', { token, password });
}

export async function getMe(token?: string): Promise<User> {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const res = await apiClient.get<MeResponse>('/auth/me', { headers });
  return res.data.data;
}
