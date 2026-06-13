import { useCallback, type ReactNode } from 'react';
import { TaskDragContext, type ReorderHandler } from './TaskDragContext';

/**
 * Provides {@link useTaskDrag}. Backed by a ref owned by SpaceLayout, so the
 * registered reorder handler survives re-renders without re-subscribing.
 */
export function TaskDragProvider({
  children,
  reorderHandlerRef,
}: {
  children: ReactNode;
  reorderHandlerRef: React.MutableRefObject<ReorderHandler | null>;
}) {
  const setReorderHandler = useCallback(
    (handler: ReorderHandler | null) => {
      reorderHandlerRef.current = handler;
    },
    [reorderHandlerRef],
  );

  return (
    <TaskDragContext.Provider value={{ setReorderHandler }}>
      {children}
    </TaskDragContext.Provider>
  );
}
