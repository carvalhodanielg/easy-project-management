import { ChevronDown } from 'lucide-react';
import { TaskStatus, TaskPriority, STATUS_LABELS, PRIORITY_LABELS } from '../../types/task.types';
import { TASK_COLS } from './TaskRow';
import { T } from '../../theme';

interface Props {
  groupKey: string | null;
  groupBy: 'status' | 'assignee' | 'sprint' | 'priority';
  count: number;
  totalStoryPoints: number;
  onAddTask?: () => void;
}

function groupLabel(groupKey: string | null, groupBy: Props['groupBy']): string {
  if (!groupKey) return 'Sem responsável';
  if (groupBy === 'status')   return STATUS_LABELS[groupKey as TaskStatus]   ?? groupKey;
  if (groupBy === 'priority') return PRIORITY_LABELS[groupKey as TaskPriority] ?? groupKey;
  return groupKey;
}

function accentColor(groupKey: string | null, groupBy: Props['groupBy']): string {
  if (groupBy === 'status' && groupKey)   return T.status[groupKey]   ?? T.text3;
  if (groupBy === 'priority' && groupKey) return T.priority[groupKey] ?? T.text3;
  return T.accent;
}

export function TaskGroupHeader({ groupKey, groupBy, count, totalStoryPoints }: Props) {
  const accent = accentColor(groupKey, groupBy);
  const label  = groupLabel(groupKey, groupBy);

  return (
    <div
      className="sticky top-8 z-10 flex items-center"
      style={{
        display: 'grid',
        gridTemplateColumns: TASK_COLS,
        alignItems: 'center',
        minHeight: '32px',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-line-dim)',
        borderLeft: `2px solid ${accent}`,
      }}
    >
      <div className="flex items-center justify-center">
        <ChevronDown size={11} style={{ color: accent }} />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: accent }}>
          {label}
        </span>
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums"
          style={{ background: accent + '18', color: accent }}
        >
          {count}
        </span>
        {totalStoryPoints > 0 && (
          <span className="text-[11px] text-ink-muted tabular-nums">
            {totalStoryPoints} pts
          </span>
        )}
      </div>

      <div /><div /><div /><div /><div />
    </div>
  );
}
