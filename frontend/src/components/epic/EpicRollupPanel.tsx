import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Layers } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip as RTooltip } from 'recharts';
import * as tasksApi from '../../api/tasks.api';
import * as sprintsApi from '../../api/sprints.api';
import type { TaskStatus } from '../../types/task.types';

const STATUS_COLORS: Record<TaskStatus, string> = {
  pendente: '#52525B',
  em_progresso: '#3B82F6',
  em_review: '#F59E0B',
  feito: '#10B981',
  fechado: '#374151',
};

interface Props {
  spaceId: string;
  epicId: string;
}

/**
 * Left-column panel for an epic: aggregated effort/progress rolled up from its
 * children (which may live across several sprints), the per-sprint distribution,
 * and the children grouped by sprint with a quick "add child" action.
 */
export function EpicRollupPanel({ spaceId, epicId }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');

  const { data: rollup, isLoading } = useQuery({
    queryKey: ['epic-rollup', spaceId, epicId],
    queryFn: () => tasksApi.getEpicRollup(spaceId, epicId),
  });

  const { data: children = [] } = useQuery({
    queryKey: ['epic-children', spaceId, epicId],
    queryFn: () => tasksApi.getEpicChildren(spaceId, epicId),
  });

  const { data: sprints = [] } = useQuery({
    queryKey: ['sprints', spaceId],
    queryFn: () => sprintsApi.getSprints(spaceId),
  });

  const addChild = useMutation({
    mutationFn: (name: string) => tasksApi.createTask(spaceId, { name, epicId }),
    onSuccess: () => {
      setNewName('');
      void queryClient.invalidateQueries({ queryKey: ['epic-rollup', spaceId, epicId] });
      void queryClient.invalidateQueries({ queryKey: ['epic-children', spaceId, epicId] });
      void queryClient.invalidateQueries({ queryKey: ['tasks', spaceId] });
    },
  });

  function sprintLabel(sprintId: string | null): string {
    if (!sprintId) return 'Backlog';
    const s = sprints.find((sp) => sp._id === sprintId);
    return s ? s.name : 'Sprint';
  }

  if (isLoading || !rollup) {
    return (
      <div className="flex items-center gap-2 px-3 py-4 text-xs text-ink-muted">
        <Loader2 size={13} className="animate-spin" /> Carregando épico…
      </div>
    );
  }

  // Children grouped by their sprint (or backlog), ordered by the rollup buckets.
  const groups = rollup.bySprint
    .slice()
    .sort((a, b) => (a.sprintId === null ? 1 : b.sprintId === null ? -1 : 0))
    .map((bucket) => ({
      sprintId: bucket.sprintId,
      label: sprintLabel(bucket.sprintId),
      points: bucket.points,
      donePoints: bucket.donePoints,
      tasks: children.filter((c) => (c.sprintId?._id ?? null) === bucket.sprintId),
    }));

  const chartData = groups.map((g) => ({
    name: g.label,
    Concluído: g.donePoints,
    Restante: Math.max(0, g.points - g.donePoints),
  }));

  return (
    <div className="flex flex-col">
      {/* Summary */}
      <div className="px-3 py-3 border-b border-line">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-brand mb-2">
          <Layers size={11} /> Épico
        </div>

        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-xs text-ink-dim">Progresso</span>
          <span className="text-xs font-semibold text-ink tabular-nums">{rollup.progressPct}%</span>
        </div>
        <div className="h-2 rounded-full bg-lift overflow-hidden">
          <div
            className="h-full rounded-full bg-s-done transition-all"
            style={{ width: `${rollup.progressPct}%`, background: STATUS_COLORS.feito }}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg bg-lift py-1.5">
            <div className="text-sm font-semibold text-ink tabular-nums">
              {rollup.donePoints}/{rollup.totalPoints}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-ink-muted">Pontos</div>
          </div>
          <div className="rounded-lg bg-lift py-1.5">
            <div className="text-sm font-semibold text-ink tabular-nums">
              {rollup.doneTasks}/{rollup.totalTasks}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-ink-muted">Tarefas</div>
          </div>
        </div>
      </div>

      {/* Points by sprint */}
      {chartData.length > 0 && rollup.totalPoints > 0 && (
        <div className="px-2 py-3 border-b border-line">
          <div className="text-[10px] uppercase tracking-widest text-ink-muted px-1 mb-1">
            Pontos por sprint
          </div>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9ca3af' }} interval={0} />
              <RTooltip
                contentStyle={{ fontSize: 11, background: '#1f1f28', border: '1px solid #333', borderRadius: 8 }}
              />
              <Bar dataKey="Concluído" stackId="a" fill={STATUS_COLORS.feito} radius={[0, 0, 0, 0]} />
              <Bar dataKey="Restante" stackId="a" fill="#3f3f46" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Children grouped by sprint */}
      <div className="flex-1">
        {groups.map((g) => (
          <div key={g.sprintId ?? 'backlog'}>
            <div className="flex items-center justify-between px-3 py-1.5 bg-lift/40 border-b border-line-dim">
              <span className="text-[11px] font-semibold text-ink-dim truncate">{g.label}</span>
              <span className="text-[10px] text-ink-muted tabular-nums shrink-0 ml-2">
                {g.donePoints}/{g.points} pts
              </span>
            </div>
            {g.tasks.map((child) => (
              <button
                key={child._id}
                onClick={() => navigate(`/spaces/${spaceId}/tasks/${child._id}`)}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-left border-b border-line-dim hover:bg-lift/60 transition-colors group"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0 border-[1.5px]"
                  style={{
                    borderColor: STATUS_COLORS[child.status],
                    background: child.status !== 'pendente' ? STATUS_COLORS[child.status] + '50' : 'transparent',
                  }}
                />
                <span className="flex-1 min-w-0 truncate text-xs text-ink-dim group-hover:text-ink transition-colors">
                  {child.name}
                </span>
                {child.storyPoints != null && (
                  <span className="text-[10px] text-ink-muted tabular-nums shrink-0">{child.storyPoints}</span>
                )}
              </button>
            ))}
          </div>
        ))}

        {children.length === 0 && (
          <p className="px-3 py-4 text-xs text-ink-muted">
            Nenhuma tarefa no épico ainda. Adicione abaixo — elas nascem no backlog e podem ser
            arrastadas para sprints.
          </p>
        )}
      </div>

      {/* Add child */}
      <div className="px-3 py-2.5 border-t border-line">
        <div className="flex items-center gap-1.5">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim()) addChild.mutate(newName.trim());
            }}
            placeholder="Adicionar tarefa ao épico…"
            className="flex-1 min-w-0 bg-base border border-line rounded-md px-2 py-1 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand/60"
          />
          <button
            aria-label="Adicionar tarefa ao épico"
            onClick={() => newName.trim() && addChild.mutate(newName.trim())}
            disabled={!newName.trim() || addChild.isPending}
            className="shrink-0 p-1.5 rounded-md bg-brand text-white disabled:opacity-50 transition-all"
          >
            <Plus size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
