import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkPatchTasks, type BulkPatchPayload, type BulkPatchResult } from '../api/tasks.api';

/**
 * Mutation for the unified bulk action endpoint
 * (PATCH /spaces/:spaceId/tasks/bulk). On success it invalidates the space's
 * task list (and subtask) queries so the UI reflects the bulk change.
 */
export function useBulkPatchTasks(spaceId: string) {
  const queryClient = useQueryClient();

  return useMutation<BulkPatchResult, unknown, BulkPatchPayload>({
    mutationFn: (payload) => bulkPatchTasks(spaceId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', spaceId] });
      void queryClient.invalidateQueries({ queryKey: ['subtasks'] });
    },
  });
}
