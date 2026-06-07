import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AcceptInvitePage } from './AcceptInvitePage';
import * as invitationsApi from '../../api/invitations.api';
import { useAuthStore } from '../../store/auth.store';
import type { InvitationContext } from '../../types/space.types';

vi.mock('../../api/invitations.api');
vi.mock('../../store/auth.store');

const VALID_INVITE: InvitationContext = {
  email: 'invitee@test.com',
  role: 'viewer',
  status: 'pending',
  valid: true,
  spaceId: 'sp1',
  spaceName: 'Team Space',
  inviterName: 'Owner',
};

function mockAuth(user: { _id: string; email: string } | null, authed: boolean) {
  const state = { user, isAuthenticated: () => authed };
  vi.mocked(useAuthStore).mockImplementation((selector) => selector(state as never));
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/invite/accept?token=tok']}>
        <Routes>
          <Route path="/invite/accept" element={<AcceptInvitePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AcceptInvitePage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the space and inviter with an accept button when the email matches', async () => {
    mockAuth({ _id: 'u1', email: 'invitee@test.com' }, true);
    vi.mocked(invitationsApi.getInvitation).mockResolvedValue(VALID_INVITE);

    renderPage();

    await waitFor(() => expect(screen.getByText('Team Space')).toBeInTheDocument());
    expect(screen.getByText('Owner', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /aceitar convite/i })).toBeInTheDocument();
  });

  it('prompts to log in or register when unauthenticated', async () => {
    mockAuth(null, false);
    vi.mocked(invitationsApi.getInvitation).mockResolvedValue(VALID_INVITE);

    renderPage();

    await waitFor(() => expect(screen.getByText(/criar conta e aceitar/i)).toBeInTheDocument());
    expect(screen.getByText(/já tenho conta/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /aceitar convite/i })).not.toBeInTheDocument();
  });

  it('warns when logged in with a different email', async () => {
    mockAuth({ _id: 'u2', email: 'someone-else@test.com' }, true);
    vi.mocked(invitationsApi.getInvitation).mockResolvedValue(VALID_INVITE);

    renderPage();

    await waitFor(() => expect(screen.getByText(/trocar de conta/i)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /aceitar convite/i })).not.toBeInTheDocument();
  });

  it('shows an unavailable state for an invalid invite', async () => {
    mockAuth({ _id: 'u1', email: 'invitee@test.com' }, true);
    vi.mocked(invitationsApi.getInvitation).mockResolvedValue({
      ...VALID_INVITE,
      valid: false,
      status: 'expired',
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/não é mais válido/i)).toBeInTheDocument(),
    );
  });
});
