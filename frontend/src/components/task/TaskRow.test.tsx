import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TaskRow } from './TaskRow';
import type { Task } from '../../types/task.types';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn(), useParams: () => ({ spaceId: 'sp1' }) };
});

vi.mock('../../api/tasks.api', () => ({
  updateTask: vi.fn().mockResolvedValue({}),
  getTask: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../api/spaces.api', () => ({
  getSpaceMembers: vi.fn().mockResolvedValue([
    { _id: 'm1', userId: { _id: 'u2', displayName: 'Bob', email: 'bob@b.com', avatarUrl: null }, role: 'editor' },
    { _id: 'm2', userId: { _id: 'u1', displayName: 'Alice', email: 'a@b.com', avatarUrl: null }, role: 'editor' },
  ]),
}));

import * as tasksApi from '../../api/tasks.api';

const TASK: Task = {
  _id: 't1',
  name: 'Implementar autenticação',
  status: 'em_progresso',
  priority: 'alta',
  storyPoints: 5,
  dueDate: null,
  assignees: [{ _id: 'u1', email: 'a@b.com', displayName: 'Alice', avatarUrl: null }],
  tags: [{ _id: 'tg1', name: 'Backend', color: '#6366F1', spaceId: 'sp1' }],
  subtaskCount: 0,
  blockedBy: [],
  blocks: [],
  description: '',
  parentTask: null,
  isEpic: false,
  subtaskPoints: 0,
  epicId: null,
  listId: 'l1',
  sprintId: null,
  spaceId: 'sp1',
  position: 0,
  createdBy: 'u1',
  startDate: null,
  createdAt: '',
  updatedAt: '',
};

function renderRow(task: Task = TASK, props = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/spaces/sp1']}>
        <Routes>
          <Route path="/spaces/:spaceId" element={<TaskRow task={task} {...props} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TaskRow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders task name', () => {
    renderRow();
    expect(screen.getByText('Implementar autenticação')).toBeInTheDocument();
  });

  it('renders assignee avatar initial when avatarUrl is null', () => {
    renderRow();
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders assignee avatar photo when avatarUrl is set', () => {
    const taskWithPhoto = {
      ...TASK,
      assignees: [{ _id: 'u1', email: 'a@b.com', displayName: 'Alice', avatarUrl: 'https://example.com/alice.jpg' }],
    };
    renderRow(taskWithPhoto);
    const img = screen.getByAltText('Alice');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/alice.jpg');
  });

  it('renders tag', () => {
    renderRow();
    expect(screen.getByText('Backend')).toBeInTheDocument();
  });

  it('shows epic chip when the task belongs to an epic', async () => {
    vi.mocked(tasksApi.getTask).mockResolvedValue({ _id: 'e1', name: 'Onboarding' } as never);
    renderRow({ ...TASK, epicId: 'e1' });
    await waitFor(() => expect(screen.getByText('Onboarding')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /épico: onboarding/i })).toBeInTheDocument();
  });

  it('does not show an epic chip when the task has no epic', () => {
    renderRow();
    expect(screen.queryByRole('button', { name: /épico:/i })).not.toBeInTheDocument();
  });

  it('renders story points', () => {
    renderRow();
    expect(screen.getByRole('button', { name: /pontos: 5/i })).toBeInTheDocument();
  });

  it('shows read-only rolled-up points (no picker) when the task has pointed subtasks', () => {
    renderRow({ ...TASK, subtaskCount: 2, subtaskPoints: 13 });
    expect(screen.getByLabelText(/soma das subtarefas\): 13/i)).toBeInTheDocument();
    // The editable points button is replaced by the read-only sum.
    expect(screen.queryByRole('button', { name: /pontos:/i })).not.toBeInTheDocument();
  });

  it('offers a "Remover" option in the points popover that clears points', async () => {
    renderRow();
    fireEvent.click(screen.getByRole('button', { name: /pontos: 5/i }));
    const remove = screen.getByRole('button', { name: /remover pontos/i });
    fireEvent.click(remove);
    await waitFor(() =>
      expect(tasksApi.updateTask).toHaveBeenCalledWith('sp1', 't1', { storyPoints: null }),
    );
  });

  it('hides the "Remover" option when the task has no points', () => {
    renderRow({ ...TASK, storyPoints: null });
    fireEvent.click(screen.getByRole('button', { name: /adicionar pontos/i }));
    expect(screen.queryByRole('button', { name: /remover pontos/i })).not.toBeInTheDocument();
  });

  it('shows expand button when onToggleExpand is provided', () => {
    const onToggle = vi.fn();
    renderRow({ ...TASK, subtaskCount: 2 }, { onToggleExpand: onToggle });
    const btn = screen.getByRole('button', { name: /expandir|recolher/i });
    expect(btn).toBeInTheDocument();
  });

  it('calls onToggleExpand when toggle button clicked', () => {
    const onToggle = vi.fn();
    renderRow({ ...TASK, subtaskCount: 2 }, { onToggleExpand: onToggle, isExpanded: false });
    const btn = screen.getByRole('button', { name: /expandir/i });
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalled();
  });

  it('shows overdue date in red class', () => {
    const pastTask = { ...TASK, dueDate: '2020-06-15T12:00:00.000Z' };
    renderRow(pastTask);
    const dateEl = screen.getByText(/jun/i);
    expect(dateEl.className).toContain('danger');
  });

  it('shows checkbox when onSelect is provided', () => {
    const onSelect = vi.fn();
    renderRow(TASK, { onSelect, isSelected: false });
    expect(screen.getByRole('button', { name: /selecionar/i })).toBeInTheDocument();
  });

  it('calls onSelect when checkbox clicked', () => {
    const onSelect = vi.fn();
    renderRow(TASK, { onSelect, isSelected: false });
    const btn = screen.getByRole('button', { name: /selecionar/i });
    fireEvent.click(btn);
    expect(onSelect).toHaveBeenCalledWith('t1', 'main');
  });

  it('shows selected state when isSelected is true', () => {
    const onSelect = vi.fn();
    renderRow(TASK, { onSelect, isSelected: true });
    expect(screen.getByRole('button', { name: /desmarcar/i })).toBeInTheDocument();
  });

  it('shows checkbox on hover entry when only onStartSelect is provided', () => {
    const onStartSelect = vi.fn();
    renderRow(TASK, { onStartSelect, isSelected: false });
    expect(screen.getByRole('button', { name: /selecionar/i })).toBeInTheDocument();
  });

  it('calls onStartSelect when the hover checkbox is clicked', () => {
    const onStartSelect = vi.fn();
    renderRow(TASK, { onStartSelect, isSelected: false });
    fireEvent.click(screen.getByRole('button', { name: /selecionar/i }));
    expect(onStartSelect).toHaveBeenCalledWith('t1', 'main');
  });

  it('reports subtask kind when checkbox is clicked on a subtask row', () => {
    const onStartSelect = vi.fn();
    const subtask = { ...TASK, _id: 's1', parentTask: 't1' } as Task;
    renderRow(subtask, { onStartSelect, isSelected: false });
    fireEvent.click(screen.getByRole('button', { name: /selecionar/i }));
    expect(onStartSelect).toHaveBeenCalledWith('s1', 'subtask');
  });

  it('keeps the status dot visible while a selection is active', () => {
    renderRow(TASK, { onSelect: vi.fn(), isSelected: false });
    expect(screen.getByRole('button', { name: /status/i })).toBeInTheDocument();
  });

  describe('status picker', () => {
    it('status button is present in normal mode', () => {
      renderRow();
      expect(screen.getByRole('button', { name: /status/i })).toBeInTheDocument();
    });

    it('opens status dropdown when status button is clicked', () => {
      renderRow();
      const btn = screen.getByRole('button', { name: /status/i });
      fireEvent.click(btn);
      expect(screen.getByText('Pendente')).toBeInTheDocument();
      expect(screen.getByText('Em progresso')).toBeInTheDocument();
      expect(screen.getByText('Em review')).toBeInTheDocument();
      expect(screen.getByText('Feito')).toBeInTheDocument();
      expect(screen.getByText('Fechado')).toBeInTheDocument();
    });

    it('calls updateTask when a new status is selected', async () => {
      renderRow();
      fireEvent.click(screen.getByRole('button', { name: /status/i }));
      fireEvent.click(screen.getByText('Feito'));
      await waitFor(() => {
        expect(tasksApi.updateTask).toHaveBeenCalledWith('sp1', 't1', { status: 'feito' });
      });
    });

  });

  describe('inline name edit', () => {
    it('shows edit name button', () => {
      renderRow();
      expect(screen.getByRole('button', { name: /editar nome/i })).toBeInTheDocument();
    });

    it('clicking edit name button shows an input with the current name', () => {
      renderRow();
      fireEvent.click(screen.getByRole('button', { name: /editar nome/i }));
      const input = screen.getByRole('textbox', { name: /nome da tarefa/i });
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('Implementar autenticação');
    });

    it('pressing Enter in the input calls updateTask with the new name', async () => {
      vi.mocked(tasksApi.updateTask).mockResolvedValue({ ...TASK, name: 'Novo nome' } as Task);
      renderRow();
      fireEvent.click(screen.getByRole('button', { name: /editar nome/i }));
      const input = screen.getByRole('textbox', { name: /nome da tarefa/i });
      fireEvent.change(input, { target: { value: 'Novo nome' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      await waitFor(() => {
        expect(tasksApi.updateTask).toHaveBeenCalledWith('sp1', 't1', { name: 'Novo nome' });
      });
    });

    it('pressing Escape in the input cancels without calling updateTask', () => {
      renderRow();
      fireEvent.click(screen.getByRole('button', { name: /editar nome/i }));
      const input = screen.getByRole('textbox', { name: /nome da tarefa/i });
      fireEvent.change(input, { target: { value: 'Outro nome' } });
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(tasksApi.updateTask).not.toHaveBeenCalled();
      expect(screen.queryByRole('textbox', { name: /nome da tarefa/i })).not.toBeInTheDocument();
    });

    it('blur on the input confirms the name', async () => {
      vi.mocked(tasksApi.updateTask).mockResolvedValue({ ...TASK, name: 'Nome blur' } as Task);
      renderRow();
      fireEvent.click(screen.getByRole('button', { name: /editar nome/i }));
      const input = screen.getByRole('textbox', { name: /nome da tarefa/i });
      fireEvent.change(input, { target: { value: 'Nome blur' } });
      fireEvent.blur(input);
      await waitFor(() => {
        expect(tasksApi.updateTask).toHaveBeenCalledWith('sp1', 't1', { name: 'Nome blur' });
      });
    });

    it('does not call updateTask when name is unchanged', async () => {
      renderRow();
      fireEvent.click(screen.getByRole('button', { name: /editar nome/i }));
      const input = screen.getByRole('textbox', { name: /nome da tarefa/i });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(tasksApi.updateTask).not.toHaveBeenCalled();
    });
  });

  describe('inline story points edit', () => {
    it('clicking story points button opens fibonacci popover', () => {
      renderRow();
      fireEvent.click(screen.getByRole('button', { name: /pontos: 5/i }));
      expect(screen.getByRole('button', { name: /^8 pts$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^13 pts$/i })).toBeInTheDocument();
    });

    it('selecting a new value calls updateTask with storyPoints', async () => {
      vi.mocked(tasksApi.updateTask).mockResolvedValue({ ...TASK, storyPoints: 8 } as Task);
      renderRow();
      fireEvent.click(screen.getByRole('button', { name: /pontos: 5/i }));
      fireEvent.click(screen.getByRole('button', { name: /^8 pts$/i }));
      await waitFor(() => {
        expect(tasksApi.updateTask).toHaveBeenCalledWith('sp1', 't1', { storyPoints: 8 });
      });
    });

    it('selecting the current value calls updateTask with null', async () => {
      vi.mocked(tasksApi.updateTask).mockResolvedValue({ ...TASK, storyPoints: null } as Task);
      renderRow();
      fireEvent.click(screen.getByRole('button', { name: /pontos: 5/i }));
      fireEvent.click(screen.getByRole('button', { name: /^5 pts$/i }));
      await waitFor(() => {
        expect(tasksApi.updateTask).toHaveBeenCalledWith('sp1', 't1', { storyPoints: null });
      });
    });

    it('shows add points button when task has no story points', () => {
      renderRow({ ...TASK, storyPoints: null });
      expect(screen.getByRole('button', { name: /adicionar pontos/i })).toBeInTheDocument();
    });

    it('opens the popover below the trigger when there is enough space underneath', () => {
      renderRow();
      window.innerHeight = 800;
      const trigger = screen.getByRole('button', { name: /pontos: 5/i });
      vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
        top: 100, bottom: 124, left: 200, right: 240, width: 40, height: 24,
        x: 200, y: 100, toJSON: () => ({}),
      } as DOMRect);
      fireEvent.click(trigger);
      const popover = screen.getByTestId('points-popover');
      // anchored below: uses top, not bottom
      expect(popover.style.top).not.toBe('');
      expect(popover.style.bottom).toBe('');
      // top should be just under the trigger's bottom edge
      expect(parseFloat(popover.style.top)).toBeGreaterThanOrEqual(124);
    });

    it('flips the popover above the trigger when there is not enough space below', () => {
      renderRow();
      window.innerHeight = 600;
      const trigger = screen.getByRole('button', { name: /pontos: 5/i });
      // trigger sits near the bottom of the viewport
      vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
        top: 560, bottom: 584, left: 200, right: 240, width: 40, height: 24,
        x: 200, y: 560, toJSON: () => ({}),
      } as DOMRect);
      fireEvent.click(trigger);
      const popover = screen.getByTestId('points-popover');
      // anchored above: uses bottom, not top
      expect(popover.style.bottom).not.toBe('');
      expect(popover.style.top).toBe('');
      // bottom margin safeguard: keeps the popover off the window's bottom edge
      expect(parseFloat(popover.style.bottom)).toBeGreaterThan(0);
    });

    it('keeps a bottom-margin safeguard so the popover never sits flush with the window edge', () => {
      renderRow();
      window.innerHeight = 600;
      const trigger = screen.getByRole('button', { name: /pontos: 5/i });
      vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
        top: 560, bottom: 584, left: 200, right: 240, width: 40, height: 24,
        x: 200, y: 560, toJSON: () => ({}),
      } as DOMRect);
      fireEvent.click(trigger);
      const popover = screen.getByTestId('points-popover');
      // maxHeight must reserve space below so it can't touch the viewport edge
      expect(popover.style.maxHeight).not.toBe('');
    });
  });

  describe('inline assignee edit', () => {
    it('shows add assignee button', () => {
      renderRow();
      expect(screen.getByRole('button', { name: /adicionar responsável/i })).toBeInTheDocument();
    });

    it('clicking add assignee button opens member popover', async () => {
      renderRow();
      fireEvent.click(screen.getByRole('button', { name: /adicionar responsável/i }));
      await waitFor(() => {
        expect(screen.getByText('Bob')).toBeInTheDocument();
      });
    });

    it('selecting a member calls updateTask with assignees', async () => {
      vi.mocked(tasksApi.updateTask).mockResolvedValue({
        ...TASK,
        assignees: [...TASK.assignees, { _id: 'u2', displayName: 'Bob', email: 'bob@b.com', avatarUrl: null }],
      } as Task);
      renderRow();
      fireEvent.click(screen.getByRole('button', { name: /adicionar responsável/i }));
      await waitFor(() => screen.getByText('Bob'));
      fireEvent.click(screen.getByRole('button', { name: /^Bob$/i }));
      await waitFor(() => {
        expect(tasksApi.updateTask).toHaveBeenCalledWith('sp1', 't1', {
          assignees: ['u1', 'u2'],
        });
      });
    });

    it('clicking an already-assigned member removes them', async () => {
      vi.mocked(tasksApi.updateTask).mockResolvedValue({ ...TASK, assignees: [] } as Task);
      renderRow();
      fireEvent.click(screen.getByRole('button', { name: /adicionar responsável/i }));
      await waitFor(() => screen.getByText('Alice'));
      fireEvent.click(screen.getByRole('button', { name: /^Alice$/i }));
      await waitFor(() => {
        expect(tasksApi.updateTask).toHaveBeenCalledWith('sp1', 't1', { assignees: [] });
      });
    });
  });
});
