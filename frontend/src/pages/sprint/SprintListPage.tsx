import { useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Zap, Plus, Calendar, X, ArrowRight, CheckCircle2, Clock, CircleDot, Loader2,
} from 'lucide-react';
import * as sprintsApi from '../../api/sprints.api';
import { type Sprint } from '../../api/sprints.api';
import { cn } from '../../lib/utils';

/* ── helpers ── */
const STATUS_ORDER: Sprint['status'][] = ['active', 'planning', 'completed'];

const STATUS_META: Record<Sprint['status'], { label: string; icon: React.ElementType; color: string; bg: string }> = {
  active:    { label: 'Ativo',        icon: CircleDot,    color: 'text-s-done',   bg: 'bg-s-done/10' },
  planning:  { label: 'Planejamento', icon: Clock,        color: 'text-s-review', bg: 'bg-s-review/10' },
  completed: { label: 'Concluído',    icon: CheckCircle2, color: 'text-ink-dim',  bg: 'bg-lift' },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function durationDays(start: string, end: string) {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000);
}

/* ── Sprint card ── */
function SprintCard({ sprint, spaceId }: { sprint: Sprint; spaceId: string }) {
  const navigate  = useNavigate();
  const meta      = STATUS_META[sprint.status];
  const StatusIcon = meta.icon;
  const days      = durationDays(sprint.startDate, sprint.endDate);

  return (
    <button
      onClick={() => navigate(`/spaces/${spaceId}/sprints/${sprint._id}`)}
      className="group flex flex-col gap-3.5 p-4 bg-surface border border-line rounded-xl hover:border-brand/30 hover:bg-lift/40 transition-all text-left w-full"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', meta.bg)}>
            <Zap size={15} className={meta.color} />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Sprint {sprint.number}</p>
            {sprint.name && (
              <p className="text-xs text-ink-muted mt-0.5">{sprint.name}</p>
            )}
          </div>
        </div>
        <ArrowRight
          size={14}
          className="text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0"
        />
      </div>

      <span className={cn('self-start flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', meta.color, meta.bg)}>
        <StatusIcon size={10} />
        {meta.label}
      </span>

      <div className="flex items-center gap-1.5 text-xs text-ink-muted">
        <Calendar size={10} className="shrink-0" />
        <span>{fmtDate(sprint.startDate)} → {fmtDate(sprint.endDate)}</span>
        <span className="text-ink-muted/40">·</span>
        <span>{days} dias</span>
      </div>
    </button>
  );
}

/* ── Create modal ── */
function CreateSprintModal({ spaceId, onClose }: { spaceId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name,  setName]  = useState('');
  const [start, setStart] = useState('');
  const [end,   setEnd]   = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => sprintsApi.createSprint(spaceId, { name, startDate: start, endDate: end }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sprints', spaceId] });
      onClose();
    },
    onError: () => setError('Falha ao criar sprint.'),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-modal border border-line rounded-2xl shadow-2xl w-full max-w-sm p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-ink">Novo Sprint</h3>
          <button onClick={onClose} className="p-1 rounded text-ink-muted hover:text-ink hover:bg-lift transition-colors">
            <X size={15} />
          </button>
        </div>

        <form
          onSubmit={(e: FormEvent) => { e.preventDefault(); setError(''); mutation.mutate(); }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-ink-dim mb-1.5">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="Nome do sprint…"
              className="w-full px-3 py-2.5 bg-input border border-line rounded-lg text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-ink-dim mb-1.5">Início</label>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-input border border-line rounded-lg text-sm text-ink focus:outline-none focus:border-brand transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-dim mb-1.5">Término</label>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-input border border-line rounded-lg text-sm text-ink focus:outline-none focus:border-brand transition-colors"
              />
            </div>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-sm text-ink-dim hover:text-ink transition-colors rounded-lg hover:bg-lift"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hi text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-60"
            >
              {mutation.isPending && <Loader2 size={13} className="animate-spin" />}
              {mutation.isPending ? 'Criando…' : 'Criar sprint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main ── */
export function SprintListPage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const [showCreate, setShowCreate] = useState(false);

  const { data: sprints = [], isLoading } = useQuery({
    queryKey: ['sprints', spaceId],
    queryFn: () => sprintsApi.getSprints(spaceId!),
    enabled: !!spaceId,
  });

  const grouped = STATUS_ORDER
    .map((status) => ({ status, items: sprints.filter((s) => s.status === status) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <header className="bg-surface border-b border-line shrink-0 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand/12 border border-brand/20 flex items-center justify-center">
              <Zap size={15} className="text-brand" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-ink">Sprints</h1>
              <p className="text-xs text-ink-muted mt-0.5">
                {sprints.length === 0
                  ? 'Nenhum sprint'
                  : `${sprints.length} sprint${sprints.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand hover:bg-brand-hi text-white text-sm font-medium rounded-lg transition-all"
          >
            <Plus size={13} /> Novo sprint
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-6">

        {isLoading && (
          <div className="flex items-center gap-2 text-ink-muted text-sm py-10">
            <Loader2 size={15} className="animate-spin" /> Carregando…
          </div>
        )}

        {!isLoading && sprints.length === 0 && (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="w-14 h-14 rounded-2xl bg-lift border border-line flex items-center justify-center mb-5">
              <Zap size={22} className="text-ink-muted" />
            </div>
            <p className="text-base font-semibold text-ink-dim">Nenhum sprint criado ainda</p>
            <p className="text-sm text-ink-muted mt-1.5 mb-6 max-w-xs">
              Organize seu trabalho em ciclos de entrega com sprints.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hi text-white text-sm font-semibold rounded-lg transition-all"
            >
              <Plus size={13} /> Criar primeiro sprint
            </button>
          </div>
        )}

        {grouped.map(({ status, items }) => {
          const meta = STATUS_META[status];
          const StatusIcon = meta.icon;
          return (
            <div key={status} className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <StatusIcon size={12} className={meta.color} />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
                  {meta.label}
                </span>
                <span className="text-[11px] text-ink-muted bg-lift px-1.5 py-0.5 rounded-full tabular-nums">
                  {items.length}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {items.map((sprint) => (
                  <SprintCard key={sprint._id} sprint={sprint} spaceId={spaceId!} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showCreate && (
        <CreateSprintModal spaceId={spaceId!} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
