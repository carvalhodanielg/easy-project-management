import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate, useParams } from 'react-router-dom';
import { GripVertical, Calendar } from 'lucide-react';
import type { Task } from '../../types/task.types';
import { PriorityIcon } from '../ui/PriorityIcon';
import { Tooltip } from '../ui/tooltip';

interface Props { task: Task; }

export function KanbanCard({ task }: Props) {
  const navigate = useNavigate();
  const { spaceId } = useParams<{ spaceId: string }>();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task._id,
    data: { task },
  });

  const isOverdue = !!task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`group mb-2 rounded-xl border select-none transition-all ${
        isDragging
          ? 'opacity-40 shadow-2xl border-brand/30 bg-lift'
          : 'border-line bg-surface hover:border-brand/30 hover:shadow-md cursor-pointer'
      }`}
      onClick={(e) => {
        if (!isDragging) { e.stopPropagation(); navigate(`/spaces/${spaceId}/tasks/${task._id}`); }
      }}
    >
      <div className="p-3.5">
        {/* Drag + title */}
        <div className="flex items-start gap-2 mb-3">
          <button
            className="mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing shrink-0 text-ink-muted hover:text-ink"
            {...listeners}
            {...attributes}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={13} />
          </button>
          <span className="text-sm text-ink leading-snug flex-1">{task.name}</span>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <PriorityIcon priority={task.priority} />

          {task.storyPoints !== null && (
            <span className="px-1.5 py-0.5 rounded text-[11px] font-medium text-ink-dim bg-lift tabular-nums">
              {task.storyPoints}
            </span>
          )}

          {task.tags.slice(0, 2).map((tag) => (
            <span
              key={tag._id}
              style={{ background: tag.color + '1E', color: tag.color }}
              className="px-2 py-0.5 rounded-full text-[11px] font-medium"
            >
              {tag.name}
            </span>
          ))}

          {task.assignees.length > 0 && (
            <div className="ml-auto flex gap-0.5">
              {task.assignees.slice(0, 3).map((u) => (
                <Tooltip key={u._id} content={u.displayName}>
                  <span className="w-5 h-5 rounded-full bg-brand/30 text-brand text-[9px] font-bold flex items-center justify-center shrink-0">
                    {u.displayName?.charAt(0).toUpperCase() ?? '?'}
                  </span>
                </Tooltip>
              ))}
            </div>
          )}
        </div>

        {task.dueDate && (
          <div className={`mt-2.5 flex items-center gap-1 text-[11px] font-medium ${isOverdue ? 'text-danger' : 'text-ink-muted'}`}>
            <Calendar size={10} />
            {new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </div>
        )}
      </div>
    </div>
  );
}
