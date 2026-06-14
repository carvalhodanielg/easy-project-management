import { describe, it, expect } from 'vitest';
import type { DragEndEvent } from '@dnd-kit/core';
import { resolveSprintDrop, isSprintDropzone } from './resolveSprintDrop';

/** Build a minimal DragEndEvent shaped object for the helper. */
function event(
  active: { id: string; data?: Record<string, unknown> } | null,
  over: { id: string; data?: Record<string, unknown> } | null,
): DragEndEvent {
  return {
    active: active && { id: active.id, data: { current: active.data ?? {} } },
    over: over && { id: over.id, data: { current: over.data ?? {} } },
  } as unknown as DragEndEvent;
}

describe('resolveSprintDrop', () => {
  it('resolves a task dropped on another sprint', () => {
    const e = event(
      { id: 'task1', data: { type: 'task', sprintId: 'sprintA' } },
      { id: 'sprint-dz-sprintB', data: { type: 'sprint-dropzone', sprintId: 'sprintB' } },
    );
    expect(resolveSprintDrop(e, 'sprintA')).toEqual({
      taskId: 'task1',
      targetSprintId: 'sprintB',
      sourceSprintId: 'sprintA',
    });
  });

  it('returns null when dropped on its own (source) sprint', () => {
    const e = event(
      { id: 'task1', data: { type: 'task', sprintId: 'sprintA' } },
      { id: 'sprint-dz-sprintA', data: { type: 'sprint-dropzone', sprintId: 'sprintA' } },
    );
    expect(resolveSprintDrop(e, 'sprintA')).toBeNull();
  });

  it('returns null when dropped on the currently open sprint', () => {
    // Task carries no sprintId in data, but it lives in the open sprint.
    const e = event(
      { id: 'task1', data: { type: 'task' } },
      { id: 'sprint-dz-sprintA', data: { type: 'sprint-dropzone', sprintId: 'sprintA' } },
    );
    expect(resolveSprintDrop(e, 'sprintA')).toBeNull();
  });

  it('returns null when the dragged item is not a task', () => {
    const e = event(
      { id: 'sub1', data: { type: 'subtask', sprintId: 'sprintA' } },
      { id: 'sprint-dz-sprintB', data: { type: 'sprint-dropzone', sprintId: 'sprintB' } },
    );
    expect(resolveSprintDrop(e, 'sprintA')).toBeNull();
  });

  it('returns null when the drop target is not a sprint dropzone', () => {
    const e = event(
      { id: 'task1', data: { type: 'task', sprintId: 'sprintA' } },
      { id: 'task2', data: { type: 'task' } },
    );
    expect(resolveSprintDrop(e, 'sprintA')).toBeNull();
  });

  it('returns null when there is no drop target', () => {
    const e = event({ id: 'task1', data: { type: 'task', sprintId: 'sprintA' } }, null);
    expect(resolveSprintDrop(e, 'sprintA')).toBeNull();
  });
});

describe('isSprintDropzone', () => {
  it('is true when the drop target is a sprint dropzone', () => {
    const over = { data: { current: { type: 'sprint-dropzone', sprintId: 'sprintB' } } };
    expect(isSprintDropzone(over)).toBe(true);
  });

  it('is false when there is no drop target', () => {
    expect(isSprintDropzone(null)).toBe(false);
  });

  it('is false for a non-sprint-dropzone target', () => {
    const over = { data: { current: { type: 'task' } } };
    expect(isSprintDropzone(over)).toBe(false);
  });
});
