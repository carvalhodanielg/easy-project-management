import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { TaskRowWithSubtasks } from './TaskRowWithSubtasks';
import type { Task } from '../../types/task.types';

interface Props {
  task: Task;
  spaceId: string;
  isSelected?: boolean;
  onSelect?: (id: string, kind: 'main' | 'subtask') => void;
  isSelectedFn?: (id: string) => boolean;
}

export function SortableTaskRow({ task, ...rest }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="relative group/drag"
    >
      {!rest.onSelect && (
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label="Arrastar tarefa"
          tabIndex={-1}
          className="absolute left-0 inset-y-0 z-10 w-5 hidden group-hover/drag:flex items-center justify-center cursor-grab active:cursor-grabbing text-ink-muted/50 hover:text-ink-muted transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={12} />
        </button>
      )}
      <div style={{ opacity: isDragging ? 0.4 : 1, transition: 'opacity 150ms' }}>
        <TaskRowWithSubtasks task={task} {...rest} />
      </div>
    </div>
  );
}
