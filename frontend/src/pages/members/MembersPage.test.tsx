import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MembersPage } from './MembersPage';
import * as spacesApi from '../../api/spaces.api';
import * as usersApi from '../../api/users.api';
import { useAuthStore } from '../../store/auth.store';

vi.mock('../../api/spaces.api');
vi.mock('../../api/users.api');
vi.mock('../../store/auth.store');
vi.mock('../../lib/toast', () => ({ notifyError: vi.fn() }));

import { notifyError } from '../../lib/toast';

const CURRENT_USER = { _id: 'u1', email: 'alice@test.com', displayName: 'Alice', avatarUrl: null };

const MEMBERS: spacesApi.SpaceMember[] = [
  {
    _id: 'm1',
    spaceId: 'sp1',
    userId: { _id: 'u1', email: 'alice@test.com', displayName: 'Alice', avatarUrl: null },
    role: 'owner',
  },
  {
    _id: 'm2',
    spaceId: 'sp1',
    userId: { _id: 'u2', email: 'bob@test.com', displayName: 'Bob', avatarUrl: null },
    role: 'viewer',
  },
];

// Same roster but the current user (Alice) is a plain editor, not the owner.
const EDITOR_MEMBERS: spacesApi.SpaceMember[] = [
  { ...MEMBERS[0], role: 'editor' },
  MEMBERS[1],
];

function renderPage(members: spacesApi.SpaceMember[] = MEMBERS) {
  vi.mocked(useAuthStore).mockReturnValue(CURRENT_USER);
  vi.mocked(spacesApi.getSpaceMembers).mockResolvedValue(members as never);

  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/spaces/sp1/members']}>
        <Routes>
          <Route path="/spaces/:spaceId/members" element={<MembersPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Wait for member data to load and editor controls to appear */
async function waitForLoaded() {
  await waitFor(() => screen.getByRole('button', { name: /adicionar membro/i }));
}

describe('MembersPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders page title', () => {
    renderPage();
    expect(screen.getByText('Membros')).toBeInTheDocument();
  });

  it('renders all member names', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  it('renders member emails', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('alice@test.com')).toBeInTheDocument();
      expect(screen.getByText('bob@test.com')).toBeInTheDocument();
    });
  });

  it('shows role badges', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Dono')).toBeInTheDocument();
      expect(screen.getByText('Visualizador')).toBeInTheDocument();
    });
  });

  it('shows "Adicionar membro" button for editors', async () => {
    renderPage();
    await waitForLoaded();
    expect(screen.getByRole('button', { name: /adicionar membro/i })).toBeInTheDocument();
  });

  it('shows search input when add button clicked', async () => {
    renderPage();
    await waitForLoaded();
    fireEvent.click(screen.getByRole('button', { name: /adicionar membro/i }));
    expect(screen.getByPlaceholderText(/buscar por email/i)).toBeInTheDocument();
  });

  it('calls searchUsers when typing in search', async () => {
    vi.mocked(usersApi.searchUsers).mockResolvedValue([]);
    renderPage();

    await waitForLoaded();
    fireEvent.click(screen.getByRole('button', { name: /adicionar membro/i }));

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/buscar por email/i), {
        target: { value: 'carol' },
      });
      // advance debounce timer
      await new Promise((r) => setTimeout(r, 350));
    });

    await waitFor(() => {
      expect(usersApi.searchUsers).toHaveBeenCalledWith('carol');
    });
  });

  it('shows search results', async () => {
    vi.mocked(usersApi.searchUsers).mockResolvedValue([
      { _id: 'u3', email: 'carol@test.com', displayName: 'Carol', avatarUrl: null },
    ]);
    renderPage();
    await waitForLoaded();
    fireEvent.click(screen.getByRole('button', { name: /adicionar membro/i }));

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/buscar por email/i), {
        target: { value: 'carol' },
      });
      await new Promise((r) => setTimeout(r, 350));
    });

    await waitFor(() => {
      expect(screen.getByText('Carol')).toBeInTheDocument();
    });
  });

  it('surfaces the backend error message when an invite fails', async () => {
    vi.mocked(usersApi.searchUsers).mockResolvedValue([]);
    vi.mocked(spacesApi.inviteSpaceMember).mockRejectedValue({
      response: { data: { error: { message: 'This user is already a member of this space' } } },
    });
    renderPage();
    await waitForLoaded();
    fireEvent.click(screen.getByRole('button', { name: /adicionar membro/i }));

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/buscar por email/i), {
        target: { value: 'carol@test.com' },
      });
      await new Promise((r) => setTimeout(r, 350));
    });

    fireEvent.click(await screen.findByRole('button', { name: /convidar/i }));

    await waitFor(() => {
      expect(screen.getByText('This user is already a member of this space')).toBeInTheDocument();
    });
  });

  it('does not show remove button for current user', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Alice'));

    // Alice is current user — no remove button in her row
    const removeButtons = screen.getAllByRole('button', { name: /remover/i });
    expect(removeButtons.length).toBe(1); // only Bob
  });

  it('marks current user row with "Você" badge', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Você')).toBeInTheDocument();
    });
  });

  it('lets the owner transfer ownership to another member', async () => {
    vi.mocked(spacesApi.transferOwnership).mockResolvedValue(undefined);
    renderPage();
    await waitForLoaded();

    fireEvent.click(screen.getByRole('button', { name: /transferir propriedade/i }));
    fireEvent.click(screen.getByRole('button', { name: /tornar dono/i }));

    await waitFor(() => {
      expect(spacesApi.transferOwnership).toHaveBeenCalledWith('sp1', 'u2');
    });
  });

  it('shows an error toast when removing a member fails', async () => {
    vi.mocked(spacesApi.removeMember).mockRejectedValue(new Error('boom'));
    renderPage();
    await waitForLoaded();

    fireEvent.click(screen.getByRole('button', { name: /remover/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => expect(notifyError).toHaveBeenCalled());
  });

  it('hides management controls from a non-owner editor', async () => {
    renderPage(EDITOR_MEMBERS);
    await waitFor(() => screen.getByText('Alice'));

    expect(screen.queryByRole('button', { name: /adicionar membro/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remover/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /transferir propriedade/i })).not.toBeInTheDocument();
  });
});
