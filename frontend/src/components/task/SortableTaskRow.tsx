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
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const dragEnabled = !rest.onSelect;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...(dragEnabled ? listeners : {})}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="relative group/drag"
    >
      {/* Visual-only grip indicator — pointer-events-none so it never intercepts clicks */}
      {dragEnabled && (
        <GripVertical
          size={12}
          aria-hidden
          className="absolute left-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/drag:opacity-40 pointer-events-none text-ink-muted"
        />
      )}
      <div style={{ opacity: isDragging ? 0.4 : 1, transition: 'opacity 150ms' }}>
        <TaskRowWithSubtasks task={task} {...rest} />
      </div>
    </div>
  );
}
