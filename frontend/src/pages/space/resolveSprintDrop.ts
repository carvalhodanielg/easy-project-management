import type { DragEndEvent } from '@dnd-kit/core';

/** Minimal shape of @dnd-kit's `over` needed to identify a sprint dropzone. */
type DroppableLike = { data: { current?: { type?: string } } } | null | undefined;

/**
 * Whether a drag is currently over a sidebar sprint dropzone. Used to gate the
 * floating drag cue so it only appears when carrying a task toward the sidebar,
 * not during in-list reordering.
 */
export function isSprintDropzone(over: DroppableLike): boolean {
  return over?.data.current?.type === 'sprint-dropzone';
}

export interface SprintDropResult {
  taskId: string;
  targetSprintId: string;
  /** Sprint the task came from (when known), used to build the undo move. */
  sourceSprintId?: string;
}

/**
 * Decides whether a drag-end event is a task being dropped onto a sprint row in
 * the sidebar. Returns the move to perform, or `null` when the drop is a no-op
 * (not a task, not a sprint dropzone, or dropped on the task's own/open sprint).
 *
 * Kept pure so the cross-sprint move logic is testable without simulating a real
 * @dnd-kit drag.
 */
export function resolveSprintDrop(
  event: DragEndEvent,
  currentSprintId: string | undefined,
): SprintDropResult | null {
  const { active, over } = event;
  if (!over) return null;

  if (active.data.current?.type !== 'task') return null;
  if (!isSprintDropzone(over)) return null;

  const targetSprintId = over.data.current?.sprintId as string | undefined;
  if (!targetSprintId) return null;

  const sourceSprintId = active.data.current.sprintId as string | undefined;

  // No-op when moving to the sprint the task already belongs to / the open one.
  if (targetSprintId === sourceSprintId) return null;
  if (targetSprintId === currentSprintId) return null;

  return { taskId: String(active.id), targetSprintId, sourceSprintId };
}
