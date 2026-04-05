import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Send, X, MessageSquare } from 'lucide-react';
import * as commentsApi from '../../api/comments.api';
import { useAuthStore } from '../../store/auth.store';

interface Props { spaceId: string; taskId: string; }

function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const s = size === 'md' ? 'w-8 h-8 text-xs' : 'w-6 h-6 text-[10px]';
  return (
    <span className={`${s} rounded-full bg-brand/20 text-brand font-bold flex items-center justify-center shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export function CommentThread({ spaceId, taskId }: Props) {
  const queryClient  = useQueryClient();
  const currentUser  = useAuthStore((s) => s.user);
  const [content, setContent]       = useState('');
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => commentsApi.getComments(spaceId, taskId),
  });

  const createMutation = useMutation({
    mutationFn: () => commentsApi.createComment(spaceId, taskId, content),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      setContent('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      commentsApi.updateComment(spaceId, taskId, id, text),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => commentsApi.deleteComment(spaceId, taskId, commentId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['comments', taskId] }),
  });

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
            <Avatar name={comment.author.displayName} />
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
                      onClick={() => { setEditingId(comment._id); setEditContent(comment.content); }}
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
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2.5 bg-input border border-brand rounded-lg text-sm text-ink resize-y focus:outline-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => updateMutation.mutate({ id: comment._id, text: editContent })}
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
                  <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                  {comment.attachments.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-2 pt-2 border-t border-line-dim">
                      {comment.attachments.map((att) => (
                        <a
                          key={att._id}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand hover:underline"
                        >
                          📎 {att.originalName}
                        </a>
                      ))}
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
        <Avatar name={currentUser?.displayName ?? '?'} />
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva um comentário…"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey && content.trim()) createMutation.mutate();
            }}
            className="w-full px-3.5 py-2.5 bg-input border border-line rounded-xl text-sm text-ink placeholder:text-ink-muted resize-y focus:outline-none focus:border-brand transition-colors"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-ink-muted">Ctrl+Enter para enviar</span>
            <button
              onClick={() => content.trim() && createMutation.mutate()}
              disabled={!content.trim() || createMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand hover:bg-brand-hi text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-all"
            >
              <Send size={12} />
              {createMutation.isPending ? 'Enviando…' : 'Comentar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
