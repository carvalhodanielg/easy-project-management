import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Link2, AlertTriangle } from 'lucide-react';
import * as tasksApi from '../../api/tasks.api';
import { StatusBadge } from '../ui/StatusBadge';
import { type Task, type TaskStatus, STATUS_LABELS } from '../../types/task.types';

interface Props {
  spaceId: string;
  task: Task;
}

const FIELD_LABEL = 'text-[11px] font-semibold uppercase tracking-widest text-ink-muted mb-2 block';

type DepType = 'blocks' | 'blocked_by';

export function DependenciesSection({ spaceId, task }: Props) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const [depType, setDepType] = useState<DepType>('blocked_by');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) {
      setQuery('');
      setDepType('blocked_by');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [adding]);

  const { data: searchResults } = useQuery({
    queryKey: ['tasks-search', spaceId, query],
    queryFn: () => tasksApi.getTasks(spaceId, { q: query }),
    enabled: adding && query.trim().length > 0,
    staleTime: 5_000,
  });

  const existingDepIds = new Set([
    task._id,
    ...task.blockedBy.map((d) => d._id),
    ...task.blocks.map((d) => d._id),
  ]);

  const filteredResults = (searchResults ?? []).filter((t) => !existingDepIds.has(t._id));

  const addMutation = useMutation({
    mutationFn: ({ targetTaskId, type }: { targetTaskId: string; type: DepType }) =>
      tasksApi.addDependency(spaceId, task._id, targetTaskId, type),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['task', task._id] });
      setAdding(false);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (targetId: string) =>
      tasksApi.removeDependency(spaceId, task._id, targetId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['task', task._id] });
    },
  });

  const hasUnresolvedBlockers = task.blockedBy.some(
    (b) => b.status !== 'feito' && b.status !== 'fechado',
  );

  const hasDeps = task.blockedBy.length > 0 || task.blocks.length > 0;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <label className={FIELD_LABEL + ' mb-0'}>Dependências</label>
        {hasUnresolvedBlockers && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-danger bg-danger/10 px-2 py-0.5 rounded-full">
            <AlertTriangle size={10} />
            Bloqueada
          </span>
        )}
      </div>

      {hasDeps && (
        <div className="flex flex-col gap-2 mb-3">
          {task.blockedBy.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-danger shrink-0">Bloqueada por:</span>
              {task.blockedBy.map((dep) => (
                <DepChip
                  key={dep._id}
                  dep={dep}
                  onRemove={() => removeMutation.mutate(dep._id)}
                  removing={removeMutation.isPending}
                />
              ))}
            </div>
          )}
          {task.blocks.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-p-high shrink-0">Bloqueia:</span>
              {task.blocks.map((dep) => (
                <DepChip
                  key={dep._id}
                  dep={dep}
                  onRemove={() => removeMutation.mutate(dep._id)}
                  removing={removeMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {adding ? (
        <div className="rounded-xl border border-line bg-lift p-3 flex flex-col gap-2.5">
          <select
            value={depType}
            onChange={(e) => setDepType(e.target.value as DepType)}
            className="w-full bg-base border border-line rounded-lg px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-brand/40"
          >
            <option value="blocked_by">Esta tarefa é bloqueada por…</option>
            <option value="blocks">Esta tarefa bloqueia…</option>
          </select>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar tarefa pelo nome…"
            className="w-full bg-base border border-line rounded-lg px-2.5 py-1.5 text-xs text-ink placeholder-ink-muted focus:outline-none focus:border-brand/40"
          />

          {query.trim().length > 0 && (
            <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
              {filteredResults.length === 0 ? (
                <p className="text-xs text-ink-muted px-1 py-2 text-center">Nenhuma tarefa encontrada.</p>
              ) : (
                filteredResults.map((t) => (
                  <button
                    key={t._id}
                    type="button"
                    onClick={() => addMutation.mutate({ targetTaskId: t._id, type: depType })}
                    disabled={addMutation.isPending}
                    className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-xs text-ink hover:bg-base transition-colors text-left disabled:opacity-50"
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <Link2 size={10} className="shrink-0 text-ink-muted" />
                      <span className="truncate">{t.name}</span>
                    </span>
                    <StatusBadge status={t.status as TaskStatus} />
                  </button>
                ))
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setAdding(false)}
            className="text-xs text-ink-muted hover:text-ink self-end transition-colors"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
        >
          <Plus size={13} />
          Adicionar dependência
        </button>
      )}
    </div>
  );
}

interface DepChipProps {
  dep: { _id: string; name: string; status: TaskStatus };
  onRemove: () => void;
  removing: boolean;
}

function DepChip({ dep, onRemove, removing }: DepChipProps) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-base border border-line rounded-lg px-2 py-1 text-xs text-ink group">
      <span className="max-w-[160px] truncate">{dep.name}</span>
      <StatusBadge status={dep.status} />
      <button
        type="button"
        onClick={onRemove}
        disabled={removing}
        className="ml-0.5 text-ink-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-30"
        aria-label="Remover dependência"
      >
        <X size={11} />
      </button>
    </span>
  );
}

export function isTaskBlocked(task: Task): boolean {
  return task.blockedBy.some((b) => b.status !== 'feito' && b.status !== 'fechado');
}

// Re-export STATUS_LABELS for convenience (used in TaskDetailPage)
export { STATUS_LABELS };
