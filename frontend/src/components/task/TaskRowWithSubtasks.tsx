import { useState } from 'react';
import { TaskRow } from './TaskRow';
import { SubtaskList } from './SubtaskList';
import type { Task } from '../../types/task.types';

interface Props {
  task: Task;
  spaceId: string;
}

export function TaskRowWithSubtasks({ task, spaceId }: Props) {
  const [expanded, setExpanded] = useState(task.subtaskCount > 0);
  const hasSubtasks = task.subtaskCount > 0;

  return (
    <div>
      <TaskRow
        task={task}
        onToggleExpand={hasSubtasks ? () => setExpanded((e) => !e) : undefined}
        isExpanded={expanded}
      />
      {hasSubtasks && expanded && (
        <div className="border-l-2 border-line ml-9">
          <SubtaskList spaceId={spaceId} taskId={task._id} />
        </div>
      )}
    </div>
  );
}
