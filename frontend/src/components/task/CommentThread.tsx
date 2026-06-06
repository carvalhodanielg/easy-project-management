import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Send, MessageSquare, Paperclip, X, Loader2 } from 'lucide-react';
import * as commentsApi from '../../api/comments.api';
import {
  deleteAttachment,
  isImage,
  resolveAttachmentUrl,
  ACCEPT_ATTACHMENTS,
  type Attachment,
} from '../../api/attachments.api';
import { useAttachmentUpload, filesFromPaste, filesFromDrop } from '../../hooks/useAttachmentUpload';
import { useAuthStore } from '../../store/auth.store';
import { MentionTextarea } from '../ui/MentionTextarea';
import { renderMentions } from '../ui/renderMentions';
import { UserAvatar } from '../ui/UserAvatar';

interface Props { spaceId: string; taskId: string; }

export function CommentThread({ spaceId, taskId }: Props) {
  const queryClient  = useQueryClient();
  const currentUser  = useAuthStore((s) => s.user);
  const [content, setContent]           = useState('');
  const [mentionIds, setMentionIds]     = useState<string[]>([]);
  const [pending, setPending]           = useState<Attachment[]>([]);
  const [dragging, setDragging]         = useState(false);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editContent, setEditContent]   = useState('');
  const [editMentionIds, setEditMentionIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploading, error: uploadError, uploadFiles } = useAttachmentUpload();

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => commentsApi.getComments(spaceId, taskId),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      commentsApi.createComment(spaceId, taskId, content, pending.map((a) => a._id), mentionIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      setContent('');
      setMentionIds([]);
      setPending([]);
    },
  });

  const canSubmit = (content.trim().length > 0 || pending.length > 0) && !createMutation.isPending && !uploading;

  async function addFiles(files: File[] | FileList) {
    const uploaded = await uploadFiles(files);
    if (uploaded.length > 0) setPending((prev) => [...prev, ...uploaded]);
  }

  async function removePending(att: Attachment) {
    setPending((prev) => prev.filter((a) => a._id !== att._id));
    try { await deleteAttachment(att._id); } catch { /* best-effort cleanup */ }
  }

  const updateMutation = useMutation({
    mutationFn: ({ id, text, ids }: { id: string; text: string; ids: string[] }) =>
      commentsApi.updateComment(spaceId, taskId, id, text, ids),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => commentsApi.deleteComment(spaceId, taskId, commentId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['comments', taskId] }),
  });

  const textareaClass = 'w-full px-3.5 py-2.5 bg-input border border-line rounded-xl text-sm text-ink placeholder:text-ink-muted resize-y focus:outline-none focus:border-brand transition-colors';

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={13} className="text-ink-muted" />
        <h4 className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
          Comentários {comments.length > 0 && `(${comments.length})`}
        </h4>
      </div>

      {/* Comments list */}
      <div className="space-y-4 mb-5">
        {comments.map((comment) => (
          <div key={comment._id} className="flex gap-3">
            <UserAvatar user={comment.author} size="xs" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm font-semibold text-ink">{comment.author.displayName}</span>
                <span className="text-xs text-ink-muted">
                  {new Date(comment.createdAt).toLocaleString('pt-BR', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
                {comment.edited && (
                  <span className="text-[11px] text-ink-muted italic">(editado)</span>
                )}
                {comment.author._id === currentUser?._id && (
                  <div className="ml-auto flex gap-0.5">
                    <button
                      aria-label="Editar"
                      onClick={() => {
                        setEditingId(comment._id);
                        setEditContent(comment.content);
                        setEditMentionIds([]);
                      }}
                      className="p-1.5 rounded text-ink-muted hover:text-ink hover:bg-lift transition-colors"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      aria-label="Excluir"
                      onClick={() => deleteMutation.mutate(comment._id)}
                      className="p-1.5 rounded text-ink-muted hover:text-danger hover:bg-lift transition-colors"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
              </div>

              {editingId === comment._id ? (
                <div>
                  <MentionTextarea
                    spaceId={spaceId}
                    value={editContent}
                    onChange={setEditContent}
                    onMentionIdsChange={setEditMentionIds}
                    rows={3}
                    className={`${textareaClass} border-brand`}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => updateMutation.mutate({ id: comment._id, text: editContent, ids: editMentionIds })}
                      disabled={updateMutation.isPending}
                      className="px-3 py-1.5 bg-brand text-white text-xs font-medium rounded-md disabled:opacity-50"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 text-xs text-ink-dim hover:text-ink rounded-md hover:bg-lift transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-3.5 py-2.5 bg-lift border border-line-dim rounded-xl">
                  <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
                    {renderMentions(comment.content)}
                  </p>
                  {comment.attachments.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-2 pt-2 border-t border-line-dim">
                      {comment.attachments.map((att) =>
                        isImage(att) ? (
                          <a
                            key={att._id}
                            href={resolveAttachmentUrl(att.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={att.originalName}
                          >
                            <img
                              src={resolveAttachmentUrl(att.url)}
                              alt={att.originalName}
                              className="max-h-40 rounded-lg border border-line-dim object-cover"
                            />
                          </a>
                        ) : (
                          <a
                            key={att._id}
                            href={resolveAttachmentUrl(att.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
                          >
                            <Paperclip size={11} /> {att.originalName}
                          </a>
                        ),
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* New comment */}
      <div className="flex gap-3">
        <UserAvatar user={currentUser ?? { displayName: '?', avatarUrl: null }} size="xs" />
        <div
          className={`flex-1 rounded-xl transition-colors ${dragging ? 'ring-2 ring-brand ring-offset-2 ring-offset-surface' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); void addFiles(filesFromDrop(e)); }}
        >
          <MentionTextarea
            spaceId={spaceId}
            value={content}
            onChange={setContent}
            onMentionIdsChange={setMentionIds}
            placeholder="Escreva um comentário… use @ para mencionar, cole ou arraste arquivos"
            rows={3}
            className={textareaClass}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey && canSubmit) createMutation.mutate();
            }}
            onPaste={(e) => {
              const files = filesFromPaste(e);
              if (files.length > 0) { e.preventDefault(); void addFiles(files); }
            }}
          />

          {/* Pending attachments */}
          {pending.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {pending.map((att) => (
                <div key={att._id} className="flex items-center gap-1.5 pl-2 pr-1 py-1 bg-lift border border-line rounded-lg">
                  {isImage(att) ? (
                    <img src={resolveAttachmentUrl(att.url)} alt={att.originalName} className="h-6 w-6 rounded object-cover" />
                  ) : (
                    <Paperclip size={12} className="text-ink-muted" />
                  )}
                  <span className="text-xs text-ink-dim max-w-[140px] truncate">{att.originalName}</span>
                  <button
                    aria-label={`Remover ${att.originalName}`}
                    onClick={() => void removePending(att)}
                    className="p-0.5 rounded text-ink-muted hover:text-danger hover:bg-surface transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {uploadError && <p className="text-xs text-danger mt-1.5">{uploadError}</p>}

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-ink-muted">Ctrl+Enter para enviar</span>
            <div className="flex items-center gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPT_ATTACHMENTS}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) void addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                aria-label="Anexar arquivo"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-ink-muted hover:text-ink hover:bg-lift rounded-lg disabled:opacity-50 transition-colors"
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
              </button>
              <button
                onClick={() => canSubmit && createMutation.mutate()}
                disabled={!canSubmit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand hover:bg-brand-hi text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-all"
              >
                <Send size={12} />
                {createMutation.isPending ? 'Enviando…' : 'Comentar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
