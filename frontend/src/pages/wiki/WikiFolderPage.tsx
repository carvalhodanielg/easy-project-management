import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as wikiApi from '../../api/wiki.api';

export function WikiFolderPage() {
  const { spaceId, folderId } = useParams<{ spaceId: string; folderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const { data: folder } = useQuery({
    queryKey: ['wiki-folder', folderId],
    queryFn: () => wikiApi.getFolders(spaceId!).then((fs) => fs.find((f) => f._id === folderId)),
    enabled: !!spaceId && !!folderId,
  });

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['wiki-documents', folderId],
    queryFn: () => wikiApi.getDocuments(spaceId!, folderId!),
    enabled: !!spaceId && !!folderId,
  });

  const createMutation = useMutation({
    mutationFn: () => wikiApi.createDocument(spaceId!, folderId!, newTitle.trim()),
    onSuccess: (doc) => {
      void queryClient.invalidateQueries({ queryKey: ['wiki-documents', folderId] });
      setNewTitle('');
      setShowCreate(false);
      navigate(`/spaces/${spaceId}/wiki/documents/${doc._id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => wikiApi.deleteDocument(spaceId!, docId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wiki-documents', folderId] }),
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #E8E8E8', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>📂 {folder?.name ?? '...'}</h2>
        <button
          onClick={() => setShowCreate(true)}
          style={{ padding: '0.4rem 0.8rem', background: '#4A90E2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}
        >
          + New Document
        </button>
      </header>

      <div style={{ flex: 1, overflow: 'auto', padding: '1rem 1.5rem' }}>
        {showCreate && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTitle.trim()) createMutation.mutate();
                if (e.key === 'Escape') { setShowCreate(false); setNewTitle(''); }
              }}
              placeholder="Document title..."
              style={{ flex: 1, padding: '0.5rem', border: '1px solid #4A90E2', borderRadius: '4px', outline: 'none', fontSize: '0.875rem' }}
            />
            <button
              onClick={() => newTitle.trim() && createMutation.mutate()}
              disabled={!newTitle.trim() || createMutation.isPending}
              style={{ padding: '0.4rem 0.8rem', background: '#4A90E2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              Create
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewTitle(''); }}
              style={{ padding: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}
            >
              ✕
            </button>
          </div>
        )}

        {isLoading && <p style={{ color: '#888' }}>Loading...</p>}

        {!isLoading && documents.length === 0 && !showCreate && (
          <p style={{ textAlign: 'center', color: '#AAA', marginTop: '3rem' }}>
            No documents yet. Click &quot;+ New Document&quot; to create one.
          </p>
        )}

        {documents.map((doc) => (
          <div
            key={doc._id}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.75rem 1rem',
              marginBottom: '0.5rem',
              background: '#fff',
              border: '1px solid #E8E8E8',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
            onClick={() => navigate(`/spaces/${spaceId}/wiki/documents/${doc._id}`)}
          >
            <span style={{ fontSize: '1rem', marginRight: '0.75rem' }}>📄</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{doc.title}</div>
              <div style={{ fontSize: '0.75rem', color: '#AAA' }}>
                {new Date(doc.updatedAt).toLocaleString()}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteMutation.mutate(doc._id);
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CCC', fontSize: '1rem', padding: '0.25rem' }}
              title="Delete document"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
