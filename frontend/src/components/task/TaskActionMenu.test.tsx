import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { toast } from 'sonner';
import { TaskActionMenu } from './TaskActionMenu';
import type { Task } from '../../types/task.types';

vi.mock('sonner', () => ({ toast: vi.fn() }));

vi.mock('../../api/tasks.api', () => ({
  deleteTask: vi.fn().mockResolvedValue(undefined),
  restoreTask: vi.fn().mockResolvedValue(undefined),
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

  it('deletes immediately on Apagar without any confirmation dialog', async () => {
    const { onDone } = renderMenu();
    fireEvent.click(screen.getByRole('button', { name: /ações/i }));
    fireEvent.click(screen.getByText('Apagar'));
    expect(screen.queryByText(/confirmar/i)).not.toBeInTheDocument();
    await waitFor(() => {
      expect(tasksApi.deleteTask).toHaveBeenCalledWith('sp1', 't1');
    });
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('shows an undo toast whose action restores the task', async () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: /ações/i }));
    fireEvent.click(screen.getByText('Apagar'));

    await waitFor(() => expect(toast).toHaveBeenCalled());
    const opts = vi.mocked(toast).mock.calls[0][1] as {
      action: { label: string; onClick: () => void };
    };
    expect(opts.action.label).toMatch(/desfazer/i);

    opts.action.onClick();
    await waitFor(() => {
      expect(tasksApi.restoreTask).toHaveBeenCalledWith('sp1', 't1');
    });
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
