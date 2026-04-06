import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Trash2, MoveRight, Copy, ArrowUpFromLine, MoveUpRight, CornerDownRight } from 'lucide-react';
import * as tasksApi from '../../api/tasks.api';
import { DestinationPickerModal, type Destination } from './DestinationPickerModal';
import { ParentTaskPickerModal } from './ParentTaskPickerModal';
import type { Task } from '../../types/task.types';
import type { SelectionType } from '../../hooks/useTaskSelection';

type ModalType =
  | 'move'
  | 'duplicate'
  | 'promote'
  | 'convert-to-subtask'
  | 'move-subtask'
  | null;

interface Props {
  spaceId: string;
  count: number;
  selectionType: SelectionType;
  mainTaskIds: string[];
  subtaskIds: string[];
  allTasks: Task[];
  onClear: () => void;
}

export function SelectionBar({
  spaceId,
  count,
  selectionType,
  mainTaskIds,
  subtaskIds,
  allTasks,
  onClear,
}: Props) {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<ModalType>(null);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['tasks', spaceId] });
    void queryClient.invalidateQueries({ queryKey: ['subtasks'] });
  };

  const deleteMutation = useMutation({
    mutationFn: () => {
      const ids = [...mainTaskIds, ...subtaskIds];
      return tasksApi.bulkDeleteTasks(spaceId, ids);
    },
    onSuccess: () => { invalidate(); onClear(); },
  });

  const moveMutation = useMutation({
    mutationFn: (dest: Destination) =>
      tasksApi.bulkMoveTasks(spaceId, mainTaskIds, dest),
    onSuccess: () => { invalidate(); onClear(); setModal(null); },
  });

  const duplicateMutation = useMutation({
    mutationFn: (dest: Destination) =>
      tasksApi.bulkDuplicateTasks(spaceId, mainTaskIds, dest),
    onSuccess: () => { invalidate(); onClear(); setModal(null); },
  });

  const convertMutation = useMutation({
    mutationFn: (parentTaskId: string) =>
      tasksApi.convertToSubtask(spaceId, mainTaskIds, parentTaskId),
    onSuccess: () => { invalidate(); onClear(); setModal(null); },
  });

  const promoteMutation = useMutation({
    mutationFn: (dest: Destination) =>
      tasksApi.promoteToMainTask(spaceId, subtaskIds, dest),
    onSuccess: () => { invalidate(); onClear(); setModal(null); },
  });

  const moveSubtaskMutation = useMutation({
    mutationFn: (newParentTaskId: string) =>
      tasksApi.moveSubtask(spaceId, subtaskIds, newParentTaskId),
    onSuccess: () => { invalidate(); onClear(); setModal(null); },
  });

  const isPending =
    deleteMutation.isPending ||
    moveMutation.isPending ||
    duplicateMutation.isPending ||
    convertMutation.isPending ||
    promoteMutation.isPending ||
    moveSubtaskMutation.isPending;

  // Available actions depend on selection type
  const showMain = selectionType === 'main' || selectionType === 'mixed';
  const showSub  = selectionType === 'subtask' || selectionType === 'mixed';

  // For convert-to-subtask, exclude the selected tasks themselves from picker
  const selectedIds = [...mainTaskIds, ...subtaskIds];
  const mainTasksOnly = allTasks.filter((t) => !t.parentTask);

  return (
    <>
      {/* Floating bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2.5 bg-surface border border-line rounded-2xl shadow-2xl shadow-black/40">
        <span className="text-xs font-semibold text-ink mr-2 min-w-max">
          {count} {count === 1 ? 'selecionada' : 'selecionadas'}
        </span>

        <div className="w-px h-4 bg-line shrink-0" />

        {/* Delete — always */}
        <button
          onClick={() => deleteMutation.mutate()}
          disabled={isPending}
          title="Excluir"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
        >
          <Trash2 size={13} />
          <span className="hidden sm:inline">Excluir</span>
        </button>

        {/* Move — only for main tasks */}
        {showMain && (
          <button
            onClick={() => setModal('move')}
            disabled={isPending}
            title="Mover"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-ink-dim hover:bg-lift hover:text-ink transition-colors disabled:opacity-50"
          >
            <MoveRight size={13} />
            <span className="hidden sm:inline">Mover</span>
          </button>
        )}

        {/* Duplicate — only for main tasks */}
        {showMain && selectionType !== 'mixed' && (
          <button
            onClick={() => setModal('duplicate')}
            disabled={isPending}
            title="Duplicar"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-ink-dim hover:bg-lift hover:text-ink transition-colors disabled:opacity-50"
          >
            <Copy size={13} />
            <span className="hidden sm:inline">Duplicar</span>
          </button>
        )}

        {/* Convert to subtask — only for main tasks */}
        {showMain && selectionType !== 'mixed' && (
          <button
            onClick={() => setModal('convert-to-subtask')}
            disabled={isPending}
            title="Tornar subtarefa"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-ink-dim hover:bg-lift hover:text-ink transition-colors disabled:opacity-50"
          >
            <CornerDownRight size={13} />
            <span className="hidden sm:inline">Tornar subtarefa</span>
          </button>
        )}

        {/* Promote to main task — only for subtasks */}
        {showSub && selectionType !== 'mixed' && (
          <button
            onClick={() => setModal('promote')}
            disabled={isPending}
            title="Tornar tarefa principal"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-ink-dim hover:bg-lift hover:text-ink transition-colors disabled:opacity-50"
          >
            <ArrowUpFromLine size={13} />
            <span className="hidden sm:inline">Promover</span>
          </button>
        )}

        {/* Move subtask — only for subtasks */}
        {showSub && selectionType !== 'mixed' && (
          <button
            onClick={() => setModal('move-subtask')}
            disabled={isPending}
            title="Mover para outro pai"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-ink-dim hover:bg-lift hover:text-ink transition-colors disabled:opacity-50"
          >
            <MoveUpRight size={13} />
            <span className="hidden sm:inline">Mover subtarefa</span>
          </button>
        )}

        <div className="w-px h-4 bg-line shrink-0" />

        <button
          onClick={onClear}
          title="Cancelar seleção"
          className="p-1.5 text-ink-muted hover:text-ink transition-colors rounded-lg hover:bg-lift"
        >
          <X size={13} />
        </button>
      </div>

      {/* Modals */}
      {modal === 'move' && (
        <DestinationPickerModal
          spaceId={spaceId}
          title="Mover tarefas para…"
          onConfirm={(dest) => moveMutation.mutate(dest)}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'duplicate' && (
        <DestinationPickerModal
          spaceId={spaceId}
          title="Duplicar tarefas para…"
          onConfirm={(dest) => duplicateMutation.mutate(dest)}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'promote' && (
        <DestinationPickerModal
          spaceId={spaceId}
          title="Promover subtarefas para…"
          onConfirm={(dest) => promoteMutation.mutate(dest)}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'convert-to-subtask' && (
        <ParentTaskPickerModal
          title="Selecionar tarefa pai…"
          tasks={mainTasksOnly}
          excludeIds={selectedIds}
          onConfirm={(parentId) => convertMutation.mutate(parentId)}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'move-subtask' && (
        <ParentTaskPickerModal
          title="Mover subtarefa para outro pai…"
          tasks={mainTasksOnly}
          excludeIds={selectedIds}
          onConfirm={(parentId) => moveSubtaskMutation.mutate(parentId)}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
