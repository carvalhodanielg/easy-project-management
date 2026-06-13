import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SprintListPage } from './SprintListPage';
import * as sprintsApi from '../../api/sprints.api';
import * as sprintFoldersApi from '../../api/sprint-folders.api';

vi.mock('../../api/sprints.api');
vi.mock('../../api/sprint-folders.api');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

const DAY = 86_400_000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();

// Status is derived from the date window (see lib/sprintStatus), so the raw
// `status` flag is deliberately 'planning' for all three to prove the display
// reflects the dates, not the stored flag.
const SPRINTS: sprintsApi.Sprint[] = [
  // past window → "Concluído"
  { _id: 's1', spaceId: 'sp1', folderId: null, number: 1, folderNumber: null, name: 'Alpha', startDate: iso(-30), endDate: iso(-16), status: 'planning' },
  // current window → "Ativo"
  { _id: 's2', spaceId: 'sp1', folderId: null, number: 2, folderNumber: null, name: 'Beta',  startDate: iso(-3),  endDate: iso(11), status: 'planning' },
  // future window → "Planejamento"
  { _id: 's3', spaceId: 'sp1', folderId: null, number: 3, folderNumber: null, name: '',      startDate: iso(20),  endDate: iso(34), status: 'planning' },
];

const FOLDERS: sprintFoldersApi.SprintFolder[] = [
  {
    _id: 'f1', spaceId: 'sp1', name: 'Q1 Sprints',
    startDayOfWeek: 1, durationWeeks: 2, autoComplete: false,
    openFutureSprints: 1, folderEndDate: null, createdAt: '', updatedAt: '',
  },
];

function renderPage(sprints = SPRINTS, folders: sprintFoldersApi.SprintFolder[] = []) {
  vi.mocked(sprintsApi.getSprints).mockResolvedValue(sprints);
  vi.mocked(sprintFoldersApi.getSprintFolders).mockResolvedValue(folders);
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

  it('derives status from dates: a past sprint stored as planning shows "Concluído"', async () => {
    renderPage([
      { _id: 'p1', spaceId: 'sp1', folderId: null, number: 1, folderNumber: null, name: 'Vencida', startDate: iso(-30), endDate: iso(-16), status: 'planning' },
    ]);
    await waitFor(() => expect(screen.getByText('Vencida')).toBeInTheDocument());
    expect(screen.getAllByText('Concluído').length).toBeGreaterThan(0);
    expect(screen.queryByText('Planejamento')).not.toBeInTheDocument();
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

describe('sprint card options menu', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows options button on each sprint card', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByLabelText('Opções do sprint').length).toBeGreaterThan(0);
    });
  });

  it('shows Apagar option when options menu is opened', async () => {
    renderPage();
    await waitFor(() => screen.getAllByLabelText('Opções do sprint'));
    fireEvent.click(screen.getAllByLabelText('Opções do sprint')[0]);
    expect(screen.getByRole('menuitem', { name: /apagar sprint/i })).toBeInTheDocument();
  });

  it('calls deleteSprint when Apagar sprint is clicked', async () => {
    vi.mocked(sprintsApi.deleteSprint).mockResolvedValue(undefined);
    vi.mocked(sprintsApi.getSprints).mockResolvedValue(SPRINTS);
    renderPage();
    await waitFor(() => screen.getAllByLabelText('Opções do sprint'));
    // First card in DOM is 'active' (s2) due to status ordering
    fireEvent.click(screen.getAllByLabelText('Opções do sprint')[0]);
    fireEvent.click(screen.getByRole('menuitem', { name: /apagar sprint/i }));
    await waitFor(() => {
      expect(sprintsApi.deleteSprint).toHaveBeenCalledWith('sp1', 's2');
    });
  });
});

describe('folder options menu', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows options button on folder header', async () => {
    renderPage(SPRINTS, FOLDERS);
    await waitFor(() => {
      expect(screen.getByLabelText('Opções da pasta')).toBeInTheDocument();
    });
  });

  it('shows Renomear and Apagar in folder options menu', async () => {
    renderPage(SPRINTS, FOLDERS);
    await waitFor(() => screen.getByLabelText('Opções da pasta'));
    fireEvent.click(screen.getByLabelText('Opções da pasta'));
    expect(screen.getByRole('menuitem', { name: /renomear/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /apagar pasta/i })).toBeInTheDocument();
  });

  it('calls deleteSprintFolder when Apagar pasta is clicked', async () => {
    vi.mocked(sprintFoldersApi.deleteSprintFolder).mockResolvedValue(undefined);
    renderPage(SPRINTS, FOLDERS);
    await waitFor(() => screen.getByLabelText('Opções da pasta'));
    fireEvent.click(screen.getByLabelText('Opções da pasta'));
    fireEvent.click(screen.getByRole('menuitem', { name: /apagar pasta/i }));
    await waitFor(() => {
      expect(sprintFoldersApi.deleteSprintFolder).toHaveBeenCalledWith('sp1', 'f1');
    });
  });

  it('opens rename modal with current name when Renomear is clicked', async () => {
    renderPage(SPRINTS, FOLDERS);
    await waitFor(() => screen.getByLabelText('Opções da pasta'));
    fireEvent.click(screen.getByLabelText('Opções da pasta'));
    fireEvent.click(screen.getByRole('menuitem', { name: /renomear/i }));
    expect(screen.getByDisplayValue('Q1 Sprints')).toBeInTheDocument();
  });

  it('calls updateSprintFolder on rename submit', async () => {
    vi.mocked(sprintFoldersApi.updateSprintFolder).mockResolvedValue({ ...FOLDERS[0], name: 'Novo Nome' });
    renderPage(SPRINTS, FOLDERS);
    await waitFor(() => screen.getByLabelText('Opções da pasta'));
    fireEvent.click(screen.getByLabelText('Opções da pasta'));
    fireEvent.click(screen.getByRole('menuitem', { name: /renomear/i }));
    const input = screen.getByDisplayValue('Q1 Sprints');
    fireEvent.change(input, { target: { value: 'Novo Nome' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    await waitFor(() => {
      expect(sprintFoldersApi.updateSprintFolder).toHaveBeenCalledWith('sp1', 'f1', { name: 'Novo Nome' });
    });
  });
});
