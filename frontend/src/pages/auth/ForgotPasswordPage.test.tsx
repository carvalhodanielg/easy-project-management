import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import * as authApi from '../../api/auth.api';

vi.mock('../../api/auth.api');

function renderPage() {
  return render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>,
  );
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls forgotPassword with the entered email and shows confirmation', async () => {
    vi.mocked(authApi.forgotPassword).mockResolvedValue(undefined);
    renderPage();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@test.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enviar link/i }));

    await waitFor(() => {
      expect(authApi.forgotPassword).toHaveBeenCalledWith('user@test.com');
    });
    expect(
      screen.getByText(/se houver uma conta associada/i),
    ).toBeInTheDocument();
  });

  it('still shows the generic confirmation when the request fails', async () => {
    vi.mocked(authApi.forgotPassword).mockRejectedValue(new Error('boom'));
    renderPage();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@test.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enviar link/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/se houver uma conta associada/i),
      ).toBeInTheDocument();
    });
  });
});
