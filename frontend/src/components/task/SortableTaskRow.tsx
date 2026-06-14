import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { TaskRowWithSubtasks } from './TaskRowWithSubtasks';
import type { Task, SubtaskMode } from '../../types/task.types';

interface Props {
  task: Task;
  spaceId: string;
  subtaskMode?: SubtaskMode;
  isSelected?: boolean;
  selectionMode?: boolean;
  onSelect?: (id: string, kind: 'main' | 'subtask') => void;
  isSelectedFn?: (id: string) => boolean;
  epicDefaultExpanded?: boolean;
}

export function SortableTaskRow({ task, selectionMode, ...rest }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id, data: { type: 'task', sprintId: task.sprintId, name: task.name } });

  const dragEnabled = !selectionMode;

  const dragHandle = dragEnabled ? (
    <button
      ref={setActivatorNodeRef}
      {...listeners}
      aria-label="Arrastar tarefa"
      className="w-3 h-3 flex items-center justify-center opacity-0 group-hover:opacity-40 hover:!opacity-100 text-ink-muted cursor-grab active:cursor-grabbing shrink-0"
    >
      <GripVertical size={12} aria-hidden />
    </button>
  ) : undefined;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="relative group/drag"
    >
      <div style={{ opacity: isDragging ? 0.4 : 1, transition: 'opacity 150ms' }}>
        <TaskRowWithSubtasks task={task} subtaskSortable dragHandle={dragHandle} {...rest} />
      </div>
    </div>
  );
}
