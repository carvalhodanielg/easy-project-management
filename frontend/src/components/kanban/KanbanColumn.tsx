import { useDroppable } from '@dnd-kit/core';
import { type Task, type TaskStatus, STATUS_LABELS } from '../../types/task.types';
import { KanbanCard } from './KanbanCard';
import { T } from '../../theme';

interface Props {
  status: TaskStatus;
  tasks: Task[];
}

export function KanbanColumn({ status, tasks }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const accent = T.status[status];
  const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);

  return (
    <div className="flex flex-col w-64 shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: accent }}
        />
        <span className="text-sm font-semibold text-ink flex-1">
          {STATUS_LABELS[status]}
        </span>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums"
          style={{ background: accent + '15', color: accent }}
        >
          {tasks.length}
        </span>
        {totalPoints > 0 && (
          <span className="text-[11px] text-ink-muted tabular-nums">{totalPoints}pts</span>
        )}
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className="flex-1 min-h-24 p-2 rounded-xl border-2 border-dashed transition-all"
        style={{
          background: isOver ? accent + '08' : 'transparent',
          borderColor: isOver ? accent + '40' : 'var(--color-line-dim)',
        }}
      >
        {tasks.map((task) => (
          <KanbanCard key={task._id} task={task} />
        ))}
      </div>
    </div>
  );
}
