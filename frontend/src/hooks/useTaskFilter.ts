import { useCallback, useRef, useState } from 'react';
import { TaskFilterParams, TaskStatus, TaskPriority, SubtaskMode } from '../types/task.types';
import { useAuthStore } from '../store/auth.store';
import { updatePreferences } from '../api/users.api';
import type { UserPreferences } from '../types/user.types';

export interface FilterState {
  status: TaskStatus[];
  priority: TaskPriority[];
  assignees: string[];
  tags: string[];
  groupBy: TaskFilterParams['groupBy'];
  subtaskMode: SubtaskMode;
  q: string;
}

const INITIAL: FilterState = {
  status: [],
  priority: [],
  assignees: [],
  tags: [],
  groupBy: undefined,
  subtaskMode: 'collapsed',
  q: '',
};

// Build the initial filter state, seeding grouping/subtask mode from the
// current user's persisted preferences ('none' means no grouping).
function initialFromPreferences(): FilterState {
  const prefs = useAuthStore.getState().user?.preferences;
  return {
    ...INITIAL,
    groupBy:
      prefs?.taskGroupBy && prefs.taskGroupBy !== 'none'
        ? prefs.taskGroupBy
        : undefined,
    subtaskMode: prefs?.taskSubtaskMode ?? INITIAL.subtaskMode,
  };
}

export function useTaskFilter(baseParams: Pick<TaskFilterParams, 'listId' | 'sprintId'> = {}) {
  const [filters, setFilters] = useState<FilterState>(initialFromPreferences);

  // Keep a ref to the latest filters so persistence can revert on failure
  // without re-creating the memoized setters on every render.
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Optimistically sync a preference patch to the auth store + backend,
  // reverting both the store and local filter state if the request fails.
  const persistPref = useCallback(
    async (patch: Partial<UserPreferences>, revert: () => void) => {
      const user = useAuthStore.getState().user;
      if (!user) return;
      const previousPrefs = user.preferences;
      useAuthStore.getState().setUser({
        ...user,
        preferences: { theme: 'dark', ...previousPrefs, ...patch },
      });
      try {
        const updated = await updatePreferences(patch);
        useAuthStore.getState().setUser(updated);
      } catch {
        revert();
        useAuthStore.getState().setUser({ ...user, preferences: previousPrefs });
      }
    },
    [],
  );

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

  const setGroupBy = useCallback(
    (g: FilterState['groupBy']) => {
      const previous = filtersRef.current.groupBy;
      setFilters((prev) => ({ ...prev, groupBy: g }));
      void persistPref({ taskGroupBy: g ?? 'none' }, () =>
        setFilters((prev) => ({ ...prev, groupBy: previous })),
      );
    },
    [persistPref],
  );

  const setSearch = useCallback((q: string) => {
    setFilters((prev) => ({ ...prev, q }));
  }, []);

  const setSubtaskMode = useCallback(
    (mode: SubtaskMode) => {
      const previous = filtersRef.current.subtaskMode;
      setFilters((prev) => ({ ...prev, subtaskMode: mode }));
      void persistPref({ taskSubtaskMode: mode }, () =>
        setFilters((prev) => ({ ...prev, subtaskMode: previous })),
      );
    },
    [persistPref],
  );

  const reset = useCallback(() => setFilters(INITIAL), []);

  const loadFilter = useCallback((saved: Partial<FilterState>) => {
    setFilters({ ...INITIAL, ...saved });
  }, []);

  const isActive =
    filters.status.length > 0 ||
    filters.priority.length > 0 ||
    filters.assignees.length > 0 ||
    filters.tags.length > 0 ||
    filters.q.length > 0 ||
    filters.groupBy !== undefined ||
    filters.subtaskMode !== 'collapsed';

  const toQueryParams = (): TaskFilterParams => ({
    ...baseParams,
    ...(filters.status.length > 0 && { status: filters.status }),
    ...(filters.priority.length > 0 && { priority: filters.priority }),
    ...(filters.assignees.length > 0 && { assignees: filters.assignees }),
    ...(filters.tags.length > 0 && { tags: filters.tags }),
    ...(filters.groupBy && { groupBy: filters.groupBy }),
    ...(filters.subtaskMode === 'separated' && { subtaskMode: 'separated' }),
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
    setSubtaskMode,
    reset,
    loadFilter,
    toQueryParams,
  };
}
