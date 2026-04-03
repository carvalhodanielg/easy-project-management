import { TaskPriority, PRIORITY_LABELS } from '../../types/task.types';

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  urgente: '#FF4D4F',
  alta: '#FA8C16',
  normal: '#1890FF',
  baixa: '#8C8C8C',
};

interface Props {
  priority: TaskPriority;
  showLabel?: boolean;
}

export function PriorityIcon({ priority, showLabel }: Props) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        fontSize: '0.75rem',
        color: PRIORITY_COLORS[priority],
        fontWeight: 600,
      }}
      title={PRIORITY_LABELS[priority]}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
        <polygon points="5,0 10,10 0,10" />
      </svg>
      {showLabel && PRIORITY_LABELS[priority]}
    </span>
  );
}
