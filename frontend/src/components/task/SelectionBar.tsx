import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Trash2, MoveRight, Copy, ArrowUpFromLine, MoveUpRight, CornerDownRight, ChevronDown } from 'lucide-react';
import * as tasksApi from '../../api/tasks.api';
import { useBulkPatchTasks } from '../../hooks/useBulkPatchTasks';
import { useDeleteTaskWithUndo } from '../../hooks/useDeleteTaskWithUndo';
import { DestinationPickerModal, type Destination } from './DestinationPickerModal';
import { ParentTaskPickerModal } from './ParentTaskPickerModal';
import type { Task, TaskStatus, TaskPriority } from '../../types/task.types';
import type { SelectionType } from '../../hooks/useTaskSelection';
import type { SpaceMember } from '../../types/space.types';
import type { User } from '../../types/user.types';

type ModalType =
  | 'move'
  | 'duplicate'
  | 'promote'
  | 'convert-to-subtask'
  | 'move-subtask'
  | null;

type PickerType = 'status' | 'priority' | 'assignee' | null;

interface Props {
  spaceId: string;
  count: number;
  selectionType: SelectionType;
  mainTaskIds: string[];
  subtaskIds: string[];
  allTasks: Task[];
  members?: SpaceMember[];
  onClear: () => void;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'pendente', label: 'Pendente', color: 'bg-ink-muted' },
  { value: 'em_progresso', label: 'Em progresso', color: 'bg-brand' },
  { value: 'em_review', label: 'Em review', color: 'bg-warning' },
  { value: 'feito', label: 'Feito', color: 'bg-success' },
  { value: 'fechado', label: 'Fechado', color: 'bg-ink-muted/40' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'urgente', label: 'Urgente', color: 'text-danger' },
  { value: 'alta', label: 'Alta', color: 'text-warning' },
  { value: 'normal', label: 'Normal', color: 'text-ink-dim' },
  { value: 'baixa', label: 'Baixa', color: 'text-ink-muted' },
];

function memberUser(m: SpaceMember): User | null {
  if (typeof m.userId === 'object' && m.userId !== null) return m.userId as User;
  return null;
}

function useOutsideClick(ref: React.RefObject<HTMLDivElement | null>, onClose: () => void) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onClose]);
}

export function SelectionBar({
  spaceId,
  count,
  selectionType,
  mainTaskIds,
  subtaskIds,
  allTasks,
  members = [],
  onClear,
}: Props) {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<ModalType>(null);
  const [picker, setPicker] = useState<PickerType>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  useOutsideClick(pickerRef, () => setPicker(null));

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['tasks', spaceId] });
    void queryClient.invalidateQueries({ queryKey: ['subtasks'] });
  };

  // Unified bulk endpoint (PATCH /spaces/:spaceId/tasks/bulk) used for the
  // status / priority / assignees / move / delete actions.
  const bulkPatch = useBulkPatchTasks(spaceId);

  const deleteWithUndo = useDeleteTaskWithUndo(spaceId);

  function handleDelete() {
    const ids = [...mainTaskIds, ...subtaskIds];
    deleteWithUndo.run({
      deleteFn: () => tasksApi.bulkPatchTasks(spaceId, { taskIds: ids, action: 'delete' }),
      restoreFn: () => Promise.all(ids.map((id) => tasksApi.restoreTask(spaceId, id))),
      message: ids.length === 1
        ? 'Tarefa movida para a lixeira'
        : `${ids.length} tarefas movidas para a lixeira`,
      onDeleted: onClear,
    });
  }

  const moveMutation = useMutation({
    mutationFn: (dest: Destination) =>
      bulkPatch.mutateAsync({
        taskIds: mainTaskIds,
        action: 'move',
        listId: dest.listId,
        sprintId: dest.sprintId,
      }),
    onSuccess: () => { onClear(); setModal(null); },
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

  const bulkPatchAction = (
    payload:
      | { action: 'status'; status: TaskStatus }
      | { action: 'priority'; priority: TaskPriority }
      | { action: 'assignees'; assignees: string[] },
  ) =>
    bulkPatch.mutate(
      { taskIds: [...mainTaskIds, ...subtaskIds], ...payload },
      { onSuccess: () => setPicker(null) },
    );

  const isPending =
    deleteWithUndo.isPending ||
    moveMutation.isPending ||
    duplicateMutation.isPending ||
    convertMutation.isPending ||
    promoteMutation.isPending ||
    moveSubtaskMutation.isPending ||
    bulkPatch.isPending;

  const showMain = selectionType === 'main' || selectionType === 'mixed';
  const showSub  = selectionType === 'subtask' || selectionType === 'mixed';

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
          onClick={handleDelete}
          disabled={isPending}
          title="Excluir"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
        >
          <Trash2 size={13} />
          <span className="hidden sm:inline">Excluir</span>
        </button>

        <div className="w-px h-4 bg-line shrink-0" />

        {/* Status picker */}
        <div className="relative" ref={picker === 'status' ? pickerRef : undefined}>
          <button
            onClick={() => setPicker(picker === 'status' ? null : 'status')}
            disabled={isPending}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-ink-dim hover:bg-lift hover:text-ink transition-colors disabled:opacity-50"
          >
            Status
            <ChevronDown size={11} />
          </button>
          {picker === 'status' && (
            <div className="absolute bottom-full mb-2 left-0 bg-surface border border-line rounded-xl shadow-xl py-1 min-w-[148px] z-50">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => bulkPatchAction({ action: 'status', status: opt.value })}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-ink hover:bg-lift transition-colors"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${opt.color}`} />
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Priority picker */}
        <div className="relative" ref={picker === 'priority' ? pickerRef : undefined}>
          <button
            onClick={() => setPicker(picker === 'priority' ? null : 'priority')}
            disabled={isPending}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-ink-dim hover:bg-lift hover:text-ink transition-colors disabled:opacity-50"
          >
            Prioridade
            <ChevronDown size={11} />
          </button>
          {picker === 'priority' && (
            <div className="absolute bottom-full mb-2 left-0 bg-surface border border-line rounded-xl shadow-xl py-1 min-w-[132px] z-50">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => bulkPatchAction({ action: 'priority', priority: opt.value })}
                  className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-lift transition-colors ${opt.color}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Assignee picker */}
        {members.length > 0 && (
          <div className="relative" ref={picker === 'assignee' ? pickerRef : undefined}>
            <button
              onClick={() => setPicker(picker === 'assignee' ? null : 'assignee')}
              disabled={isPending}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-ink-dim hover:bg-lift hover:text-ink transition-colors disabled:opacity-50"
            >
              Responsável
              <ChevronDown size={11} />
            </button>
            {picker === 'assignee' && (
              <div className="absolute bottom-full mb-2 left-0 bg-surface border border-line rounded-xl shadow-xl py-1 min-w-[168px] z-50 max-h-48 overflow-y-auto">
                <button
                  onClick={() => bulkPatchAction({ action: 'assignees', assignees: [] })}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-ink-muted hover:bg-lift transition-colors"
                >
                  Sem responsável
                </button>
                {members.map((m) => {
                  const u = memberUser(m);
                  if (!u) return null;
                  return (
                    <button
                      key={m._id}
                      onClick={() => bulkPatchAction({ action: 'assignees', assignees: [u._id] })}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-ink hover:bg-lift transition-colors"
                    >
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} className="w-5 h-5 rounded-full object-cover shrink-0" />
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-brand/20 text-brand text-[10px] font-semibold flex items-center justify-center shrink-0">
                          {u.name?.[0]?.toUpperCase() ?? '?'}
                        </span>
                      )}
                      {u.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="w-px h-4 bg-line shrink-0" />

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
