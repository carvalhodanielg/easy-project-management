import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SprintDashboard } from './SprintDashboard';
import * as sprintsApi from '../../api/sprints.api';
import type { SprintStats } from '../../api/sprints.api';

vi.mock('../../api/sprints.api');
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Line: () => null,
  Bar: () => null,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

const MOCK_STATS: SprintStats = {
  totalTasks: 10,
  doneTasks: 4,
  totalPoints: 21,
  donePoints: 8,
  tasksByStatus: {
    pendente: { count: 3, points: 5 },
    em_progresso: { count: 2, points: 5 },
    em_review: { count: 1, points: 3 },
    feito: { count: 4, points: 8 },
    fechado: { count: 0, points: 0 },
  },
  tasksByAssignee: [
    { userId: 'u1', displayName: 'Alice', avatarUrl: null, count: 5, points: 13 },
    { userId: 'u2', displayName: 'Bob', avatarUrl: null, count: 3, points: 5 },
  ],
  burndown: [
    { date: '2026-04-01', ideal: 21, remaining: 21 },
    { date: '2026-04-07', ideal: 10, remaining: 13 },
    { date: '2026-04-13', ideal: 0, remaining: 13 },
  ],
  previousSprintPoints: 18,
};

function renderComponent(sprintId = 's1') {
  vi.mocked(sprintsApi.getSprintStats).mockResolvedValue(MOCK_STATS);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <SprintDashboard spaceId="sp1" sprintId={sprintId} />
    </QueryClientProvider>,
  );
}

describe('SprintDashboard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows loading state initially', () => {
    vi.mocked(sprintsApi.getSprintStats).mockReturnValue(new Promise(() => {}));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <SprintDashboard spaceId="sp1" sprintId="s1" />
      </QueryClientProvider>,
    );
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('shows total and done tasks counts', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  it('shows story points progress', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('8 / 21 pts')).toBeInTheDocument();
    });
  });

  it('shows velocity comparison with previous sprint', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/velocidade/i)).toBeInTheDocument();
      expect(screen.getByText('18 pts')).toBeInTheDocument();
    });
  });

  it('renders burndown chart', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  it('renders status distribution chart', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  it('shows assignee workload', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });
});
