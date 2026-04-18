import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TaskActionMenu } from './TaskActionMenu';
import type { Task } from '../../types/task.types';

vi.mock('../../api/tasks.api', () => ({
  deleteTask: vi.fn().mockResolvedValue(undefined),
  bulkMoveTasks: vi.fn().mockResolvedValue(undefined),
  bulkDuplicateTasks: vi.fn().mockResolvedValue(undefined),
  moveSubtask: vi.fn().mockResolvedValue(undefined),
  promoteToMainTask: vi.fn().mockResolvedValue(undefined),
  duplicateSubtask: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./DestinationPickerModal', () => ({
  DestinationPickerModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="destination-modal">
      <button onClick={onClose}>Fechar</button>
    </div>
  ),
}));

vi.mock('./ParentTaskPickerModal', () => ({
  ParentTaskPickerModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="parent-modal">
      <button onClick={onClose}>Fechar</button>
    </div>
  ),
}));

import * as tasksApi from '../../api/tasks.api';

const BASE_TASK: Task = {
  _id: 't1',
  name: 'Tarefa Teste',
  status: 'pendente',
  priority: 'normal',
  storyPoints: null,
  dueDate: null,
  assignees: [],
  tags: [],
  subtaskCount: 0,
  blockedBy: [],
  blocks: [],
  description: '',
  parentTask: null,
  listId: 'l1',
  sprintId: null,
  spaceId: 'sp1',
  position: 0,
  createdBy: 'u1',
  startDate: null,
  createdAt: '',
  updatedAt: '',
};

function renderMenu(task: Task = BASE_TASK) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onDone = vi.fn();
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TaskActionMenu task={task} spaceId="sp1" onDone={onDone} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { onDone };
}

describe('TaskActionMenu', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the three-dot button', () => {
    renderMenu();
    expect(screen.getByRole('button', { name: /ações/i })).toBeInTheDocument();
  });

  it('opens dropdown with Apagar, Mover, Duplicar on click', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: /ações/i }));
    expect(screen.getByText('Apagar')).toBeInTheDocument();
    expect(screen.getByText('Mover')).toBeInTheDocument();
    expect(screen.getByText('Duplicar')).toBeInTheDocument();
  });

  it('shows confirmation dialog when clicking Apagar on main task without subtasks', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: /ações/i }));
    fireEvent.click(screen.getByText('Apagar'));
    expect(screen.getByText(/confirmar/i)).toBeInTheDocument();
    expect(screen.queryByText(/subtarefa/i)).not.toBeInTheDocument();
  });

  it('shows subtask warning in confirmation when main task has subtasks', () => {
    const taskWithSubs = { ...BASE_TASK, subtaskCount: 3 };
    renderMenu(taskWithSubs);
    fireEvent.click(screen.getByRole('button', { name: /ações/i }));
    fireEvent.click(screen.getByText('Apagar'));
    expect(screen.getByText(/3 subtarefa/i)).toBeInTheDocument();
  });

  it('calls deleteTask and onDone after confirming delete', async () => {
    const { onDone } = renderMenu();
    fireEvent.click(screen.getByRole('button', { name: /ações/i }));
    fireEvent.click(screen.getByText('Apagar'));
    fireEvent.click(screen.getByRole('button', { name: /apagar/i }));
    await waitFor(() => {
      expect(tasksApi.deleteTask).toHaveBeenCalledWith('sp1', 't1');
    });
  });

  it('cancels delete when clicking Cancelar', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: /ações/i }));
    fireEvent.click(screen.getByText('Apagar'));
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(tasksApi.deleteTask).not.toHaveBeenCalled();
  });

  it('opens DestinationPickerModal when clicking Mover on main task', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: /ações/i }));
    fireEvent.click(screen.getByText('Mover'));
    expect(screen.getByTestId('destination-modal')).toBeInTheDocument();
  });

  it('opens DestinationPickerModal when clicking Duplicar on main task', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: /ações/i }));
    fireEvent.click(screen.getByText('Duplicar'));
    expect(screen.getByTestId('destination-modal')).toBeInTheDocument();
  });

  it('shows sub-menu options for subtask Mover', () => {
    const subtask = { ...BASE_TASK, parentTask: 'parent1' };
    renderMenu(subtask);
    fireEvent.click(screen.getByRole('button', { name: /ações/i }));
    fireEvent.click(screen.getByText('Mover'));
    expect(screen.getByText('Mudar pai')).toBeInTheDocument();
    expect(screen.getByText('Promover para tarefa principal')).toBeInTheDocument();
  });

  it('opens ParentTaskPickerModal when clicking Duplicar on subtask', () => {
    const subtask = { ...BASE_TASK, parentTask: 'parent1' };
    renderMenu(subtask);
    fireEvent.click(screen.getByRole('button', { name: /ações/i }));
    fireEvent.click(screen.getByText('Duplicar'));
    expect(screen.getByTestId('parent-modal')).toBeInTheDocument();
  });
});
