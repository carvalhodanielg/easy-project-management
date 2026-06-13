import { createContext, useContext } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';

export type ReorderHandler = (event: DragEndEvent) => void;

export interface TaskDragContextValue {
  /** Register (or clear with `null`) the page-local drag-end handler used for
   *  in-sprint reordering. The root DndContext in SpaceLayout delegates here when
   *  a drag is not a cross-sprint drop. */
  setReorderHandler: (handler: ReorderHandler | null) => void;
}

export const TaskDragContext = createContext<TaskDragContextValue | null>(null);

/** Outside the provider (e.g. isolated tests) registration is a no-op. */
const NOOP: TaskDragContextValue = { setReorderHandler: () => {} };

/**
 * Lets a page (SprintPage) plug its reordering logic into the single
 * application-wide DndContext that lives in SpaceLayout, so the same drag can
 * either reorder within a sprint or be dropped onto a sidebar sprint.
 */
export function useTaskDrag(): TaskDragContextValue {
  return useContext(TaskDragContext) ?? NOOP;
}
