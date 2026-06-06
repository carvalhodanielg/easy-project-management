import React, { useState } from 'react';
import { TaskRow } from './TaskRow';
import { SubtaskList } from './SubtaskList';
import type { Task, SubtaskMode } from '../../types/task.types';

interface Props {
  task: Task;
  spaceId: string;
  subtaskMode?: SubtaskMode;
  isSelected?: boolean;
  selectionMode?: boolean;
  onSelect?: (id: string, kind: 'main' | 'subtask') => void;
  isSelectedFn?: (id: string) => boolean;
  subtaskSortable?: boolean;
  dragHandle?: React.ReactNode;
}

export function TaskRowWithSubtasks({ task, spaceId, subtaskMode = 'collapsed', isSelected, selectionMode, onSelect, isSelectedFn, subtaskSortable, dragHandle }: Props) {
  const forceExpanded = subtaskMode === 'expanded';
  const [expanded, setExpanded] = useState(subtaskMode === 'expanded' || task.subtaskCount > 0);
  const [adding, setAdding] = useState(false);
  const hasSubtasks = task.subtaskCount > 0;
  const showSubtaskSection = subtaskMode !== 'separated' && (expanded || forceExpanded || adding);

  function handleAddSubtask() {
    setExpanded(true);
    setAdding(true);
  }

  return (
    <div>
      <TaskRow
        task={task}
        onToggleExpand={!selectionMode && hasSubtasks && !forceExpanded ? () => setExpanded((e) => !e) : undefined}
        isExpanded={forceExpanded || expanded}
        isSelected={isSelected}
        onSelect={selectionMode ? onSelect : undefined}
        onStartSelect={onSelect}
        onAddSubtask={!selectionMode ? handleAddSubtask : undefined}
        dragHandle={dragHandle}
      />
      {showSubtaskSection && (
        <div className="border-l-[3px] border-brand/25 ml-10 bg-lift/30">
          <SubtaskList
            spaceId={spaceId}
            taskId={task._id}
            onSelect={onSelect}
            isSelectedFn={isSelectedFn}
            selectionMode={selectionMode}
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
