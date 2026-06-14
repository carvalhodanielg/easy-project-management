import { useQuery } from '@tanstack/react-query';
import * as tasksApi from '../../api/tasks.api';
import { TaskRowWithSubtasks } from './TaskRowWithSubtasks';

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
      {children.map((child) => (
        <TaskRowWithSubtasks
          key={child._id}
          task={child}
          spaceId={spaceId}
          depth={1}
          isSelected={isSelectedFn?.(child._id)}
          isSelectedFn={isSelectedFn}
          selectionMode={selectionMode}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
