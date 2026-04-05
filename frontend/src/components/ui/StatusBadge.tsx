import { type TaskStatus, STATUS_LABELS } from '../../types/task.types';

const STATUS_STYLES: Record<TaskStatus, { dot: string; text: string; bg: string }> = {
  pendente:     { dot: 'bg-s-pending',  text: 'text-s-pending',  bg: 'bg-s-pending/10' },
  em_progresso: { dot: 'bg-s-progress', text: 'text-s-progress', bg: 'bg-s-progress/10' },
  em_review:    { dot: 'bg-s-review',   text: 'text-s-review',   bg: 'bg-s-review/10' },
  feito:        { dot: 'bg-s-done',     text: 'text-s-done',     bg: 'bg-s-done/10' },
  fechado:      { dot: 'bg-s-closed',   text: 'text-s-closed',   bg: 'bg-s-closed/10' },
};

interface Props {
  status: TaskStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: Props) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${s.bg} ${s.text} ${size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-xs'}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}
