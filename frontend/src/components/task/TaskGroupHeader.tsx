import { TaskStatus, TaskPriority, STATUS_LABELS, PRIORITY_LABELS } from '../../types/task.types';
import { TASK_COLS } from './TaskRow';

interface Props {
  groupKey: string | null;
  groupBy: 'status' | 'assignee' | 'sprint' | 'priority';
  count: number;
  totalStoryPoints: number;
  onAddTask?: () => void;
}

const STATUS_ACCENT: Record<TaskStatus, string> = {
  pendente:     '#8B8FA8',
  em_progresso: '#1677FF',
  em_review:    '#FA8C16',
  feito:        '#52C41A',
  fechado:      '#595959',
};

function groupLabel(groupKey: string | null, groupBy: Props['groupBy']): string {
  if (!groupKey) return 'Sem responsável';
  if (groupBy === 'status')   return STATUS_LABELS[groupKey as TaskStatus]   ?? groupKey;
  if (groupBy === 'priority') return PRIORITY_LABELS[groupKey as TaskPriority] ?? groupKey;
  return groupKey;
}

function accentColor(groupKey: string | null, groupBy: Props['groupBy']): string {
  if (groupBy === 'status' && groupKey) return STATUS_ACCENT[groupKey as TaskStatus] ?? '#8B8FA8';
  return '#8B8FA8';
}

export function TaskGroupHeader({ groupKey, groupBy, count, totalStoryPoints, onAddTask }: Props) {
  const accent = accentColor(groupKey, groupBy);
  const label  = groupLabel(groupKey, groupBy);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: TASK_COLS,
        alignItems: 'center',
        minHeight: '34px',
        borderBottom: '1px solid #E8E8E8',
        borderLeft: `3px solid ${accent}`,
        background: '#FAFAFA',
        position: 'sticky',
        top: 0,
        zIndex: 2,
      }}
    >
      {/* Col 1 — colored chevron */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '0.6rem', color: accent, fontWeight: 700 }}>▼</span>
      </div>

      {/* Col 2 — label + count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
        <span style={{ fontSize: '0.72rem', color: '#AAA', fontWeight: 500 }}>{count}</span>
        {onAddTask && (
          <button
            onClick={onAddTask}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#AAA', padding: '0 4px', lineHeight: 1 }}
          >
            +
          </button>
        )}
      </div>

      {/* Col 3 — empty (assignee) */}
      <div />

      {/* Col 4 — total points */}
      <div style={{ textAlign: 'center' }}>
        {totalStoryPoints > 0 && (
          <span style={{ fontSize: '0.72rem', color: '#888', fontWeight: 600 }}>{totalStoryPoints}</span>
        )}
      </div>

      {/* Col 5 & 6 — empty */}
      <div />
      <div />
    </div>
  );
}
