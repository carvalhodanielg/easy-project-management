import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TaskRowWithSubtasks } from './TaskRowWithSubtasks';
import * as tasksApi from '../../api/tasks.api';
import type { Task } from '../../types/task.types';

vi.mock('../../api/tasks.api');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn(), useParams: () => ({ spaceId: 'sp1' }) };
});

const TASK: Task = {
  _id: 't1',
  spaceId: 'sp1',
  name: 'Tarefa principal',
  status: 'pendente',
  priority: 'normal',
  storyPoints: null,
  startDate: null,
  dueDate: null,
  assignees: [],
  tags: [],
  subtaskCount: 2,
  blockedBy: [],
  blocks: [],
  description: '',
  parentTask: null,
  isEpic: false,
  subtaskPoints: 0,
  epicId: null,
  listId: 'l1',
  sprintId: null,
  position: 0,
  createdBy: 'u1',
  createdAt: '',
  updatedAt: '',
};

const SUBTASKS = [
  { ...TASK, _id: 's1', name: 'Subtarefa 1', subtaskCount: 0, parentTask: 't1' },
  { ...TASK, _id: 's2', name: 'Subtarefa 2', subtaskCount: 0, parentTask: 't1' },
];

function renderComponent(task = TASK, props: { epicDefaultExpanded?: boolean; depth?: number } = {}) {
  vi.mocked(tasksApi.getSubtasks).mockResolvedValue(SUBTASKS as never);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/spaces/sp1']}>
        <Routes>
          <Route
            path="/spaces/:spaceId"
            element={<TaskRowWithSubtasks task={task} spaceId="sp1" {...props} />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TaskRowWithSubtasks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the main task', () => {
    renderComponent();
    expect(screen.getByText('Tarefa principal')).toBeInTheDocument();
  });

  it('shows expand button when task has subtasks', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: /recolher|expandir/i })).toBeInTheDocument();
  });

  it('shows subtasks when expanded (default for tasks with subtasks)', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Subtarefa 1')).toBeInTheDocument();
      expect(screen.getByText('Subtarefa 2')).toBeInTheDocument();
    });
  });

  it('still reveals subtasks when nested under a depth (third level inside an epic)', async () => {
    renderComponent(TASK, { depth: 1 });
    await waitFor(() => {
      expect(screen.getByText('Subtarefa 1')).toBeInTheDocument();
      expect(screen.getByText('Subtarefa 2')).toBeInTheDocument();
    });
  });

  it('hides subtasks after collapsing', async () => {
    renderComponent();
    await waitFor(() => screen.getByText('Subtarefa 1'));
    fireEvent.click(screen.getByRole('button', { name: /recolher/i }));
    expect(screen.queryByText('Subtarefa 1')).not.toBeInTheDocument();
  });

  it('does not show expand button for task without subtasks', () => {
    renderComponent({ ...TASK, subtaskCount: 0 });
    expect(screen.queryByRole('button', { name: /expandir|recolher/i })).not.toBeInTheDocument();
  });

  it('shows add subtask button in normal mode', () => {
    renderComponent({ ...TASK, subtaskCount: 0 });
    expect(screen.getByRole('button', { name: /adicionar subtarefa/i })).toBeInTheDocument();
  });

  it('opens subtask input when add subtask button clicked on task with no subtasks', async () => {
    vi.mocked(tasksApi.getSubtasks).mockResolvedValue([]);
    renderComponent({ ...TASK, subtaskCount: 0 });
    fireEvent.click(screen.getByRole('button', { name: /adicionar subtarefa/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/nome da subtarefa/i)).toBeInTheDocument();
    });
  });

  it('expands and opens input when add subtask button clicked on task with existing subtasks', async () => {
    renderComponent({ ...TASK, subtaskCount: 0, _id: 't2' });
    vi.mocked(tasksApi.getSubtasks).mockResolvedValue([]);
    fireEvent.click(screen.getByRole('button', { name: /adicionar subtarefa/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/nome da subtarefa/i)).toBeInTheDocument();
    });
  });

  describe('epic rows', () => {
    const EPIC = { ...TASK, _id: 'e1', name: 'Autenticação', isEpic: true, subtaskCount: 0 };

    it('shows an expand toggle for epics even without subtasks', () => {
      renderComponent(EPIC);
      expect(screen.getByRole('button', { name: /expandir|recolher/i })).toBeInTheDocument();
    });

    it('reveals the epic children when expanded', async () => {
      vi.mocked(tasksApi.getEpicChildren).mockResolvedValue([
        { ...TASK, _id: 'k1', name: 'Filha do épico', epicId: 'e1', isEpic: false },
      ] as never);
      renderComponent(EPIC);
      fireEvent.click(screen.getByRole('button', { name: /expandir/i }));
      await waitFor(() => expect(screen.getByText('Filha do épico')).toBeInTheDocument());
      expect(tasksApi.getEpicChildren).toHaveBeenCalledWith('sp1', 'e1');
    });

    it('does not fetch epic children until expanded', () => {
      renderComponent(EPIC);
      expect(tasksApi.getEpicChildren).not.toHaveBeenCalled();
    });

    it('auto-expands and reveals children when epicDefaultExpanded is set', async () => {
      vi.mocked(tasksApi.getEpicChildren).mockResolvedValue([
        { ...TASK, _id: 'k1', name: 'Filha do épico', epicId: 'e1', isEpic: false },
      ] as never);
      renderComponent(EPIC, { epicDefaultExpanded: true });
      await waitFor(() => expect(screen.getByText('Filha do épico')).toBeInTheDocument());
      expect(tasksApi.getEpicChildren).toHaveBeenCalledWith('sp1', 'e1');
    });
  });

  it('keeps subtask section visible after adding first subtask before query refetches', async () => {
    const newSub = { ...TASK, _id: 's3', name: 'Nova subtarefa', subtaskCount: 0, parentTask: 't1' };
    vi.mocked(tasksApi.getSubtasks).mockResolvedValue([]);
    vi.mocked(tasksApi.createTask).mockResolvedValue(newSub as never);

    renderComponent({ ...TASK, subtaskCount: 0 });
    fireEvent.click(screen.getByRole('button', { name: /adicionar subtarefa/i }));

    await waitFor(() => screen.getByPlaceholderText(/nome da subtarefa/i));

    // Simulate the subtask list returning the new subtask after creation
    vi.mocked(tasksApi.getSubtasks).mockResolvedValue([newSub] as never);

    fireEvent.change(screen.getByPlaceholderText(/nome da subtarefa/i), { target: { value: 'Nova subtarefa' } });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() => {
      // Both TaskRow's + button and SubtaskList's own button are present = section still mounted
      expect(screen.getAllByRole('button', { name: /adicionar subtarefa/i })).toHaveLength(2);
    });
  });
});
