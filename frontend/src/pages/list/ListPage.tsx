import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LayoutList, Kanban, Plus, X, List } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import * as tasksApi from '../../api/tasks.api';
import * as listsApi from '../../api/lists.api';
import * as savedFiltersApi from '../../api/saved-filters.api';
import { SortableTaskRow } from '../../components/task/SortableTaskRow';
import { TaskRowWithSubtasks } from '../../components/task/TaskRowWithSubtasks';
import { SelectionBar } from '../../components/task/SelectionBar';
import { TASK_COLS } from '../../components/task/TaskRow';
import { TaskGroupHeader } from '../../components/task/TaskGroupHeader';
import { KanbanView } from '../../components/kanban/KanbanView';
import { FilterBar } from '../../components/filter/FilterBar';
import { useTaskFilter } from '../../hooks/useTaskFilter';
import { useTaskSelection } from '../../hooks/useTaskSelection';
import { Task, GroupedTaskResult } from '../../types/task.types';
import { useSpacesStore } from '../../store/spaces.store';
import { cn } from '../../lib/utils';

const COL_LABELS: { label: string; align?: 'center' | 'right' }[] = [
  { label: 'Tarefa' },
  { label: 'Responsável' },
  { label: 'Pts', align: 'center' },
  { label: 'Prioridade', align: 'center' },
  { label: 'Prazo', align: 'right' },
  { label: '' },
];

export function ListPage() {
  const { spaceId, listId } = useParams<{ spaceId: string; listId: string }>();
  const queryClient = useQueryClient();
  const currentSpace = useSpacesStore((s) => s.currentSpace);
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [showCreate, setShowCreate] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');

  const taskFilter = useTaskFilter({ listId });
  const selection = useTaskSelection();

  const { data: savedFilters = [] } = useQuery({
    queryKey: ['saved-filters', spaceId],
    queryFn: () => savedFiltersApi.getSavedFilters(spaceId!),
    enabled: !!spaceId,
  });

  const createSavedFilter = useMutation({
    mutationFn: (name: string) =>
      savedFiltersApi.createSavedFilter(spaceId!, { name, filters: taskFilter.filters }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-filters', spaceId] }),
  });

  const deleteSavedFilter = useMutation({
    mutationFn: (id: string) => savedFiltersApi.deleteSavedFilter(spaceId!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-filters', spaceId] }),
  });

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

  const [orderedTasks, setOrderedTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!isGrouped) setOrderedTasks(tasks as Task[]);
  }, [tasks, isGrouped]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const reorderMutation = useMutation({
    mutationFn: ({ taskId, position }: { taskId: string; position: number }) =>
      tasksApi.updateTask(spaceId!, taskId, { position }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['tasks', spaceId] }),
  });

  const moveSubtaskMutation = useMutation({
    mutationFn: ({ taskIds, newParentTaskId }: { taskIds: string[]; newParentTaskId: string }) =>
      tasksApi.moveSubtask(spaceId!, taskIds, newParentTaskId),
    onSuccess: (_data, { newParentTaskId }) => {
      void queryClient.invalidateQueries({ queryKey: ['subtasks'] });
      void queryClient.invalidateQueries({ queryKey: ['tasks', spaceId] });
      void queryClient.invalidateQueries({ queryKey: ['task', spaceId, newParentTaskId] });
    },
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeType = active.data.current?.type as string | undefined;
    const overType = over.data.current?.type as string | undefined;

    if (activeType === 'subtask') {
      const activeParentId = active.data.current?.parentId as string;
      const overParentId = over.data.current?.parentId as string | undefined;

      if (overParentId && overParentId !== activeParentId) {
        // Cross-parent move
        moveSubtaskMutation.mutate({ taskIds: [active.id as string], newParentTaskId: overParentId });
      } else if (overParentId === activeParentId) {
        // Within-parent reorder: optimistic update then persist
        const currentSubtasks = queryClient.getQueryData<Task[]>(['subtasks', activeParentId]) ?? [];
        const oldIdx = currentSubtasks.findIndex((s) => s._id === active.id);
        const newIdx = currentSubtasks.findIndex((s) => s._id === over.id);
        if (oldIdx === -1 || newIdx === -1) return;
        const reorderedSubs = arrayMove(currentSubtasks, oldIdx, newIdx);
        queryClient.setQueryData(['subtasks', activeParentId], reorderedSubs);
        const prev = reorderedSubs[newIdx - 1];
        const next = reorderedSubs[newIdx + 1];
        const newPos = !prev
          ? (next?.position ?? 0) - 1
          : !next
            ? (prev.position ?? 0) + 1
            : ((prev.position ?? 0) + (next.position ?? 0)) / 2;
        reorderMutation.mutate({ taskId: active.id as string, position: newPos }, {
          onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['subtasks', activeParentId] }),
        });
      } else if (overType === 'task') {
        // Dropped onto a main task header — reparent to that task
        moveSubtaskMutation.mutate({ taskIds: [active.id as string], newParentTaskId: over.id as string });
      }
      return;
    }

    // Main task reorder
    const oldIndex = orderedTasks.findIndex((t) => t._id === active.id);
    const newIndex = orderedTasks.findIndex((t) => t._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(orderedTasks, oldIndex, newIndex);
    setOrderedTasks(reordered);

    const prev = reordered[newIndex - 1];
    const next = reordered[newIndex + 1];
    const newPosition = !prev
      ? (next?.position ?? 0) - 1
      : !next
        ? prev.position + 1
        : (prev.position + next.position) / 2;

    reorderMutation.mutate({ taskId: active.id as string, position: newPosition });
  }

  const createMutation = useMutation({
    mutationFn: (name: string) => tasksApi.createTask(spaceId!, { name, listId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', spaceId] });
      setNewTaskName('');
      setShowCreate(false);
    },
    onError: () => alert('Falha ao criar tarefa. Tente novamente.'),
  });

  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <header className="bg-surface border-b border-line shrink-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-lift border border-line flex items-center justify-center">
              <List size={15} className="text-ink-dim" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-ink">{list?.name ?? '…'}</h1>
              <p className="text-xs text-ink-muted mt-0.5">{currentSpace?.name}</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand hover:bg-brand-hi text-white text-sm font-medium rounded-lg transition-all"
          >
            <Plus size={13} /> Nova tarefa
          </button>
        </div>

        {/* View tabs + filter bar */}
        <div className="flex items-center gap-0 px-6 border-b border-line-dim">
          {(['list', 'kanban'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 -mb-px transition-colors',
                view === v
                  ? 'border-brand text-brand font-medium'
                  : 'border-transparent text-ink-muted hover:text-ink-dim',
              )}
            >
              {v === 'list' ? <LayoutList size={13} /> : <Kanban size={13} />}
              {v === 'list' ? 'Lista' : 'Board'}
            </button>
          ))}
        </div>

        <div className="px-6 py-2.5">
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
            savedFilters={savedFilters}
            onSaveFilter={(name) => createSavedFilter.mutate(name)}
            onLoadFilter={taskFilter.loadFilter}
            onDeleteFilter={(id) => deleteSavedFilter.mutate(id)}
          />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {view === 'kanban' ? (
          <KanbanView spaceId={spaceId!} tasks={flatTasks} />
        ) : (
          <>
            {/* Column headers */}
            <div
              className="sticky top-0 z-20 border-b border-line bg-surface"
              style={{ display: 'grid', gridTemplateColumns: TASK_COLS, alignItems: 'center', minHeight: '32px' }}
            >
              <div />
              {COL_LABELS.map(({ label, align }) => (
                <span
                  key={label}
                  className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted px-1"
                  style={{ textAlign: align }}
                >
                  {label}
                </span>
              ))}
            </div>

            {isLoading && (
              <div className="flex items-center gap-2 px-6 py-10 text-ink-muted text-sm">
                <span className="animate-spin">⟳</span> Carregando…
              </div>
            )}

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
                    <TaskRowWithSubtasks
                      key={task._id}
                      task={task}
                      spaceId={spaceId!}
                      isSelected={selection.isSelected(task._id)}
                      onSelect={selection.count > 0 ? selection.toggle : undefined}
                      isSelectedFn={selection.isSelected}
                    />
                  ))}
                </div>
              ))
              : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={orderedTasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
                    {orderedTasks.map((task) => (
                      <SortableTaskRow
                        key={task._id}
                        task={task}
                        spaceId={spaceId!}
                        isSelected={selection.isSelected(task._id)}
                        onSelect={selection.count > 0 ? selection.toggle : undefined}
                        isSelectedFn={selection.isSelected}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}


            {!isLoading && flatTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-12 h-12 rounded-xl bg-lift border border-line flex items-center justify-center mb-4">
                  <LayoutList size={18} className="text-ink-muted" />
                </div>
                <p className="text-sm font-semibold text-ink-dim">Nenhuma tarefa</p>
                <p className="text-xs text-ink-muted mt-1.5">Clique em &quot;+ Nova tarefa&quot; para começar</p>
              </div>
            )}

            {/* Inline create row */}
            {showCreate && (
              <div
                className="border-b border-line-dim bg-lift/40"
                style={{ display: 'grid', gridTemplateColumns: TASK_COLS, alignItems: 'center', minHeight: '40px' }}
              >
                <div />
                <input
                  autoFocus
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTaskName.trim()) createMutation.mutate(newTaskName.trim());
                    if (e.key === 'Escape') { setShowCreate(false); setNewTaskName(''); }
                  }}
                  placeholder="Nome da tarefa…"
                  className="bg-transparent border-b border-brand text-sm text-ink placeholder:text-ink-muted focus:outline-none py-1 pr-2"
                />
                <div className="col-span-5 flex gap-1.5 pl-2">
                  <button
                    onClick={() => newTaskName.trim() && createMutation.mutate(newTaskName.trim())}
                    disabled={!newTaskName.trim() || createMutation.isPending}
                    className="px-2.5 py-1 bg-brand text-white text-xs rounded-md disabled:opacity-50 transition-all"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setShowCreate(false); setNewTaskName(''); }}
                    className="p-1 text-ink-muted hover:text-ink transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            )}

            {!showCreate && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-5 py-3 w-full text-sm text-ink-muted hover:text-ink hover:bg-lift/40 transition-colors"
              >
                <Plus size={13} /> Adicionar tarefa
              </button>
            )}
          </>
        )}
      </div>

      {selection.count > 0 && (
        <SelectionBar
          spaceId={spaceId!}
          count={selection.count}
          selectionType={selection.selectionType}
          mainTaskIds={selection.mainTaskIds}
          subtaskIds={selection.subtaskIds}
          allTasks={flatTasks}
          onClear={selection.clear}
        />
      )}
    </div>
  );
}
