import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Loader2, AlertCircle } from 'lucide-react';
import * as wikiApi from '../../api/wiki.api';
import { MarkdownEditor } from '../../components/editor/MarkdownEditor';

export function WikiDocumentPage() {
  const { spaceId, documentId } = useParams<{ spaceId: string; documentId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [content,      setContent]      = useState('');
  const [title,        setTitle]        = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [saveStatus,   setSaveStatus]   = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const contentRef = useRef('');

  const { data: doc } = useQuery({
    queryKey: ['wiki-document', documentId],
    queryFn: () => wikiApi.getDocument(spaceId!, documentId!),
    enabled: !!spaceId && !!documentId,
  });

  useEffect(() => {
    if (doc) {
      setContent(doc.content);
      setTitle(doc.title);
      contentRef.current = doc.content;
      setSaveStatus('saved');
    }
  }, [doc]);

  const updateMutation = useMutation({
    mutationFn: (payload: { title?: string; content?: string }) =>
      wikiApi.updateDocument(spaceId!, documentId!, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['wiki-document', documentId] });
      setSaveStatus('saved');
    },
    onError: () => setSaveStatus('unsaved'),
  });

  // Save on blur, matching the task-description editor behavior.
  const saveContent = useCallback(() => {
    if (contentRef.current === doc?.content) return;
    setSaveStatus('saving');
    updateMutation.mutate({ content: contentRef.current });
  }, [doc?.content, updateMutation]);

  const handleContentChange = (value: string) => {
    setContent(value);
    contentRef.current = value;
    setSaveStatus('unsaved');
  };

  const saveTitle = () => {
    if (title.trim() && title !== doc?.title) {
      updateMutation.mutate({ title: title.trim() });
    }
    setEditingTitle(false);
  };

  if (!doc) {
    return (
      <div className="h-full flex items-center justify-center text-ink-muted text-sm gap-2">
        <Loader2 size={16} className="animate-spin" /> Carregando documento…
      </div>
    );
  }

  const SaveIcon = saveStatus === 'saved'   ? Check
                 : saveStatus === 'saving'  ? Loader2
                 : AlertCircle;
  const saveColor = saveStatus === 'saved'   ? 'text-s-done'
                  : saveStatus === 'saving'  ? 'text-s-review'
                  : 'text-danger';
  const saveLabel = saveStatus === 'saved'   ? 'Salvo'
                  : saveStatus === 'saving'  ? 'Salvando…'
                  : 'Não salvo';

  return (
    <div className="h-full flex flex-col bg-base">

      {/* Header */}
      <header className="bg-surface border-b border-line px-6 py-3 flex items-center gap-4 shrink-0">
        <button
          onClick={() => navigate(`/spaces/${spaceId}/wiki/folders/${doc.folderId}`)}
          className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft size={14} /> Voltar
        </button>

        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle();
                if (e.key === 'Escape') { setTitle(doc.title); setEditingTitle(false); }
              }}
              className="text-base font-semibold bg-transparent border-b-2 border-brand text-ink focus:outline-none w-full py-0.5"
            />
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="text-base font-semibold text-ink hover:text-white transition-colors text-left truncate max-w-full"
              title="Clique para renomear"
            >
              {title}
            </button>
          )}
        </div>

        <div className={`flex items-center gap-1.5 text-xs font-medium ${saveColor}`}>
          <SaveIcon size={12} className={saveStatus === 'saving' ? 'animate-spin' : ''} />
          {saveLabel}
        </div>
      </header>

      {/* Editor */}
      <div className="flex-1 overflow-auto p-6">
        <MarkdownEditor
          spaceId={spaceId!}
          value={content}
          onChange={handleContentChange}
          onBlur={saveContent}
          placeholder="Comece a escrever…"
          minHeight={480}
        />
      </div>
    </div>
  );
}
