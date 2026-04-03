import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MDEditor from '@uiw/react-md-editor';
import * as wikiApi from '../../api/wiki.api';

const AUTOSAVE_DELAY_MS = 1500;

export function WikiDocumentPage() {
  const { spaceId, documentId } = useParams<{ spaceId: string; documentId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: doc } = useQuery({
    queryKey: ['wiki-document', documentId],
    queryFn: () => wikiApi.getDocument(spaceId!, documentId!),
    enabled: !!spaceId && !!documentId,
  });

  useEffect(() => {
    if (doc) {
      setContent(doc.content);
      setTitle(doc.title);
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

  const saveContent = useCallback((newContent: string) => {
    setSaveStatus('saving');
    updateMutation.mutate({ content: newContent });
  }, [updateMutation]);

  const handleContentChange = (value: string | undefined) => {
    const newValue = value ?? '';
    setContent(newValue);
    setSaveStatus('unsaved');

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveContent(newValue), AUTOSAVE_DELAY_MS);
  };

  const saveTitle = () => {
    if (title.trim() && title !== doc?.title) {
      updateMutation.mutate({ title: title.trim() });
    }
    setEditingTitle(false);
  };

  if (!doc) {
    return (
      <div style={{ padding: '2rem', color: '#888', textAlign: 'center' }}>Loading document...</div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid #E8E8E8', background: '#fff', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={() => navigate(`/spaces/${spaceId}/wiki/folders/${doc.folderId}`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '0.8rem' }}
        >
          ← Back
        </button>

        <div style={{ flex: 1 }}>
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
              style={{ fontSize: '1.1rem', fontWeight: 700, border: 'none', borderBottom: '2px solid #4A90E2', outline: 'none', width: '100%', padding: '0.1rem 0' }}
            />
          ) : (
            <h2
              onClick={() => setEditingTitle(true)}
              style={{ margin: 0, fontSize: '1.1rem', cursor: 'text' }}
              title="Click to rename"
            >
              {title}
            </h2>
          )}
        </div>

        <span style={{ fontSize: '0.75rem', color: saveStatus === 'saved' ? '#52C41A' : saveStatus === 'saving' ? '#FA8C16' : '#FF4D4F' }}>
          {saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'saving' ? 'Saving...' : '● Unsaved'}
        </span>
      </header>

      {/* Editor */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }} data-color-mode="light">
        <MDEditor
          value={content}
          onChange={handleContentChange}
          height="100%"
          style={{ minHeight: '400px' }}
        />
      </div>
    </div>
  );
}
