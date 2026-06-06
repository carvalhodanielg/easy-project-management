import { apiClient } from './client';
import type { User } from '../types/user.types';
import type { Tag } from '../types/task.types';
import type { Attachment } from './attachments.api';

interface ApiResponse<T> { data: T; }

export type CommentAttachment = Attachment;

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
  mentionIds?: string[],
): Promise<Comment> {
  const res = await apiClient.post<ApiResponse<Comment>>(
    `/spaces/${spaceId}/tasks/${taskId}/comments`,
    { content, attachments, mentionIds },
  );
  return res.data.data;
}

export async function updateComment(
  spaceId: string,
  taskId: string,
  commentId: string,
  content: string,
  mentionIds?: string[],
): Promise<Comment> {
  const res = await apiClient.patch<ApiResponse<Comment>>(
    `/spaces/${spaceId}/tasks/${taskId}/comments/${commentId}`,
    { content, mentionIds },
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

// Re-export the shared uploader so existing import sites keep working
export { uploadAttachment } from './attachments.api';

// Re-export Tag so consumers can use it from here
export type { Tag };
