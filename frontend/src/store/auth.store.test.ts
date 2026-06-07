import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './auth.store';
import type { User } from '../types/user.types';

const USER: User = {
  _id: 'u1',
  email: 'u@e.com',
  displayName: 'U',
  avatarUrl: null,
};

describe('auth store', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('setAuth stores token, refreshToken and user together', () => {
    useAuthStore.getState().setAuth('access', 'refresh', USER);

    const state = useAuthStore.getState();
    expect(state.token).toBe('access');
    expect(state.refreshToken).toBe('refresh');
    expect(state.user).toEqual(USER);
    expect(state.isAuthenticated()).toBe(true);
  });

  it('setToken updates only the access token, keeping the refresh token', () => {
    useAuthStore.getState().setAuth('old-access', 'refresh', USER);
    useAuthStore.getState().setToken('new-access');

    const state = useAuthStore.getState();
    expect(state.token).toBe('new-access');
    expect(state.refreshToken).toBe('refresh');
  });

  it('logout clears token, refreshToken and user', () => {
    useAuthStore.getState().setAuth('access', 'refresh', USER);
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated()).toBe(false);
  });
});
