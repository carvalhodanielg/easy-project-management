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
        <div
          style={{
            marginLeft: '2.5rem',
            borderLeft: '2px solid #E0E8F5',
            background: '#FAFBFF',
          }}
        >
          <SubtaskList spaceId={spaceId} taskId={task._id} />
        </div>
      )}
    </div>
  );
}
