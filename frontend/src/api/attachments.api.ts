import { apiClient } from './client';

interface ApiResponse<T> { data: T; }

export interface Attachment {
  _id: string;
  originalName: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

/** The `accept` attribute for file inputs: images, PDF and Markdown. */
export const ACCEPT_ATTACHMENTS = 'image/*,application/pdf,.md,.markdown,text/markdown';

const GENERIC_MIME = new Set(['text/plain', 'application/octet-stream', '']);

/** Mirrors the backend guard: allow images, PDF and Markdown only. */
export function isAllowedFile(file: File): boolean {
  const { type, name } = file;
  if (type.startsWith('image/')) return true;
  if (type === 'application/pdf') return true;
  if (type === 'text/markdown' || type === 'text/x-markdown') return true;
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  if (GENERIC_MIME.has(type) && (ext === '.md' || ext === '.markdown')) return true;
  return false;
}

/** Absolute URL for a stored attachment (the API serves /uploads/* statically). */
export function resolveAttachmentUrl(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  const base = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function isImage(att: Pick<Attachment, 'mimeType'>): boolean {
  return att.mimeType.startsWith('image/');
}

/** Markdown snippet to embed an attachment inline (image embed, otherwise a link). */
export function buildMarkdownEmbed(att: Attachment): string {
  const url = resolveAttachmentUrl(att.url);
  return isImage(att) ? `![${att.originalName}](${url})` : `[${att.originalName}](${url})`;
}

export async function uploadAttachment(file: File): Promise<Attachment> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post<ApiResponse<Attachment>>(
    '/attachments/upload',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data.data;
}

export async function deleteAttachment(id: string): Promise<void> {
  await apiClient.delete(`/attachments/${id}`);
}
