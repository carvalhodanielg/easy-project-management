import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as tasksApi from '../../api/tasks.api';
import * as listsApi from '../../api/lists.api';
import { TaskRow } from '../../components/task/TaskRow';
import { TaskGroupHeader } from '../../components/task/TaskGroupHeader';
import { KanbanView } from '../../components/kanban/KanbanView';
import { FilterBar } from '../../components/filter/FilterBar';
import { useTaskFilter } from '../../hooks/useTaskFilter';
import { Task, GroupedTaskResult } from '../../types/task.types';

export function ListPage() {
  const { spaceId, listId } = useParams<{ spaceId: string; listId: string }>();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [showCreate, setShowCreate] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');

  const taskFilter = useTaskFilter({ listId });

  const { data: list } = useQuery({
    queryKey: ['list', listId],
    queryFn: () => listsApi.getLists(spaceId!).then((ls) => ls.find((l) => l._id === listId)),
    enabled: !!spaceId && !!listId,
  });

  const filterParams = taskFilter.toQueryParams();
  const isGrouped = !!filterParams.groupBy;

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', spaceId, filterParams],
    queryFn: () =>
      isGrouped
        ? tasksApi.getGroupedTasks(spaceId!, filterParams)
        : tasksApi.getTasks(spaceId!, filterParams),
    enabled: !!spaceId && !!listId,
  });

  const flatTasks: Task[] = isGrouped
    ? (tasks as GroupedTaskResult[]).flatMap((g) => g.tasks)
    : (tasks as Task[]);

  const createMutation = useMutation({
    mutationFn: () =>
      tasksApi.createTask(spaceId!, { name: newTaskName, listId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', spaceId] });
      setNewTaskName('');
      setShowCreate(false);
    },
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid #E8E8E8', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>≡ {list?.name ?? '...'}</h2>
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
        </div>
        <FilterBar
          filters={taskFilter.filters}
          onToggleStatus={taskFilter.toggleStatus}
          onTogglePriority={taskFilter.togglePriority}
          onToggleAssignee={taskFilter.toggleAssignee}
          onToggleTag={taskFilter.toggleTag}
          onSetGroupBy={taskFilter.setGroupBy}
          onSetSearch={taskFilter.setSearch}
          onToggleSubtasks={taskFilter.toggleSubtasks}
          onReset={taskFilter.reset}
          isActive={taskFilter.isActive}
        />
      </header>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {view === 'kanban' ? (
          <KanbanView spaceId={spaceId!} tasks={flatTasks} />
        ) : (
          <>
            {/* Column headers */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 1rem', background: '#FAFAFA', borderBottom: '1px solid #E8E8E8', fontSize: '0.75rem', color: '#AAA', fontWeight: 600 }}>
              <span style={{ width: '10px' }} />
              <span style={{ flex: 1 }}>Task</span>
              <span>Points</span>
              <span style={{ minWidth: '80px', textAlign: 'right' }}>Status</span>
            </div>

            {isLoading && <p style={{ padding: '1rem', color: '#888' }}>Loading...</p>}

            {isGrouped
              ? (tasks as GroupedTaskResult[]).map((group) => (
                <div key={group.groupKey ?? 'null'}>
                  <TaskGroupHeader
                    groupKey={group.groupKey}
                    groupBy={filterParams.groupBy!}
                    count={group.count}
                    totalStoryPoints={group.totalStoryPoints}
                  />
                  {group.tasks.map((task) => (
                    <TaskRow key={task._id} task={task} />
                  ))}
                </div>
              ))
              : (tasks as Task[]).map((task) => (
                <TaskRow key={task._id} task={task} />
              ))
            }

            {!isLoading && flatTasks.length === 0 && (
              <p style={{ padding: '2rem', textAlign: 'center', color: '#AAA' }}>
                No tasks yet. Click &quot;+ Add Task&quot; to create one.
              </p>
            )}
          </>
        )}

        {/* Inline create */}
        {showCreate && view === 'list' && (
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
      </div>
    </div>
  );
}
