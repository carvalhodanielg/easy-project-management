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

  it('renders an archived task with its deletion date and origin', async () => {
    vi.mocked(tasksApi.getArchivedTasks).mockResolvedValue([
      {
        _id: 't1',
        name: 'Deleted Task',
        archivedAt: '2026-03-15T12:00:00Z',
        listId: { _id: 'l1', name: 'Backlog' },
        sprintId: null,
      } as never,
    ]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Deleted Task')).toBeInTheDocument();
    });
    expect(
      screen.getByText(new Date('2026-03-15T12:00:00Z').toLocaleDateString('pt-BR'), {
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Backlog', { exact: false })).toBeInTheDocument();
  });

  it('shows the sprint name as origin when the task came from a sprint', async () => {
    vi.mocked(tasksApi.getArchivedTasks).mockResolvedValue([
      {
        _id: 't2',
        name: 'Sprint Task',
        archivedAt: '2026-03-15T12:00:00Z',
        listId: null,
        sprintId: { _id: 's1', name: 'Sprint 1', number: 1 },
      } as never,
    ]);
    renderPage();
    await waitFor(() => screen.getByText('Sprint Task'));
    expect(screen.getByText('Sprint 1', { exact: false })).toBeInTheDocument();
  });

  it('empties the task trash after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(tasksApi.getArchivedTasks).mockResolvedValue([
      {
        _id: 't1',
        name: 'Deleted Task',
        archivedAt: '2026-03-15T12:00:00Z',
        listId: { _id: 'l1', name: 'Backlog' },
        sprintId: null,
      } as never,
    ]);
    vi.mocked(tasksApi.emptyTaskTrash).mockResolvedValue({ affected: 1 });
    renderPage();
    await waitFor(() => screen.getByText('Deleted Task'));

    fireEvent.click(screen.getByRole('button', { name: /esvaziar lixeira/i }));

    await waitFor(() => {
      expect(tasksApi.emptyTaskTrash).toHaveBeenCalledWith('sp1');
    });
  });
});
