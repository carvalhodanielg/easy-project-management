import { apiClient } from './client';
import type { Note, NoteComment, CreateNotePayload, UpdateNotePayload } from '../types/note.types';

interface ApiResponse<T> { data: T }

// ── Notes ────────────────────────────────────────────────────────────────────

export async function getNotes(spaceId: string, sprintId: string): Promise<Note[]> {
  const res = await apiClient.get<ApiResponse<Note[]>>(
    `/spaces/${spaceId}/sprints/${sprintId}/notes`,
  );
  return res.data.data;
}

export async function createNote(
  spaceId: string,
  sprintId: string,
  payload: CreateNotePayload,
): Promise<Note> {
  const res = await apiClient.post<ApiResponse<Note>>(
    `/spaces/${spaceId}/sprints/${sprintId}/notes`,
    payload,
  );
  return res.data.data;
}

export async function getNote(spaceId: string, noteId: string): Promise<Note> {
  const res = await apiClient.get<ApiResponse<Note>>(
    `/spaces/${spaceId}/notes/${noteId}`,
  );
  return res.data.data;
}

export async function updateNote(
  spaceId: string,
  noteId: string,
  payload: UpdateNotePayload,
): Promise<Note> {
  const res = await apiClient.patch<ApiResponse<Note>>(
    `/spaces/${spaceId}/notes/${noteId}`,
    payload,
  );
  return res.data.data;
}

export async function deleteNote(spaceId: string, noteId: string): Promise<void> {
  await apiClient.delete(`/spaces/${spaceId}/notes/${noteId}`);
}

// ── Comments ─────────────────────────────────────────────────────────────────

export async function getNoteComments(spaceId: string, noteId: string): Promise<NoteComment[]> {
  const res = await apiClient.get<ApiResponse<NoteComment[]>>(
    `/spaces/${spaceId}/notes/${noteId}/comments`,
  );
  return res.data.data;
}

export async function createNoteComment(
  spaceId: string,
  noteId: string,
  content: string,
): Promise<NoteComment> {
  const res = await apiClient.post<ApiResponse<NoteComment>>(
    `/spaces/${spaceId}/notes/${noteId}/comments`,
    { content },
  );
  return res.data.data;
}

export async function updateNoteComment(
  spaceId: string,
  noteId: string,
  commentId: string,
  content: string,
): Promise<NoteComment> {
  const res = await apiClient.patch<ApiResponse<NoteComment>>(
    `/spaces/${spaceId}/notes/${noteId}/comments/${commentId}`,
    { content },
  );
  return res.data.data;
}

export async function deleteNoteComment(
  spaceId: string,
  noteId: string,
  commentId: string,
): Promise<void> {
  await apiClient.delete(`/spaces/${spaceId}/notes/${noteId}/comments/${commentId}`);
}
