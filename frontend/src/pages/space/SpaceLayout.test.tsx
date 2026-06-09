import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SpaceLayout } from './SpaceLayout';
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
