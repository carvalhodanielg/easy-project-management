import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import { Task, TaskStatus } from '../../types/task.types';
import { KanbanColumn } from './KanbanColumn';
import { moveTaskStatus } from './moveTaskStatus';

const STATUSES: TaskStatus[] = ['pendente', 'em_progresso', 'em_review', 'feito', 'fechado'];

interface Props {
  spaceId: string;
  tasks: Task[];
}

export function KanbanView({ spaceId, tasks }: Props) {
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const tasksByStatus = STATUSES.reduce<Record<TaskStatus, Task[]>>(
    (acc, s) => {
      acc[s] = tasks.filter((t) => t.status === s);
      return acc;
    },
    {} as Record<TaskStatus, Task[]>,
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;
    const task = tasks.find((t) => t._id === taskId);
    if (!task || task.status === newStatus) return;

    moveTaskStatus(queryClient, spaceId, taskId, newStatus);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          padding: '1rem',
          overflowX: 'auto',
          height: '100%',
          alignItems: 'flex-start',
        }}
      >
        {STATUSES.map((status) => (
          <KanbanColumn key={status} status={status} tasks={tasksByStatus[status]} />
        ))}
      </div>
    </DndContext>
  );
}
