import { QueryClient } from '@tanstack/react-query';
import { Task, TaskStatus } from '../../types/task.types';
import * as tasksApi from '../../api/tasks.api';
import { notifyError } from '../../lib/toast';

/**
 * Optimistically moves a task to `newStatus` across every cached task list for
 * the space, then persists the change. If the write fails it restores the exact
 * previous cache snapshot (a visible rollback — the card returns to where it was)
 * and surfaces the failure as an error toast.
 */
export function moveTaskStatus(
  queryClient: QueryClient,
  spaceId: string,
  taskId: string,
  newStatus: TaskStatus,
): void {
  const queryKey = ['tasks', spaceId];
  const previous = queryClient.getQueriesData<Task[]>({ queryKey });

  queryClient.setQueriesData<Task[]>({ queryKey }, (old) =>
    old ? old.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t)) : old,
  );

  void tasksApi.updateTask(spaceId, taskId, { status: newStatus }).catch((err) => {
    previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
    notifyError(err, 'Falha ao mover a tarefa. Tente novamente.');
  });
}
