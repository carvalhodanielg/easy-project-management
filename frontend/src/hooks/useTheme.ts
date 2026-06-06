import { useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';
import { updatePreferences } from '../api/users.api';
import { applyTheme, DEFAULT_THEME } from '../lib/theme';
import type { ThemeMode } from '../types/user.types';

/**
 * Manages the light/dark theme. Source of truth is the current user's
 * persisted `preferences.theme`; changes are applied optimistically and
 * synced to the backend, reverting on failure.
 */
export function useTheme() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const theme: ThemeMode = user?.preferences?.theme ?? DEFAULT_THEME;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  async function setTheme(next: ThemeMode) {
    if (!user || next === theme) return;
    const previous = theme;
    applyTheme(next);
    setUser({ ...user, preferences: { ...user.preferences, theme: next } });
    try {
      const updated = await updatePreferences({ theme: next });
      setUser(updated);
    } catch {
      applyTheme(previous);
      setUser({ ...user, preferences: { ...user.preferences, theme: previous } });
    }
  }

  function toggleTheme() {
    return setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  return { theme, setTheme, toggleTheme };
}
