import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EpicChildrenList } from './EpicChildrenList';
import * as tasksApi from '../../api/tasks.api';

vi.mock('../../api/tasks.api');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useParams: () => ({ spaceId: 'sp1' }), useNavigate: () => vi.fn() };
});
vi.mock('../../api/spaces.api', () => ({ getSpaceMembers: vi.fn().mockResolvedValue([]) }));

const CHILDREN = [
  { _id: 'c1', name: 'Tela de login', status: 'pendente', priority: 'normal', storyPoints: null,
    dueDate: null, assignees: [], tags: [], subtaskCount: 0, blockedBy: [], blocks: [],
    description: '', parentTask: null, isEpic: false, subtaskPoints: 0, epicId: 'e1',
    listId: 'l1', sprintId: null, spaceId: 'sp1', position: 0, createdBy: 'u1',
    startDate: null, createdAt: '', updatedAt: '' },
  { _id: 'c2', name: 'Endpoint de token', status: 'feito', priority: 'normal', storyPoints: 3,
    dueDate: null, assignees: [], tags: [], subtaskCount: 0, blockedBy: [], blocks: [],
    description: '', parentTask: null, isEpic: false, subtaskPoints: 0, epicId: 'e1',
    listId: 'l1', sprintId: null, spaceId: 'sp1', position: 1, createdBy: 'u1',
    startDate: null, createdAt: '', updatedAt: '' },
];

function renderList() {
  vi.mocked(tasksApi.getEpicChildren).mockResolvedValue(CHILDREN as never);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/spaces/sp1']}>
        <Routes>
          <Route path="/spaces/:spaceId" element={<EpicChildrenList spaceId="sp1" epicId="e1" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('EpicChildrenList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches and renders the epic children', async () => {
    renderList();
    await waitFor(() => expect(screen.getByText('Tela de login')).toBeInTheDocument());
    expect(screen.getByText('Endpoint de token')).toBeInTheDocument();
    expect(tasksApi.getEpicChildren).toHaveBeenCalledWith('sp1', 'e1');
  });

  it('reveals a child\'s subtasks (third level: epic → task → subtask)', async () => {
    const childWithSubs = { ...CHILDREN[0], _id: 'c3', name: 'Tarefa com subtarefas', subtaskCount: 1 };
    vi.mocked(tasksApi.getEpicChildren).mockResolvedValue([childWithSubs] as never);
    vi.mocked(tasksApi.getSubtasks).mockResolvedValue([
      { ...CHILDREN[0], _id: 'g1', name: 'Subtarefa neta', parentTask: 'c3', epicId: null },
    ] as never);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/spaces/sp1']}>
          <Routes>
            <Route path="/spaces/:spaceId" element={<EpicChildrenList spaceId="sp1" epicId="e1" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByText('Tarefa com subtarefas')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Subtarefa neta')).toBeInTheDocument());
    expect(tasksApi.getSubtasks).toHaveBeenCalledWith('sp1', 'c3');
  });

  it('shows an empty hint when the epic has no children', async () => {
    vi.mocked(tasksApi.getEpicChildren).mockResolvedValue([] as never);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/spaces/sp1']}>
          <Routes>
            <Route path="/spaces/:spaceId" element={<EpicChildrenList spaceId="sp1" epicId="e1" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByText(/nenhuma tarefa neste épico/i)).toBeInTheDocument());
  });
});
