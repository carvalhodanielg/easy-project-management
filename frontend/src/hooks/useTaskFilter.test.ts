import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTaskFilter } from './useTaskFilter';
import { useAuthStore } from '../store/auth.store';
import * as usersApi from '../api/users.api';
import type { User } from '../types/user.types';

vi.mock('../api/users.api');

const baseUser: User = {
  _id: 'u1',
  email: 'alice@example.com',
  displayName: 'Alice',
  avatarUrl: null,
  preferences: { theme: 'dark' },
};

function setUser(user: User | null) {
  useAuthStore.setState({ token: user ? 'tok' : null, user });
}

describe('useTaskFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUser({ ...baseUser, preferences: { theme: 'dark' } });
    vi.mocked(usersApi.updatePreferences).mockResolvedValue(baseUser);
  });

  describe('local filtering', () => {
    it('starts with empty filters', () => {
      const { result } = renderHook(() => useTaskFilter());
      expect(result.current.filters.status).toEqual([]);
      expect(result.current.filters.priority).toEqual([]);
      expect(result.current.isActive).toBe(false);
    });

    it('toggles status on and off', () => {
      const { result } = renderHook(() => useTaskFilter());

      act(() => result.current.toggleStatus('pendente'));
      expect(result.current.filters.status).toContain('pendente');
      expect(result.current.isActive).toBe(true);

      act(() => result.current.toggleStatus('pendente'));
      expect(result.current.filters.status).not.toContain('pendente');
    });

    it('toggles priority', () => {
      const { result } = renderHook(() => useTaskFilter());
      act(() => result.current.togglePriority('alta'));
      expect(result.current.filters.priority).toContain('alta');
      act(() => result.current.togglePriority('alta'));
      expect(result.current.filters.priority).not.toContain('alta');
    });

    it('toggles assignee', () => {
      const { result } = renderHook(() => useTaskFilter());
      act(() => result.current.toggleAssignee('user-1'));
      expect(result.current.filters.assignees).toContain('user-1');
      expect(result.current.isActive).toBe(true);
      act(() => result.current.toggleAssignee('user-1'));
      expect(result.current.filters.assignees).toHaveLength(0);
    });

    it('toggles tags', () => {
      const { result } = renderHook(() => useTaskFilter());
      act(() => result.current.toggleTag('tag-1'));
      expect(result.current.filters.tags).toContain('tag-1');
      act(() => result.current.toggleTag('tag-1'));
      expect(result.current.filters.tags).toHaveLength(0);
    });

    it('sets search query', () => {
      const { result } = renderHook(() => useTaskFilter());
      act(() => result.current.setSearch('bug'));
      expect(result.current.filters.q).toBe('bug');
      expect(result.current.isActive).toBe(true);
    });

    it('resets all filters', () => {
      const { result } = renderHook(() => useTaskFilter());
      act(() => {
        result.current.toggleStatus('feito');
        result.current.togglePriority('urgente');
        result.current.setSearch('test');
      });
      expect(result.current.isActive).toBe(true);
      act(() => result.current.reset());
      expect(result.current.filters.status).toEqual([]);
      expect(result.current.filters.q).toBe('');
      expect(result.current.isActive).toBe(false);
    });

    it('builds query params with base params', () => {
      const { result } = renderHook(() => useTaskFilter({ listId: 'list-1' }));
      act(() => {
        result.current.toggleStatus('pendente');
        result.current.togglePriority('alta');
        result.current.setGroupBy('status');
      });
      const params = result.current.toQueryParams();
      expect(params.listId).toBe('list-1');
      expect(params.status).toEqual(['pendente']);
      expect(params.priority).toEqual(['alta']);
      expect(params.groupBy).toBe('status');
    });

    it('omits empty arrays from query params', () => {
      const { result } = renderHook(() => useTaskFilter());
      const params = result.current.toQueryParams();
      expect(params.status).toBeUndefined();
      expect(params.priority).toBeUndefined();
      expect(params.assignees).toBeUndefined();
      expect(params.tags).toBeUndefined();
      expect(params.groupBy).toBeUndefined();
    });
  });

  describe('persisted grouping / subtask mode', () => {
    it('initializes grouping/subtask mode from user preferences', () => {
      setUser({
        ...baseUser,
        preferences: {
          theme: 'dark',
          taskGroupBy: 'status',
          taskSubtaskMode: 'expanded',
        },
      });

      const { result } = renderHook(() => useTaskFilter());

      expect(result.current.filters.groupBy).toBe('status');
      expect(result.current.filters.subtaskMode).toBe('expanded');
    });

    it('maps a "none" grouping preference to undefined', () => {
      setUser({
        ...baseUser,
        preferences: { theme: 'dark', taskGroupBy: 'none' },
      });

      const { result } = renderHook(() => useTaskFilter());

      expect(result.current.filters.groupBy).toBeUndefined();
      expect(result.current.filters.subtaskMode).toBe('collapsed');
    });

    it('persists grouping changes via updatePreferences and updates the store', async () => {
      vi.mocked(usersApi.updatePreferences).mockResolvedValue({
        ...baseUser,
        preferences: { theme: 'dark', taskGroupBy: 'assignee' },
      });

      const { result } = renderHook(() => useTaskFilter());

      act(() => result.current.setGroupBy('assignee'));

      expect(result.current.filters.groupBy).toBe('assignee');
      await waitFor(() =>
        expect(usersApi.updatePreferences).toHaveBeenCalledWith({
          taskGroupBy: 'assignee',
        }),
      );
      expect(useAuthStore.getState().user?.preferences?.taskGroupBy).toBe(
        'assignee',
      );
    });

    it('persists clearing the grouping as "none"', async () => {
      const { result } = renderHook(() => useTaskFilter());

      act(() => result.current.setGroupBy(undefined));

      await waitFor(() =>
        expect(usersApi.updatePreferences).toHaveBeenCalledWith({
          taskGroupBy: 'none',
        }),
      );
    });

    it('persists subtask mode changes', async () => {
      const { result } = renderHook(() => useTaskFilter());

      act(() => result.current.setSubtaskMode('separated'));

      expect(result.current.filters.subtaskMode).toBe('separated');
      await waitFor(() =>
        expect(usersApi.updatePreferences).toHaveBeenCalledWith({
          taskSubtaskMode: 'separated',
        }),
      );
    });

    it('does not persist when other filters change', () => {
      const { result } = renderHook(() => useTaskFilter());

      act(() => result.current.toggleStatus('pendente'));

      expect(usersApi.updatePreferences).not.toHaveBeenCalled();
    });

    it('reverts grouping locally and in the store when persistence fails', async () => {
      setUser({
        ...baseUser,
        preferences: { theme: 'dark', taskGroupBy: 'status' },
      });
      vi.mocked(usersApi.updatePreferences).mockRejectedValue(
        new Error('boom'),
      );

      const { result } = renderHook(() => useTaskFilter());

      await act(async () => {
        result.current.setGroupBy('assignee');
      });

      await waitFor(() =>
        expect(result.current.filters.groupBy).toBe('status'),
      );
      expect(useAuthStore.getState().user?.preferences?.taskGroupBy).toBe(
        'status',
      );
    });
  });
});
