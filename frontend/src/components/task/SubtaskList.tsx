import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import * as tasksApi from '../../api/tasks.api';
import { TaskRow } from './TaskRow';

interface Props {
  spaceId: string;
  taskId: string;
  onSelect?: (id: string, kind: 'main' | 'subtask') => void;
  isSelectedFn?: (id: string) => boolean;
}

export function SubtaskList({ spaceId, taskId, onSelect, isSelectedFn }: Props) {
  const queryClient = useQueryClient();
  const [showInput, setShowInput] = useState(false);
  const [name, setName] = useState('');

  const { data: subtasks = [] } = useQuery({
    queryKey: ['subtasks', taskId],
    queryFn: () => tasksApi.getSubtasks(spaceId, taskId),
  });

  const createMutation = useMutation({
    mutationFn: () => tasksApi.createTask(spaceId, { name: name.trim(), parentTask: taskId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] });
      setName('');
      setShowInput(false);
    },
  });

  const submit = () => { if (name.trim()) createMutation.mutate(); };

  return (
    <div>
      {subtasks.map((sub) => (
        <TaskRow
          key={sub._id}
          task={sub}
          depth={1}
          isSelected={isSelectedFn?.(sub._id)}
          onSelect={onSelect}
        />
      ))}

      {showInput ? (
        <div className="flex items-center gap-2 px-3 py-2.5 border-t border-line-dim bg-lift/30">
          <input
            autoFocus
            placeholder="Nome da subtarefa…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
              if (e.key === 'Escape') { setShowInput(false); setName(''); }
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
            onClick={() => { setShowInput(false); setName(''); }}
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
