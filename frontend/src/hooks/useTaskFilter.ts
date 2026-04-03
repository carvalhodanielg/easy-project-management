import { useState, useCallback } from 'react';
import { TaskFilterParams, TaskStatus, TaskPriority } from '../types/task.types';

export interface FilterState {
  status: TaskStatus[];
  priority: TaskPriority[];
  assignees: string[];
  tags: string[];
  groupBy: TaskFilterParams['groupBy'];
  includeSubtasks: boolean;
  q: string;
}

const INITIAL: FilterState = {
  status: [],
  priority: [],
  assignees: [],
  tags: [],
  groupBy: undefined,
  includeSubtasks: false,
  q: '',
};

export function useTaskFilter(baseParams: Pick<TaskFilterParams, 'listId' | 'sprintId'> = {}) {
  const [filters, setFilters] = useState<FilterState>(INITIAL);

  const toggleStatus = useCallback((s: TaskStatus) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status.includes(s)
        ? prev.status.filter((x) => x !== s)
        : [...prev.status, s],
    }));
  }, []);

  const togglePriority = useCallback((p: TaskPriority) => {
    setFilters((prev) => ({
      ...prev,
      priority: prev.priority.includes(p)
        ? prev.priority.filter((x) => x !== p)
        : [...prev.priority, p],
    }));
  }, []);

  const toggleAssignee = useCallback((id: string) => {
    setFilters((prev) => ({
      ...prev,
      assignees: prev.assignees.includes(id)
        ? prev.assignees.filter((x) => x !== id)
        : [...prev.assignees, id],
    }));
  }, []);

  const toggleTag = useCallback((id: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(id)
        ? prev.tags.filter((x) => x !== id)
        : [...prev.tags, id],
    }));
  }, []);

  const setGroupBy = useCallback((g: FilterState['groupBy']) => {
    setFilters((prev) => ({ ...prev, groupBy: g }));
  }, []);

  const setSearch = useCallback((q: string) => {
    setFilters((prev) => ({ ...prev, q }));
  }, []);

  const toggleSubtasks = useCallback(() => {
    setFilters((prev) => ({ ...prev, includeSubtasks: !prev.includeSubtasks }));
  }, []);

  const reset = useCallback(() => setFilters(INITIAL), []);

  const isActive =
    filters.status.length > 0 ||
    filters.priority.length > 0 ||
    filters.assignees.length > 0 ||
    filters.tags.length > 0 ||
    filters.q.length > 0;

  const toQueryParams = (): TaskFilterParams => ({
    ...baseParams,
    ...(filters.status.length > 0 && { status: filters.status }),
    ...(filters.priority.length > 0 && { priority: filters.priority }),
    ...(filters.assignees.length > 0 && { assignees: filters.assignees }),
    ...(filters.tags.length > 0 && { tags: filters.tags }),
    ...(filters.groupBy && { groupBy: filters.groupBy }),
    ...(filters.includeSubtasks && { includeSubtasks: true }),
    ...(filters.q && { q: filters.q }),
  });

  return {
    filters,
    isActive,
    toggleStatus,
    togglePriority,
    toggleAssignee,
    toggleTag,
    setGroupBy,
    setSearch,
    toggleSubtasks,
    reset,
    toQueryParams,
  };
}
