import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, RotateCcw, Loader2, List as ListIcon, Zap, CheckSquare } from 'lucide-react';
import * as listsApi from '../../api/lists.api';
import * as sprintsApi from '../../api/sprints.api';
import * as tasksApi from '../../api/tasks.api';
import { notifyError } from '../../lib/toast';

type ItemKind = 'list' | 'sprint' | 'task';

interface TrashRowProps {
  icon: React.ElementType;
  name: string;
  meta?: React.ReactNode;
  onRestore: () => void;
  onDelete: () => void;
  busy: boolean;
}

function TrashRow({ icon: Icon, name, meta, onRestore, onDelete, busy }: TrashRowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-surface border border-line rounded-lg">
      <Icon size={15} className="shrink-0 text-ink-muted" />
      <div className="flex-1 min-w-0">
        <span className="block truncate text-sm text-ink">{name || 'Sem nome'}</span>
        {meta && <span className="block truncate text-xs text-ink-muted">{meta}</span>}
      </div>
      <button
        type="button"
        onClick={onRestore}
        disabled={busy}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-ink-dim hover:text-brand hover:bg-brand/10 rounded-md transition-colors disabled:opacity-50"
      >
        <RotateCcw size={13} /> Restaurar
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-ink-dim hover:text-danger hover:bg-danger/10 rounded-md transition-colors disabled:opacity-50"
      >
        <Trash2 size={13} /> Excluir
      </button>
    </div>
  );
}

export function TrashPage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const queryClient = useQueryClient();

  const listsQuery = useQuery({
    queryKey: ['trash', 'lists', spaceId],
    queryFn: () => listsApi.getArchivedLists(spaceId!),
    enabled: !!spaceId,
  });
  const sprintsQuery = useQuery({
    queryKey: ['trash', 'sprints', spaceId],
    queryFn: () => sprintsApi.getArchivedSprints(spaceId!),
    enabled: !!spaceId,
  });
  const tasksQuery = useQuery({
    queryKey: ['trash', 'tasks', spaceId],
    queryFn: () => tasksApi.getArchivedTasks(spaceId!),
    enabled: !!spaceId,
  });

  // Restoring or purging an item must refresh both the trash and the active
  // listings (the sidebar lists/sprints and the board tasks) for this space.
  function invalidateAll() {
    void queryClient.invalidateQueries({ queryKey: ['trash'] });
    void queryClient.invalidateQueries({ queryKey: ['lists', spaceId] });
    void queryClient.invalidateQueries({ queryKey: ['sprints', spaceId] });
    void queryClient.invalidateQueries({ queryKey: ['tasks', spaceId] });
  }

  const restore = useMutation<unknown, Error, { kind: ItemKind; id: string }>({
    mutationFn: ({ kind, id }) => {
      if (kind === 'list') return listsApi.restoreList(spaceId!, id);
      if (kind === 'sprint') return sprintsApi.restoreSprint(spaceId!, id);
      return tasksApi.restoreTask(spaceId!, id);
    },
    onSuccess: invalidateAll,
    onError: (err) => notifyError(err, 'Falha ao restaurar o item. Tente novamente.'),
  });

  const purge = useMutation({
    mutationFn: ({ kind, id }: { kind: ItemKind; id: string }) => {
      if (kind === 'list') return listsApi.permanentDeleteList(spaceId!, id);
      if (kind === 'sprint') return sprintsApi.permanentDeleteSprint(spaceId!, id);
      return tasksApi.permanentDeleteTask(spaceId!, id);
    },
    onSuccess: invalidateAll,
    onError: (err) => notifyError(err, 'Falha ao excluir o item definitivamente. Tente novamente.'),
  });

  const emptyTrash = useMutation({
    mutationFn: () => tasksApi.emptyTaskTrash(spaceId!),
    onSuccess: invalidateAll,
    onError: (err) => notifyError(err, 'Falha ao esvaziar a lixeira. Tente novamente.'),
  });

  const busy = restore.isPending || purge.isPending || emptyTrash.isPending;

  function handleEmptyTaskTrash() {
    if (
      window.confirm(
        'Esvaziar a lixeira de tarefas? Esta ação não pode ser desfeita.',
      )
    ) {
      emptyTrash.mutate();
    }
  }

  function handleDelete(kind: ItemKind, id: string, name: string) {
    if (
      window.confirm(
        `Excluir "${name}" definitivamente? Esta ação não pode ser desfeita.`,
      )
    ) {
      purge.mutate({ kind, id });
    }
  }

  const lists = listsQuery.data ?? [];
  const sprints = sprintsQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];
  const isLoading =
    listsQuery.isLoading || sprintsQuery.isLoading || tasksQuery.isLoading;
  const isEmpty =
    !isLoading && lists.length === 0 && sprints.length === 0 && tasks.length === 0;

  return (
    <div className="flex-1 overflow-auto px-8 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2.5 mb-6">
          <Trash2 size={18} className="text-ink-muted" />
          <h1 className="text-xl font-bold text-ink">Lixeira</h1>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-24 text-ink-muted gap-2">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Carregando…</span>
          </div>
        )}

        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-surface border border-line flex items-center justify-center mb-5">
              <Trash2 size={22} className="text-ink-muted" />
            </div>
            <p className="text-sm font-semibold text-ink mb-1">Lixeira vazia</p>
            <p className="text-sm text-ink-dim max-w-xs">
              Itens arquivados aparecem aqui e podem ser restaurados ou excluídos
              definitivamente.
            </p>
          </div>
        )}

        {!isLoading && lists.length > 0 && (
          <section className="mb-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted mb-2">
              Listas
            </h2>
            <div className="space-y-1.5">
              {lists.map((l) => (
                <TrashRow
                  key={l._id}
                  icon={ListIcon}
                  name={l.name}
                  busy={busy}
                  onRestore={() => restore.mutate({ kind: 'list', id: l._id })}
                  onDelete={() => handleDelete('list', l._id, l.name)}
                />
              ))}
            </div>
          </section>
        )}

        {!isLoading && sprints.length > 0 && (
          <section className="mb-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted mb-2">
              Sprints
            </h2>
            <div className="space-y-1.5">
              {sprints.map((s) => (
                <TrashRow
                  key={s._id}
                  icon={Zap}
                  name={s.name || `Sprint ${s.number}`}
                  busy={busy}
                  onRestore={() => restore.mutate({ kind: 'sprint', id: s._id })}
                  onDelete={() =>
                    handleDelete('sprint', s._id, s.name || `Sprint ${s.number}`)
                  }
                />
              ))}
            </div>
          </section>
        )}

        {!isLoading && tasks.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
                Tarefas
              </h2>
              <button
                type="button"
                onClick={handleEmptyTaskTrash}
                disabled={busy || tasks.length === 0}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-ink-dim hover:text-danger hover:bg-danger/10 rounded-md transition-colors disabled:opacity-50"
              >
                <Trash2 size={13} /> Esvaziar lixeira
              </button>
            </div>
            <div className="space-y-1.5">
              {tasks.map((t) => {
                const date = t.archivedAt
                  ? new Date(t.archivedAt).toLocaleDateString('pt-BR')
                  : null;
                const origin = t.sprintId
                  ? t.sprintId.name || `Sprint ${t.sprintId.number}`
                  : (t.listId?.name ?? '—');
                const meta = [date, origin].filter(Boolean).join(' · ');
                return (
                  <TrashRow
                    key={t._id}
                    icon={CheckSquare}
                    name={t.name}
                    meta={meta}
                    busy={busy}
                    onRestore={() => restore.mutate({ kind: 'task', id: t._id })}
                    onDelete={() => handleDelete('task', t._id, t.name)}
                  />
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
