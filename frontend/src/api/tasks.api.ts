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

export interface BulkDestination {
  listId?: string;
  sprintId?: string;
}

export async function bulkDeleteTasks(spaceId: string, taskIds: string[]): Promise<void> {
  await apiClient.post(`/spaces/${spaceId}/tasks/bulk-delete`, { taskIds });
}

export async function bulkMoveTasks(spaceId: string, taskIds: string[], dest: BulkDestination): Promise<void> {
  await apiClient.post(`/spaces/${spaceId}/tasks/bulk-move`, { taskIds, ...dest });
}

export async function bulkDuplicateTasks(spaceId: string, taskIds: string[], dest: BulkDestination): Promise<void> {
  await apiClient.post(`/spaces/${spaceId}/tasks/bulk-duplicate`, { taskIds, ...dest });
}

export async function convertToSubtask(spaceId: string, taskIds: string[], parentTaskId: string): Promise<void> {
  await apiClient.post(`/spaces/${spaceId}/tasks/convert-to-subtask`, { taskIds, parentTaskId });
}

export async function promoteToMainTask(spaceId: string, taskIds: string[], dest: BulkDestination): Promise<void> {
  await apiClient.post(`/spaces/${spaceId}/tasks/promote-to-main`, { taskIds, ...dest });
}

export async function moveSubtask(spaceId: string, taskIds: string[], newParentTaskId: string): Promise<void> {
  await apiClient.post(`/spaces/${spaceId}/tasks/move-subtask`, { taskIds, newParentTaskId });
}

export async function duplicateSubtask(spaceId: string, taskId: string, newParentTaskId: string): Promise<void> {
  await apiClient.post(`/spaces/${spaceId}/tasks/duplicate-subtask`, { taskId, newParentTaskId });
}
