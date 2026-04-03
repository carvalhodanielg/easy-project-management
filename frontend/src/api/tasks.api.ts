import { apiClient } from './client';
import { Task, CreateTaskPayload, UpdateTaskPayload, TaskFilterParams, GroupedTaskResult } from '../types/task.types';

interface ApiResponse<T> { data: T; }

function buildParams(filters: TaskFilterParams): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.listId) p.set('listId', filters.listId);
  if (filters.sprintId) p.set('sprintId', filters.sprintId);
  filters.status?.forEach((s) => p.append('status', s));
  filters.priority?.forEach((pr) => p.append('priority', pr));
  filters.assignees?.forEach((a) => p.append('assignees', a));
  filters.tags?.forEach((t) => p.append('tags', t));
  if (filters.groupBy) p.set('groupBy', filters.groupBy);
  if (filters.includeSubtasks) p.set('includeSubtasks', 'true');
  if (filters.q) p.set('q', filters.q);
  return p;
}

export async function getTasks(spaceId: string, filters: TaskFilterParams = {}): Promise<Task[]> {
  const res = await apiClient.get<ApiResponse<Task[]>>(
    `/spaces/${spaceId}/tasks?${buildParams(filters).toString()}`,
  );
  return res.data.data;
}

export async function getGroupedTasks(
  spaceId: string,
  filters: TaskFilterParams,
): Promise<GroupedTaskResult[]> {
  const res = await apiClient.get<ApiResponse<GroupedTaskResult[]>>(
    `/spaces/${spaceId}/tasks?${buildParams(filters).toString()}`,
  );
  return res.data.data;
}

export async function getTask(spaceId: string, taskId: string): Promise<Task> {
  const res = await apiClient.get<ApiResponse<Task>>(
    `/spaces/${spaceId}/tasks/${taskId}`,
  );
  return res.data.data;
}

export async function createTask(spaceId: string, payload: CreateTaskPayload): Promise<Task> {
  const res = await apiClient.post<ApiResponse<Task>>(
    `/spaces/${spaceId}/tasks`,
    payload,
  );
  return res.data.data;
}

export async function updateTask(spaceId: string, taskId: string, payload: UpdateTaskPayload): Promise<Task> {
  const res = await apiClient.patch<ApiResponse<Task>>(
    `/spaces/${spaceId}/tasks/${taskId}`,
    payload,
  );
  return res.data.data;
}

export async function deleteTask(spaceId: string, taskId: string): Promise<void> {
  await apiClient.delete(`/spaces/${spaceId}/tasks/${taskId}`);
}

export async function getSubtasks(spaceId: string, taskId: string): Promise<Task[]> {
  const res = await apiClient.get<ApiResponse<Task[]>>(
    `/spaces/${spaceId}/tasks/${taskId}/subtasks`,
  );
  return res.data.data;
}

export async function addDependency(
  spaceId: string,
  taskId: string,
  targetTaskId: string,
  type: 'blocks' | 'blocked_by',
): Promise<void> {
  await apiClient.post(`/spaces/${spaceId}/tasks/${taskId}/dependencies`, {
    targetTaskId,
    type,
  });
}

export async function removeDependency(
  spaceId: string,
  taskId: string,
  targetId: string,
): Promise<void> {
  await apiClient.delete(`/spaces/${spaceId}/tasks/${taskId}/dependencies/${targetId}`);
}
