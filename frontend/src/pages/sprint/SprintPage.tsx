import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { LayoutList, Kanban, Plus, X, Zap, Calendar, FileText, Loader2, Tag, ChevronRight, BarChart2 } from 'lucide-react';
import * as tasksApi from '../../api/tasks.api';
import * as sprintsApi from '../../api/sprints.api';
import * as notesApi from '../../api/notes.api';
import * as savedFiltersApi from '../../api/saved-filters.api';
import * as spacesApi from '../../api/spaces.api';
import { SortableTaskRow } from '../../components/task/SortableTaskRow';
import { TaskRowWithSubtasks } from '../../components/task/TaskRowWithSubtasks';
import { SelectionBar } from '../../components/task/SelectionBar';
import { TASK_COLS } from '../../components/task/TaskRow';
import { TaskGroupHeader } from '../../components/task/TaskGroupHeader';
import { KanbanView } from '../../components/kanban/KanbanView';
import { FilterBar } from '../../components/filter/FilterBar';
import { SprintDashboard } from '../../components/sprint/SprintDashboard';
import { useTaskFilter } from '../../hooks/useTaskFilter';
import { useTaskSelection } from '../../hooks/useTaskSelection';
import { Task, GroupedTaskResult } from '../../types/task.types';
import type { Note } from '../../types/note.types';
import { cn } from '../../lib/utils';

const LABEL_COLORS: Record<string, string> = {
  ideia:     'bg-p-normal/20 text-p-normal',
  bug:       'bg-p-urgent/20 text-p-urgent',
  melhoria:  'bg-s-progress/20 text-s-progress',
  decisão:   'bg-s-review/20 text-s-review',
  revisão:   'bg-p-high/20 text-p-high',
  referência:'bg-s-done/20 text-s-done',
};

const STATUS_META: Record<sprintsApi.Sprint['status'], { label: string; color: string }> = {
  planning:  { label: 'Planejamento', color: 'text-s-review' },
  active:    { label: 'Ativo',        color: 'text-s-done' },
  completed: { label: 'Concluído',    color: 'text-ink-dim' },
};

const COL_LABELS: { label: string; align?: 'center' | 'right' }[] = [
  { label: 'Tarefa' },
  { label: 'Responsável' },
  { label: 'Pts', align: 'center' },
  { label: 'Prioridade', align: 'center' },
  { label: 'Prazo', align: 'right' },
  { label: '' },
];

export function SprintPage() {
  const { spaceId, sprintId } = useParams<{ spaceId: string; sprintId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'tarefas' | 'notas' | 'dashboard'>('tarefas');
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [showCreate, setShowCreate] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [showCreateNote, setShowCreateNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');

  const taskFilter = useTaskFilter({ sprintId });
  const selection = useTaskSelection();

  const { data: members = [] } = useQuery({
    queryKey: ['space-members', spaceId],
    queryFn: () => spacesApi.getSpaceMembers(spaceId!),
    enabled: !!spaceId,
  });

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

  const { data: sprint } = useQuery({
    queryKey: ['sprint', sprintId],
    queryFn: () => sprintsApi.getSprints(spaceId!).then((ss) => ss.find((s) => s._id === sprintId)),
    enabled: !!spaceId && !!sprintId,
  });

  const filterParams = taskFilter.toQueryParams();
  const isGrouped = !!filterParams.groupBy;

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', spaceId, filterParams],
    queryFn: () =>
      isGrouped
        ? tasksApi.getGroupedTasks(spaceId!, filterParams)
        : tasksApi.getTasks(spaceId!, filterParams),
    enabled: !!spaceId && !!sprintId,
  });

  const flatTasks: Task[] = isGrouped
    ? (tasks as GroupedTaskResult[]).flatMap((g) => g.tasks)
    : (tasks as Task[]);

  const totalPoints = flatTasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);
  const donePoints  = flatTasks.filter((t) => t.status === 'feito').reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);
  const progress    = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;

  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ['notes', spaceId, sprintId],
    queryFn: () => notesApi.getNotes(spaceId!, sprintId!),
    enabled: !!spaceId && !!sprintId && tab === 'notas',
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => tasksApi.createTask(spaceId!, { name, sprintId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', spaceId] });
      setNewTaskName('');
      setShowCreate(false);
    },
    onError: () => alert('Falha ao criar tarefa. Tente novamente.'),
  });

  const createNoteMutation = useMutation({
    mutationFn: () => notesApi.createNote(spaceId!, sprintId!, { title: newNoteTitle }),
    onSuccess: (note) => {
      void queryClient.invalidateQueries({ queryKey: ['notes', spaceId, sprintId] });
      setNewNoteTitle('');
      setShowCreateNote(false);
      navigate(`/spaces/${spaceId}/notes/${note._id}`);
    },
  });

  const [orderedTasks, setOrderedTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!isGrouped) setOrderedTasks(flatTasks);
  }, [flatTasks, isGrouped]);

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

  const sprintLabel = sprint
    ? `Sprint ${sprint.number}${sprint.name ? ` — ${sprint.name}` : ''}`
    : '…';

  const statusMeta = sprint ? STATUS_META[sprint.status] : null;

  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <header className="bg-surface border-b border-line shrink-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand/12 border border-brand/20 flex items-center justify-center">
              <Zap size={15} className="text-brand" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-ink">{sprintLabel}</h1>
                {statusMeta && (
                  <span className={`text-xs font-medium ${statusMeta.color}`}>
                    · {statusMeta.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                {sprint && (
                  <span className="flex items-center gap-1 text-xs text-ink-muted">
                    <Calendar size={10} />
                    {new Date(sprint.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    {' → '}
                    {new Date(sprint.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                )}
                {totalPoints > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-line rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-ink-muted tabular-nums">
                      {donePoints}/{totalPoints} pts
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          {tab === 'tarefas' && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand hover:bg-brand-hi text-white text-sm font-medium rounded-lg transition-all"
            >
              <Plus size={13} /> Nova tarefa
            </button>
          )}
          {tab === 'notas' && (
            <button
              onClick={() => setShowCreateNote(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand hover:bg-brand-hi text-white text-sm font-medium rounded-lg transition-all"
            >
              <Plus size={13} /> Nova nota
            </button>
          )}
        </div>

        {/* Main tabs */}
        <div className="flex items-center gap-0 px-6 border-b border-line-dim">
          {([
            { key: 'tarefas', label: 'Tarefas', icon: <LayoutList size={13} /> },
            { key: 'notas', label: 'Notas', icon: <FileText size={13} /> },
            { key: 'dashboard', label: 'Dashboard', icon: <BarChart2 size={13} /> },
          ] as const).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 -mb-px transition-colors',
                tab === key
                  ? 'border-brand text-brand font-medium'
                  : 'border-transparent text-ink-muted hover:text-ink-dim',
              )}
            >
              {icon}
              {label}
            </button>
          ))}

          {tab === 'tarefas' && (
            <div className="ml-auto flex items-center py-1.5" aria-label="Modo de visualização">
              <div className="bg-lift rounded-lg p-0.5 flex items-center gap-0.5">
                {(['list', 'kanban'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors',
                      view === v
                        ? 'bg-surface text-ink font-medium shadow-sm'
                        : 'text-ink-muted hover:text-ink',
                    )}
                  >
                    {v === 'list' ? <LayoutList size={12} /> : <Kanban size={12} />}
                    {v === 'list' ? 'Lista' : 'Board'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {tab === 'tarefas' && <div className="px-6 py-2.5">
          <FilterBar
            filters={taskFilter.filters}
            onToggleStatus={taskFilter.toggleStatus}
            onTogglePriority={taskFilter.togglePriority}
            onToggleAssignee={taskFilter.toggleAssignee}
            onToggleTag={taskFilter.toggleTag}
            onSetGroupBy={taskFilter.setGroupBy}
            onSetSearch={taskFilter.setSearch}
            onSetSubtaskMode={taskFilter.setSubtaskMode}
            onReset={taskFilter.reset}
            isActive={taskFilter.isActive}
            savedFilters={savedFilters}
            onSaveFilter={(name) => createSavedFilter.mutate(name)}
            onLoadFilter={taskFilter.loadFilter}
            onDeleteFilter={(id) => deleteSavedFilter.mutate(id)}
          />
        </div>}
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto">

        {/* ── Dashboard tab ── */}
        {tab === 'dashboard' && spaceId && sprintId && (
          <SprintDashboard spaceId={spaceId} sprintId={sprintId} />
        )}

        {/* ── Notas tab ── */}
        {tab === 'notas' && (
          <div className="max-w-3xl mx-auto px-6 py-6">

            {/* Create note inline form */}
            {showCreateNote && (
              <form
                onSubmit={(e: FormEvent) => { e.preventDefault(); if (newNoteTitle.trim()) createNoteMutation.mutate(); }}
                className="mb-4 p-4 bg-surface border border-brand/30 rounded-xl flex items-center gap-3"
              >
                <FileText size={15} className="text-brand shrink-0" />
                <input
                  autoFocus
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && setShowCreateNote(false)}
                  placeholder="Título da nota…"
                  className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!newNoteTitle.trim() || createNoteMutation.isPending}
                  className="px-3 py-1.5 bg-brand text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-all"
                >
                  {createNoteMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Criar'}
                </button>
                <button type="button" onClick={() => setShowCreateNote(false)} className="text-ink-muted hover:text-ink">
                  <X size={14} />
                </button>
              </form>
            )}

            {notesLoading && (
              <div className="flex items-center gap-2 py-10 text-ink-muted text-sm justify-center">
                <Loader2 size={15} className="animate-spin" /> Carregando notas…
              </div>
            )}

            {!notesLoading && notes.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-12 h-12 rounded-xl bg-lift border border-line flex items-center justify-center mb-4">
                  <FileText size={18} className="text-ink-muted" />
                </div>
                <p className="text-sm font-semibold text-ink-dim">Nenhuma nota ainda</p>
                <p className="text-xs text-ink-muted mt-1.5 mb-5">Clique em &quot;+ Nova nota&quot; para criar</p>
                <button
                  onClick={() => setShowCreateNote(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-brand hover:bg-brand-hi text-white text-xs font-semibold rounded-lg transition-all"
                >
                  <Plus size={12} /> Nova nota
                </button>
              </div>
            )}

            {!notesLoading && notes.length > 0 && (
              <div className="space-y-2">
                {notes.map((note: Note) => {
                  const labelCls = note.label ? (LABEL_COLORS[note.label] ?? 'bg-lift text-ink-dim') : '';
                  return (
                    <button
                      key={note._id}
                      onClick={() => navigate(`/spaces/${spaceId}/notes/${note._id}`)}
                      className="group w-full text-left bg-surface border border-line rounded-xl px-4 py-3.5 hover:border-brand/30 hover:bg-lift/40 transition-all flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-lift border border-line flex items-center justify-center shrink-0 group-hover:border-brand/20 transition-colors">
                        <FileText size={14} className="text-ink-muted" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{note.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-ink-muted">
                            {note.createdBy.displayName} · {new Date(note.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </span>
                          {note.label && (
                            <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium', labelCls)}>
                              <Tag size={8} /> {note.label}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={13} className="text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  );
                })}

                <button
                  onClick={() => setShowCreateNote(true)}
                  className="flex items-center gap-2 w-full px-4 py-3 text-sm text-ink-muted hover:text-ink hover:bg-lift/40 transition-colors rounded-xl"
                >
                  <Plus size={13} /> Nova nota
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'tarefas' && view === 'kanban' ? (
          <KanbanView spaceId={spaceId!} tasks={flatTasks} />
        ) : tab === 'tarefas' ? (
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
                      subtaskMode={taskFilter.filters.subtaskMode}
                      isSelected={selection.isSelected(task._id)}
                      selectionMode={selection.count > 0}
                      onSelect={selection.toggle}
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
                        subtaskMode={taskFilter.filters.subtaskMode}
                        isSelected={selection.isSelected(task._id)}
                        selectionMode={selection.count > 0}
                        onSelect={selection.toggle}
                        isSelectedFn={selection.isSelected}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )
            }

            {!isLoading && flatTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-12 h-12 rounded-xl bg-lift border border-line flex items-center justify-center mb-4">
                  <Zap size={18} className="text-ink-muted" />
                </div>
                <p className="text-sm font-semibold text-ink-dim">Sprint sem tarefas</p>
                <p className="text-xs text-ink-muted mt-1.5">Clique em &quot;+ Nova tarefa&quot; para adicionar</p>
              </div>
            )}

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
        ) : null}
      </div>

      {selection.count > 0 && (
        <SelectionBar
          spaceId={spaceId!}
          count={selection.count}
          selectionType={selection.selectionType}
          mainTaskIds={selection.mainTaskIds}
          subtaskIds={selection.subtaskIds}
          allTasks={flatTasks}
          members={members}
          onClear={selection.clear}
        />
      )}
    </div>
  );
}
