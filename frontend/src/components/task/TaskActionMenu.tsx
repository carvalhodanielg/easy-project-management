import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, Trash2, MoveRight, Copy, ChevronRight, ArrowUpFromLine, MoveUpRight, CheckSquare } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as tasksApi from '../../api/tasks.api';
import { DestinationPickerModal, type Destination } from './DestinationPickerModal';
import { ParentTaskPickerModal } from './ParentTaskPickerModal';
import type { Task } from '../../types/task.types';

type DropdownView = 'main' | 'move-subtask';
type ModalType = 'move' | 'duplicate' | 'move-subtask' | 'promote' | 'duplicate-subtask' | 'confirm-delete' | null;

interface Props {
  task: Task;
  spaceId: string;
  onDone: () => void;
  onSelect?: () => void;
}

export function TaskActionMenu({ task, spaceId, onDone, onSelect }: Props) {
  const queryClient = useQueryClient();
  const isSubtask = !!task.parentTask;

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<DropdownView>('main');
  const [modal, setModal] = useState<ModalType>(null);
  const [btnPos, setBtnPos] = useState({ top: 0, left: 0 });

  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const needsTaskList = modal === 'move-subtask' || modal === 'duplicate-subtask';

  const { data: spaceTasks = [] } = useQuery({
    queryKey: ['tasks-flat', spaceId],
    queryFn: (): Promise<Task[]> => tasksApi.getTasks(spaceId),
    staleTime: 30_000,
    enabled: needsTaskList,
  });

  const mainTasks = spaceTasks.filter((t) => !t.parentTask);

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['tasks', spaceId] });
    void queryClient.invalidateQueries({ queryKey: ['subtasks'] });
  }

  const deleteMutation = useMutation({
    mutationFn: () => tasksApi.deleteTask(spaceId, task._id),
    onSuccess: () => { invalidate(); onDone(); setModal(null); },
  });

  const moveMutation = useMutation({
    mutationFn: (dest: Destination) => tasksApi.bulkMoveTasks(spaceId, [task._id], dest),
    onSuccess: () => { invalidate(); onDone(); setModal(null); },
  });

  const duplicateMutation = useMutation({
    mutationFn: (dest: Destination) => tasksApi.bulkDuplicateTasks(spaceId, [task._id], dest),
    onSuccess: () => { invalidate(); onDone(); setModal(null); },
  });

  const moveSubtaskMutation = useMutation({
    mutationFn: (newParentTaskId: string) => tasksApi.moveSubtask(spaceId, [task._id], newParentTaskId),
    onSuccess: () => { invalidate(); onDone(); setModal(null); },
  });

  const promoteMutation = useMutation({
    mutationFn: (dest: Destination) => tasksApi.promoteToMainTask(spaceId, [task._id], dest),
    onSuccess: () => { invalidate(); onDone(); setModal(null); },
  });

  const duplicateSubtaskMutation = useMutation({
    mutationFn: (newParentTaskId: string) => tasksApi.duplicateSubtask(spaceId, task._id, newParentTaskId),
    onSuccess: () => { invalidate(); onDone(); setModal(null); },
  });

  function openDropdown() {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setBtnPos({ top: rect.bottom + 4, left: rect.right });
    setView('main');
    setOpen(true);
  }

  function closeAll() {
    setOpen(false);
    setModal(null);
    setView('main');
  }

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setView('main');
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  function handleDelete() {
    setOpen(false);
    setModal('confirm-delete');
  }

  function handleMove() {
    if (isSubtask) {
      setView('move-subtask');
    } else {
      setOpen(false);
      setModal('move');
    }
  }

  function handleDuplicate() {
    setOpen(false);
    setModal(isSubtask ? 'duplicate-subtask' : 'duplicate');
  }

  const isPending =
    deleteMutation.isPending || moveMutation.isPending || duplicateMutation.isPending ||
    moveSubtaskMutation.isPending || promoteMutation.isPending || duplicateSubtaskMutation.isPending;

  return (
    <>
      <button
        ref={btnRef}
        aria-label="Ações da tarefa"
        onClick={(e) => { e.stopPropagation(); openDropdown(); }}
        className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 rounded text-ink-muted hover:text-ink hover:bg-lift transition-colors"
      >
        <MoreHorizontal size={14} />
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: btnPos.top, left: btnPos.left, transform: 'translateX(-100%)' }}
          className="z-[9999] bg-modal border border-line rounded-xl shadow-2xl py-1 min-w-[160px]"
          onClick={(e) => e.stopPropagation()}
        >
          {view === 'main' && (
            <>
              {onSelect && (
                <button
                  onClick={() => { setOpen(false); onSelect(); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-ink hover:bg-lift transition-colors"
                >
                  <CheckSquare size={13} />
                  Selecionar
                </button>
              )}
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
              >
                <Trash2 size={13} />
                Apagar
              </button>
              <button
                onClick={handleMove}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-ink hover:bg-lift transition-colors"
              >
                <MoveRight size={13} />
                <span className="flex-1 text-left">Mover</span>
                {isSubtask && <ChevronRight size={12} className="text-ink-muted" />}
              </button>
              <button
                onClick={handleDuplicate}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-ink hover:bg-lift transition-colors"
              >
                <Copy size={13} />
                Duplicar
              </button>
            </>
          )}

          {view === 'move-subtask' && (
            <>
              <div className="px-3 pt-2 pb-1 text-xs text-ink-muted font-medium">Mover para</div>
              <button
                onClick={() => { setOpen(false); setModal('move-subtask'); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-ink hover:bg-lift transition-colors"
              >
                <MoveUpRight size={13} />
                Mudar pai
              </button>
              <button
                onClick={() => { setOpen(false); setModal('promote'); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-ink hover:bg-lift transition-colors"
              >
                <ArrowUpFromLine size={13} />
                Promover para tarefa principal
              </button>
            </>
          )}
        </div>,
        document.body,
      )}

      {/* Confirm delete dialog */}
      {modal === 'confirm-delete' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={closeAll}
        >
          <div
            className="bg-surface border border-line rounded-xl shadow-2xl w-[360px] p-5 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-ink">Confirmar exclusão</p>
            <p className="text-sm text-ink-dim">
              {!isSubtask && task.subtaskCount > 0
                ? <>Esta tarefa possui <strong>{task.subtaskCount} subtarefa{task.subtaskCount !== 1 ? 's' : ''}</strong>. Todas serão apagadas junto com ela. Deseja continuar?</>
                : 'Esta ação não pode ser desfeita. Deseja continuar?'
              }
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={closeAll}
                className="px-3 py-1.5 rounded-lg text-sm text-ink-dim border border-line hover:bg-lift transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={isPending}
                className="px-3 py-1.5 rounded-lg text-sm text-white bg-danger hover:bg-danger/80 transition-colors disabled:opacity-50"
              >
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'move' && (
        <DestinationPickerModal
          spaceId={spaceId}
          title="Mover tarefa para"
          onConfirm={(dest) => moveMutation.mutate(dest)}
          onClose={closeAll}
        />
      )}

      {modal === 'duplicate' && (
        <DestinationPickerModal
          spaceId={spaceId}
          title="Duplicar tarefa para"
          onConfirm={(dest) => duplicateMutation.mutate(dest)}
          onClose={closeAll}
        />
      )}

      {modal === 'promote' && (
        <DestinationPickerModal
          spaceId={spaceId}
          title="Promover para tarefa principal"
          onConfirm={(dest) => promoteMutation.mutate(dest)}
          onClose={closeAll}
        />
      )}

      {modal === 'move-subtask' && (
        <ParentTaskPickerModal
          title="Mover para outro pai"
          tasks={mainTasks}
          excludeIds={[task._id]}
          onConfirm={(parentId) => moveSubtaskMutation.mutate(parentId)}
          onClose={closeAll}
        />
      )}

      {modal === 'duplicate-subtask' && (
        <ParentTaskPickerModal
          title="Duplicar subtarefa para"
          tasks={mainTasks}
          excludeIds={[]}
          onConfirm={(parentId) => duplicateSubtaskMutation.mutate(parentId)}
          onClose={closeAll}
        />
      )}
    </>
  );
}
