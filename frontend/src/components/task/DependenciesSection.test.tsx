import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DependenciesSection, isTaskBlocked } from './DependenciesSection';
import type { Task } from '../../types/task.types';

vi.mock('../../api/tasks.api', () => ({
  getTasks: vi.fn(),
  addDependency: vi.fn(),
  removeDependency: vi.fn(),
}));

import * as tasksApi from '../../api/tasks.api';

const BASE_TASK: Task = {
  _id: 't1',
  spaceId: 'sp1',
  name: 'Tarefa Principal',
  description: '',
  status: 'pendente',
  priority: 'normal',
  assignees: [],
  tags: [],
  storyPoints: null,
  startDate: null,
  dueDate: null,
  parentTask: null,
  blockedBy: [],
  blocks: [],
  position: 0,
  subtaskCount: 0,
  createdBy: 'u1',
  listId: 'l1',
  sprintId: null,
  createdAt: '',
  updatedAt: '',
};

const SUBTASK: Task = {
  ...BASE_TASK,
  _id: 'sub1',
  name: 'Subtarefa Exemplo',
  parentTask: 'parent1',
};

function renderSection(task = BASE_TASK) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DependenciesSection spaceId="sp1" task={task} />
    </QueryClientProvider>,
  );
}

describe('DependenciesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the add-dependency button when there are no deps', () => {
    renderSection();
    expect(screen.getByText('Adicionar dependência')).toBeInTheDocument();
  });

  it('shows blocked label when task has an unresolved blocker', () => {
    const blocked: Task = {
      ...BASE_TASK,
      blockedBy: [{ _id: 'b1', name: 'Bloqueador', status: 'pendente' }],
    };
    renderSection(blocked);
    expect(screen.getByText('Bloqueada')).toBeInTheDocument();
    expect(screen.getByText('Bloqueada por:')).toBeInTheDocument();
  });

  it('does not show blocked label when all blockers are done', () => {
    const done: Task = {
      ...BASE_TASK,
      blockedBy: [{ _id: 'b1', name: 'Bloqueador', status: 'feito' }],
    };
    renderSection(done);
    expect(screen.queryByText('Bloqueada')).not.toBeInTheDocument();
  });

  it('searches tasks with includeSubtasks=true so subtasks appear in results', async () => {
    vi.mocked(tasksApi.getTasks).mockResolvedValue([SUBTASK]);

    renderSection();
    fireEvent.click(screen.getByText('Adicionar dependência'));
    fireEvent.change(screen.getByPlaceholderText('Buscar tarefa pelo nome…'), {
      target: { value: 'Sub' },
    });

    await waitFor(() => {
      expect(tasksApi.getTasks).toHaveBeenCalledWith(
        'sp1',
        expect.objectContaining({ q: 'Sub', includeSubtasks: true }),
      );
    });

    expect(await screen.findByText('Subtarefa Exemplo')).toBeInTheDocument();
  });

  it('excludes the current task and already-linked tasks from search results', async () => {
    const alreadyLinked: Task = { ...BASE_TASK, _id: 'linked1', name: 'Já Vinculada' };
    const taskWithDeps: Task = {
      ...BASE_TASK,
      blocks: [{ _id: 'linked1', name: 'Já Vinculada', status: 'pendente' }],
    };
    vi.mocked(tasksApi.getTasks).mockResolvedValue([BASE_TASK, alreadyLinked, SUBTASK]);

    renderSection(taskWithDeps);
    fireEvent.click(screen.getByText('Adicionar dependência'));
    fireEvent.change(screen.getByPlaceholderText('Buscar tarefa pelo nome…'), {
      target: { value: 'tarefa' },
    });

    await waitFor(() => expect(tasksApi.getTasks).toHaveBeenCalled());

    expect(screen.queryByText('Tarefa Principal')).not.toBeInTheDocument();
    expect(screen.queryByText('Já Vinculada')).not.toBeInTheDocument();
    expect(await screen.findByText('Subtarefa Exemplo')).toBeInTheDocument();
  });
});

describe('isTaskBlocked', () => {
  it('returns true when any blocker is not finished', () => {
    const task = { ...BASE_TASK, blockedBy: [{ _id: 'b1', name: 'X', status: 'pendente' as const }] };
    expect(isTaskBlocked(task)).toBe(true);
  });

  it('returns false when all blockers are feito or fechado', () => {
    const task = {
      ...BASE_TASK,
      blockedBy: [
        { _id: 'b1', name: 'X', status: 'feito' as const },
        { _id: 'b2', name: 'Y', status: 'fechado' as const },
      ],
    };
    expect(isTaskBlocked(task)).toBe(false);
  });

  it('returns false when there are no blockers', () => {
    expect(isTaskBlocked(BASE_TASK)).toBe(false);
  });
});
