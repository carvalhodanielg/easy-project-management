import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as tasksApi from '../../api/tasks.api';
import { TaskRow } from './TaskRow';

interface Props {
  spaceId: string;
  taskId: string;
}

export function SubtaskList({ spaceId, taskId }: Props) {
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

  const submit = () => {
    if (name.trim()) createMutation.mutate();
  };

  return (
    <div>
      {subtasks.map((sub) => (
        <TaskRow key={sub._id} task={sub} />
      ))}

      {showInput ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.75rem' }}>
          <input
            autoFocus
            placeholder="Subtask name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
              if (e.key === 'Escape') { setShowInput(false); setName(''); }
            }}
            style={{ flex: 1, padding: '0.35rem 0.5rem', border: '1px solid #4A90E2', borderRadius: '4px', outline: 'none', fontSize: '0.85rem' }}
          />
          <button
            aria-label="Add"
            onClick={submit}
            disabled={!name.trim() || createMutation.isPending}
            style={{ padding: '0.35rem 0.7rem', background: '#4A90E2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            Add
          </button>
          <button
            onClick={() => { setShowInput(false); setName(''); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '0.85rem' }}
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#AAA', padding: '0.3rem 0.75rem', display: 'block' }}
        >
          + Add subtask
        </button>
      )}
    </div>
  );
}
