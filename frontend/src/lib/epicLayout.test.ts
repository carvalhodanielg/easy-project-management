import { describe, it, expect } from 'vitest';
import { buildEpicLayout } from './epicLayout';
import type { Task } from '../types/task.types';

// Minimal task factory — only the fields buildEpicLayout reads matter.
function task(overrides: Partial<Task> & { _id: string }): Task {
  return {
    spaceId: 'sp1',
    listId: 'l1',
    sprintId: null,
    name: overrides._id,
    description: '',
    status: 'pendente',
    priority: 'normal',
    assignees: [],
    startDate: null,
    dueDate: null,
    tags: [],
    storyPoints: null,
    parentTask: null,
    isEpic: false,
    epicId: null,
    blockedBy: [],
    blocks: [],
    position: 0,
    subtaskCount: 0,
    subtaskPoints: 0,
    createdBy: 'u1',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

const taskIds = (items: ReturnType<typeof buildEpicLayout>) =>
  items.filter((i) => i.kind === 'task').map((i) => (i.kind === 'task' ? i.task._id : ''));

describe('buildEpicLayout', () => {
  it('leaves a list with no epics unchanged and adds no separators', () => {
    const tasks = [task({ _id: 'a' }), task({ _id: 'b' }), task({ _id: 'c' })];
    const layout = buildEpicLayout(tasks);
    expect(layout.every((i) => i.kind === 'task')).toBe(true);
    expect(taskIds(layout)).toEqual(['a', 'b', 'c']);
  });

  it('drops an in-list child of a present epic from the top level (shown nested instead)', () => {
    const tasks = [
      task({ _id: 'e1', isEpic: true }),
      task({ _id: 'child', epicId: 'e1' }),
      task({ _id: 'loose' }),
    ];
    const layout = buildEpicLayout(tasks);
    expect(taskIds(layout)).toEqual(['e1', 'loose']);
  });

  it('keeps a child whose epic is absent from this list as a top-level row', () => {
    const tasks = [task({ _id: 'a' }), task({ _id: 'orphan', epicId: 'elsewhere' })];
    const layout = buildEpicLayout(tasks);
    expect(taskIds(layout)).toEqual(['a', 'orphan']);
  });

  it('puts a separator before and after an epic between two loose tasks', () => {
    const tasks = [task({ _id: 'a' }), task({ _id: 'e1', isEpic: true }), task({ _id: 'b' })];
    const layout = buildEpicLayout(tasks);
    expect(layout.map((i) => i.kind)).toEqual([
      'task',
      'separator',
      'task',
      'separator',
      'task',
    ]);
  });

  it('puts exactly one separator between two adjacent epics', () => {
    const tasks = [task({ _id: 'e1', isEpic: true }), task({ _id: 'e2', isEpic: true })];
    const layout = buildEpicLayout(tasks);
    expect(layout.map((i) => i.kind)).toEqual(['task', 'separator', 'task']);
  });

  it('does not add a leading or trailing separator', () => {
    const tasks = [task({ _id: 'e1', isEpic: true })];
    const layout = buildEpicLayout(tasks);
    expect(layout.map((i) => i.kind)).toEqual(['task']);
  });

  it('gives separators stable unique keys', () => {
    const tasks = [
      task({ _id: 'a' }),
      task({ _id: 'e1', isEpic: true }),
      task({ _id: 'b' }),
      task({ _id: 'e2', isEpic: true }),
      task({ _id: 'c' }),
    ];
    const layout = buildEpicLayout(tasks);
    const keys = layout
      .filter((i) => i.kind === 'separator')
      .map((i) => (i.kind === 'separator' ? i.key : ''));
    expect(new Set(keys).size).toBe(keys.length);
  });
});
