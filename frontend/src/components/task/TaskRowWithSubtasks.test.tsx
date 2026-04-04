import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskRowWithSubtasks } from './TaskRowWithSubtasks';
import * as tasksApi from '../../api/tasks.api';
import type { Task } from '../../types/task.types';

vi.mock('../../api/tasks.api');

const mockTask: Task = {
  _id: 'task-1',
  spaceId: 'space-1',
  listId: 'list-1',
  sprintId: null,
  name: 'Parent Task',
  description: '',
  status: 'pendente',
  priority: 'alta',
  assignees: [],
  startDate: null,
  dueDate: null,
  tags: [],
  storyPoints: 5,
  parentTask: null,
  blockedBy: [],
  blocks: [],
  position: 0,
  createdBy: 'u1',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const mockSubtask: Task = {
  ...mockTask,
  _id: 'sub-1',
  name: 'Child Task',
  parentTask: 'task-1',
  storyPoints: null,
};

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderRow(task = mockTask) {
  vi.mocked(tasksApi.getSubtasks).mockResolvedValue([mockSubtask]);
  return render(
    <QueryClientProvider client={makeClient()}>
      <MemoryRouter initialEntries={['/spaces/space-1/lists/list-1']}>
        <Routes>
          <Route
            path="/spaces/:spaceId/lists/:listId"
            element={<TaskRowWithSubtasks task={task} spaceId="space-1" />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TaskRowWithSubtasks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the task name', () => {
    renderRow();
    expect(screen.getByText('Parent Task')).toBeInTheDocument();
  });

  it('renders a collapse/expand toggle button', () => {
    renderRow();
    expect(screen.getByRole('button', { name: /expand subtasks/i })).toBeInTheDocument();
  });

  it('subtasks are hidden by default', () => {
    renderRow();
    expect(screen.queryByText('Child Task')).not.toBeInTheDocument();
  });

  it('shows subtasks after clicking the expand button', async () => {
    renderRow();
    fireEvent.click(screen.getByRole('button', { name: /expand subtasks/i }));
    expect(await screen.findByText('Child Task')).toBeInTheDocument();
  });

  it('shows "+ Add subtask" button when expanded', async () => {
    renderRow();
    fireEvent.click(screen.getByRole('button', { name: /expand subtasks/i }));
    expect(await screen.findByRole('button', { name: /add subtask/i })).toBeInTheDocument();
  });

  it('collapses subtasks on second toggle click', async () => {
    renderRow();
    const toggle = screen.getByRole('button', { name: /expand subtasks/i });
    fireEvent.click(toggle);
    expect(await screen.findByText('Child Task')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByText('Child Task')).not.toBeInTheDocument();
  });

  it('shows the collapse label when expanded', async () => {
    renderRow();
    const toggle = screen.getByRole('button', { name: /expand subtasks/i });
    fireEvent.click(toggle);
    await screen.findByText('Child Task');
    expect(screen.getByRole('button', { name: /collapse subtasks/i })).toBeInTheDocument();
  });
});
