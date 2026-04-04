import { useState } from 'react';
import { TaskRow } from './TaskRow';
import { SubtaskList } from './SubtaskList';
import type { Task } from '../../types/task.types';

interface Props {
  task: Task;
  spaceId: string;
}

export function TaskRowWithSubtasks({ task, spaceId }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <TaskRow
        task={task}
        onToggleExpand={() => setExpanded((e) => !e)}
        isExpanded={expanded}
      />

      {expanded && (
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
