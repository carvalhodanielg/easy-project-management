import { useQuery } from '@tanstack/react-query';
import * as tasksApi from '../../api/tasks.api';
import { TaskRowWithSubtasks } from './TaskRowWithSubtasks';
import type { Task } from '../../types/task.types';

interface Props {
  spaceId: string;
  epicId: string;
  onSelect?: (id: string, kind: 'main' | 'subtask') => void;
  isSelectedFn?: (id: string) => boolean;
  selectionMode?: boolean;
}

// Lists the tasks linked to an epic (via epicId). Unlike subtasks these children
// may live in other lists/sprints — that cross-sprint reach is the point of an
// epic. The set of children is managed from the epic's detail panel
// (EpicRollupPanel), but each child renders as a full row at depth 1 and can
// expand to reveal its own subtasks — the third level (epic → task → subtask).
export function EpicChildrenList({ spaceId, epicId, onSelect, isSelectedFn, selectionMode }: Props) {
  const { data: children = [] } = useQuery({
    queryKey: ['epic-children', epicId],
    queryFn: () => tasksApi.getEpicChildren(spaceId, epicId),
  });

  if (children.length === 0) {
    return (
      <p className="px-4 py-2.5 text-xs text-ink-muted">Nenhuma tarefa neste épico ainda.</p>
    );
  }

  return (
    <div>
      {children.map((child) => {
        // The endpoint populates the origin sprint; split it back out so the row
        // gets a plain Task while still showing where the child is scheduled.
        const { sprintId, ...rest } = child;
        const task: Task = { ...rest, sprintId: sprintId?._id ?? null };
        return (
          <TaskRowWithSubtasks
            key={child._id}
            task={task}
            spaceId={spaceId}
            depth={1}
            showSprintChip
            sprint={sprintId}
            isSelected={isSelectedFn?.(child._id)}
            isSelectedFn={isSelectedFn}
            selectionMode={selectionMode}
            onSelect={onSelect}
          />
        );
      })}
    </div>
  );
}
