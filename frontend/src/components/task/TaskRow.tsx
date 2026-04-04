import { useNavigate, useParams } from 'react-router-dom';
import { Task, TaskStatus } from '../../types/task.types';
import { PriorityIcon } from '../ui/PriorityIcon';

// Column widths — shared with the list header (TASK_COLS in SprintPage/ListPage)
export const TASK_COLS = '44px 1fr 100px 64px 80px 96px';

const STATUS_CIRCLE: Record<TaskStatus, { border: string; bg: string }> = {
  pendente:     { border: '#8B8FA8', bg: 'transparent' },
  em_progresso: { border: '#1677FF', bg: '#1677FF' },
  em_review:    { border: '#FA8C16', bg: '#FA8C16' },
  feito:        { border: '#52C41A', bg: '#52C41A' },
  fechado:      { border: '#8C8C8C', bg: '#8C8C8C' },
};

interface Props {
  task: Task;
  depth?: number;
  onToggleExpand?: () => void;
  isExpanded?: boolean;
}

export function TaskRow({ task, depth = 0, onToggleExpand, isExpanded }: Props) {
  const navigate = useNavigate();
  const { spaceId } = useParams<{ spaceId: string }>();
  const circle = STATUS_CIRCLE[task.status];

  return (
    <div
      role="row"
      onClick={() => navigate(`/spaces/${spaceId}/tasks/${task._id}`)}
      style={{
        display: 'grid',
        gridTemplateColumns: TASK_COLS,
        alignItems: 'center',
        minHeight: '36px',
        borderBottom: '1px solid #F0F0F0',
        cursor: 'pointer',
        background: '#fff',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#F7F8FA')}
      onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
    >
      {/* Col 1 — expand toggle + status circle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', paddingLeft: '8px' }}>
        {onToggleExpand ? (
          <button
            aria-label={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.55rem', color: '#AAA', lineHeight: 1, flexShrink: 0, width: '14px' }}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        ) : (
          <span style={{ width: '14px' }} />
        )}
        <span
          title={task.status}
          style={{
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            border: `2px solid ${circle.border}`,
            background: circle.bg,
            flexShrink: 0,
            display: 'inline-block',
          }}
        />
      </div>

      {/* Col 2 — task name */}
      <span
        style={{
          paddingLeft: `${depth * 20}px`,
          fontSize: '0.85rem',
          color: '#1A1A2E',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          paddingRight: '8px',
        }}
      >
        {task.subtaskCount > 0 && (
          <span style={{ fontSize: '0.7rem', color: '#AAA', marginRight: '6px' }}>
            ↳ {task.subtaskCount}
          </span>
        )}
        {task.name}
      </span>

      {/* Col 3 — assignees */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        {task.assignees.length === 0 ? (
          <span style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1.5px dashed #CCC', display: 'inline-block' }} />
        ) : (
          task.assignees.slice(0, 2).map((user) => (
            <span
              key={user._id}
              title={user.displayName}
              style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#4A90E2', color: '#fff', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}
            >
              {user.displayName.charAt(0).toUpperCase()}
            </span>
          ))
        )}
      </div>

      {/* Col 4 — story points */}
      <div style={{ textAlign: 'center' }}>
        {task.storyPoints !== null && (
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#555', background: '#F0F0F0', borderRadius: '4px', padding: '1px 6px' }}>
            {task.storyPoints}
          </span>
        )}
      </div>

      {/* Col 5 — priority */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <PriorityIcon priority={task.priority} showLabel />
      </div>

      {/* Col 6 — due date */}
      <div style={{ paddingRight: '12px', textAlign: 'right' }}>
        {task.dueDate && (
          <span style={{ fontSize: '0.72rem', color: new Date(task.dueDate) < new Date() ? '#FF4D4F' : '#8C8C8C' }}>
            {new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </span>
        )}
      </div>
    </div>
  );
}
