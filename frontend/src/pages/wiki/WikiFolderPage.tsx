import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, Trash2, X, BookOpen, Clock } from 'lucide-react';
import * as wikiApi from '../../api/wiki.api';
import { notifyError } from '../../lib/toast';

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
    onError: (err) => notifyError(err, 'Falha ao criar o documento. Tente novamente.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => wikiApi.deleteDocument(spaceId!, docId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['wiki-documents', folderId] }),
    onError: (err) => notifyError(err, 'Falha ao excluir o documento. Tente novamente.'),
  });

  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <header className="bg-surface border-b border-line shrink-0 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-lift border border-line flex items-center justify-center">
              <BookOpen size={15} className="text-ink-dim" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-ink">{folder?.name ?? '…'}</h1>
              <p className="text-xs text-ink-muted mt-0.5">
                {documents.length === 0 ? 'Nenhum documento' : `${documents.length} documento${documents.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand hover:bg-brand-hi text-white text-sm font-medium rounded-lg transition-all"
          >
            <Plus size={13} /> Novo documento
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-5">

        {/* Inline create input */}
        {showCreate && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-surface border border-brand/30 rounded-xl">
            <FileText size={15} className="text-ink-muted shrink-0" />
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTitle.trim()) createMutation.mutate();
                if (e.key === 'Escape') { setShowCreate(false); setNewTitle(''); }
              }}
              placeholder="Título do documento…"
              className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
            />
            <button
              onClick={() => newTitle.trim() && createMutation.mutate()}
              disabled={!newTitle.trim() || createMutation.isPending}
              className="px-2.5 py-1 bg-brand text-white text-xs rounded-md disabled:opacity-50 transition-all"
            >
              Criar
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewTitle(''); }}
              className="p-1 text-ink-muted hover:text-ink transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-ink-muted text-sm py-10">
            <span className="animate-spin">⟳</span> Carregando…
          </div>
        )}

        {!isLoading && documents.length === 0 && !showCreate && (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="w-14 h-14 rounded-2xl bg-lift border border-line flex items-center justify-center mb-5">
              <FileText size={22} className="text-ink-muted" />
            </div>
            <p className="text-base font-semibold text-ink-dim">Nenhum documento</p>
            <p className="text-sm text-ink-muted mt-1.5 mb-6">
              Crie o primeiro documento nesta pasta.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hi text-white text-sm font-semibold rounded-lg transition-all"
            >
              <Plus size={13} /> Criar documento
            </button>
          </div>
        )}

        {/* Document list */}
        <div className="space-y-1.5">
          {documents.map((doc) => (
            <div
              key={doc._id}
              className="group flex items-center gap-3 p-3.5 bg-surface border border-line rounded-xl cursor-pointer hover:border-brand/25 hover:bg-lift/40 transition-all"
              onClick={() => navigate(`/spaces/${spaceId}/wiki/documents/${doc._id}`)}
            >
              <div className="w-8 h-8 rounded-lg bg-lift border border-line-dim flex items-center justify-center shrink-0">
                <FileText size={14} className="text-ink-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{doc.title}</p>
                <div className="flex items-center gap-1 mt-0.5 text-xs text-ink-muted">
                  <Clock size={10} />
                  <span>
                    {new Date(doc.updatedAt).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteMutation.mutate(doc._id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-ink-muted hover:text-danger hover:bg-danger/10 transition-all"
                title="Excluir documento"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
