export type ThemeMode = 'light' | 'dark';

export interface UserPreferences {
  theme: ThemeMode;
}

export interface User {
  _id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  preferences?: UserPreferences;
}
