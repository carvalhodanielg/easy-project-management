import { useNavigate, useParams } from 'react-router-dom';
import { Task } from '../../types/task.types';
import { StatusBadge } from '../ui/StatusBadge';
import { PriorityIcon } from '../ui/PriorityIcon';

interface Props {
  task: Task;
  depth?: number;
  onToggleExpand?: () => void;
  isExpanded?: boolean;
}

export function TaskRow({ task, depth = 0, onToggleExpand, isExpanded }: Props) {
  const navigate = useNavigate();
  const { spaceId } = useParams<{ spaceId: string }>();

  return (
    <div
      onClick={() => navigate(`/spaces/${spaceId}/tasks/${task._id}`)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.6rem 1rem',
        paddingLeft: `${1 + depth * 1.5}rem`,
        borderBottom: '1px solid #f0f0f0',
        cursor: 'pointer',
        background: '#fff',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafa')}
      onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
    >
      {onToggleExpand && (
        <button
          aria-label={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
          onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0 2px',
            fontSize: '0.6rem',
            color: '#AAA',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      )}
      <PriorityIcon priority={task.priority} />

      <span style={{ flex: 1, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {task.name}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        {task.storyPoints !== null && (
          <span
            style={{
              background: '#f0f0f0',
              borderRadius: '4px',
              padding: '1px 6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#555',
            }}
          >
            {task.storyPoints}
          </span>
        )}

        {task.assignees.slice(0, 3).map((user) => (
          <span
            key={user._id}
            title={user.displayName}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: '#4A90E2',
              color: '#fff',
              fontSize: '0.65rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {user.displayName.charAt(0).toUpperCase()}
          </span>
        ))}

        <StatusBadge status={task.status} />

        {task.dueDate && (
          <span style={{ fontSize: '0.75rem', color: new Date(task.dueDate) < new Date() ? '#FF4D4F' : '#8C8C8C' }}>
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}
