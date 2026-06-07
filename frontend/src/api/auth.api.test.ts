import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

import { apiClient } from './client';
import { register, login, refresh, logout } from './auth.api';

const post = vi.mocked(apiClient.post);

describe('auth api', () => {
  beforeEach(() => vi.clearAllMocks());

  it('register unwraps token + refreshToken', async () => {
    post.mockResolvedValue({
      data: { data: { token: 'a', refreshToken: 'r' } },
    } as never);

    const result = await register({
      email: 'u@e.com',
      password: 'password123',
      displayName: 'U',
    });

    expect(post).toHaveBeenCalledWith('/auth/register', {
      email: 'u@e.com',
      password: 'password123',
      displayName: 'U',
    });
    expect(result).toEqual({ token: 'a', refreshToken: 'r' });
  });

  it('login unwraps token + refreshToken', async () => {
    post.mockResolvedValue({
      data: { data: { token: 'a', refreshToken: 'r' } },
    } as never);

    const result = await login({ email: 'u@e.com', password: 'pass123' });

    expect(post).toHaveBeenCalledWith('/auth/login', {
      email: 'u@e.com',
      password: 'pass123',
    });
    expect(result).toEqual({ token: 'a', refreshToken: 'r' });
  });

  it('refresh POSTs the refresh token and returns the new access token', async () => {
    post.mockResolvedValue({
      data: { data: { token: 'new-access' } },
    } as never);

    const token = await refresh('my-refresh');

    expect(post).toHaveBeenCalledWith('/auth/refresh', {
      refreshToken: 'my-refresh',
    });
    expect(token).toBe('new-access');
  });

  it('logout POSTs the refresh token for revocation', async () => {
    post.mockResolvedValue({ data: {} } as never);

    await logout('my-refresh');

    expect(post).toHaveBeenCalledWith('/auth/logout', {
      refreshToken: 'my-refresh',
    });
  });
});
