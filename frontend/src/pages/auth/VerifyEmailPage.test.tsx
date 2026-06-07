import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { VerifyEmailPage } from './VerifyEmailPage';
import * as authApi from '../../api/auth.api';
import { useAuthStore } from '../../store/auth.store';

vi.mock('../../api/auth.api');
vi.mock('../../store/auth.store');

function mockAuth(user: { _id: string; email: string } | null) {
  const state = { user, setUser: vi.fn() };
  vi.mocked(useAuthStore).mockImplementation((selector) =>
    selector(state as never),
  );
}

function renderPage(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth(null);
  });

  it('shows an invalid-link message when no token is present', () => {
    renderPage('/verify-email');
    expect(screen.getByText(/inválido ou incompleto/i)).toBeInTheDocument();
    expect(authApi.verifyEmail).not.toHaveBeenCalled();
  });

  it('verifies the token and shows a success message', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue(undefined);
    renderPage('/verify-email?token=tok123');

    await waitFor(() => {
      expect(screen.getByText(/verificado com sucesso/i)).toBeInTheDocument();
    });
    expect(authApi.verifyEmail).toHaveBeenCalledWith('tok123');
  });

  it('shows an error and a resend option when the token is invalid', async () => {
    vi.mocked(authApi.verifyEmail).mockRejectedValue(new Error('bad token'));
    mockAuth({ _id: 'u1', email: 'user@test.com' });
    vi.mocked(authApi.resendVerification).mockResolvedValue(undefined);

    renderPage('/verify-email?token=expired');

    const resendBtn = await screen.findByRole('button', {
      name: /reenviar e-mail/i,
    });
    fireEvent.click(resendBtn);

    await waitFor(() => {
      expect(authApi.resendVerification).toHaveBeenCalledWith('user@test.com');
    });
  });
});
