import { type TaskStatus, STATUS_LABELS } from '../../types/task.types';

const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string }> = {
  pendente:    { bg: '#F5F5F5', text: '#595959' },
  em_progresso:{ bg: '#E6F4FF', text: '#1677FF' },
  em_review:   { bg: '#FFF7E6', text: '#FA8C16' },
  feito:       { bg: '#F6FFED', text: '#52C41A' },
  fechado:     { bg: '#F0F0F0', text: '#8C8C8C' },
};

interface Props {
  status: TaskStatus;
}

export function StatusBadge({ status }: Props) {
  const colors = STATUS_COLORS[status];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: 600,
        background: colors.bg,
        color: colors.text,
        whiteSpace: 'nowrap',
      }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
