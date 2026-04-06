import { useState } from 'react';
import { TaskRow } from './TaskRow';
import { SubtaskList } from './SubtaskList';
import type { Task } from '../../types/task.types';

interface Props {
  task: Task;
  spaceId: string;
  isSelected?: boolean;
  onSelect?: (id: string, kind: 'main' | 'subtask') => void;
  isSelectedFn?: (id: string) => boolean;
}

export function TaskRowWithSubtasks({ task, spaceId, isSelected, onSelect, isSelectedFn }: Props) {
  const [expanded, setExpanded] = useState(task.subtaskCount > 0);
  const hasSubtasks = task.subtaskCount > 0;
  const inSelectionMode = !!onSelect;

  return (
    <div>
      <TaskRow
        task={task}
        onToggleExpand={!inSelectionMode && hasSubtasks ? () => setExpanded((e) => !e) : undefined}
        isExpanded={expanded}
        isSelected={isSelected}
        onSelect={onSelect}
      />
      {hasSubtasks && expanded && (
        <div className="border-l-2 border-line ml-9">
          <SubtaskList
            spaceId={spaceId}
            taskId={task._id}
            onSelect={onSelect}
            isSelectedFn={isSelectedFn}
          />
        </div>
      )}
    </div>
  );
}
