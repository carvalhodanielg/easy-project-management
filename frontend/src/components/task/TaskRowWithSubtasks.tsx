import React, { useState } from 'react';
import { TaskRow } from './TaskRow';
import { SubtaskList } from './SubtaskList';
import type { Task } from '../../types/task.types';

interface Props {
  task: Task;
  spaceId: string;
  isSelected?: boolean;
  onSelect?: (id: string, kind: 'main' | 'subtask') => void;
  isSelectedFn?: (id: string) => boolean;
  subtaskSortable?: boolean;
  dragHandle?: React.ReactNode;
}

export function TaskRowWithSubtasks({ task, spaceId, isSelected, onSelect, isSelectedFn, subtaskSortable, dragHandle }: Props) {
  const [expanded, setExpanded] = useState(task.subtaskCount > 0);
  const [adding, setAdding] = useState(false);
  const hasSubtasks = task.subtaskCount > 0;
  const inSelectionMode = !!onSelect;
  const showSubtaskSection = expanded || adding;

  function handleAddSubtask() {
    setExpanded(true);
    setAdding(true);
  }

  return (
    <div>
      <TaskRow
        task={task}
        onToggleExpand={!inSelectionMode && hasSubtasks ? () => setExpanded((e) => !e) : undefined}
        isExpanded={expanded}
        isSelected={isSelected}
        onSelect={onSelect}
        onAddSubtask={!inSelectionMode ? handleAddSubtask : undefined}
        dragHandle={dragHandle}
      />
      {showSubtaskSection && (
        <div className="border-l-2 border-line ml-9">
          <SubtaskList
            spaceId={spaceId}
            taskId={task._id}
            onSelect={onSelect}
            isSelectedFn={isSelectedFn}
            autoFocusAdd={adding}
            onAddDone={() => setAdding(false)}
            rowDepth={0}
            sortable={subtaskSortable}
          />
        </div>
      )}
    </div>
  );
}
