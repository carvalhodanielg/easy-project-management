import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Pencil, Check, Loader2, CornerLeftUp } from 'lucide-react';
import { MarkdownEditor } from '../../components/editor/MarkdownEditor';
import * as tasksApi from '../../api/tasks.api';
import { notifyError } from '../../lib/toast';
import { CommentThread } from '../../components/task/CommentThread';
import { ActivityLog } from '../../components/task/ActivityLog';
import { AssigneeSelector } from '../../components/task/AssigneeSelector';
import { SubtaskList } from '../../components/task/SubtaskList';
import { DependenciesSection, isTaskBlocked } from '../../components/task/DependenciesSection';
import { useModalA11y } from '../../hooks/useModalA11y';
import type { Task } from '../../types/task.types';
import {
  type TaskStatus, type TaskPriority,
  FIBONACCI_POINTS, STATUS_LABELS, PRIORITY_LABELS,
} from '../../types/task.types';

const FIELD_LABEL = 'text-[11px] font-semibold uppercase tracking-widest text-ink-muted mb-2 block';

const STATUS_COLORS: Record<TaskStatus, string> = {
  pendente:     '#52525B',
  em_progresso: '#3B82F6',
  em_review:    '#F59E0B',
  feito:        '#10B981',
  fechado:      '#374151',
};

export function TaskDetailPage() {
  const { spaceId, taskId } = useParams<{ spaceId: string; taskId: string }>();
  const navigate = useNavigate();

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => tasksApi.getTask(spaceId!, taskId!),
    enabled: !!spaceId && !!taskId,
  });

  const { data: parentTask } = useQuery({
    queryKey: ['task', task?.parentTask],
    queryFn: () => tasksApi.getTask(spaceId!, task!.parentTask!),
    enabled: !!spaceId && !!task?.parentTask,
  });

  const { data: siblings = [] } = useQuery({
    queryKey: ['subtasks', task?.parentTask],
    queryFn: () => tasksApi.getSubtasks(spaceId!, task!.parentTask!),
    enabled: !!spaceId && !!task?.parentTask,
  });

  if (isLoading || !task) {
    return (
      <div
        data-testid="task-detail-loading-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        // Navigate to a real in-app route rather than `navigate(-1)`, so that
        // dismissing while loading still works after a deep-link reload (which
        // has no prior SPA history entry to go back to).
        onClick={() => navigate(`/spaces/${spaceId}`)}
      >
        <div className="flex items-center gap-2 bg-modal border border-line rounded-xl px-5 py-3 text-sm text-ink-dim">
          <Loader2 size={15} className="animate-spin" /> Carregando…
        </div>
      </div>
    );
  }

  return (
    <TaskDetailModal
      task={task}
      parentTask={parentTask}
      siblings={siblings}
      spaceId={spaceId!}
      taskId={taskId!}
    />
  );
}

interface TaskDetailModalProps {
  task: Task;
  parentTask?: Task;
  siblings: Task[];
  spaceId: string;
  taskId: string;
}

// Rendered only once the task is loaded, so useModalA11y binds to the real
// dialog panel on mount (focus trap, Escape, focus return).
function TaskDetailModal({ task, parentTask, siblings, spaceId, taskId }: TaskDetailModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [description,  setDescription]  = useState(task.description);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title,        setTitle]        = useState(task.name);
  // Mirrors `description` synchronously so onBlur saves the latest value even when
  // the editor inserts an attachment via onChange + onBlur in the same tick.
  const descriptionRef = useRef(task.description);

  useEffect(() => {
    setDescription(task.description);
    descriptionRef.current = task.description;
    setTitle(task.name);
  }, [task]);

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof tasksApi.updateTask>[2]) =>
      tasksApi.updateTask(spaceId, taskId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      void queryClient.invalidateQueries({ queryKey: ['tasks', spaceId] });
      void queryClient.invalidateQueries({ queryKey: ['task-events', taskId] });
      if (task.parentTask) {
        void queryClient.invalidateQueries({ queryKey: ['subtasks', task.parentTask] });
      }
    },
    onError: (err) => notifyError(err, 'Falha ao atualizar a tarefa. Tente novamente.'),
  });

  function handleClose() {
    const listId = task.listId ?? parentTask?.listId ?? null;
    const sprintId = task.sprintId ?? parentTask?.sprintId ?? null;
    if (listId) navigate(`/spaces/${spaceId}/lists/${listId}`);
    else if (sprintId) navigate(`/spaces/${spaceId}/sprints/${sprintId}`);
    else navigate(`/spaces/${spaceId}`);
  }

  const dialogRef = useModalA11y<HTMLDivElement>(handleClose);

  const statusColor = STATUS_COLORS[task.status];
  const blocked = isTaskBlocked(task);

  return (
    <div
      data-testid="task-detail-backdrop"
      className="fixed inset-0 z-50 flex items-stretch justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={handleClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={task.name}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[1280px] h-full bg-modal flex flex-col overflow-hidden focus:outline-none"
        style={{ boxShadow: '0 0 80px rgba(0,0,0,0.6)' }}
      >
        {/* Status accent line */}
        <div className="h-0.5 shrink-0" style={{ background: statusColor }} />

        {/* Header */}
        <div className="px-6 py-4 border-b border-line flex items-start gap-3 shrink-0">
          <div className="flex-1 min-w-0 pt-0.5">
            {task.parentTask && parentTask && (
              <button
                data-testid="parent-task-breadcrumb"
                onClick={() => navigate(`/spaces/${spaceId}/tasks/${parentTask._id}`)}
                className="flex items-center gap-1.5 mb-2 text-xs text-ink-muted hover:text-brand transition-colors max-w-full"
              >
                <CornerLeftUp size={11} className="shrink-0" />
                <span className="truncate">{parentTask.name}</span>
              </button>
            )}
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { updateMutation.mutate({ name: title }); setEditingTitle(false); }
                    if (e.key === 'Escape') { setTitle(task.name); setEditingTitle(false); }
                  }}
                  className="flex-1 bg-transparent border-b-2 border-brand text-lg font-semibold text-ink focus:outline-none py-0.5"
                />
                <button
                  onClick={() => { updateMutation.mutate({ name: title }); setEditingTitle(false); }}
                  className="p-1.5 rounded-lg text-brand hover:bg-brand/10 transition-colors"
                >
                  <Check size={15} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingTitle(true)}
                className="text-lg font-semibold text-ink text-left w-full hover:text-white transition-colors group flex items-center gap-2"
              >
                <span className="flex-1 text-left">{task.name}</span>
                <Pencil size={12} className="opacity-0 group-hover:opacity-40 shrink-0" />
              </button>
            )}
          </div>
          <button
            data-testid="close-button"
            onClick={handleClose}
            className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-lift transition-colors shrink-0 mt-0.5"
          >
            <X size={16} />
          </button>
        </div>

        {/* Three-column body — stacks vertically on small screens */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden min-h-0">

          {/* Left column — context tree */}
          <div
            data-testid="task-detail-col-subtasks"
            className="w-full lg:w-[280px] shrink-0 border-b lg:border-b-0 lg:border-r border-line flex flex-col lg:overflow-hidden"
          >
            <div className="flex-1 lg:overflow-y-auto">
              {task.parentTask ? (
                <>
                  {parentTask && (
                    <button
                      data-testid="parent-task-link"
                      onClick={() => navigate(`/spaces/${spaceId}/tasks/${parentTask._id}`)}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left hover:bg-lift/60 border-b border-line transition-colors group"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0 border-[1.5px]"
                        style={{
                          borderColor: STATUS_COLORS[parentTask.status],
                          background: parentTask.status !== 'pendente' ? STATUS_COLORS[parentTask.status] + '50' : 'transparent',
                        }}
                      />
                      <span className="flex-1 min-w-0 truncate text-xs font-medium text-ink-dim group-hover:text-ink transition-colors">
                        {parentTask.name}
                      </span>
                    </button>
                  )}
                  {siblings.map((sub) => {
                    const isCurrent = sub._id === taskId;
                    return (
                      <button
                        key={sub._id}
                        data-testid={isCurrent ? 'current-subtask-row' : undefined}
                        onClick={() => navigate(`/spaces/${spaceId}/tasks/${sub._id}`)}
                        className={`flex items-center gap-2.5 w-full px-3 py-2 pl-6 text-left border-b border-line-dim transition-colors group ${
                          isCurrent ? 'bg-lift/40 border-l-2 border-brand' : 'hover:bg-lift/60'
                        }`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0 border-[1.5px]"
                          style={{
                            borderColor: STATUS_COLORS[sub.status],
                            background: sub.status !== 'pendente' ? STATUS_COLORS[sub.status] + '50' : 'transparent',
                          }}
                        />
                        <span className={`flex-1 min-w-0 truncate text-xs transition-colors ${
                          isCurrent ? 'text-ink' : 'text-ink-dim group-hover:text-ink'
                        }`}>
                          {sub.name}
                        </span>
                      </button>
                    );
                  })}
                </>
              ) : (
                <SubtaskList spaceId={spaceId} taskId={taskId} compact />
              )}
            </div>
          </div>

          {/* Center column — Fields + Description */}
          <div
            data-testid="task-detail-col-main"
            className="flex-1 flex flex-col lg:overflow-hidden min-w-0"
          >
            <div className="flex-1 lg:overflow-y-auto">
              <div className="p-6 flex flex-col gap-6">

                {/* Quick-edit chips */}
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={task.status}
                    onChange={(e) => updateMutation.mutate({ status: e.target.value as TaskStatus })}
                    title={blocked ? 'Tarefa bloqueada — conclua as dependências primeiro' : undefined}
                    className="appearance-none px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer focus:outline-none border transition-colors"
                    style={{
                      background: statusColor + '15',
                      color: statusColor,
                      borderColor: statusColor + '40',
                    }}
                  >
                    {Object.entries(STATUS_LABELS).map(([v, l]) => (
                      <option
                        key={v}
                        value={v}
                        disabled={blocked && (v === 'feito' || v === 'fechado')}
                      >
                        {l}{blocked && (v === 'feito' || v === 'fechado') ? ' (bloqueada)' : ''}
                      </option>
                    ))}
                  </select>

                  <select
                    value={task.priority}
                    onChange={(e) => updateMutation.mutate({ priority: e.target.value as TaskPriority })}
                    className="appearance-none px-2.5 py-1.5 rounded-lg text-xs cursor-pointer focus:outline-none border border-line bg-lift text-ink-dim"
                  >
                    {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>

                  <select
                    value={task.storyPoints ?? ''}
                    onChange={(e) => updateMutation.mutate({ storyPoints: e.target.value ? Number(e.target.value) : null })}
                    className="appearance-none px-2.5 py-1.5 rounded-lg text-xs cursor-pointer focus:outline-none border border-line bg-lift text-ink-dim"
                  >
                    <option value="">— pts</option>
                    {FIBONACCI_POINTS.map((p) => <option key={p} value={p}>{p} pts</option>)}
                  </select>

                  <input
                    type="date"
                    value={task.dueDate ? task.dueDate.substring(0, 10) : ''}
                    onChange={(e) => updateMutation.mutate({ dueDate: e.target.value || null })}
                    className="px-2.5 py-1.5 rounded-lg text-xs cursor-pointer focus:outline-none border border-line bg-lift text-ink-dim"
                  />
                </div>

                {/* Assignees */}
                <div>
                  <label className={FIELD_LABEL}>Responsáveis</label>
                  <AssigneeSelector
                    spaceId={spaceId}
                    assignees={task.assignees}
                    onChange={(ids) => updateMutation.mutate({ assignees: ids })}
                  />
                </div>

                {/* Tags */}
                {task.tags.length > 0 && (
                  <div>
                    <label className={FIELD_LABEL}>Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {task.tags.map((tag) => (
                        <span
                          key={tag._id}
                          style={{
                            background: tag.color + '18',
                            color: tag.color,
                            border: `1px solid ${tag.color}30`,
                          }}
                          className="px-2.5 py-1 rounded-full text-xs font-semibold"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dependencies */}
                <DependenciesSection spaceId={spaceId} task={task} />

                {/* Description */}
                <div>
                  <label className={FIELD_LABEL}>Descrição</label>
                  <MarkdownEditor
                    spaceId={spaceId}
                    value={description}
                    onChange={(v) => { setDescription(v); descriptionRef.current = v; }}
                    onBlur={() => updateMutation.mutate({ description: descriptionRef.current })}
                    placeholder="Adicionar uma descrição…"
                    minHeight={160}
                  />
                </div>

              </div>
            </div>
          </div>

          {/* Right column — Activity + Comments */}
          <div
            data-testid="task-detail-col-activity"
            className="w-full lg:w-[340px] shrink-0 border-t lg:border-t-0 lg:border-l border-line flex flex-col lg:overflow-hidden"
          >
            <div className="flex-1 lg:overflow-y-auto">
              <div className="p-4 flex flex-col gap-6">
                <ActivityLog spaceId={spaceId} taskId={taskId} />
                <div className="border-t border-line pt-4">
                  <CommentThread spaceId={spaceId} taskId={taskId} />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
