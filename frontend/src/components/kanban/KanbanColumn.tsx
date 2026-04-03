import { useDroppable } from '@dnd-kit/core';
import { Task, TaskStatus, STATUS_LABELS } from '../../types/task.types';
import { KanbanCard } from './KanbanCard';

interface Props {
  status: TaskStatus;
  tasks: Task[];
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  pendente: '#8C8C8C',
  em_progresso: '#4A90E2',
  em_review: '#FA8C16',
  feito: '#52C41A',
  fechado: '#595959',
};

export function KanbanColumn({ status, tasks }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '240px',
        flexShrink: 0,
      }}
    >
      {/* Column header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: STATUS_COLORS[status],
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#333', flex: 1 }}>
          {STATUS_LABELS[status]}
        </span>
        <span style={{ fontSize: '0.75rem', color: '#AAA', fontWeight: 400 }}>
          {tasks.length}
          {totalPoints > 0 && ` · ${totalPoints}pt`}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        style={{
          flex: 1,
          minHeight: '80px',
          padding: '0.5rem',
          borderRadius: '8px',
          background: isOver ? '#EEF4FF' : '#F8F8F8',
          border: `2px dashed ${isOver ? '#4A90E2' : 'transparent'}`,
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        {tasks.map((task) => (
          <KanbanCard key={task._id} task={task} />
        ))}
      </div>
    </div>
  );
}
