import { apiClient } from './client';
import type { User } from '../types/user.types';

export interface AuthTokens {
  token: string;
  refreshToken: string;
}

interface AuthResponse {
  data: AuthTokens;
}

interface RefreshResponse {
  data: { token: string };
}

interface MeResponse {
  data: User;
}

export async function register(payload: {
  email: string;
  password: string;
  displayName: string;
}): Promise<AuthTokens> {
  const res = await apiClient.post<AuthResponse>('/auth/register', payload);
  return res.data.data;
}

export async function login(payload: {
  email: string;
  password: string;
}): Promise<AuthTokens> {
  const res = await apiClient.post<AuthResponse>('/auth/login', payload);
  return res.data.data;
}

export async function refresh(refreshToken: string): Promise<string> {
  const res = await apiClient.post<RefreshResponse>('/auth/refresh', {
    refreshToken,
  });
  return res.data.data.token;
}

export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post('/auth/logout', { refreshToken });
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

export async function verifyEmail(token: string): Promise<void> {
  await apiClient.post('/auth/verify-email', { token });
}

export async function resendVerification(email: string): Promise<void> {
  await apiClient.post('/auth/resend-verification', { email });
}

export async function getMe(token?: string): Promise<User> {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const res = await apiClient.get<MeResponse>('/auth/me', { headers });
  return res.data.data;
}
