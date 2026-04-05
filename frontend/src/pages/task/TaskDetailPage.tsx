import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Pencil, Check, Loader2 } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import * as tasksApi from '../../api/tasks.api';
import { CommentThread } from '../../components/task/CommentThread';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { AssigneeSelector } from '../../components/task/AssigneeSelector';
import { SubtaskList } from '../../components/task/SubtaskList';
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
  const queryClient = useQueryClient();
  const [editingDesc,  setEditingDesc]  = useState(false);
  const [description,  setDescription]  = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [title,        setTitle]        = useState('');

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => tasksApi.getTask(spaceId!, taskId!),
    enabled: !!spaceId && !!taskId,
  });

  useEffect(() => {
    if (task) {
      setDescription(task.description);
      setTitle(task.name);
    }
  }, [task]);

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof tasksApi.updateTask>[2]) =>
      tasksApi.updateTask(spaceId!, taskId!, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      void queryClient.invalidateQueries({ queryKey: ['tasks', spaceId] });
    },
  });

  if (isLoading || !task) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={() => navigate(-1)}
      >
        <div className="flex items-center gap-2 bg-modal border border-line rounded-xl px-5 py-3 text-sm text-ink-dim">
          <Loader2 size={15} className="animate-spin" /> Carregando…
        </div>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[task.status];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={() => navigate(-1)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[700px] max-w-full h-full bg-modal flex flex-col overflow-hidden"
        style={{ boxShadow: '-16px 0 60px rgba(0,0,0,0.5)' }}
      >
        {/* Status accent line */}
        <div className="h-0.5 shrink-0" style={{ background: statusColor }} />

        {/* Header */}
        <div className="px-6 py-4 border-b border-line flex items-start gap-3 shrink-0">
          <div className="flex-1 min-w-0 pt-0.5">
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
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-lift transition-colors shrink-0 mt-0.5"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 flex flex-col gap-6">

            {/* Quick-edit chips */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status */}
              <select
                value={task.status}
                onChange={(e) => updateMutation.mutate({ status: e.target.value as TaskStatus })}
                className="appearance-none px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer focus:outline-none border transition-colors"
                style={{
                  background: statusColor + '15',
                  color: statusColor,
                  borderColor: statusColor + '40',
                }}
              >
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>

              {/* Priority */}
              <select
                value={task.priority}
                onChange={(e) => updateMutation.mutate({ priority: e.target.value as TaskPriority })}
                className="appearance-none px-2.5 py-1.5 rounded-lg text-xs cursor-pointer focus:outline-none border border-line bg-lift text-ink-dim"
              >
                {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>

              {/* Story points */}
              <select
                value={task.storyPoints ?? ''}
                onChange={(e) => updateMutation.mutate({ storyPoints: e.target.value ? Number(e.target.value) : null })}
                className="appearance-none px-2.5 py-1.5 rounded-lg text-xs cursor-pointer focus:outline-none border border-line bg-lift text-ink-dim"
              >
                <option value="">— pts</option>
                {FIBONACCI_POINTS.map((p) => <option key={p} value={p}>{p} pts</option>)}
              </select>

              {/* Due date */}
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
                spaceId={spaceId!}
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
            {(task.blockedBy.length > 0 || task.blocks.length > 0) && (
              <div>
                <label className={FIELD_LABEL}>Dependências</label>
                {task.blockedBy.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2 items-center">
                    <span className="text-xs text-danger font-semibold">Bloqueado por:</span>
                    {task.blockedBy.map((dep) => (
                      <span key={dep._id} className="flex items-center gap-1.5 text-sm text-ink">
                        {dep.name} <StatusBadge status={dep.status} />
                      </span>
                    ))}
                  </div>
                )}
                {task.blocks.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs text-p-high font-semibold">Bloqueia:</span>
                    {task.blocks.map((dep) => (
                      <span key={dep._id} className="flex items-center gap-1.5 text-sm text-ink">
                        {dep.name} <StatusBadge status={dep.status} />
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={FIELD_LABEL}>Descrição</label>
                {!editingDesc && (
                  <button
                    onClick={() => setEditingDesc(true)}
                    className="text-xs text-ink-muted hover:text-ink transition-colors flex items-center gap-1"
                  >
                    <Pencil size={10} /> Editar
                  </button>
                )}
              </div>
              {editingDesc ? (
                <div data-color-mode="dark">
                  <MDEditor
                    value={description}
                    onChange={(v) => setDescription(v ?? '')}
                    height={220}
                  />
                  <div className="flex gap-2 mt-2.5">
                    <button
                      onClick={() => { updateMutation.mutate({ description }); setEditingDesc(false); }}
                      className="px-3 py-1.5 bg-brand text-white text-xs font-medium rounded-lg transition-all"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => { setEditingDesc(false); setDescription(task.description); }}
                      className="px-3 py-1.5 text-xs text-ink-dim hover:text-ink transition-colors rounded-lg hover:bg-lift"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setEditingDesc(true)}
                  className="min-h-14 px-4 py-3 bg-lift border border-line rounded-xl text-sm cursor-pointer hover:border-brand/25 transition-colors"
                >
                  {task.description
                    ? <span className="text-ink whitespace-pre-wrap leading-relaxed">{task.description}</span>
                    : <span className="text-ink-muted text-xs">Clique para adicionar uma descrição…</span>
                  }
                </div>
              )}
            </div>

            {/* Subtasks */}
            <div>
              <label className={FIELD_LABEL}>Subtarefas</label>
              <div className="border border-line rounded-xl overflow-hidden">
                <SubtaskList spaceId={spaceId!} taskId={taskId!} />
              </div>
            </div>

            {/* Comments */}
            <div className="border-t border-line pt-6">
              <CommentThread spaceId={spaceId!} taskId={taskId!} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
