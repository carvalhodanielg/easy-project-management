import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { TaskRow } from './TaskRow';
import type { Task } from '../../types/task.types';

interface Props {
  task: Task;
  parentId: string;
  depth?: number;
  isSelected?: boolean;
  selectionMode?: boolean;
  onSelect?: (id: string, kind: 'main' | 'subtask') => void;
}

export function SortableSubtaskRow({ task, parentId, depth = 0, isSelected, selectionMode, onSelect }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id, data: { type: 'subtask', parentId } });

  const dragHandle = !selectionMode ? (
    <button
      ref={setActivatorNodeRef}
      {...listeners}
      aria-label="Arrastar subtarefa"
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
        <TaskRow
          task={task}
          depth={depth}
          isSelected={isSelected}
          selectionMode={selectionMode}
          onSelect={onSelect}
          dragHandle={dragHandle}
        />
      </div>
    </div>
  );
}
