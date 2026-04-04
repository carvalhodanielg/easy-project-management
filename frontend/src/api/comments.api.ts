import { apiClient } from './client';
import type { User } from '../types/user.types';
import type { Tag } from '../types/task.types';

interface ApiResponse<T> { data: T; }

export interface CommentAttachment {
  _id: string;
  originalName: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

export interface Comment {
  _id: string;
  taskId: string;
  author: User;
  content: string;
  attachments: CommentAttachment[];
  edited: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getComments(spaceId: string, taskId: string): Promise<Comment[]> {
  const res = await apiClient.get<ApiResponse<Comment[]>>(
    `/spaces/${spaceId}/tasks/${taskId}/comments`,
  );
  return res.data.data;
}

export async function createComment(
  spaceId: string,
  taskId: string,
  content: string,
  attachments?: string[],
): Promise<Comment> {
  const res = await apiClient.post<ApiResponse<Comment>>(
    `/spaces/${spaceId}/tasks/${taskId}/comments`,
    { content, attachments },
  );
  return res.data.data;
}

export async function updateComment(
  spaceId: string,
  taskId: string,
  commentId: string,
  content: string,
): Promise<Comment> {
  const res = await apiClient.patch<ApiResponse<Comment>>(
    `/spaces/${spaceId}/tasks/${taskId}/comments/${commentId}`,
    { content },
  );
  return res.data.data;
}

export async function deleteComment(
  spaceId: string,
  taskId: string,
  commentId: string,
): Promise<void> {
  await apiClient.delete(`/spaces/${spaceId}/tasks/${taskId}/comments/${commentId}`);
}

export async function uploadAttachment(file: File): Promise<{ _id: string; url: string; originalName: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post<ApiResponse<{ _id: string; url: string; originalName: string }>>(
    '/attachments/upload',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data.data;
}

// Re-export Tag so consumers can use it from here
export type { Tag };
