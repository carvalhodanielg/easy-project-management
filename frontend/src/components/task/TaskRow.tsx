import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { Task, TaskStatus, GroupedTaskResult } from '../../types/task.types';
import { STATUS_LABELS } from '../../types/task.types';
import { updateTask } from '../../api/tasks.api';
import { PriorityIcon } from '../ui/PriorityIcon';
import { Tooltip } from '../ui/tooltip';
import { T } from '../../theme';

export const TASK_COLS = '36px 1fr 88px 52px 80px 90px';

const STATUS_DOT: Record<TaskStatus, string> = {
  pendente:     'border-s-pending bg-transparent',
  em_progresso: 'border-s-progress bg-s-progress/30',
  em_review:    'border-s-review bg-s-review/30',
  feito:        'border-s-done bg-s-done/30',
  fechado:      'border-s-closed bg-s-closed/30',
};

const STATUSES = Object.keys(STATUS_LABELS) as TaskStatus[];

function Avatar({ name }: { name: string }) {
  return (
    <span className="w-6 h-6 rounded-full bg-brand/30 text-brand text-[10px] font-bold flex items-center justify-center ring-2 ring-base shrink-0">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

interface Props {
  task: Task;
  depth?: number;
  onToggleExpand?: () => void;
  isExpanded?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, kind: 'main' | 'subtask') => void;
}

export function TaskRow({ task, depth = 0, onToggleExpand, isExpanded, isSelected, onSelect }: Props) {
  const navigate  = useNavigate();
  const { spaceId } = useParams<{ spaceId: string }>();
  const queryClient = useQueryClient();
  const isOverdue = !!task.dueDate && new Date(task.dueDate) < new Date();
  const kind: 'main' | 'subtask' = task.parentTask ? 'subtask' : 'main';

  const [statusOpen, setStatusOpen] = useState(false);
  const [localStatus, setLocalStatus] = useState<TaskStatus>(task.status);
  const statusRef = useRef<HTMLDivElement>(null);

  // Sync local status when server data changes (e.g. after query refetch)
  useEffect(() => { setLocalStatus(task.status); }, [task.status]);

  useEffect(() => {
    if (!statusOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [statusOpen]);

  const { mutate: changeStatus } = useMutation({
    mutationFn: (status: TaskStatus) => updateTask(spaceId!, task._id, { status }),
    onMutate: (newStatus) => {
      setLocalStatus(newStatus);
      setStatusOpen(false);
      // Optimistically update list queries for this space
      const queries = queryClient.getQueriesData<Task[] | GroupedTaskResult[]>({ queryKey: ['tasks', spaceId] });
      for (const [key, data] of queries) {
        if (!data) continue;
        const updated = Array.isArray(data) && data.length > 0 && 'tasks' in data[0]
          ? (data as GroupedTaskResult[]).map((g) => ({ ...g, tasks: g.tasks.map((t) => t._id === task._id ? { ...t, status: newStatus } : t) }))
          : (data as Task[]).map((t) => t._id === task._id ? { ...t, status: newStatus } : t);
        queryClient.setQueryData(key, updated);
      }
      // Optimistically update the detail query if already cached
      const detail = queryClient.getQueryData<Task>(['task', task._id]);
      if (detail) queryClient.setQueryData(['task', task._id], { ...detail, status: newStatus });
    },
    onError: () => {
      setLocalStatus(task.status);
      void queryClient.invalidateQueries({ queryKey: ['tasks', spaceId] });
      void queryClient.invalidateQueries({ queryKey: ['task', task._id] });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', spaceId] });
      void queryClient.invalidateQueries({ queryKey: ['task', task._id] });
    },
  });

  return (
    <div
      role="row"
      onClick={() => navigate(`/spaces/${spaceId}/tasks/${task._id}`)}
      className={`group cursor-pointer border-b border-line-dim hover:bg-lift/60 transition-colors ${isSelected ? 'bg-brand/8' : ''}`}
      style={{ display: 'grid', gridTemplateColumns: TASK_COLS, alignItems: 'center', minHeight: '38px' }}
    >
      {/* Col 1 — checkbox (selection mode) OR toggle + status (normal mode) */}
      <div
        className="flex items-center justify-center gap-0.5"
        style={{ paddingLeft: depth > 0 ? `${depth * 16 + 4}px` : '4px' }}
      >
        {onSelect ? (
          /* Selection mode: show only a clear square checkbox, no status dot */
          <button
            aria-label={isSelected ? 'Desmarcar' : 'Selecionar'}
            onClick={(e) => { e.stopPropagation(); onSelect(task._id, kind); }}
            className={`w-4 h-4 flex items-center justify-center rounded shrink-0 transition-all border ${
              isSelected
                ? 'border-brand bg-brand text-white'
                : 'border-ink-muted/40 bg-transparent text-transparent hover:border-brand/60 hover:bg-brand/8'
            }`}
          >
            {isSelected && (
              <svg width="8" height="6" viewBox="0 0 8 6" fill="none" className="shrink-0">
                <path d="M1 3L3 5L7 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        ) : (
          /* Normal mode: expand toggle + status dot (clickable) */
          <>
            {onToggleExpand ? (
              <button
                aria-label={isExpanded ? 'Recolher' : 'Expandir'}
                onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
                className="w-4 h-4 flex items-center justify-center text-ink-muted hover:text-ink transition-colors shrink-0 opacity-0 group-hover:opacity-100"
              >
                {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              </button>
            ) : (
              <span className="w-4" />
            )}

            {/* Status picker */}
            <div ref={statusRef} className="relative flex items-center" onClick={(e) => e.stopPropagation()}>
              <Tooltip content={STATUS_LABELS[localStatus]} disabled={statusOpen}>
                <button
                  aria-label={`Status: ${STATUS_LABELS[localStatus]}`}
                  onClick={() => setStatusOpen((v) => !v)}
                  className={`w-3 h-3 rounded-full shrink-0 border-[1.5px] ${STATUS_DOT[localStatus]} hover:scale-125 transition-transform`}
                />
              </Tooltip>

              {statusOpen && (
                <div className="absolute top-full left-0 mt-1.5 z-50 min-w-[140px] bg-modal border border-line rounded-xl shadow-2xl py-1 flex flex-col">
                  {STATUSES.map((s) => {
                    const isCurrent = s === localStatus;
                    return (
                      <button
                        key={s}
                        onClick={() => changeStatus(s)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-lift transition-colors"
                      >
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 border-[1.5px] ${STATUS_DOT[s]}`}
                        />
                        <span style={isCurrent ? { color: T.status[s] } : {}} className={isCurrent ? 'font-semibold' : 'text-ink'}>
                          {STATUS_LABELS[s]}
                        </span>
                        {isCurrent && <span className="ml-auto text-[10px] text-ink-muted">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Col 2 — name + tags + subtask count */}
      <div
        className="flex items-center gap-2 pr-3 min-w-0"
        style={{ paddingLeft: depth > 0 ? `${depth * 16}px` : '0' }}
      >
        {task.subtaskCount > 0 && (
          <span className="text-[11px] text-ink-muted shrink-0 tabular-nums bg-lift px-1.5 py-0.5 rounded">
            ↳{task.subtaskCount}
          </span>
        )}
        <span className="text-sm text-ink truncate leading-tight">
          {task.name}
        </span>
        {task.tags.slice(0, 2).map((tag) => (
          <span
            key={tag._id}
            className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: tag.color + '22', color: tag.color }}
          >
            {tag.name}
          </span>
        ))}
      </div>

      {/* Col 3 — assignees */}
      <div className="flex items-center gap-0.5 pl-1">
        {task.assignees.length === 0 ? (
          <span className="w-6 h-6 rounded-full border border-dashed border-line-dim opacity-30 inline-block" />
        ) : (
          task.assignees.slice(0, 3).map((user) => (
            <Tooltip key={user._id} content={user.displayName}>
              <Avatar name={user.displayName ?? '?'} />
            </Tooltip>
          ))
        )}
      </div>

      {/* Col 4 — story points */}
      <div className="flex justify-center">
        {task.storyPoints !== null && (
          <span className="text-xs font-medium text-ink-dim tabular-nums bg-lift px-1.5 py-0.5 rounded">
            {task.storyPoints}
          </span>
        )}
      </div>

      {/* Col 5 — priority */}
      <div className="flex items-center justify-center">
        <PriorityIcon priority={task.priority} />
      </div>

      {/* Col 6 — due date */}
      <div className="pr-4 text-right">
        {task.dueDate && (
          <span className={`text-xs tabular-nums font-medium ${isOverdue ? 'text-danger' : 'text-ink-dim'}`}>
            {new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </span>
        )}
      </div>
    </div>
  );
}
