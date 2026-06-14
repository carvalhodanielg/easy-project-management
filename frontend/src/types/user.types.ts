export type ThemeMode = 'light' | 'dark';
export type TaskGroupByPref = 'none' | 'status' | 'assignee' | 'epic';
export type TaskSubtaskModePref = 'collapsed' | 'expanded' | 'separated';

export interface UserPreferences {
  theme: ThemeMode;
  taskGroupBy?: TaskGroupByPref;
  taskSubtaskMode?: TaskSubtaskModePref;
}

export interface User {
  _id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  emailVerified?: boolean;
  preferences?: UserPreferences;
}
