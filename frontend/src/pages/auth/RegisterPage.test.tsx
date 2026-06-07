import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { RegisterPage } from './RegisterPage';
import * as authApi from '../../api/auth.api';

vi.mock('../../api/auth.api');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

function renderPage(entry = '/register') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <RegisterPage />
    </MemoryRouter>,
  );
}

describe('RegisterPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the registration fields', () => {
    renderPage();
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
  });

  it('tells the user the password needs at least 8 characters', () => {
    renderPage();
    expect(screen.getByPlaceholderText(/mínimo 8 caracteres/i)).toBeInTheDocument();
  });

  it('leaves the email editable for a normal registration', () => {
    renderPage();
    const email = screen.getByLabelText(/email/i);
    expect(email).not.toBeDisabled();
    expect(email).toHaveValue('');
  });

  it('pre-fills and disables the email when it comes from an invite link', () => {
    renderPage('/register?email=invitee%40test.com&redirect=%2Finvite%2Faccept%3Ftoken%3Dtok');
    const email = screen.getByLabelText(/email/i);
    expect(email).toHaveValue('invitee@test.com');
    expect(email).toBeDisabled();
  });

  it('shows the backend error message on a failed registration', async () => {
    vi.mocked(authApi.register).mockRejectedValue({
      response: { data: { error: { message: 'Email already in use' } } },
    });
    renderPage();

    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Carol' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'carol@test.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() => {
      expect(screen.getByText('Email already in use')).toBeInTheDocument();
    });
  });

  it('shows the first validation message when the backend returns an array', async () => {
    vi.mocked(authApi.register).mockRejectedValue({
      response: { data: { error: { message: ['email must be an email', 'x'] } } },
    });
    renderPage();

    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Carol' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'carol@test.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() => {
      expect(screen.getByText('email must be an email')).toBeInTheDocument();
    });
  });
});
