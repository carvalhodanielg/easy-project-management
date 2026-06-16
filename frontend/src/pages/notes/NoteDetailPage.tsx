import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Check, Loader2, AlertCircle, Tag, X, Send,
  Pencil, Trash2, MessageSquare, ChevronDown, ChevronUp, BookOpen,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import * as notesApi from '../../api/notes.api';
import type { NoteComment } from '../../types/note.types';
import { cn } from '../../lib/utils';
import { notifyError } from '../../lib/toast';
import { MentionTextarea } from '../../components/ui/MentionTextarea';
import { renderMentions } from '../../components/ui/renderMentions';
import { MarkdownEditor } from '../../components/editor/MarkdownEditor';

const LABEL_COLORS: Record<string, string> = {
  ideia:      'bg-p-normal/20 text-p-normal border-p-normal/30',
  bug:        'bg-p-urgent/20 text-p-urgent border-p-urgent/30',
  melhoria:   'bg-s-progress/20 text-s-progress border-s-progress/30',
  decisão:    'bg-s-review/20 text-s-review border-s-review/30',
  revisão:    'bg-p-high/20 text-p-high border-p-high/30',
  referência: 'bg-s-done/20 text-s-done border-s-done/30',
};
const LABEL_PRESETS = Object.keys(LABEL_COLORS);

function LabelBadge({ label, onRemove }: { label: string; onRemove?: () => void }) {
  const cls = LABEL_COLORS[label] ?? 'bg-lift text-ink-dim border-line';
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', cls)}>
      <Tag size={10} />
      {label}
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 opacity-60 hover:opacity-100">
          <X size={9} />
        </button>
      )}
    </span>
  );
}

function CommentItem({
  comment, currentUserId, spaceId, noteId,
}: {
  comment: NoteComment;
  currentUserId: string;
  spaceId: string;
  noteId: string;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(comment.content);
  const [editMentionIds, setEditMentionIds] = useState<string[]>([]);

  const updateMutation = useMutation({
    mutationFn: ({ content, mentionIds }: { content: string; mentionIds: string[] }) =>
      notesApi.updateNoteComment(spaceId, noteId, comment._id, content, mentionIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['note-comments', noteId] });
      setEditing(false);
    },
    onError: (err) => notifyError(err, 'Falha ao editar o comentário. Tente novamente.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => notesApi.deleteNoteComment(spaceId, noteId, comment._id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['note-comments', noteId] }),
    onError: (err) => notifyError(err, 'Falha ao excluir o comentário. Tente novamente.'),
  });

  const isOwn = comment.author._id === currentUserId;
  const initials = comment.author.displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const date = new Date(comment.createdAt).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="flex gap-3 group">
      <div className="w-7 h-7 rounded-full bg-brand/20 text-brand text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs font-semibold text-ink">{comment.author.displayName}</span>
          <span className="text-[11px] text-ink-muted">{date}</span>
          {comment.edited && <span className="text-[10px] text-ink-muted italic">(editado)</span>}
        </div>
        {editing ? (
          <div className="space-y-2">
            <MentionTextarea
              autoFocus
              spaceId={spaceId}
              value={editVal}
              onChange={setEditVal}
              onMentionIdsChange={setEditMentionIds}
              rows={3}
              className="w-full px-3 py-2 bg-input border border-brand rounded-lg text-sm text-ink placeholder:text-ink-muted focus:outline-none resize-none transition-colors"
            />
            <div className="flex gap-2">
              <button
                onClick={() => editVal.trim() && updateMutation.mutate({ content: editVal.trim(), mentionIds: editMentionIds })}
                disabled={updateMutation.isPending || !editVal.trim()}
                className="px-2.5 py-1 bg-brand text-white text-xs rounded-md disabled:opacity-50"
              >
                {updateMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : 'Salvar'}
              </button>
              <button
                onClick={() => { setEditing(false); setEditVal(comment.content); setEditMentionIds([]); }}
                className="px-2.5 py-1 text-xs text-ink-muted hover:text-ink"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-dim leading-relaxed whitespace-pre-wrap">
            {renderMentions(comment.content)}
          </p>
        )}
      </div>
      {isOwn && !editing && (
        <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="p-1 rounded text-ink-muted hover:text-ink hover:bg-lift transition-colors"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="p-1 rounded text-ink-muted hover:text-danger hover:bg-lift transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

export function NoteDetailPage() {
  const { spaceId, noteId } = useParams<{ spaceId: string; noteId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const currentUserId = useAuthStore((s) => s.user?._id ?? '');

  const [title,        setTitle]        = useState('');
  const [content,      setContent]      = useState('');
  const [label,        setLabel]        = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [saveStatus,   setSaveStatus]   = useState<'saved' | 'saving' | 'error'>('saved');
  const [showComments,        setShowComments]        = useState(true);
  const [newComment,          setNewComment]          = useState('');
  const [newCommentMentionIds, setNewCommentMentionIds] = useState<string[]>([]);
  const contentRef = useRef(content);

  const { data: note } = useQuery({
    queryKey: ['note', noteId],
    queryFn: () => notesApi.getNote(spaceId!, noteId!),
    enabled: !!spaceId && !!noteId,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['note-comments', noteId],
    queryFn: () => notesApi.getNoteComments(spaceId!, noteId!),
    enabled: !!spaceId && !!noteId,
  });

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setLabel(note.label);
      contentRef.current = note.content;
      setSaveStatus('saved');
    }
  }, [note]);

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof notesApi.updateNote>[2]) =>
      notesApi.updateNote(spaceId!, noteId!, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['note', noteId] });
      setSaveStatus('saved');
    },
    onError: (err) => { setSaveStatus('error'); notifyError(err, 'Falha ao salvar a nota. Tente novamente.'); },
  });

  // ── Save content on blur, matching the task-description editor ────────────────

  const saveContent = useCallback(() => {
    if (contentRef.current === note?.content) return;
    setSaveStatus('saving');
    updateMutation.mutate({ content: contentRef.current });
  }, [note?.content, updateMutation]);

  const handleContentChange = (value: string) => {
    setContent(value);
    contentRef.current = value;
  };

  // ── Title ───────────────────────────────────────────────────────────────────

  const saveTitle = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== note?.title) {
      updateMutation.mutate({ title: trimmed });
    } else {
      setTitle(note?.title ?? '');
    }
    setEditingTitle(false);
  };

  // ── Label ───────────────────────────────────────────────────────────────────

  const saveLabel = (val: string | null) => {
    setLabel(val);
    setEditingLabel(false);
    updateMutation.mutate({ label: val });
  };

  // ── Comment ─────────────────────────────────────────────────────────────────

  const addCommentMutation = useMutation({
    mutationFn: () => notesApi.createNoteComment(spaceId!, noteId!, newComment.trim(), newCommentMentionIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['note-comments', noteId] });
      setNewComment('');
      setNewCommentMentionIds([]);
    },
    onError: (err) => notifyError(err, 'Falha ao adicionar comentário. Tente novamente.'),
  });

  if (!note) {
    return (
      <div className="h-full flex items-center justify-center text-ink-muted gap-2">
        <Loader2 size={16} className="animate-spin" /> Carregando…
      </div>
    );
  }

  const createdDate = new Date(note.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  const updatedDate = new Date(note.updatedAt).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="h-full flex flex-col bg-base overflow-hidden">

      {/* ── Topbar ── */}
      <header className="bg-surface border-b border-line px-5 py-2.5 flex items-center gap-3 shrink-0">

        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-lift transition-colors shrink-0"
        >
          <ArrowLeft size={15} />
        </button>

        {/* Title */}
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle();
                if (e.key === 'Escape') { setTitle(note.title); setEditingTitle(false); }
              }}
              className="text-sm font-semibold bg-transparent border-b-2 border-brand text-ink focus:outline-none w-full py-0.5"
            />
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="text-sm font-semibold text-ink hover:text-white transition-colors text-left truncate max-w-full block"
              title="Clique para renomear"
            >
              {title}
            </button>
          )}
        </div>

        {/* Save status */}
        {saveStatus === 'error' ? (
          <div className="flex items-center gap-1.5 text-xs text-danger shrink-0">
            <AlertCircle size={13} />
            <span>Erro ao salvar</span>
          </div>
        ) : saveStatus === 'saving' ? (
          <div className="flex items-center gap-1.5 text-xs text-ink-muted shrink-0">
            <Loader2 size={13} className="animate-spin" />
            <span>Salvando…</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-s-done shrink-0">
            <Check size={13} />
            <span>Salvo</span>
          </div>
        )}
      </header>

      {/* ── Main ── */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-8 pt-8 pb-16">

          {/* Metadata */}
          <div className="flex items-center gap-3 mb-6 text-xs text-ink-muted flex-wrap">
            <div className="flex items-center gap-1.5">
              <BookOpen size={11} />
              <span>
                Por <span className="text-ink-dim font-medium">{note.createdBy.displayName}</span>
              </span>
            </div>
            <span>·</span>
            <span>{createdDate}</span>
            <span>·</span>
            <span>Atualizado {updatedDate}</span>
            <span>·</span>

            {/* Label */}
            {label ? (
              <button onClick={() => setEditingLabel(true)}>
                <LabelBadge label={label} onRemove={() => saveLabel(null)} />
              </button>
            ) : (
              <button
                onClick={() => setEditingLabel(true)}
                className="flex items-center gap-1 hover:text-ink transition-colors"
              >
                <Tag size={10} /> Adicionar label
              </button>
            )}
          </div>

          {/* Label picker */}
          {editingLabel && (
            <div className="mb-5 p-3 bg-surface border border-line rounded-xl shadow-lg inline-flex flex-col gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
                Escolher label
              </p>
              <div className="flex flex-wrap gap-1.5 items-center">
                {LABEL_PRESETS.map((l) => (
                  <button key={l} onClick={() => saveLabel(l)}>
                    <LabelBadge label={l} />
                  </button>
                ))}
                {label && (
                  <button
                    onClick={() => saveLabel(null)}
                    className="text-xs text-ink-muted hover:text-danger transition-colors ml-1"
                  >
                    Remover
                  </button>
                )}
                <button onClick={() => setEditingLabel(false)} className="ml-1 text-ink-muted hover:text-ink">
                  <X size={13} />
                </button>
              </div>
            </div>
          )}

          {/* ── Editor ── */}
          <MarkdownEditor
            spaceId={spaceId!}
            value={content}
            onChange={handleContentChange}
            onBlur={saveContent}
            placeholder="Comece a escrever…"
            minHeight={480}
          />

          {/* ── Comments ── */}
          <div className="mt-12 border-t border-line pt-6">
            <button
              onClick={() => setShowComments((v) => !v)}
              className="flex items-center gap-2 w-full text-sm font-semibold text-ink-dim hover:text-ink transition-colors mb-5"
            >
              <MessageSquare size={14} />
              Comentários
              {comments.length > 0 && (
                <span className="text-xs text-ink-muted font-normal">({comments.length})</span>
              )}
              <span className="ml-auto">
                {showComments ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </span>
            </button>

            {showComments && (
              <div className="space-y-5">
                {comments.map((c) => (
                  <CommentItem
                    key={c._id}
                    comment={c}
                    currentUserId={currentUserId}
                    spaceId={spaceId!}
                    noteId={noteId!}
                  />
                ))}

                {/* New comment input */}
                <form
                  onSubmit={(e: FormEvent) => {
                    e.preventDefault();
                    if (newComment.trim()) addCommentMutation.mutate();
                  }}
                  className="flex gap-3"
                >
                  <div className="w-7 h-7 rounded-full bg-brand/20 text-brand text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {user?.displayName?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1">
                    <MentionTextarea
                      spaceId={spaceId!}
                      value={newComment}
                      onChange={setNewComment}
                      onMentionIdsChange={setNewCommentMentionIds}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && newComment.trim()) {
                          e.preventDefault();
                          addCommentMutation.mutate();
                        }
                      }}
                      rows={2}
                      placeholder="Escreva um comentário… use @ para mencionar"
                      className="w-full px-3 py-2 bg-input border border-line rounded-lg text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand resize-none transition-colors"
                    />
                    <div className="flex justify-end mt-1.5">
                      <button
                        type="submit"
                        disabled={addCommentMutation.isPending || !newComment.trim()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand hover:bg-brand-hi text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-50"
                      >
                        {addCommentMutation.isPending
                          ? <Loader2 size={11} className="animate-spin" />
                          : <Send size={11} />
                        }
                        Comentar
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
