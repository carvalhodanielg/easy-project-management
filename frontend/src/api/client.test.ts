import { describe, it, expect, beforeEach } from 'vitest';
import { apiClient } from './client';
import { useAuthStore } from '../store/auth.store';
import type { User } from '../types/user.types';

const USER: User = {
  _id: 'u1',
  email: 'u@e.com',
  displayName: 'U',
  avatarUrl: null,
};

// Reach into axios' registered response interceptor to drive the rejected
// (error) branch directly, without making real HTTP calls.
function rejectedHandler(): (error: unknown) => Promise<unknown> {
  const handlers = (
    apiClient.interceptors.response as unknown as {
      handlers: { rejected: (error: unknown) => Promise<unknown> }[];
    }
  ).handlers;
  return handlers[0].rejected;
}

describe('apiClient 401 handling', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
    // Stub navigation so assigning location.href doesn't hit jsdom.
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
  });

  it('logs out and redirects when a 401 has no refresh token', async () => {
    const error = {
      response: { status: 401 },
      config: { url: '/tasks', headers: {} },
    };

    await expect(rejectedHandler()(error)).rejects.toBe(error);

    expect(useAuthStore.getState().token).toBeNull();
    expect(window.location.href).toBe('/login');
  });

  it('does not refresh or clear session on a failed login (401 on /auth/login)', async () => {
    useAuthStore.getState().setAuth('access', 'refresh', USER);

    const error = {
      response: { status: 401 },
      config: { url: '/auth/login', headers: {} },
    };

    await expect(rejectedHandler()(error)).rejects.toBe(error);

    // Session is left intact; no redirect happened.
    expect(useAuthStore.getState().refreshToken).toBe('refresh');
    expect(window.location.href).toBe('');
  });
});
