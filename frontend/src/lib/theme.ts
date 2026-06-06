import type { ThemeMode } from '../types/user.types';

// localStorage key used by the persisted auth store (store/auth.store.ts).
const AUTH_STORAGE_KEY = 'atkplan-auth';

export const DEFAULT_THEME: ThemeMode = 'dark';

/** Applies the theme to the document root. CSS reacts via [data-theme]. */
export function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Reads the persisted user's theme synchronously from localStorage so it can
 * be applied before React mounts, avoiding a flash of the wrong theme (FOUC).
 */
export function getPersistedTheme(): ThemeMode {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return DEFAULT_THEME;
    const theme = JSON.parse(raw)?.state?.user?.preferences?.theme;
    return theme === 'light' || theme === 'dark' ? theme : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}
