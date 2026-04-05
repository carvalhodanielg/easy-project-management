import type { User } from './user.types';

export interface Note {
  _id: string;
  title: string;
  content: string;
  spaceId: string;
  sprintId: string;
  createdBy: User;
  label: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NoteComment {
  _id: string;
  noteId: string;
  author: User;
  content: string;
  edited: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotePayload {
  title: string;
  content?: string;
  label?: string;
}

export interface UpdateNotePayload {
  title?: string;
  content?: string;
  label?: string | null;
}
