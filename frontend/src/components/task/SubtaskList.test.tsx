import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubtaskList } from './SubtaskList';
import * as tasksApi from '../../api/tasks.api';
import type { Task } from '../../types/task.types';

vi.mock('../../api/tasks.api');

const mockSubtask: Task = {
  _id: 'sub-1',
  spaceId: 'space-1',
  listId: 'list-1',
  sprintId: null,
  name: 'Existing subtask',
  description: '',
  status: 'pendente',
  priority: 'normal',
  assignees: [],
  startDate: null,
  dueDate: null,
  tags: [],
  storyPoints: null,
  parentTask: 'task-1',
  blockedBy: [],
  blocks: [],
  position: 0,
  createdBy: 'u1',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderSubtaskList(subtasks: Task[] = []) {
  vi.mocked(tasksApi.getSubtasks).mockResolvedValue(subtasks);
  return render(
    <QueryClientProvider client={makeClient()}>
      <MemoryRouter initialEntries={['/spaces/space-1/tasks/task-1']}>
        <Routes>
          <Route path="/spaces/:spaceId/tasks/:taskId" element={<SubtaskList spaceId="space-1" taskId="task-1" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SubtaskList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders existing subtasks', async () => {
    renderSubtaskList([mockSubtask]);
    expect(await screen.findByText('Existing subtask')).toBeInTheDocument();
  });

  it('renders "+ Add subtask" button', async () => {
    renderSubtaskList([]);
    expect(await screen.findByRole('button', { name: /add subtask/i })).toBeInTheDocument();
  });

  it('shows name input when "+ Add subtask" is clicked', async () => {
    renderSubtaskList([]);
    fireEvent.click(await screen.findByRole('button', { name: /add subtask/i }));
    expect(screen.getByPlaceholderText(/subtask name/i)).toBeInTheDocument();
  });

  it('calls createTask with parentTask on submit', async () => {
    vi.mocked(tasksApi.createTask).mockResolvedValue({ ...mockSubtask, name: 'New subtask' });
    vi.mocked(tasksApi.getSubtasks)
      .mockResolvedValueOnce([])
      .mockResolvedValue([{ ...mockSubtask, name: 'New subtask' }]);

    renderSubtaskList([]);
    fireEvent.click(await screen.findByRole('button', { name: /add subtask/i }));
    fireEvent.change(screen.getByPlaceholderText(/subtask name/i), { target: { value: 'New subtask' } });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() =>
      expect(tasksApi.createTask).toHaveBeenCalledWith('space-1', {
        name: 'New subtask',
        parentTask: 'task-1',
      }),
    );
  });

  it('hides input after successful creation', async () => {
    vi.mocked(tasksApi.createTask).mockResolvedValue({ ...mockSubtask, name: 'New subtask' });
    vi.mocked(tasksApi.getSubtasks).mockResolvedValue([]);

    renderSubtaskList([]);
    fireEvent.click(await screen.findByRole('button', { name: /add subtask/i }));
    fireEvent.change(screen.getByPlaceholderText(/subtask name/i), { target: { value: 'New subtask' } });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() =>
      expect(screen.queryByPlaceholderText(/subtask name/i)).not.toBeInTheDocument(),
    );
  });

  it('cancels input on Escape key', async () => {
    renderSubtaskList([]);
    fireEvent.click(await screen.findByRole('button', { name: /add subtask/i }));
    fireEvent.keyDown(screen.getByPlaceholderText(/subtask name/i), { key: 'Escape' });
    expect(screen.queryByPlaceholderText(/subtask name/i)).not.toBeInTheDocument();
  });

  it('does not call createTask when name is empty', async () => {
    renderSubtaskList([]);
    fireEvent.click(await screen.findByRole('button', { name: /add subtask/i }));
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));
    expect(tasksApi.createTask).not.toHaveBeenCalled();
  });
});
