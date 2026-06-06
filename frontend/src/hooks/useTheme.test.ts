import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTheme } from './useTheme';
import { useAuthStore } from '../store/auth.store';
import * as usersApi from '../api/users.api';
import type { User } from '../types/user.types';

vi.mock('../api/users.api');

const baseUser: User = {
  _id: 'u1',
  email: 'alice@example.com',
  displayName: 'Alice',
  avatarUrl: null,
  preferences: { theme: 'dark' },
};

function setUser(user: User | null) {
  useAuthStore.setState({ token: user ? 'tok' : null, user });
}

describe('useTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.removeAttribute('data-theme');
    setUser({ ...baseUser, preferences: { theme: 'dark' } });
  });

  it('derives theme from the auth store user and applies it to <html>', async () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    await waitFor(() =>
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark'),
    );
  });

  it('defaults to dark when user has no preferences', () => {
    setUser({ ...baseUser, preferences: undefined });
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('toggleTheme applies the new theme, updates the store and persists via API', async () => {
    vi.mocked(usersApi.updatePreferences).mockResolvedValue({
      ...baseUser,
      preferences: { theme: 'light' },
    });

    const { result } = renderHook(() => useTheme());

    await act(async () => {
      await result.current.toggleTheme();
    });

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(usersApi.updatePreferences).toHaveBeenCalledWith({ theme: 'light' });
    expect(useAuthStore.getState().user?.preferences?.theme).toBe('light');
  });

  it('reverts the theme when the API call fails', async () => {
    vi.mocked(usersApi.updatePreferences).mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useTheme());

    await act(async () => {
      await result.current.toggleTheme();
    });

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(useAuthStore.getState().user?.preferences?.theme).toBe('dark');
  });
});
