import { apiClient } from './client';
import type { Notification } from '../types/notification.types';

interface ApiResponse<T> {
  data: T;
}

export async function getNotifications(): Promise<Notification[]> {
  const res = await apiClient.get<ApiResponse<Notification[]>>('/notifications');
  return res.data.data;
}

export async function getUnreadCount(): Promise<number> {
  const res = await apiClient.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
  return res.data.data.count;
}

export async function markAsRead(id: string): Promise<Notification> {
  const res = await apiClient.patch<ApiResponse<Notification>>(`/notifications/${id}/read`);
  return res.data.data;
}

export async function markAllAsRead(): Promise<void> {
  await apiClient.patch('/notifications/read-all');
}
