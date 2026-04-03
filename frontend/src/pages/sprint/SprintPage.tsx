import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as tasksApi from '../../api/tasks.api';
import * as sprintsApi from '../../api/sprints.api';
import { TaskRow } from '../../components/task/TaskRow';
import { KanbanView } from '../../components/kanban/KanbanView';
import { Task } from '../../types/task.types';

export function SprintPage() {
  const { spaceId, sprintId } = useParams<{ spaceId: string; sprintId: string }>();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [showCreate, setShowCreate] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');

  const { data: sprint } = useQuery({
    queryKey: ['sprint', sprintId],
    queryFn: () => sprintsApi.getSprints(spaceId!).then((ss) => ss.find((s) => s._id === sprintId)),
    enabled: !!spaceId && !!sprintId,
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', spaceId, { sprintId }],
    queryFn: () => tasksApi.getTasks(spaceId!, { sprintId }),
    enabled: !!spaceId && !!sprintId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      tasksApi.createTask(spaceId!, { name: newTaskName, sprintId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', spaceId] });
      setNewTaskName('');
      setShowCreate(false);
    },
  });

  const totalPoints = tasks.reduce((sum: number, t: Task) => sum + (t.storyPoints ?? 0), 0);
  const donePoints = tasks
    .filter((t: Task) => t.status === 'feito')
    .reduce((sum: number, t: Task) => sum + (t.storyPoints ?? 0), 0);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #E8E8E8', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>
            ⚡ Sprint {sprint?.number} — {sprint?.name ?? '...'}
          </h2>
          {sprint && (
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#888' }}>
              {new Date(sprint.startDate).toLocaleDateString()} → {new Date(sprint.endDate).toLocaleDateString()}
              {' · '}
              <span style={{ color: '#4A90E2', fontWeight: 600 }}>{donePoints}/{totalPoints} pts</span>
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setView('list')}
            style={{ padding: '0.4rem 0.7rem', background: view === 'list' ? '#4A90E2' : '#F0F0F0', color: view === 'list' ? '#fff' : '#555', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            ☰ List
          </button>
          <button
            onClick={() => setView('kanban')}
            style={{ padding: '0.4rem 0.7rem', background: view === 'kanban' ? '#4A90E2' : '#F0F0F0', color: view === 'kanban' ? '#fff' : '#555', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            ⬛ Board
          </button>
          <button
            onClick={() => setShowCreate(true)}
            style={{ padding: '0.4rem 0.8rem', background: '#4A90E2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', marginLeft: '0.5rem' }}
          >
            + Add Task
          </button>
        </div>
      </header>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {view === 'kanban' ? (
          <KanbanView spaceId={spaceId!} tasks={tasks} />
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 1rem', background: '#FAFAFA', borderBottom: '1px solid #E8E8E8', fontSize: '0.75rem', color: '#AAA', fontWeight: 600 }}>
              <span style={{ width: '10px' }} />
              <span style={{ flex: 1 }}>Task</span>
              <span>Points</span>
              <span style={{ minWidth: '80px', textAlign: 'right' }}>Status</span>
            </div>

            {isLoading && <p style={{ padding: '1rem', color: '#888' }}>Loading...</p>}

            {tasks.map((task: Task) => (
              <TaskRow key={task._id} task={task} />
            ))}

            {!isLoading && tasks.length === 0 && (
              <p style={{ padding: '2rem', textAlign: 'center', color: '#AAA' }}>
                No tasks in this sprint yet.
              </p>
            )}

            {showCreate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderBottom: '1px solid #f0f0f0' }}>
                <input
                  autoFocus
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTaskName.trim()) createMutation.mutate();
                    if (e.key === 'Escape') { setShowCreate(false); setNewTaskName(''); }
                  }}
                  placeholder="Task name..."
                  style={{ flex: 1, padding: '0.4rem', border: '1px solid #4A90E2', borderRadius: '4px', outline: 'none', fontSize: '0.875rem' }}
                />
                <button
                  onClick={() => newTaskName.trim() && createMutation.mutate()}
                  disabled={!newTaskName.trim() || createMutation.isPending}
                  style={{ padding: '0.4rem 0.8rem', background: '#4A90E2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Add
                </button>
                <button
                  onClick={() => { setShowCreate(false); setNewTaskName(''); }}
                  style={{ padding: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}
                >
                  ✕
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
