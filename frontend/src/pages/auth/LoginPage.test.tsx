import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { LoginPage } from './LoginPage';
import * as authApi from '../../api/auth.api';

vi.mock('../../api/auth.api');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders email and password fields', () => {
    renderPage();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
  });

  it('renders Claudio branding', () => {
    renderPage();
    expect(screen.getByText('Claudio')).toBeInTheDocument();
  });

  it('shows error on failed login', async () => {
    vi.mocked(authApi.login).mockRejectedValue({ response: { status: 401 } });
    renderPage();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'bad@test.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/email ou senha inválidos/i)).toBeInTheDocument();
    });
  });

  it('calls login api with form values', async () => {
    vi.mocked(authApi.login).mockResolvedValue('tok');
    vi.mocked(authApi.getMe).mockResolvedValue({ _id: '1', email: 'u@e.com', displayName: 'U', avatarUrl: null });
    renderPage();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'u@e.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({ email: 'u@e.com', password: 'pass123' });
    });
  });

  it('toggles password visibility', () => {
    renderPage();
    const passwordInput = screen.getByLabelText(/senha/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Find the toggle button (eye icon)
    const toggleBtn = screen.getByRole('button', { name: '' });
    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');
  });
});
