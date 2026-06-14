import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EpicRollupPanel } from './EpicRollupPanel';
import * as tasksApi from '../../api/tasks.api';
import * as sprintsApi from '../../api/sprints.api';

vi.mock('../../api/tasks.api');
vi.mock('../../api/sprints.api');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

const ROLLUP = {
  epicId: 'epic1',
  totalTasks: 2,
  doneTasks: 1,
  totalPoints: 8,
  donePoints: 5,
  progressPct: 63,
  byStatus: {} as never,
  bySprint: [
    { sprintId: 'sp-a', count: 1, points: 5, donePoints: 5 },
    { sprintId: null, count: 1, points: 3, donePoints: 0 },
  ],
};

const CHILDREN = [
  { _id: 'c1', name: 'Child A', status: 'feito', sprintId: 'sp-a', storyPoints: 5 },
  { _id: 'c2', name: 'Child B', status: 'pendente', sprintId: null, storyPoints: 3 },
];

const SPRINTS = [{ _id: 'sp-a', name: 'Sprint 1', number: 1 }];

function renderPanel() {
  vi.mocked(tasksApi.getEpicRollup).mockResolvedValue(ROLLUP as never);
  vi.mocked(tasksApi.getEpicChildren).mockResolvedValue(CHILDREN as never);
  vi.mocked(sprintsApi.getSprints).mockResolvedValue(SPRINTS as never);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/spaces/sp1']}>
        <EpicRollupPanel spaceId="sp1" epicId="epic1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('EpicRollupPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders aggregated progress and points', async () => {
    renderPanel();
    await waitFor(() => expect(screen.getByText('63%')).toBeInTheDocument());
    expect(screen.getByText('5/8')).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('groups children by sprint and backlog', async () => {
    renderPanel();
    await waitFor(() => expect(screen.getByText('Child A')).toBeInTheDocument());
    expect(screen.getByText('Child B')).toBeInTheDocument();
    expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    expect(screen.getByText('Backlog')).toBeInTheDocument();
  });

  it('adds a child to the epic via the input', async () => {
    vi.mocked(tasksApi.createTask).mockResolvedValue({ _id: 'c3' } as never);
    renderPanel();
    await waitFor(() => screen.getByPlaceholderText(/adicionar tarefa ao épico/i));
    const input = screen.getByPlaceholderText(/adicionar tarefa ao épico/i);
    fireEvent.change(input, { target: { value: 'New child' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() =>
      expect(tasksApi.createTask).toHaveBeenCalledWith('sp1', {
        name: 'New child',
        epicId: 'epic1',
      }),
    );
  });
});
