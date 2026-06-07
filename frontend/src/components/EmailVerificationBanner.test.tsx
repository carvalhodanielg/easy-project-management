import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EmailVerificationBanner } from './EmailVerificationBanner';
import * as authApi from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';

vi.mock('../api/auth.api');
vi.mock('../store/auth.store');

type StoreUser = { _id: string; email: string; emailVerified?: boolean } | null;

function mockUser(user: StoreUser) {
  const state = { user };
  vi.mocked(useAuthStore).mockImplementation((selector) =>
    selector(state as never),
  );
}

describe('EmailVerificationBanner', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders when the user email is unverified', () => {
    mockUser({ _id: 'u1', email: 'a@test.com', emailVerified: false });
    render(<EmailVerificationBanner />);
    expect(screen.getByText(/verifique seu e-mail/i)).toBeInTheDocument();
  });

  it('renders nothing when the email is verified', () => {
    mockUser({ _id: 'u1', email: 'a@test.com', emailVerified: true });
    const { container } = render(<EmailVerificationBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when there is no user', () => {
    mockUser(null);
    const { container } = render(<EmailVerificationBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('calls resendVerification when the resend button is clicked', async () => {
    mockUser({ _id: 'u1', email: 'a@test.com', emailVerified: false });
    vi.mocked(authApi.resendVerification).mockResolvedValue(undefined);

    render(<EmailVerificationBanner />);
    fireEvent.click(screen.getByRole('button', { name: /reenviar e-mail/i }));

    await waitFor(() => {
      expect(authApi.resendVerification).toHaveBeenCalledWith('a@test.com');
    });
    expect(await screen.findByText(/link reenviado/i)).toBeInTheDocument();
  });
});
