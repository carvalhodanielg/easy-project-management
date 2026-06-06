import { useState, useCallback } from 'react';
import { uploadAttachment, isAllowedFile, type Attachment } from '../api/attachments.api';

/** Extract files from a paste event (clipboard images and dropped-in files). */
export function filesFromPaste(e: React.ClipboardEvent): File[] {
  const items = Array.from(e.clipboardData?.items ?? []);
  const files = items
    .filter((it) => it.kind === 'file')
    .map((it) => it.getAsFile())
    .filter((f): f is File => f !== null);
  return files;
}

/** Extract files from a drop event. */
export function filesFromDrop(e: React.DragEvent): File[] {
  return Array.from(e.dataTransfer?.files ?? []);
}

interface UseAttachmentUpload {
  uploading: boolean;
  error: string | null;
  /** Filters to allowed types, uploads in parallel, returns the created attachments. */
  uploadFiles: (files: File[] | FileList) => Promise<Attachment[]>;
}

export function useAttachmentUpload(): UseAttachmentUpload {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFiles = useCallback(async (input: File[] | FileList): Promise<Attachment[]> => {
    const all = Array.from(input);
    const allowed = all.filter(isAllowedFile);
    if (allowed.length === 0) {
      if (all.length > 0) setError('Tipo de arquivo não permitido (use imagem, PDF ou .md)');
      return [];
    }
    setError(null);
    setUploading(true);
    try {
      const results = await Promise.all(allowed.map(uploadAttachment));
      if (allowed.length < all.length) {
        setError('Alguns arquivos foram ignorados (apenas imagem, PDF ou .md)');
      }
      return results;
    } catch {
      setError('Falha ao enviar o arquivo');
      return [];
    } finally {
      setUploading(false);
    }
  }, []);

  return { uploading, error, uploadFiles };
}
