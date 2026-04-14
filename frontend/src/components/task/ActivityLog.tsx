import { useQuery } from '@tanstack/react-query';
import { Clock, Loader2 } from 'lucide-react';
import { getTaskEvents, type TaskEvent } from '../../api/task-events.api';
import { STATUS_LABELS, PRIORITY_LABELS } from '../../types/task.types';

const STATUS_COLORS: Record<string, string> = {
  pendente:     '#52525B',
  em_progresso: '#3B82F6',
  em_review:    '#F59E0B',
  feito:        '#10B981',
  fechado:      '#374151',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `há ${days}d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function EventDescription({ event }: { event: TaskEvent }) {
  const { type, changes } = event;

  if (type === 'created') return <span>criou esta tarefa</span>;

  if (type === 'description_changed') return <span>atualizou a descrição</span>;

  if (type === 'name_changed' && changes) {
    return (
      <span>
        renomeou de <em className="text-ink not-italic font-medium">"{changes.oldValue}"</em>{' '}
        para <em className="text-ink not-italic font-medium">"{changes.newValue}"</em>
      </span>
    );
  }

  if (type === 'status_changed' && changes) {
    const oldLabel = STATUS_LABELS[changes.oldValue as keyof typeof STATUS_LABELS] ?? changes.oldValue;
    const newLabel = STATUS_LABELS[changes.newValue as keyof typeof STATUS_LABELS] ?? changes.newValue;
    return (
      <span>
        mudou o status de{' '}
        <StatusChip value={changes.oldValue} label={oldLabel} />{' '}
        para{' '}
        <StatusChip value={changes.newValue} label={newLabel} />
      </span>
    );
  }

  if (type === 'priority_changed' && changes) {
    const oldLabel = PRIORITY_LABELS[changes.oldValue as keyof typeof PRIORITY_LABELS] ?? changes.oldValue;
    const newLabel = PRIORITY_LABELS[changes.newValue as keyof typeof PRIORITY_LABELS] ?? changes.newValue;
    return (
      <span>
        mudou a prioridade de{' '}
        <span className="font-medium text-ink">{oldLabel}</span>{' '}
        para{' '}
        <span className="font-medium text-ink">{newLabel}</span>
      </span>
    );
  }

  if (type === 'story_points_changed' && changes) {
    const oldPts = changes.oldValue ?? '—';
    const newPts = changes.newValue ?? '—';
    return (
      <span>
        mudou os pontos de <span className="font-medium text-ink">{oldPts}</span>{' '}
        para <span className="font-medium text-ink">{newPts}</span>
      </span>
    );
  }

  if (type === 'due_date_changed' && changes) {
    if (!changes.newValue) return <span>removeu a data de entrega</span>;
    return (
      <span>
        {changes.oldValue ? (
          <>
            mudou a data de entrega para{' '}
            <span className="font-medium text-ink">{formatDate(changes.newValue)}</span>
          </>
        ) : (
          <>
            definiu a data de entrega para{' '}
            <span className="font-medium text-ink">{formatDate(changes.newValue)}</span>
          </>
        )}
      </span>
    );
  }

  if (type === 'start_date_changed' && changes) {
    if (!changes.newValue) return <span>removeu a data de início</span>;
    return (
      <span>
        {changes.oldValue ? (
          <>
            mudou a data de início para{' '}
            <span className="font-medium text-ink">{formatDate(changes.newValue)}</span>
          </>
        ) : (
          <>
            definiu a data de início para{' '}
            <span className="font-medium text-ink">{formatDate(changes.newValue)}</span>
          </>
        )}
      </span>
    );
  }

  if (type === 'assignee_added') {
    return <span>adicionou um responsável</span>;
  }

  if (type === 'assignee_removed') {
    return <span>removeu um responsável</span>;
  }

  if (type === 'moved') {
    return <span>moveu a tarefa</span>;
  }

  return <span>{type.replace(/_/g, ' ')}</span>;
}

function StatusChip({ value, label }: { value: string | null; label: string }) {
  const color = value ? (STATUS_COLORS[value] ?? '#52525B') : '#52525B';
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold"
      style={{ background: color + '18', color, border: `1px solid ${color}30` }}
    >
      {label}
    </span>
  );
}

function UserAvatar({ user }: { user: TaskEvent['userId'] }) {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.displayName ?? user.email}
        className="w-6 h-6 rounded-full object-cover shrink-0"
      />
    );
  }
  const initials = (user.displayName ?? user.email).charAt(0).toUpperCase();
  return (
    <div className="w-6 h-6 rounded-full bg-brand/20 text-brand text-[10px] font-bold flex items-center justify-center shrink-0">
      {initials}
    </div>
  );
}

interface Props {
  spaceId: string;
  taskId: string;
}

export function ActivityLog({ spaceId, taskId }: Props) {
  const { data: events, isLoading } = useQuery({
    queryKey: ['task-events', taskId],
    queryFn: () => getTaskEvents(spaceId, taskId),
    enabled: !!spaceId && !!taskId,
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Clock size={13} className="text-ink-muted" />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
          Histórico de atividade
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-ink-muted py-3">
          <Loader2 size={13} className="animate-spin" /> Carregando histórico…
        </div>
      ) : !events || events.length === 0 ? (
        <p className="text-xs text-ink-muted py-3">Nenhuma atividade registrada.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {events.map((event) => (
            <li key={event._id} className="flex items-start gap-2.5">
              <UserAvatar user={event.userId} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-ink-dim leading-relaxed">
                  <span className="font-semibold text-ink">
                    {event.userId.displayName ?? event.userId.email}
                  </span>{' '}
                  <EventDescription event={event} />
                </p>
              </div>
              <span
                className="text-[11px] text-ink-muted shrink-0 pt-0.5"
                title={new Date(event.createdAt).toLocaleString('pt-BR')}
              >
                {formatRelative(event.createdAt)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
