import React, { useState } from 'react';
import { TaskRow } from './TaskRow';
import { SubtaskList } from './SubtaskList';
import { EpicChildrenList } from './EpicChildrenList';
import { epicColor } from '../../lib/epicColor';
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
  /** When set, epic rows start expanded (revealing their linked tasks). */
  epicDefaultExpanded?: boolean;
  /** Indentation level of this row. 0 = top level; 1 when nested under an epic,
   *  so its subtasks form a visible third level (epic → task → subtask). */
  depth?: number;
  /** In the epic list, mark each child with its sprint (or Backlog). */
  showSprintChip?: boolean;
  sprint?: { name: string; number?: number } | null;
}

export function TaskRowWithSubtasks({ task, spaceId, subtaskMode = 'collapsed', isSelected, selectionMode, onSelect, isSelectedFn, subtaskSortable, dragHandle, epicDefaultExpanded, depth = 0, showSprintChip, sprint }: Props) {
  const forceExpanded = subtaskMode === 'expanded';
  const [expanded, setExpanded] = useState(
    task.isEpic ? !!epicDefaultExpanded : subtaskMode === 'expanded' || task.subtaskCount > 0,
  );
  const [adding, setAdding] = useState(false);
  const hasSubtasks = task.subtaskCount > 0;
  const showSubtaskSection = subtaskMode !== 'separated' && (expanded || forceExpanded || adding);

  function handleAddSubtask() {
    setExpanded(true);
    setAdding(true);
  }

  // Epics expand to reveal their linked tasks (by epicId), not subtasks. The
  // toggle is always available since children are fetched lazily on expand.
  if (task.isEpic) {
    return (
      <div>
        <TaskRow
          task={task}
          onToggleExpand={!selectionMode ? () => setExpanded((e) => !e) : undefined}
          isExpanded={expanded}
          isSelected={isSelected}
          onSelect={selectionMode ? onSelect : undefined}
          onStartSelect={onSelect}
          dragHandle={dragHandle}
        />
        {expanded && (
          <div className="border-l-[3px] ml-10 bg-lift/30" style={{ borderColor: epicColor(task.name) }}>
            <EpicChildrenList
              spaceId={spaceId}
              epicId={task._id}
              onSelect={onSelect}
              isSelectedFn={isSelectedFn}
              selectionMode={selectionMode}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <TaskRow
        task={task}
        depth={depth}
        showSprintChip={showSprintChip}
        sprint={sprint}
        onToggleExpand={!selectionMode && hasSubtasks && !forceExpanded ? () => setExpanded((e) => !e) : undefined}
        isExpanded={forceExpanded || expanded}
        isSelected={isSelected}
        onSelect={selectionMode ? onSelect : undefined}
        onStartSelect={onSelect}
        onAddSubtask={!selectionMode ? handleAddSubtask : undefined}
        dragHandle={dragHandle}
      />
      {showSubtaskSection && (
        <div className={`border-l-[3px] border-brand/25 bg-lift/30 ${depth === 0 ? 'ml-10' : ''}`}>
          <SubtaskList
            spaceId={spaceId}
            taskId={task._id}
            onSelect={onSelect}
            isSelectedFn={isSelectedFn}
            selectionMode={selectionMode}
            autoFocusAdd={adding}
            onAddDone={() => setAdding(false)}
            rowDepth={depth === 0 ? 0 : depth + 1}
            sortable={subtaskSortable}
          />
        </div>
      )}
    </div>
  );
}
