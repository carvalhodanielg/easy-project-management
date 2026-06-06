export type ThemeMode = 'light' | 'dark';
export type TaskGroupByPref = 'none' | 'status' | 'assignee';
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
  preferences?: UserPreferences;
}
