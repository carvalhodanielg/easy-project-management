import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskRowWithSubtasks } from './TaskRowWithSubtasks';
import * as tasksApi from '../../api/tasks.api';
import type { Task } from '../../types/task.types';

vi.mock('../../api/tasks.api');

const baseTask: Task = {
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
  subtaskCount: 0,
  parentTask: null,
  blockedBy: [],
  blocks: [],
  position: 0,
  createdBy: 'u1',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const mockSubtask: Task = {
  ...baseTask,
  _id: 'sub-1',
  name: 'Child Task',
  subtaskCount: 0,
  parentTask: 'task-1',
  storyPoints: null,
};

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderRow(task: Task) {
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

describe('TaskRowWithSubtasks — task with subtaskCount = 0', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the task name', () => {
    renderRow({ ...baseTask, subtaskCount: 0 });
    expect(screen.getByText('Parent Task')).toBeInTheDocument();
  });

  it('does not render expand toggle when task has no subtasks', () => {
    renderRow({ ...baseTask, subtaskCount: 0 });
    expect(screen.queryByRole('button', { name: /expand subtasks/i })).not.toBeInTheDocument();
  });

  it('does not show subtasks section when subtaskCount = 0', () => {
    renderRow({ ...baseTask, subtaskCount: 0 });
    expect(screen.queryByText('Child Task')).not.toBeInTheDocument();
  });
});

describe('TaskRowWithSubtasks — task with subtaskCount > 0', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders expand toggle when task has subtasks', () => {
    renderRow({ ...baseTask, subtaskCount: 2 });
    expect(screen.getByRole('button', { name: /collapse subtasks/i })).toBeInTheDocument();
  });

  it('shows subtasks expanded by default when subtaskCount > 0', async () => {
    renderRow({ ...baseTask, subtaskCount: 2 });
    expect(await screen.findByText('Child Task')).toBeInTheDocument();
  });

  it('collapses subtasks when toggle is clicked', async () => {
    renderRow({ ...baseTask, subtaskCount: 2 });
    await screen.findByText('Child Task');
    fireEvent.click(screen.getByRole('button', { name: /collapse subtasks/i }));
    expect(screen.queryByText('Child Task')).not.toBeInTheDocument();
  });

  it('re-expands subtasks after collapsing', async () => {
    renderRow({ ...baseTask, subtaskCount: 2 });
    await screen.findByText('Child Task');
    fireEvent.click(screen.getByRole('button', { name: /collapse subtasks/i }));
    fireEvent.click(screen.getByRole('button', { name: /expand subtasks/i }));
    expect(await screen.findByText('Child Task')).toBeInTheDocument();
  });

  it('shows "+ Add subtask" button when expanded', async () => {
    renderRow({ ...baseTask, subtaskCount: 2 });
    expect(await screen.findByRole('button', { name: /add subtask/i })).toBeInTheDocument();
  });
});
