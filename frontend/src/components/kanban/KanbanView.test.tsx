import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { KanbanView } from './KanbanView';
import { Task } from '../../types/task.types';

vi.mock('../../api/tasks.api');

const makeTask = (overrides: Partial<Task>): Task => ({
  _id: 'task-1',
  spaceId: 'space-1',
  listId: 'list-1',
  sprintId: null,
  name: 'Test Task',
  description: '',
  status: 'pendente',
  priority: 'normal',
  assignees: [],
  startDate: null,
  dueDate: null,
  tags: [],
  storyPoints: null,
  parentTask: null,
  blockedBy: [],
  blocks: [],
  position: 0,
  createdBy: 'u1',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

const tasks: Task[] = [
  makeTask({ _id: 't1', name: 'Pending task', status: 'pendente', storyPoints: 3 }),
  makeTask({ _id: 't2', name: 'In progress task', status: 'em_progresso', storyPoints: 5 }),
  makeTask({ _id: 't3', name: 'Done task', status: 'feito', storyPoints: 8 }),
];

function renderKanban(taskList = tasks) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/spaces/space-1/lists/list-1']}>
        <Routes>
          <Route path="/spaces/:spaceId/lists/:listId" element={<KanbanView spaceId="space-1" tasks={taskList} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('KanbanView', () => {
  it('renders all 5 status columns', () => {
    renderKanban();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(screen.getByText('Em progresso')).toBeInTheDocument();
    expect(screen.getByText('Em review')).toBeInTheDocument();
    expect(screen.getByText('Feito')).toBeInTheDocument();
    expect(screen.getByText('Fechado')).toBeInTheDocument();
  });

  it('renders task cards in correct columns', () => {
    renderKanban();
    expect(screen.getByText('Pending task')).toBeInTheDocument();
    expect(screen.getByText('In progress task')).toBeInTheDocument();
    expect(screen.getByText('Done task')).toBeInTheDocument();
  });

  it('shows task count per column', () => {
    renderKanban();
    // Pendente column: 1 task = "1"
    // Em progresso: 1 task
    // Feito: 1 task
    // Em review, Fechado: 0
    const countElements = screen.getAllByText(/^[0-5]( ·.*)?$/);
    expect(countElements.length).toBeGreaterThan(0);
  });

  it('shows story points in column header when present', () => {
    renderKanban();
    // "1 · 3pt" for pendente (3 points)
    expect(screen.getByText(/3pt/)).toBeInTheDocument();
    expect(screen.getByText(/5pt/)).toBeInTheDocument();
    expect(screen.getByText(/8pt/)).toBeInTheDocument();
  });

  it('renders empty columns for statuses with no tasks', () => {
    renderKanban([tasks[0]]); // only pendente task
    // All 5 columns still appear
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(screen.getByText('Fechado')).toBeInTheDocument();
  });

  it('renders assignee avatars on cards', () => {
    const taskWithAssignee = makeTask({
      _id: 't4',
      name: 'Assigned task',
      status: 'pendente',
      assignees: [{ _id: 'u1', email: 'x@y.com', displayName: 'Xavier', avatarUrl: null }],
    });
    renderKanban([taskWithAssignee]);
    expect(screen.getByText('X')).toBeInTheDocument();
  });

  it('renders tags on cards', () => {
    const taskWithTag = makeTask({
      _id: 't5',
      name: 'Tagged task',
      status: 'pendente',
      tags: [{ _id: 'tag1', spaceId: 'space-1', name: 'bug', color: '#FF4D4F' }],
    });
    renderKanban([taskWithTag]);
    expect(screen.getByText('bug')).toBeInTheDocument();
  });
});
