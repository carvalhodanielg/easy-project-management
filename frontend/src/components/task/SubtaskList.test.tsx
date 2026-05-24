import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SubtaskList } from './SubtaskList';
import * as tasksApi from '../../api/tasks.api';

vi.mock('../../api/tasks.api');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useParams: () => ({ spaceId: 'sp1' }), useNavigate: () => vi.fn() };
});

const SUBTASKS = [
  { _id: 's1', name: 'Subtarefa A', status: 'pendente', priority: 'normal', storyPoints: null,
    dueDate: null, assignees: [], tags: [], subtaskCount: 0, blockedBy: [], blocks: [],
    description: '', parentTask: 't1', listId: null, sprintId: null, createdAt: '', updatedAt: '' },
];

function renderComponent() {
  vi.mocked(tasksApi.getSubtasks).mockResolvedValue(SUBTASKS as never);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/spaces/sp1']}>
        <Routes>
          <Route path="/spaces/:spaceId" element={<SubtaskList spaceId="sp1" taskId="t1" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SubtaskList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders subtasks', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Subtarefa A')).toBeInTheDocument();
    });
  });

  it('shows add subtask button', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/adicionar subtarefa/i)).toBeInTheDocument();
    });
  });

  it('shows input when add button clicked', async () => {
    renderComponent();
    await waitFor(() => screen.getByText(/adicionar subtarefa/i));
    fireEvent.click(screen.getByText(/adicionar subtarefa/i));
    expect(screen.getByPlaceholderText(/nome da subtarefa/i)).toBeInTheDocument();
  });

  it('hides input on Escape', async () => {
    renderComponent();
    await waitFor(() => screen.getByText(/adicionar subtarefa/i));
    fireEvent.click(screen.getByText(/adicionar subtarefa/i));
    fireEvent.keyDown(screen.getByPlaceholderText(/nome da subtarefa/i), { key: 'Escape' });
    expect(screen.queryByPlaceholderText(/nome da subtarefa/i)).not.toBeInTheDocument();
  });

  it('auto-opens input when autoFocusAdd is true', () => {
    vi.mocked(tasksApi.getSubtasks).mockResolvedValue(SUBTASKS as never);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/spaces/sp1']}>
          <Routes>
            <Route path="/spaces/:spaceId" element={<SubtaskList spaceId="sp1" taskId="t1" autoFocusAdd />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByPlaceholderText(/nome da subtarefa/i)).toBeInTheDocument();
  });

  it('compact mode shows subtask name and no full grid row', async () => {
    vi.mocked(tasksApi.getSubtasks).mockResolvedValue(SUBTASKS as never);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/spaces/sp1']}>
          <Routes>
            <Route path="/spaces/:spaceId" element={<SubtaskList spaceId="sp1" taskId="t1" compact />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText('Subtarefa A')).toBeInTheDocument();
    });
    expect(screen.queryByRole('row')).not.toBeInTheDocument();
  });

  it('calls onAddDone when Escape is pressed on auto-focused input', () => {
    const onAddDone = vi.fn();
    vi.mocked(tasksApi.getSubtasks).mockResolvedValue(SUBTASKS as never);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/spaces/sp1']}>
          <Routes>
            <Route
              path="/spaces/:spaceId"
              element={<SubtaskList spaceId="sp1" taskId="t1" autoFocusAdd onAddDone={onAddDone} />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    fireEvent.keyDown(screen.getByPlaceholderText(/nome da subtarefa/i), { key: 'Escape' });
    expect(onAddDone).toHaveBeenCalled();
  });
});
