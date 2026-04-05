import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { Task, TaskStatus } from '../../types/task.types';
import { PriorityIcon } from '../ui/PriorityIcon';
import { Tooltip } from '../ui/tooltip';

export const TASK_COLS = '36px 1fr 88px 52px 80px 90px';

const STATUS_DOT: Record<TaskStatus, string> = {
  pendente:     'border-s-pending bg-transparent',
  em_progresso: 'border-s-progress bg-s-progress/30',
  em_review:    'border-s-review bg-s-review/30',
  feito:        'border-s-done bg-s-done/30',
  fechado:      'border-s-closed bg-s-closed/30',
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  pendente:     'Pendente',
  em_progresso: 'Em progresso',
  em_review:    'Em revisão',
  feito:        'Feito',
  fechado:      'Fechado',
};

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
}

export function TaskRow({ task, depth = 0, onToggleExpand, isExpanded }: Props) {
  const navigate  = useNavigate();
  const { spaceId } = useParams<{ spaceId: string }>();
  const isOverdue = !!task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <div
      role="row"
      onClick={() => navigate(`/spaces/${spaceId}/tasks/${task._id}`)}
      className="group cursor-pointer border-b border-line-dim hover:bg-lift/60 transition-colors"
      style={{ display: 'grid', gridTemplateColumns: TASK_COLS, alignItems: 'center', minHeight: '38px' }}
    >
      {/* Col 1 — toggle + status */}
      <div
        className="flex items-center justify-center gap-0.5"
        style={{ paddingLeft: depth > 0 ? `${depth * 16 + 4}px` : '4px' }}
      >
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
        <Tooltip content={STATUS_LABEL[task.status]}>
          <span
            className={`w-3 h-3 rounded-full shrink-0 border-[1.5px] ${STATUS_DOT[task.status]}`}
          />
        </Tooltip>
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
