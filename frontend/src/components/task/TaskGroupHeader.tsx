import { TaskStatus, TaskPriority, STATUS_LABELS, PRIORITY_LABELS } from '../../types/task.types';

interface Props {
  groupKey: string | null;
  groupBy: 'status' | 'assignee' | 'sprint' | 'priority';
  count: number;
  totalStoryPoints: number;
}

function formatGroupLabel(groupKey: string | null, groupBy: Props['groupBy']): string {
  if (!groupKey) return 'Unassigned';
  if (groupBy === 'status') return STATUS_LABELS[groupKey as TaskStatus] ?? groupKey;
  if (groupBy === 'priority') return PRIORITY_LABELS[groupKey as TaskPriority] ?? groupKey;
  return groupKey;
}

export function TaskGroupHeader({ groupKey, groupBy, count, totalStoryPoints }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.6rem 1rem',
        background: '#F5F5F5',
        borderBottom: '1px solid #E8E8E8',
        borderTop: '1px solid #E8E8E8',
      }}
    >
      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#333', flex: 1 }}>
        {formatGroupLabel(groupKey, groupBy)}
      </span>
      <span style={{ fontSize: '0.75rem', color: '#888' }}>
        {count} task{count !== 1 ? 's' : ''}
        {totalStoryPoints > 0 && (
          <span style={{ marginLeft: '0.5rem', color: '#4A90E2', fontWeight: 600 }}>
            Σ {totalStoryPoints} pts
          </span>
        )}
      </span>
    </div>
  );
}
