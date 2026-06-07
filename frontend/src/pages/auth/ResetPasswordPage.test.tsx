import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ResetPasswordPage } from './ResetPasswordPage';
import * as authApi from '../../api/auth.api';

vi.mock('../../api/auth.api');

function renderPage(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ResetPasswordPage />
    </MemoryRouter>,
  );
}

describe('ResetPasswordPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows a request-new-link message when no token is present', () => {
    renderPage('/reset-password');
    expect(screen.getByText(/solicitar novo link/i)).toBeInTheDocument();
  });

  it('calls resetPassword with token and password when they match', async () => {
    vi.mocked(authApi.resetPassword).mockResolvedValue(undefined);
    renderPage('/reset-password?token=abc123');

    fireEvent.change(screen.getByLabelText(/nova senha/i), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), {
      target: { value: 'newpassword123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /redefinir senha/i }));

    await waitFor(() => {
      expect(authApi.resetPassword).toHaveBeenCalledWith(
        'abc123',
        'newpassword123',
      );
    });
  });

  it('blocks submission and shows an error when passwords differ', async () => {
    renderPage('/reset-password?token=abc123');

    fireEvent.change(screen.getByLabelText(/nova senha/i), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), {
      target: { value: 'different456' },
    });
    fireEvent.click(screen.getByRole('button', { name: /redefinir senha/i }));

    await waitFor(() => {
      expect(screen.getByText(/não coincidem/i)).toBeInTheDocument();
    });
    expect(authApi.resetPassword).not.toHaveBeenCalled();
  });
});
