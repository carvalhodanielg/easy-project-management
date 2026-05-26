import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SprintPage } from './SprintPage';
import * as tasksApi from '../../api/tasks.api';
import * as sprintsApi from '../../api/sprints.api';
import * as notesApi from '../../api/notes.api';
import * as savedFiltersApi from '../../api/saved-filters.api';
import * as spacesApi from '../../api/spaces.api';

vi.mock('../../api/tasks.api');
vi.mock('../../api/sprints.api');
vi.mock('../../api/notes.api');
vi.mock('../../api/saved-filters.api');
vi.mock('../../api/spaces.api');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

// Minimal mock data
const SPRINT: sprintsApi.Sprint = {
  _id: 's1',
  spaceId: 'sp1',
  folderId: null,
  number: 1,
  folderNumber: null,
  name: 'Alpha',
  startDate: '2026-03-01T00:00:00.000Z',
  endDate: '2026-03-14T00:00:00.000Z',
  status: 'active',
};

function renderPage() {
  vi.mocked(sprintsApi.getSprints).mockResolvedValue([SPRINT]);
  vi.mocked(tasksApi.getTasks).mockResolvedValue([]);
  vi.mocked(tasksApi.getGroupedTasks).mockResolvedValue([]);
  vi.mocked(notesApi.getNotes).mockResolvedValue([]);
  vi.mocked(savedFiltersApi.getSavedFilters).mockResolvedValue([]);
  vi.mocked(spacesApi.getSpaceMembers).mockResolvedValue([]);

  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/spaces/sp1/sprints/s1']}>
        <Routes>
          <Route path="/spaces/:spaceId/sprints/:sprintId" element={<SprintPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SprintPage – view toggle visibility', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows Lista and Board buttons when tab is "tarefas" (default)', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /lista/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /board/i })).toBeInTheDocument();
    });
  });

  it('hides Lista and Board buttons when tab is "notas"', async () => {
    renderPage();
    // Switch to Notas tab
    await waitFor(() => screen.getByRole('button', { name: /notas/i }));
    fireEvent.click(screen.getByRole('button', { name: /notas/i }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^lista$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^board$/i })).not.toBeInTheDocument();
    });
  });

  it('hides Lista and Board buttons when tab is "dashboard"', async () => {
    renderPage();
    // Switch to Dashboard tab
    await waitFor(() => screen.getByRole('button', { name: /dashboard/i }));
    fireEvent.click(screen.getByRole('button', { name: /dashboard/i }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^lista$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^board$/i })).not.toBeInTheDocument();
    });
  });

  it('shows Lista and Board buttons again when switching back to "tarefas"', async () => {
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /notas/i }));
    fireEvent.click(screen.getByRole('button', { name: /notas/i }));
    fireEvent.click(screen.getByRole('button', { name: /tarefas/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /lista/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /board/i })).toBeInTheDocument();
    });
  });

  it('toggle container has the segmented pill style (aria-label "Modo de visualização")', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByLabelText('Modo de visualização')).toBeInTheDocument(),
    );
  });
});
