import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SpaceLayout, SprintNavItem } from './SpaceLayout';
import { MovingSprintContext } from '../../contexts/MovingSprintContext';
import { useUiStore } from '../../store/ui.store';
import * as spacesApi from '../../api/spaces.api';
import * as listsApi from '../../api/lists.api';
import * as sprintsApi from '../../api/sprints.api';
import * as sprintFoldersApi from '../../api/sprint-folders.api';
import * as wikiApi from '../../api/wiki.api';
import * as notifApi from '../../api/notifications.api';
import type { Space } from '../../types/space.types';

vi.mock('../../api/spaces.api');
vi.mock('../../api/lists.api');
vi.mock('../../api/sprints.api');
vi.mock('../../api/sprint-folders.api');
vi.mock('../../api/wiki.api');
vi.mock('../../api/notifications.api');

const SPACE: Space = {
  _id: 'sp1',
  name: 'Meu Espaço',
  description: null,
  color: '#6366F1',
  createdBy: 'u1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderLayout(sprints: sprintsApi.Sprint[] = []) {
  vi.mocked(spacesApi.getSpace).mockResolvedValue(SPACE);
  vi.mocked(listsApi.getLists).mockResolvedValue([]);
  vi.mocked(sprintsApi.getSprints).mockResolvedValue(sprints);
  vi.mocked(sprintFoldersApi.getSprintFolders).mockResolvedValue([]);
  vi.mocked(wikiApi.getFolders).mockResolvedValue([]);
  vi.mocked(notifApi.getNotifications).mockResolvedValue([]);

  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/spaces/sp1']}>
        <Routes>
          <Route path="/spaces/:spaceId" element={<SpaceLayout />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SpaceLayout – top bar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the current space name in the top bar', async () => {
    renderLayout();
    await waitFor(() =>
      expect(screen.getByText('Meu Espaço')).toBeInTheDocument(),
    );
  });

  it('renders the search trigger', async () => {
    renderLayout();
    await waitFor(() =>
      expect(screen.getByText('Buscar…')).toBeInTheDocument(),
    );
  });

  it('renders the notification bell', async () => {
    renderLayout();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Notificações' }),
      ).toBeInTheDocument(),
    );
  });
});

describe('SpaceLayout – collapsible sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useUiStore.setState({ sidebarCollapsed: false });
  });

  it('renders the sidebar expanded by default', async () => {
    renderLayout();
    await waitFor(() => expect(screen.getByText('Meu Espaço')).toBeInTheDocument());
    expect(screen.getByRole('complementary').className).toContain('w-58');
  });

  it('collapses the sidebar when the toggle button is clicked', async () => {
    renderLayout();
    const toggle = await screen.findByRole('button', { name: /barra lateral/i });

    fireEvent.click(toggle);
    expect(screen.getByRole('complementary').className).toContain('w-0');

    fireEvent.click(toggle);
    expect(screen.getByRole('complementary').className).toContain('w-58');
  });
});

describe('SpaceLayout – sidebar sprint item', () => {
  beforeEach(() => vi.clearAllMocks());

  const ACTIVE_SPRINT: sprintsApi.Sprint = {
    _id: 'spr1',
    spaceId: 'sp1',
    folderId: null,
    number: 3,
    folderNumber: null,
    name: 'Login',
    // wide window so it is always "Em progresso" regardless of test clock
    startDate: '2000-01-01T00:00:00.000Z',
    endDate: '2099-12-31T00:00:00.000Z',
    status: 'active',
  };

  it('renders a sprint on a single compact line with status and dates', async () => {
    renderLayout([ACTIVE_SPRINT]);

    // sprint number label (no name)
    const label = await screen.findByText('Sprint 3');
    expect(label).toBeInTheDocument();

    // open–close date range in reduced dd/mm - dd/mm format on the same item
    const row = label.closest('a');
    expect(row).not.toBeNull();
    expect(row!.textContent).toMatch(/\d{2}\/\d{2}\s*-\s*\d{2}\/\d{2}/);
  });
});

describe('SpaceLayout – sprint move-in-progress indicator', () => {
  const SPRINT: sprintsApi.Sprint = {
    _id: 'spr1',
    spaceId: 'sp1',
    folderId: null,
    number: 3,
    folderNumber: null,
    name: 'Login',
    startDate: '2000-01-01T00:00:00.000Z',
    endDate: '2099-12-31T00:00:00.000Z',
    status: 'active',
  };

  function renderNavItem(movingToSprintId: string | null) {
    return render(
      <MemoryRouter>
        <MovingSprintContext.Provider value={movingToSprintId}>
          <SprintNavItem sprint={SPRINT} spaceId="sp1" />
        </MovingSprintContext.Provider>
      </MemoryRouter>,
    );
  }

  it('shows "movendo…" when this sprint is the move target', () => {
    renderNavItem('spr1');
    expect(screen.getByText('movendo…')).toBeInTheDocument();
  });

  it('does not show "movendo…" when no move is in progress', () => {
    renderNavItem(null);
    expect(screen.queryByText('movendo…')).not.toBeInTheDocument();
  });

  it('does not show "movendo…" when another sprint is the target', () => {
    renderNavItem('spr-other');
    expect(screen.queryByText('movendo…')).not.toBeInTheDocument();
  });
});

/* ── folder options menu (sprints + documents) ── */

const SPRINT_IN_FOLDER: sprintsApi.Sprint = {
  _id: 's1', spaceId: 'sp1', folderId: 'f1', number: 1, folderNumber: 1, name: '',
  startDate: '2026-03-01T00:00:00.000Z', endDate: '2026-03-14T00:00:00.000Z', status: 'planning',
};

const SPRINT_FOLDERS: sprintFoldersApi.SprintFolder[] = [
  {
    _id: 'f1', spaceId: 'sp1', name: 'Q1 Sprints',
    startDayOfWeek: 1, durationWeeks: 2, autoComplete: false,
    openFutureSprints: 1, folderEndDate: null, createdAt: '', updatedAt: '',
  },
];

const DOC_FOLDERS: wikiApi.WikiFolder[] = [
  { _id: 'w1', spaceId: 'sp1', name: 'Manuais', position: 0, createdAt: '', updatedAt: '' },
];

function renderSidebar(docFolders: wikiApi.WikiFolder[] = DOC_FOLDERS) {
  vi.mocked(spacesApi.getSpace).mockResolvedValue(SPACE);
  vi.mocked(listsApi.getLists).mockResolvedValue([]);
  vi.mocked(sprintsApi.getSprints).mockResolvedValue([SPRINT_IN_FOLDER]);
  vi.mocked(sprintFoldersApi.getSprintFolders).mockResolvedValue(SPRINT_FOLDERS);
  vi.mocked(wikiApi.getFolders).mockResolvedValue(docFolders);
  vi.mocked(notifApi.getNotifications).mockResolvedValue([]);

  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/spaces/sp1']}>
        <Routes>
          <Route path="/spaces/:spaceId" element={<SpaceLayout />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SpaceLayout – sprint folder options menu', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the contextual actions when opened', async () => {
    renderSidebar();
    await waitFor(() => screen.getByLabelText('Opções da pasta de sprints'));
    fireEvent.click(screen.getByLabelText('Opções da pasta de sprints'));
    expect(screen.getByRole('menuitem', { name: /criar sprint/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /editar nome/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /configurações da pasta/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /excluir pasta/i })).toBeInTheDocument();
  });

  it('calls createNextSprint when "Criar sprint" is clicked', async () => {
    vi.mocked(sprintFoldersApi.createNextSprint).mockResolvedValue(SPRINT_IN_FOLDER);
    renderSidebar();
    await waitFor(() => screen.getByLabelText('Opções da pasta de sprints'));
    fireEvent.click(screen.getByLabelText('Opções da pasta de sprints'));
    fireEvent.click(screen.getByRole('menuitem', { name: /criar sprint/i }));
    await waitFor(() =>
      expect(sprintFoldersApi.createNextSprint).toHaveBeenCalledWith('sp1', 'f1'),
    );
  });

  it('renames the folder inline via "Editar nome"', async () => {
    vi.mocked(sprintFoldersApi.updateSprintFolder).mockResolvedValue({ ...SPRINT_FOLDERS[0], name: 'Renomeada' });
    renderSidebar();
    await waitFor(() => screen.getByLabelText('Opções da pasta de sprints'));
    fireEvent.click(screen.getByLabelText('Opções da pasta de sprints'));
    fireEvent.click(screen.getByRole('menuitem', { name: /editar nome/i }));
    const input = screen.getByDisplayValue('Q1 Sprints');
    fireEvent.change(input, { target: { value: 'Renomeada' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() =>
      expect(sprintFoldersApi.updateSprintFolder).toHaveBeenCalledWith('sp1', 'f1', { name: 'Renomeada' }),
    );
  });

  it('opens the settings modal via "Configurações da pasta"', async () => {
    renderSidebar();
    await waitFor(() => screen.getByLabelText('Opções da pasta de sprints'));
    fireEvent.click(screen.getByLabelText('Opções da pasta de sprints'));
    fireEvent.click(screen.getByRole('menuitem', { name: /configurações da pasta/i }));
    expect(screen.getByText('Editar pasta de sprints')).toBeInTheDocument();
  });

  it('deletes the folder via "Excluir pasta"', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(sprintFoldersApi.deleteSprintFolder).mockResolvedValue(undefined);
    renderSidebar();
    await waitFor(() => screen.getByLabelText('Opções da pasta de sprints'));
    fireEvent.click(screen.getByLabelText('Opções da pasta de sprints'));
    fireEvent.click(screen.getByRole('menuitem', { name: /excluir pasta/i }));
    await waitFor(() =>
      expect(sprintFoldersApi.deleteSprintFolder).toHaveBeenCalledWith('sp1', 'f1'),
    );
  });
});

describe('SpaceLayout – documents (wiki) folders', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a document from the folder options menu', async () => {
    vi.mocked(wikiApi.createDocument).mockResolvedValue(
      { _id: 'd1' } as Awaited<ReturnType<typeof wikiApi.createDocument>>,
    );
    renderSidebar();
    await waitFor(() => screen.getByText('Documentos'));
    fireEvent.click(screen.getByText('Documentos')); // expand section
    await waitFor(() => screen.getByLabelText('Opções da pasta de documentos'));
    fireEvent.click(screen.getByLabelText('Opções da pasta de documentos'));
    fireEvent.click(screen.getByRole('menuitem', { name: /criar documento/i }));
    await waitFor(() =>
      expect(wikiApi.createDocument).toHaveBeenCalledWith('sp1', 'w1', 'Sem título'),
    );
  });

  it('creates a new documents folder from the section', async () => {
    vi.mocked(wikiApi.createFolder).mockResolvedValue(DOC_FOLDERS[0]);
    renderSidebar([]); // no folders → empty-state create button shows
    await waitFor(() => screen.getByText('Documentos'));
    fireEvent.click(screen.getByText('Documentos')); // expand section
    fireEvent.click(await screen.findByRole('button', { name: /nova pasta de documentos/i }));
    const input = screen.getByPlaceholderText(/nome da pasta/i);
    fireEvent.change(input, { target: { value: 'Especificações' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() =>
      expect(wikiApi.createFolder).toHaveBeenCalledWith('sp1', 'Especificações'),
    );
  });
});
