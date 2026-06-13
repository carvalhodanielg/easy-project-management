import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DestinationPickerModal } from './DestinationPickerModal';
import type { Sprint } from '../../api/sprints.api';
import type { SprintFolder } from '../../api/sprint-folders.api';

vi.mock('../../api/sprints.api', () => ({
  getSprints: vi.fn(),
}));

vi.mock('../../api/sprint-folders.api', () => ({
  getSprintFolders: vi.fn(),
}));

vi.mock('../../api/lists.api', () => ({
  getLists: vi.fn().mockResolvedValue([]),
}));

import * as sprintsApi from '../../api/sprints.api';
import * as sprintFoldersApi from '../../api/sprint-folders.api';

function makeSprint(over: Partial<Sprint> & Pick<Sprint, '_id' | 'name'>): Sprint {
  return {
    spaceId: 'sp1',
    folderId: null,
    number: 1,
    folderNumber: null,
    startDate: '2026-03-01T00:00:00.000Z',
    endDate: '2026-03-14T00:00:00.000Z',
    status: 'planning',
    ...over,
  } as Sprint;
}

function makeFolder(over: Partial<SprintFolder> & Pick<SprintFolder, '_id' | 'name'>): SprintFolder {
  return {
    spaceId: 'sp1',
    startDayOfWeek: 1,
    durationWeeks: 2,
    autoComplete: false,
    openFutureSprints: 1,
    folderEndDate: null,
    createdAt: '',
    updatedAt: '',
    ...over,
  } as SprintFolder;
}

function renderModal(onConfirm = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={qc}>
      <DestinationPickerModal
        spaceId="sp1"
        title="Mover tarefa para"
        onConfirm={onConfirm}
        onClose={onClose}
      />
    </QueryClientProvider>,
  );
  return { onConfirm, onClose };
}

describe('DestinationPickerModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('groups sprints under their folder name as a section header', async () => {
    vi.mocked(sprintFoldersApi.getSprintFolders).mockResolvedValue([
      makeFolder({ _id: 'f1', name: 'Time Alpha' }),
    ]);
    vi.mocked(sprintsApi.getSprints).mockResolvedValue([
      makeSprint({ _id: 's1', name: 'Sprint 1', folderId: 'f1' }),
    ]);

    renderModal();

    expect(await screen.findByText('Time Alpha')).toBeInTheDocument();
    expect(screen.getByText('Sprint 1')).toBeInTheDocument();
  });

  it('shows sprints without a folder under "Sprints avulsos"', async () => {
    vi.mocked(sprintFoldersApi.getSprintFolders).mockResolvedValue([]);
    vi.mocked(sprintsApi.getSprints).mockResolvedValue([
      makeSprint({ _id: 's2', name: 'Sprint Avulsa', folderId: null }),
    ]);

    renderModal();

    expect(await screen.findByText(/sprints avulsos/i)).toBeInTheDocument();
    expect(screen.getByText('Sprint Avulsa')).toBeInTheDocument();
  });

  it('displays start and end date inline as dd/mm - dd/mm', async () => {
    vi.mocked(sprintFoldersApi.getSprintFolders).mockResolvedValue([]);
    vi.mocked(sprintsApi.getSprints).mockResolvedValue([
      makeSprint({
        _id: 's3',
        name: 'Sprint Datas',
        startDate: '2026-03-01T00:00:00.000Z',
        endDate: '2026-03-14T00:00:00.000Z',
      }),
    ]);

    renderModal();

    const opts = { day: '2-digit', month: '2-digit' } as const;
    const start = new Date('2026-03-01T00:00:00.000Z').toLocaleDateString('pt-BR', opts);
    const end = new Date('2026-03-14T00:00:00.000Z').toLocaleDateString('pt-BR', opts);

    expect(await screen.findByText(`${start} - ${end}`)).toBeInTheDocument();
  });

  it('reflects the date-derived status via the icon tooltip, with no badge', async () => {
    // Window contains "now" → derived status should be "Em progresso",
    // regardless of the raw `status` flag.
    const day = 86_400_000;
    vi.mocked(sprintFoldersApi.getSprintFolders).mockResolvedValue([]);
    vi.mocked(sprintsApi.getSprints).mockResolvedValue([
      makeSprint({
        _id: 's5',
        name: 'Sprint Em Curso',
        status: 'planning',
        startDate: new Date(Date.now() - day).toISOString(),
        endDate: new Date(Date.now() + day).toISOString(),
      }),
    ]);

    renderModal();

    // tooltip on the icon carries the derived status label
    expect(await screen.findByTitle('Em progresso')).toBeInTheDocument();
    // ...and there is no visible status badge text anymore
    expect(screen.queryByText('Em progresso')).not.toBeInTheDocument();
  });

  it('calls onConfirm with the selected sprintId', async () => {
    vi.mocked(sprintFoldersApi.getSprintFolders).mockResolvedValue([]);
    vi.mocked(sprintsApi.getSprints).mockResolvedValue([
      makeSprint({ _id: 's4', name: 'Sprint Escolhida' }),
    ]);

    const { onConfirm } = renderModal();

    fireEvent.click(await screen.findByText('Sprint Escolhida'));
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith({ sprintId: 's4' });
    });
  });

  it('closes when clicking the backdrop', async () => {
    vi.mocked(sprintFoldersApi.getSprintFolders).mockResolvedValue([]);
    vi.mocked(sprintsApi.getSprints).mockResolvedValue([]);

    const { onClose } = renderModal();

    fireEvent.click(await screen.findByTestId('destination-picker-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not close when clicking inside the modal content', async () => {
    vi.mocked(sprintFoldersApi.getSprintFolders).mockResolvedValue([]);
    vi.mocked(sprintsApi.getSprints).mockResolvedValue([]);

    const { onClose } = renderModal();

    fireEvent.click(await screen.findByText('Mover tarefa para'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps an empty state when there are no sprints', async () => {
    vi.mocked(sprintFoldersApi.getSprintFolders).mockResolvedValue([]);
    vi.mocked(sprintsApi.getSprints).mockResolvedValue([]);

    renderModal();

    expect(await screen.findByText(/nenhuma sprint disponível/i)).toBeInTheDocument();
  });
});
