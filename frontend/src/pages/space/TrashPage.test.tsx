import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TrashPage } from './TrashPage';
import * as listsApi from '../../api/lists.api';
import * as sprintsApi from '../../api/sprints.api';
import * as tasksApi from '../../api/tasks.api';

vi.mock('../../api/lists.api');
vi.mock('../../api/sprints.api');
vi.mock('../../api/tasks.api');

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/spaces/sp1/trash']}>
        <Routes>
          <Route path="/spaces/:spaceId/trash" element={<TrashPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TrashPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listsApi.getArchivedLists).mockResolvedValue([
      { _id: 'l1', spaceId: 'sp1', name: 'Old List', position: 0 },
    ]);
    vi.mocked(sprintsApi.getArchivedSprints).mockResolvedValue([]);
    vi.mocked(tasksApi.getArchivedTasks).mockResolvedValue([]);
  });

  it('lists archived items grouped by type', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Old List')).toBeInTheDocument();
      expect(screen.getByText('Listas')).toBeInTheDocument();
    });
  });

  it('shows an empty state when nothing is archived', async () => {
    vi.mocked(listsApi.getArchivedLists).mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/lixeira vazia/i)).toBeInTheDocument();
    });
  });

  it('restores a list when Restaurar is clicked', async () => {
    vi.mocked(listsApi.restoreList).mockResolvedValue({
      _id: 'l1',
      spaceId: 'sp1',
      name: 'Old List',
      position: 0,
    });
    renderPage();
    await waitFor(() => screen.getByText('Old List'));

    fireEvent.click(screen.getByRole('button', { name: /restaurar/i }));

    await waitFor(() => {
      expect(listsApi.restoreList).toHaveBeenCalledWith('sp1', 'l1');
    });
  });

  it('permanently deletes a list after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(listsApi.permanentDeleteList).mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => screen.getByText('Old List'));

    fireEvent.click(screen.getByRole('button', { name: /excluir/i }));

    await waitFor(() => {
      expect(listsApi.permanentDeleteList).toHaveBeenCalledWith('sp1', 'l1');
    });
  });

  it('does not delete when confirmation is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    vi.mocked(listsApi.permanentDeleteList).mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => screen.getByText('Old List'));

    fireEvent.click(screen.getByRole('button', { name: /excluir/i }));

    expect(listsApi.permanentDeleteList).not.toHaveBeenCalled();
  });
});
