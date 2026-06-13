import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { toast } from 'sonner';
import { SelectionBar } from './SelectionBar';
import * as tasksApi from '../../api/tasks.api';
import type { Task } from '../../types/task.types';
import type { SpaceMember } from '../../types/space.types';

vi.mock('sonner', () => ({ toast: vi.fn() }));
vi.mock('../../api/tasks.api');

const bulkPatch = vi.mocked(tasksApi.bulkPatchTasks);

const TASK: Task = {
  _id: 't1',
  name: 'A',
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

const MEMBER: SpaceMember = {
  _id: 'm1',
  spaceId: 'sp1',
  role: 'editor',
  userId: { _id: 'u9', email: 'a@b.c', displayName: 'Alice', avatarUrl: null },
};

function renderBar(props: Partial<React.ComponentProps<typeof SelectionBar>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onClear = vi.fn();
  render(
    <QueryClientProvider client={qc}>
      <SelectionBar
        spaceId="sp1"
        count={2}
        selectionType="main"
        mainTaskIds={['t1', 't2']}
        subtaskIds={[]}
        allTasks={[TASK]}
        onClear={onClear}
        {...props}
      />
    </QueryClientProvider>,
  );
  return { onClear };
}

describe('SelectionBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bulkPatch.mockResolvedValue({ affected: 2 });
  });

  it('shows the selected count', () => {
    renderBar();
    expect(screen.getByText(/2 selecionadas/i)).toBeInTheDocument();
  });

  it('calls the unified bulk endpoint with a status action', async () => {
    renderBar();
    fireEvent.click(screen.getByRole('button', { name: /status/i }));
    fireEvent.click(screen.getByText('Feito'));
    await waitFor(() => {
      expect(bulkPatch).toHaveBeenCalledWith('sp1', {
        taskIds: ['t1', 't2'],
        action: 'status',
        status: 'feito',
      });
    });
  });

  it('calls the unified bulk endpoint with a priority action', async () => {
    renderBar();
    fireEvent.click(screen.getByRole('button', { name: /prioridade/i }));
    fireEvent.click(screen.getByText('Urgente'));
    await waitFor(() => {
      expect(bulkPatch).toHaveBeenCalledWith('sp1', {
        taskIds: ['t1', 't2'],
        action: 'priority',
        priority: 'urgente',
      });
    });
  });

  it('calls the unified bulk endpoint with a delete action and clears selection', async () => {
    const { onClear } = renderBar();
    fireEvent.click(screen.getByRole('button', { name: /excluir/i }));
    await waitFor(() => {
      expect(bulkPatch).toHaveBeenCalledWith('sp1', {
        taskIds: ['t1', 't2'],
        action: 'delete',
      });
    });
    await waitFor(() => expect(onClear).toHaveBeenCalled());
  });

  it('shows an undo toast whose action restores every deleted task', async () => {
    vi.mocked(tasksApi.restoreTask).mockResolvedValue({} as Task);
    renderBar();
    fireEvent.click(screen.getByRole('button', { name: /excluir/i }));

    await waitFor(() => expect(toast).toHaveBeenCalled());
    const opts = vi.mocked(toast).mock.calls[0][1] as {
      action: { label: string; onClick: () => void };
    };
    expect(opts.action.label).toMatch(/desfazer/i);

    opts.action.onClick();
    await waitFor(() => {
      expect(tasksApi.restoreTask).toHaveBeenCalledWith('sp1', 't1');
      expect(tasksApi.restoreTask).toHaveBeenCalledWith('sp1', 't2');
    });
  });

  it('shows the assignee name next to the avatar in the picker', () => {
    renderBar({ members: [MEMBER] });
    fireEvent.click(screen.getByRole('button', { name: /responsável/i }));
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders status dots with colors coherent with the task list', () => {
    renderBar();
    fireEvent.click(screen.getByRole('button', { name: /status/i }));
    const dot = screen.getByText('Feito').querySelector('span');
    expect(dot?.className).toContain('bg-s-done');
  });
});
