import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate, useParams } from 'react-router-dom';
import { Task } from '../../types/task.types';
import { PriorityIcon } from '../ui/PriorityIcon';

interface Props {
  task: Task;
}

export function KanbanCard({ task }: Props) {
  const navigate = useNavigate();
  const { spaceId } = useParams<{ spaceId: string }>();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task._id,
    data: { task },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    background: '#fff',
    borderRadius: '6px',
    padding: '0.6rem 0.75rem',
    marginBottom: '0.5rem',
    border: '1px solid #E8E8E8',
    boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        // Only open detail if not dragging
        if (!isDragging) {
          e.stopPropagation();
          navigate(`/spaces/${spaceId}/tasks/${task._id}`);
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', marginBottom: '0.4rem' }}>
        <PriorityIcon priority={task.priority} />
        <span style={{ fontSize: '0.85rem', lineHeight: 1.3, flex: 1 }}>{task.name}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
        {task.storyPoints !== null && (
          <span style={{ background: '#F0F0F0', borderRadius: '4px', padding: '1px 6px', fontSize: '0.7rem', fontWeight: 600, color: '#555' }}>
            {task.storyPoints}
          </span>
        )}

        {task.tags.map((tag) => (
          <span
            key={tag._id}
            style={{ padding: '1px 6px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 600, background: tag.color + '22', color: tag.color, border: `1px solid ${tag.color}44` }}
          >
            {tag.name}
          </span>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.25rem' }}>
          {task.assignees.slice(0, 3).map((u) => (
            <span
              key={u._id}
              title={u.displayName}
              style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#4A90E2', color: '#fff', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
            >
              {u.displayName.charAt(0).toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      {task.dueDate && (
        <div style={{ marginTop: '0.3rem', fontSize: '0.7rem', color: new Date(task.dueDate) < new Date() ? '#FF4D4F' : '#8C8C8C' }}>
          {new Date(task.dueDate).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
