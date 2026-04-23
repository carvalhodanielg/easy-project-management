import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import * as tasksApi from '../../api/tasks.api';
import { TaskRow } from './TaskRow';
import { SortableSubtaskRow } from './SortableSubtaskRow';

interface Props {
  spaceId: string;
  taskId: string;
  onSelect?: (id: string, kind: 'main' | 'subtask') => void;
  isSelectedFn?: (id: string) => boolean;
  selectionMode?: boolean;
  autoFocusAdd?: boolean;
  onAddDone?: () => void;
  /** Depth passed to each TaskRow. Default 1 (task detail view). Pass 0 when
   *  the list is already inside an indented container (e.g. ml-9 in the list view). */
  rowDepth?: number;
  /** When true, renders subtasks inside a SortableContext with drag handles. */
  sortable?: boolean;
}

export function SubtaskList({ spaceId, taskId, onSelect, isSelectedFn, selectionMode, autoFocusAdd, onAddDone, rowDepth = 1, sortable = false }: Props) {
  const queryClient = useQueryClient();
  const [showInput, setShowInput] = useState(autoFocusAdd ?? false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocusAdd) setShowInput(true);
  }, [autoFocusAdd]);

  useEffect(() => {
    if (showInput) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [showInput]);

  const { data: subtasks = [] } = useQuery({
    queryKey: ['subtasks', taskId],
    queryFn: () => tasksApi.getSubtasks(spaceId, taskId),
  });

  const createMutation = useMutation({
    mutationFn: (taskName: string) => tasksApi.createTask(spaceId, { name: taskName, parentTask: taskId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] });
      void queryClient.invalidateQueries({ queryKey: ['tasks', spaceId] });
    },
  });

  function cancel() {
    setShowInput(false);
    setName('');
    onAddDone?.();
  }

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed || createMutation.isPending) return;
    setName('');
    setShowInput(false);
    onAddDone?.();
    createMutation.mutate(trimmed);
  };

  const subtaskRows = sortable ? (
    <SortableContext items={subtasks.map((s) => s._id)} strategy={verticalListSortingStrategy}>
      {subtasks.map((sub) => (
        <SortableSubtaskRow
          key={sub._id}
          task={sub}
          parentId={taskId}
          depth={rowDepth}
          isSelected={isSelectedFn?.(sub._id)}
          selectionMode={selectionMode}
          onSelect={onSelect}
        />
      ))}
    </SortableContext>
  ) : (
    <>
      {subtasks.map((sub) => (
        <TaskRow
          key={sub._id}
          task={sub}
          depth={rowDepth}
          isSelected={isSelectedFn?.(sub._id)}
          selectionMode={selectionMode}
          onSelect={onSelect}
        />
      ))}
    </>
  );

  return (
    <div>
      {subtaskRows}

      {showInput ? (
        <div className="flex items-center gap-2 px-3 py-2.5 border-t border-line-dim bg-lift/30">
          <input
            ref={inputRef}
            placeholder="Nome da subtarefa…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') submit();
              if (e.key === 'Escape') cancel();
            }}
            className="flex-1 bg-transparent border-b border-brand text-sm text-ink placeholder:text-ink-muted focus:outline-none py-0.5"
          />
          <button
            onClick={submit}
            disabled={!name.trim() || createMutation.isPending}
            className="px-2.5 py-1 bg-brand text-white text-xs rounded-md disabled:opacity-50 transition-all"
          >
            Add
          </button>
          <button
            onClick={cancel}
            className="p-1 text-ink-muted hover:text-ink transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          className="flex items-center gap-2 px-4 py-2.5 w-full text-xs text-ink-muted hover:text-ink hover:bg-lift/50 transition-colors border-t border-line-dim"
        >
          <Plus size={12} /> Adicionar subtarefa
        </button>
      )}
    </div>
  );
}
