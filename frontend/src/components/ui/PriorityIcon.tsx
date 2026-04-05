import { Flame, ArrowUp, ArrowRight, ArrowDown } from 'lucide-react';
import type { TaskPriority } from '../../types/task.types';
import { PRIORITY_LABELS } from '../../types/task.types';

const PRIORITY_CONFIG: Record<TaskPriority, {
  icon: React.ElementType;
  color: string;
}> = {
  urgente: { icon: Flame,      color: 'text-p-urgent' },
  alta:    { icon: ArrowUp,    color: 'text-p-high'   },
  normal:  { icon: ArrowRight, color: 'text-p-normal' },
  baixa:   { icon: ArrowDown,  color: 'text-p-low'    },
};

interface Props {
  priority: TaskPriority;
  showLabel?: boolean;
  size?: number;
}

export function PriorityIcon({ priority, showLabel = false, size = 13 }: Props) {
  const { icon: Icon, color } = PRIORITY_CONFIG[priority];
  return (
    <span className={`inline-flex items-center gap-1 ${color}`}>
      <Icon size={size} />
      {showLabel && <span className="text-xs font-medium">{PRIORITY_LABELS[priority]}</span>}
    </span>
  );
}
