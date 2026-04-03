import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useTaskFilter } from './useTaskFilter';

describe('useTaskFilter', () => {
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

  it('sets groupBy', () => {
    const { result } = renderHook(() => useTaskFilter());
    act(() => result.current.setGroupBy('status'));
    expect(result.current.filters.groupBy).toBe('status');
  });

  it('toggles includeSubtasks', () => {
    const { result } = renderHook(() => useTaskFilter());
    expect(result.current.filters.includeSubtasks).toBe(false);
    act(() => result.current.toggleSubtasks());
    expect(result.current.filters.includeSubtasks).toBe(true);
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

  it('isActive is false when only groupBy is set', () => {
    const { result } = renderHook(() => useTaskFilter());
    act(() => result.current.setGroupBy('priority'));
    // groupBy doesn't count as "active filter" for the indicator
    expect(result.current.isActive).toBe(false);
  });
});
