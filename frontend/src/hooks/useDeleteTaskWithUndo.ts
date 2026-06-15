import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { notifyError } from '../lib/toast';

export interface DeleteWithUndoParams {
  /** Performs the (soft) deletion. */
  deleteFn: () => Promise<unknown>;
  /** Restores what `deleteFn` deleted — wired to the toast's "Desfazer" action. */
  restoreFn: () => Promise<unknown>;
  /** Toast message shown after the deletion succeeds. */
  message: string;
  /** Optional side effect after a successful delete (close menu, clear selection…). */
  onDeleted?: () => void;
}

/**
 * Deletes a task (or a batch) and shows an undo toast that restores it.
 *
 * The deletion is a real backend soft-delete (archive), so "Desfazer" simply
 * calls the matching restore endpoint. Both the delete and the undo invalidate
 * the task / subtask / trash queries so the lists and the Lixeira stay in sync.
 */
export function useDeleteTaskWithUndo(spaceId: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['tasks', spaceId] });
    void queryClient.invalidateQueries({ queryKey: ['subtasks'] });
    void queryClient.invalidateQueries({ queryKey: ['trash'] });
  };

  const restoreMutation = useMutation({
    mutationFn: (restoreFn: () => Promise<unknown>) => restoreFn(),
    onSuccess: invalidate,
    onError: (err) => notifyError(err, 'Não foi possível desfazer a exclusão.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (params: DeleteWithUndoParams) => params.deleteFn(),
    onSuccess: (_data, params) => {
      invalidate();
      params.onDeleted?.();
      toast(params.message, {
        action: {
          label: 'Desfazer',
          onClick: () => restoreMutation.mutate(params.restoreFn),
        },
        duration: 6000,
      });
    },
    onError: (err) => notifyError(err, 'Falha ao excluir. Tente novamente.'),
  });

  return {
    run: (params: DeleteWithUndoParams) => deleteMutation.mutate(params),
    isPending: deleteMutation.isPending || restoreMutation.isPending,
  };
}
