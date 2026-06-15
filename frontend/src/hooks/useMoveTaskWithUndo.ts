import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { notifyError } from '../lib/toast';

export interface MoveWithUndoParams {
  /** Performs the move (e.g. send the task to another sprint). */
  moveFn: () => Promise<unknown>;
  /** Reverts the move — wired to the toast's "Desfazer" action. */
  undoFn: () => Promise<unknown>;
  /** Toast message shown after the move succeeds. */
  message: string;
  /** Optional side effect after a successful move. */
  onMoved?: () => void;
  /** Optional side effect once the move settles — runs on success *and* failure. */
  onSettled?: () => void;
}

/**
 * Moves a task and shows an undo toast that puts it back where it was.
 *
 * Mirrors {@link useDeleteTaskWithUndo}: the move and the undo are both plain
 * backend calls, so "Desfazer" simply runs the reverse move. Both invalidate the
 * task / subtask queries so the lists stay in sync.
 */
export function useMoveTaskWithUndo(spaceId: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['tasks', spaceId] });
    void queryClient.invalidateQueries({ queryKey: ['subtasks'] });
  };

  const undoMutation = useMutation({
    mutationFn: (undoFn: () => Promise<unknown>) => undoFn(),
    onSuccess: invalidate,
    onError: (err) => notifyError(err, 'Não foi possível desfazer a movimentação.'),
  });

  const moveMutation = useMutation({
    mutationFn: (params: MoveWithUndoParams) => params.moveFn(),
    onSuccess: (_data, params) => {
      invalidate();
      params.onMoved?.();
      toast(params.message, {
        action: {
          label: 'Desfazer',
          onClick: () => undoMutation.mutate(params.undoFn),
        },
        duration: 6000,
      });
    },
    onError: (err) => notifyError(err, 'Falha ao mover a tarefa. Tente novamente.'),
    onSettled: (_data, _error, params) => params.onSettled?.(),
  });

  return {
    run: (params: MoveWithUndoParams) => moveMutation.mutate(params),
    isPending: moveMutation.isPending || undoMutation.isPending,
  };
}
