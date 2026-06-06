import { BadRequestException } from '@nestjs/common';
import * as path from 'path';

/** Mimetypes accepted outright (images and PDF). */
const ALLOWED_MIME_PREFIXES = ['image/'];
const ALLOWED_MIME_EXACT = new Set([
  'application/pdf',
  'text/markdown',
  'text/x-markdown',
]);

/**
 * Markdown files are often sent with a generic mimetype (text/plain,
 * application/octet-stream). Allow those only when the extension is .md/.markdown.
 */
const GENERIC_MIME = new Set(['text/plain', 'application/octet-stream']);
const MARKDOWN_EXT = new Set(['.md', '.markdown']);

export function isAllowedAttachment(mimetype: string, originalname: string): boolean {
  if (ALLOWED_MIME_PREFIXES.some((p) => mimetype.startsWith(p))) return true;
  if (ALLOWED_MIME_EXACT.has(mimetype)) return true;

  const ext = path.extname(originalname).toLowerCase();
  if (GENERIC_MIME.has(mimetype) && MARKDOWN_EXT.has(ext)) return true;

  return false;
}

/** Multer fileFilter restricting uploads to images, PDF and Markdown. */
export function attachmentFileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
): void {
  if (isAllowedAttachment(file.mimetype, file.originalname)) {
    cb(null, true);
    return;
  }
  cb(new BadRequestException('Tipo de arquivo não permitido'), false);
}
