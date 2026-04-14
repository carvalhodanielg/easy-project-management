import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import * as sprintsApi from '../../api/sprints.api';

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_progresso: 'Em progresso',
  em_review: 'Em review',
  feito: 'Feito',
  fechado: 'Fechado',
};

const STATUS_COLORS: Record<string, string> = {
  pendente: '#6b7280',
  em_progresso: '#3b82f6',
  em_review: '#f59e0b',
  feito: '#22c55e',
  fechado: '#a78bfa',
};

interface Props {
  spaceId: string;
  sprintId: string;
}

export function SprintDashboard({ spaceId, sprintId }: Props) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['sprint-stats', spaceId, sprintId],
    queryFn: () => sprintsApi.getSprintStats(spaceId, sprintId),
  });

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center py-20 text-ink-dim gap-2">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Carregando métricas…</span>
      </div>
    );
  }

  const progress = stats.totalPoints > 0
    ? Math.round((stats.donePoints / stats.totalPoints) * 100)
    : 0;

  const statusData = Object.entries(stats.tasksByStatus)
    .filter(([, v]) => v.count > 0 || v.points > 0)
    .map(([key, v]) => ({
      name: STATUS_LABELS[key] ?? key,
      tarefas: v.count,
      pontos: v.points,
      fill: STATUS_COLORS[key] ?? '#6b7280',
    }));

  const burndownData = stats.burndown.map((b) => ({
    ...b,
    date: new Date(b.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
  }));

  return (
    <div className="p-6 space-y-8 overflow-y-auto">

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Total de tarefas" value={stats.totalTasks} />
        <Kpi label="Concluídas" value={stats.doneTasks} highlight />
        <Kpi label="Story points" value={`${stats.donePoints} / ${stats.totalPoints} pts`} />
        <div className="bg-surface border border-line rounded-xl p-4 flex flex-col gap-2">
          <p className="text-xs text-ink-dim">Progresso</p>
          <p className="text-2xl font-bold text-ink tabular-nums">{progress}%</p>
          <div className="w-full h-1.5 bg-line rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Velocity */}
      {stats.previousSprintPoints !== null && (
        <div className="bg-surface border border-line rounded-xl p-4">
          <p className="text-sm font-semibold text-ink mb-3">Velocidade</p>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-ink-dim mb-1">Sprint atual</p>
              <p className="text-xl font-bold text-brand tabular-nums">{stats.donePoints} pts</p>
            </div>
            <div className="w-px h-8 bg-line" />
            <div>
              <p className="text-xs text-ink-dim mb-1">Sprint anterior</p>
              <p className="text-xl font-bold text-ink-dim tabular-nums">{stats.previousSprintPoints} pts</p>
            </div>
            {stats.previousSprintPoints > 0 && (
              <>
                <div className="w-px h-8 bg-line" />
                <div>
                  <p className="text-xs text-ink-dim mb-1">Variação</p>
                  <p className={`text-xl font-bold tabular-nums ${
                    stats.donePoints >= stats.previousSprintPoints ? 'text-s-done' : 'text-p-urgent'
                  }`}>
                    {stats.donePoints >= stats.previousSprintPoints ? '+' : ''}
                    {stats.donePoints - stats.previousSprintPoints} pts
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Burndown */}
      {burndownData.length > 1 && (
        <div className="bg-surface border border-line rounded-xl p-4">
          <p className="text-sm font-semibold text-ink mb-4">Burndown</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={burndownData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--color-ink)', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="ideal" name="Ideal" stroke="#6b7280" strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="remaining" name="Restante" stroke="#6366f1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Status distribution */}
      {statusData.length > 0 && (
        <div className="bg-surface border border-line rounded-xl p-4">
          <p className="text-sm font-semibold text-ink mb-4">Distribuição por status</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statusData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 8 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="tarefas" name="Tarefas" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pontos" name="Pontos" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Assignee workload */}
      {stats.tasksByAssignee.length > 0 && (
        <div className="bg-surface border border-line rounded-xl p-4">
          <p className="text-sm font-semibold text-ink mb-4">Carga por responsável</p>
          <div className="space-y-3">
            {stats.tasksByAssignee
              .sort((a, b) => b.count - a.count)
              .map((a) => (
                <div key={a.userId} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-brand/20 flex items-center justify-center text-xs font-semibold text-brand shrink-0">
                    {a.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-ink truncate">{a.displayName}</span>
                      <span className="text-xs text-ink-muted tabular-nums ml-2">
                        {a.count} tarefa{a.count !== 1 ? 's' : ''} · {a.points} pts
                      </span>
                    </div>
                    {stats.totalTasks > 0 && (
                      <div className="w-full h-1 bg-line rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand rounded-full"
                          style={{ width: `${Math.round((a.count / stats.totalTasks) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

    </div>
  );
}

function Kpi({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="bg-surface border border-line rounded-xl p-4">
      <p className="text-xs text-ink-dim">{label}</p>
      <p className={`text-2xl font-bold tabular-nums mt-1 ${highlight ? 'text-brand' : 'text-ink'}`}>
        {value}
      </p>
    </div>
  );
}
