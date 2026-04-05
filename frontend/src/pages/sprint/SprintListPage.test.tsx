import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SprintListPage } from './SprintListPage';
import * as sprintsApi from '../../api/sprints.api';

vi.mock('../../api/sprints.api');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

const SPRINTS: sprintsApi.Sprint[] = [
  { _id: 's1', spaceId: 'sp1', number: 1, name: 'Alpha', startDate: '2026-03-01T00:00:00.000Z', endDate: '2026-03-14T00:00:00.000Z', status: 'completed' },
  { _id: 's2', spaceId: 'sp1', number: 2, name: 'Beta',  startDate: '2026-03-15T00:00:00.000Z', endDate: '2026-03-28T00:00:00.000Z', status: 'active' },
  { _id: 's3', spaceId: 'sp1', number: 3, name: '',      startDate: '2026-04-01T00:00:00.000Z', endDate: '2026-04-14T00:00:00.000Z', status: 'planning' },
];

function renderPage(sprints = SPRINTS) {
  vi.mocked(sprintsApi.getSprints).mockResolvedValue(sprints);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/spaces/sp1/sprints']}>
        <Routes>
          <Route path="/spaces/:spaceId/sprints" element={<SprintListPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SprintListPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders a card for each sprint', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Sprint 1')).toBeInTheDocument();
      expect(screen.getByText('Sprint 2')).toBeInTheDocument();
      expect(screen.getByText('Sprint 3')).toBeInTheDocument();
    });
  });

  it('shows sprint name when present', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.getByText('Beta')).toBeInTheDocument();
    });
  });

  it('shows status labels in portuguese', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Ativo').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Planejamento').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Concluído').length).toBeGreaterThan(0);
    });
  });

  it('shows empty state when no sprints', async () => {
    renderPage([]);
    await waitFor(() => {
      expect(screen.getByText(/nenhum sprint/i)).toBeInTheDocument();
    });
  });

  it('shows novo sprint button', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /novo sprint/i })).toBeInTheDocument();
    });
  });

  it('opens create modal when button is clicked', async () => {
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /novo sprint/i }));
    fireEvent.click(screen.getByRole('button', { name: /novo sprint/i }));
    expect(screen.getByPlaceholderText(/nome do sprint/i)).toBeInTheDocument();
  });
});
