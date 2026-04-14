import { apiClient } from './client';
import type { User } from '../types/user.types';

interface ApiResponse<T> { data: T; }

export interface TaskEvent {
  _id: string;
  taskId: string;
  spaceId: string;
  userId: User;
  type: TaskEventType;
  changes: { field: string; oldValue: string | null; newValue: string | null } | null;
  createdAt: string;
}

export type TaskEventType =
  | 'created'
  | 'status_changed'
  | 'priority_changed'
  | 'name_changed'
  | 'description_changed'
  | 'due_date_changed'
  | 'start_date_changed'
  | 'story_points_changed'
  | 'assignee_added'
  | 'assignee_removed'
  | 'moved';

export async function getTaskEvents(spaceId: string, taskId: string): Promise<TaskEvent[]> {
  const res = await apiClient.get<ApiResponse<TaskEvent[]>>(
    `/spaces/${spaceId}/tasks/${taskId}/events`,
  );
  return res.data.data;
}
