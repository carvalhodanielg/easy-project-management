import type { User } from './user.types';

export type TaskStatus = 'pendente' | 'em_progresso' | 'em_review' | 'feito' | 'fechado';
export type SubtaskMode = 'collapsed' | 'expanded' | 'separated';
export type TaskPriority = 'urgente' | 'alta' | 'normal' | 'baixa';
export type FibonacciPoint = 1 | 2 | 3 | 5 | 8 | 13 | 21 | 34 | 55 | 89;

export const FIBONACCI_POINTS: FibonacciPoint[] = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pendente: 'Pendente',
  em_progresso: 'Em progresso',
  em_review: 'Em review',
  feito: 'Feito',
  fechado: 'Fechado',
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgente: 'Urgente',
  alta: 'Alta',
  normal: 'Normal',
  baixa: 'Baixa',
};

export interface Tag {
  _id: string;
  spaceId: string;
  name: string;
  color: string;
}

export interface Task {
  _id: string;
  spaceId: string;
  listId: string | null;
  sprintId: string | null;
  name: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignees: User[];
  startDate: string | null;
  dueDate: string | null;
  tags: Tag[];
  storyPoints: FibonacciPoint | null;
  parentTask: string | null;
  isEpic: boolean;
  epicId: string | null;
  blockedBy: { _id: string; name: string; status: TaskStatus }[];
  blocks: { _id: string; name: string; status: TaskStatus }[];
  position: number;
  subtaskCount: number;
  /** Sum of this task's subtasks' points; when > 0 the task is a rolled-up parent. */
  subtaskPoints: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

export interface CreateTaskPayload {
  name: string;
  description?: string;
  listId?: string;
  sprintId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignees?: string[];
  startDate?: string;
  dueDate?: string;
  tags?: string[];
  storyPoints?: number;
  parentTask?: string;
  isEpic?: boolean;
  epicId?: string;
}

export interface UpdateTaskPayload {
  name?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignees?: string[];
  startDate?: string | null;
  dueDate?: string | null;
  tags?: string[];
  storyPoints?: number | null;
  position?: number;
  /** Attach to (id) or detach from (null) a parent epic. */
  epicId?: string | null;
}

export interface EpicRollup {
  epicId: string;
  totalTasks: number;
  doneTasks: number;
  totalPoints: number;
  donePoints: number;
  progressPct: number;
  byStatus: Record<TaskStatus, { count: number; points: number }>;
  bySprint: { sprintId: string | null; count: number; points: number; donePoints: number }[];
}

export interface TaskFilterParams {
  listId?: string;
  sprintId?: string;
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assignees?: string[];
  tags?: string[];
  groupBy?: 'status' | 'assignee';
  subtaskMode?: SubtaskMode;
  q?: string;
}

export interface GroupedTaskResult {
  groupKey: string | null;
  tasks: Task[];
  totalStoryPoints: number;
  count: number;
}
