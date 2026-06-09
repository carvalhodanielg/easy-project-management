import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, ChevronDown, Pencil, Check, Plus } from 'lucide-react';
import type { Task, TaskStatus, GroupedTaskResult, FibonacciPoint } from '../../types/task.types';
import { STATUS_LABELS, FIBONACCI_POINTS } from '../../types/task.types';
import { updateTask } from '../../api/tasks.api';
import { TaskActionMenu } from './TaskActionMenu';
import { getSpaceMembers } from '../../api/spaces.api';
import { PriorityIcon } from '../ui/PriorityIcon';
import { Tooltip } from '../ui/tooltip';
import { UserAvatar } from '../ui/UserAvatar';
import { T } from '../../theme';
import type { SpaceMember } from '../../types/space.types';
import type { User } from '../../types/user.types';

export const TASK_COLS = '64px 1fr 88px 52px 80px 90px 36px';

const STATUS_DOT: Record<TaskStatus, string> = {
  pendente:     'border-s-pending bg-transparent',
  em_progresso: 'border-s-progress bg-s-progress/30',
  em_review:    'border-s-review bg-s-review/30',
  feito:        'border-s-done bg-s-done/30',
  fechado:      'border-s-closed bg-s-closed/30',
};

const STATUSES = Object.keys(STATUS_LABELS) as TaskStatus[];

function memberUser(m: SpaceMember): User | null {
  return typeof m.userId === 'object' ? m.userId : null;
}

interface Props {
  task: Task;
  depth?: number;
  onToggleExpand?: () => void;
  isExpanded?: boolean;
  isSelected?: boolean;
  /**
   * When provided the row is in selection mode: the per-row checkbox replaces
   * the inline status button. Callers should only pass this once a selection is
   * active (or the row should otherwise be selectable).
   */
  onSelect?: (id: string, kind: 'main' | 'subtask') => void;
  /**
   * Entry point used by the row action menu to begin a selection. Available
   * even when the row is not yet in selection mode.
   */
  onStartSelect?: (id: string, kind: 'main' | 'subtask') => void;
  onAddSubtask?: () => void;
  dragHandle?: React.ReactNode;
}

export function TaskRow({ task, depth = 0, onToggleExpand, isExpanded, isSelected, onSelect, onStartSelect, onAddSubtask, dragHandle }: Props) {
  const navigate  = useNavigate();
  const { spaceId } = useParams<{ spaceId: string }>();
  const queryClient = useQueryClient();
  const isOverdue = !!task.dueDate && new Date(task.dueDate) < new Date();
  const kind: 'main' | 'subtask' = task.parentTask ? 'subtask' : 'main';
  const selectionMode = !!onSelect;

  // ── Status ────────────────────────────────────────────────────────────────
  const [statusOpen, setStatusOpen] = useState(false);
  const [localStatus, setLocalStatus] = useState<TaskStatus>(task.status);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLocalStatus(task.status); }, [task.status]);

  useEffect(() => {
    if (!statusOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [statusOpen]);

  // ── Name ──────────────────────────────────────────────────────────────────
  const [editingName, setEditingName] = useState(false);
  const [localName, setLocalName] = useState(task.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setLocalName(task.name); }, [task.name]);

  function openNameEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setLocalName(task.name);
    setEditingName(true);
  }

  function commitName() {
    const trimmed = localName.trim();
    if (trimmed && trimmed !== task.name) {
      changeName(trimmed);
    }
    setEditingName(false);
  }

  function cancelName() {
    setLocalName(task.name);
    setEditingName(false);
  }

  // ── Story Points ──────────────────────────────────────────────────────────
  const [pointsOpen, setPointsOpen] = useState(false);
  const [pointsPos, setPointsPos] = useState<{
    left: number;
    placement: 'below' | 'above';
    top?: number;
    bottom?: number;
    maxHeight: number;
  }>({ left: 0, placement: 'below', top: 0, maxHeight: 192 });
  const [localPoints, setLocalPoints] = useState<FibonacciPoint | null>(task.storyPoints);
  const pointsRef = useRef<HTMLDivElement>(null);
  const pointsPopoverRef = useRef<HTMLDivElement>(null);
  const pointsBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { setLocalPoints(task.storyPoints); }, [task.storyPoints]);

  // Position the story-points popover relative to its trigger, flipping it above
  // when there isn't enough room below in the viewport, and always keeping a
  // bottom margin so it never sits flush against the window edge.
  const openPointsPopover = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const GAP = 4; // space between trigger and popover
    const MARGIN = 8; // safeguard from the viewport edge
    const POPOVER_MAX = 192; // matches max-h-48 / 12rem
    const left = rect.left + rect.width / 2;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow >= POPOVER_MAX + GAP + MARGIN || spaceBelow >= spaceAbove) {
      // Anchor below the trigger.
      setPointsPos({
        left,
        placement: 'below',
        top: rect.bottom + GAP,
        maxHeight: Math.max(80, Math.min(POPOVER_MAX, spaceBelow - GAP - MARGIN)),
      });
    } else {
      // Not enough space below — flip above, anchored by `bottom`.
      setPointsPos({
        left,
        placement: 'above',
        bottom: window.innerHeight - rect.top + GAP,
        maxHeight: Math.max(80, Math.min(POPOVER_MAX, spaceAbove - GAP - MARGIN)),
      });
    }
    setPointsOpen((v) => !v);
  };

  useEffect(() => {
    if (!pointsOpen) return;
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      const inWrapper = pointsRef.current?.contains(target);
      const inPopover = pointsPopoverRef.current?.contains(target);
      if (!inWrapper && !inPopover) setPointsOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [pointsOpen]);

  // ── Assignees ─────────────────────────────────────────────────────────────
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [localAssignees, setLocalAssignees] = useState<User[]>(task.assignees);
  const assigneeRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLocalAssignees(task.assignees); }, [task.assignees]);

  useEffect(() => {
    if (!assigneeOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (assigneeRef.current && !assigneeRef.current.contains(e.target as Node)) setAssigneeOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [assigneeOpen]);

  const { data: members = [] } = useQuery({
    queryKey: ['space-members', spaceId],
    queryFn: () => getSpaceMembers(spaceId!),
    enabled: assigneeOpen,
  });

  // ── Optimistic update helper ──────────────────────────────────────────────
  function applyOptimistic(patch: Partial<Task>) {
    const queries = queryClient.getQueriesData<Task[] | GroupedTaskResult[]>({ queryKey: ['tasks', spaceId] });
    for (const [key, data] of queries) {
      if (!data) continue;
      const updated = Array.isArray(data) && data.length > 0 && 'tasks' in data[0]
        ? (data as GroupedTaskResult[]).map((g) => ({ ...g, tasks: g.tasks.map((t) => t._id === task._id ? { ...t, ...patch } : t) }))
        : (data as Task[]).map((t) => t._id === task._id ? { ...t, ...patch } : t);
      queryClient.setQueryData(key, updated);
    }
    const detail = queryClient.getQueryData<Task>(['task', task._id]);
    if (detail) queryClient.setQueryData(['task', task._id], { ...detail, ...patch });
    if (task.parentTask) {
      const parentId = typeof task.parentTask === 'string' ? task.parentTask : (task.parentTask as { _id: string })._id;
      const subs = queryClient.getQueryData<Task[]>(['subtasks', parentId]);
      if (subs) queryClient.setQueryData(['subtasks', parentId], subs.map((t) => t._id === task._id ? { ...t, ...patch } : t));
    }
  }

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['tasks', spaceId] });
    void queryClient.invalidateQueries({ queryKey: ['task', task._id] });
    if (task.parentTask) {
      const parentId = typeof task.parentTask === 'string' ? task.parentTask : (task.parentTask as { _id: string })._id;
      void queryClient.invalidateQueries({ queryKey: ['subtasks', parentId] });
    }
  }

  // ── Mutations ─────────────────────────────────────────────────────────────
  const { mutate: changeStatus } = useMutation({
    mutationFn: (status: TaskStatus) => updateTask(spaceId!, task._id, { status }),
    onMutate: (newStatus) => {
      setLocalStatus(newStatus);
      setStatusOpen(false);
      applyOptimistic({ status: newStatus });
    },
    onError: () => { setLocalStatus(task.status); invalidate(); },
    onSuccess: () => invalidate(),
  });

  const { mutate: changeName } = useMutation({
    mutationFn: (name: string) => updateTask(spaceId!, task._id, { name }),
    onMutate: (name) => { applyOptimistic({ name }); },
    onError: () => invalidate(),
    onSuccess: () => invalidate(),
  });

  const { mutate: changePoints } = useMutation({
    mutationFn: (storyPoints: FibonacciPoint | null) => updateTask(spaceId!, task._id, { storyPoints }),
    onMutate: (storyPoints) => {
      setLocalPoints(storyPoints);
      setPointsOpen(false);
      applyOptimistic({ storyPoints });
    },
    onError: () => { setLocalPoints(task.storyPoints); invalidate(); },
    onSuccess: () => invalidate(),
  });

  const { mutate: changeAssignees } = useMutation({
    mutationFn: (assignees: string[]) => updateTask(spaceId!, task._id, { assignees }),
    onMutate: (ids) => {
      const next = members
        .map(memberUser)
        .filter((u): u is User => u !== null && ids.includes(u._id));
      setLocalAssignees(next);
      applyOptimistic({ assignees: next });
    },
    onError: () => { setLocalAssignees(task.assignees); invalidate(); },
    onSuccess: () => invalidate(),
  });

  function toggleMember(user: User) {
    const ids = localAssignees.map((u) => u._id);
    const next = ids.includes(user._id) ? ids.filter((id) => id !== user._id) : [...ids, user._id];
    changeAssignees(next);
  }

  const assigneeIds = new Set(localAssignees.map((u) => u._id));

  return (
    <div
      role="row"
      onClick={() => !editingName && navigate(`/spaces/${spaceId}/tasks/${task._id}`)}
      className={`group cursor-pointer border-b border-line-dim hover:bg-lift/60 transition-colors ${isSelected ? 'bg-brand/8' : ''}`}
      style={{ display: 'grid', gridTemplateColumns: TASK_COLS, alignItems: 'center', minHeight: kind === 'subtask' ? '34px' : '42px' }}
    >
      {/* Col 1 — drag handle + selection checkbox + expand toggle + status */}
      <div
        className="flex items-center gap-0.5"
        style={{ paddingLeft: depth > 0 ? `${depth * 16 + 4}px` : '4px' }}
      >
        {dragHandle ?? <span className="w-3" />}

        {/* Selection checkbox — sits beside the drag handle, visible only on
            hover or when the row is selected / a selection is active. */}
        {(onSelect || onStartSelect) && (
          <button
            aria-label={isSelected ? 'Desmarcar' : 'Selecionar'}
            onClick={(e) => { e.stopPropagation(); (onSelect ?? onStartSelect)!(task._id, kind); }}
            className={`shrink-0 transition-opacity ${isSelected || selectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          >
            <span className={`w-4 h-4 flex items-center justify-center rounded shrink-0 transition-all border ${
              isSelected
                ? 'border-brand bg-brand text-white'
                : 'border-ink-muted/40 bg-transparent hover:border-brand/60 hover:bg-brand/8'
            }`}>
              {isSelected && (
                <svg width="8" height="6" viewBox="0 0 8 6" fill="none" className="shrink-0">
                  <path d="M1 3L3 5L7 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </span>
          </button>
        )}

        {onToggleExpand ? (
          <button
            aria-label={isExpanded ? 'Recolher' : 'Expandir'}
            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
            className="w-4 h-4 flex items-center justify-center text-ink-muted hover:text-ink transition-colors shrink-0 opacity-50 group-hover:opacity-100"
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
              className={`rounded-full shrink-0 border-[1.5px] ${STATUS_DOT[localStatus]} hover:scale-125 transition-transform ${kind === 'subtask' ? 'w-2.5 h-2.5' : 'w-3 h-3'}`}
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
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 border-[1.5px] ${STATUS_DOT[s]}`} />
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
      </div>

      {/* Col 2 — name + tags + subtask count */}
      <div
        className="flex items-center gap-2 pr-3 min-w-0"
        style={{ paddingLeft: depth > 0 ? `${depth * 16}px` : '8px' }}
        onClick={(e) => editingName && e.stopPropagation()}
      >
        {onAddSubtask && !editingName && (
          <Tooltip content="Adicionar subtarefa">
            <button
              aria-label="Adicionar subtarefa"
              onClick={(e) => { e.stopPropagation(); onAddSubtask(); }}
              className="opacity-0 group-hover:opacity-100 shrink-0 text-ink-muted hover:text-brand transition-colors"
            >
              <Plus size={12} />
            </button>
          </Tooltip>
        )}

        {task.subtaskCount > 0 && (
          <span className="text-[11px] text-ink-muted shrink-0 tabular-nums bg-lift px-1.5 py-0.5 rounded">
            ↳{task.subtaskCount}
          </span>
        )}

        {editingName ? (
          <input
            ref={nameInputRef}
            aria-label="Nome da tarefa"
            autoFocus
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') { e.preventDefault(); commitName(); }
              if (e.key === 'Escape') cancelName();
            }}
            onBlur={commitName}
            className="flex-1 min-w-0 text-sm text-ink bg-base border border-brand/60 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand/50"
          />
        ) : (
          <>
            <span className={`truncate leading-tight flex-1 min-w-0 ${kind === 'subtask' ? 'text-xs text-ink-dim' : 'text-sm text-ink font-medium'}`}>
              {task.name}
            </span>
            <button
              aria-label="Editar nome"
              onClick={openNameEdit}
              className="opacity-0 group-hover:opacity-100 shrink-0 text-ink-muted hover:text-ink transition-colors"
            >
              <Pencil size={11} />
            </button>
          </>
        )}

        {!editingName && task.tags.slice(0, 2).map((tag) => (
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
      <div
        ref={assigneeRef}
        className="relative flex items-center gap-0.5 pl-1"
        onClick={(e) => e.stopPropagation()}
      >
        {localAssignees.slice(0, 3).map((user) => (
          <Tooltip key={user._id} content={user.displayName}>
            <button
              aria-label={`Responsável: ${user.displayName}`}
              onClick={() => setAssigneeOpen((o) => !o)}
              className="shrink-0"
            >
              <UserAvatar user={user} size="xs" className="ring-2 ring-base" />
            </button>
          </Tooltip>
        ))}

        <button
          aria-label="Adicionar responsável"
          onClick={() => setAssigneeOpen((o) => !o)}
          className={`w-5 h-5 rounded-full border border-dashed border-line-dim flex items-center justify-center text-ink-muted hover:text-ink hover:border-brand/60 transition-colors shrink-0 ${localAssignees.length === 0 ? '' : 'opacity-0 group-hover:opacity-100'}`}
        >
          <span className="text-[10px] leading-none">+</span>
        </button>

        {assigneeOpen && (
          <div className="absolute top-full left-0 mt-1.5 z-50 bg-modal border border-line rounded-xl shadow-2xl min-w-44 py-1.5 max-h-56 overflow-y-auto">
            {members.map((m) => {
              const user = memberUser(m);
              if (!user) return null;
              const assigned = assigneeIds.has(user._id);
              return (
                <button
                  key={m._id}
                  aria-label={user.displayName}
                  onClick={() => toggleMember(user)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-left text-sm text-ink hover:bg-lift transition-colors"
                >
                  <span
                    className="w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center shrink-0"
                    style={{ background: assigned ? '#6366F1' : '#3A3A4A' }}
                  >
                    {user.displayName.charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1">{user.displayName}</span>
                  {assigned && <Check size={11} className="text-brand shrink-0" />}
                </button>
              );
            })}
            {members.length === 0 && (
              <p className="px-3 py-2 text-xs text-ink-muted">Carregando…</p>
            )}
          </div>
        )}
      </div>

      {/* Col 4 — story points */}
      <div
        ref={pointsRef}
        className="relative flex justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {localPoints !== null ? (
          <button
            ref={pointsBtnRef}
            aria-label={`Pontos: ${localPoints}`}
            onClick={(e) => openPointsPopover(e.currentTarget as HTMLElement)}
            className="text-xs font-medium text-ink-dim tabular-nums bg-lift px-1.5 py-0.5 rounded hover:bg-lift/80 transition-colors cursor-pointer"
          >
            {localPoints}
          </button>
        ) : (
          <button
            ref={pointsBtnRef}
            aria-label="Adicionar pontos"
            onClick={(e) => openPointsPopover(e.currentTarget as HTMLElement)}
            className="opacity-0 group-hover:opacity-100 text-xs text-ink-muted tabular-nums px-1.5 py-0.5 rounded border border-dashed border-line-dim hover:border-brand/60 transition-colors"
          >
            —
          </button>
        )}

        {pointsOpen && createPortal(
          <div
            ref={pointsPopoverRef}
            data-testid="points-popover"
            style={{
              position: 'fixed',
              left: pointsPos.left,
              ...(pointsPos.placement === 'above'
                ? { bottom: pointsPos.bottom }
                : { top: pointsPos.top }),
              maxHeight: pointsPos.maxHeight,
              transform: 'translateX(-50%)',
            }}
            className="z-[9999] bg-modal border border-line rounded-xl shadow-2xl py-1 min-w-[96px] overflow-y-auto"
          >
            <div className="flex flex-col">
              {FIBONACCI_POINTS.map((pt) => (
                <button
                  key={pt}
                  aria-label={`${pt} pts`}
                  onClick={() => changePoints(localPoints === pt ? null : pt)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors rounded-lg ${
                    localPoints === pt
                      ? 'text-brand font-semibold'
                      : 'text-ink hover:bg-lift'
                  }`}
                >
                  <span className="tabular-nums w-6 text-right">{pt}</span>
                  <span className="text-xs text-ink-muted">pts</span>
                  {localPoints === pt && <span className="ml-auto text-[10px] text-ink-muted">✓</span>}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
      </div>

      {/* Col 5 — priority */}
      <div className="flex items-center justify-center">
        <PriorityIcon priority={task.priority} />
      </div>

      {/* Col 6 — due date */}
      <div className="pr-1 text-right">
        {task.dueDate && (
          <span className={`text-xs tabular-nums font-medium ${isOverdue ? 'text-danger' : 'text-ink-dim'}`}>
            {new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </span>
        )}
      </div>

      {/* Col 7 — action menu */}
      <div
        className="flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {spaceId && (
          <TaskActionMenu
            task={task}
            spaceId={spaceId}
            onDone={() => void queryClient.invalidateQueries({ queryKey: ['tasks', spaceId] })}
            onSelect={
              onStartSelect
                ? () => onStartSelect(task._id, kind)
                : onSelect
                  ? () => onSelect(task._id, kind)
                  : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
