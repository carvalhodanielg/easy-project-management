import { CircleDot, CheckCircle2, Clock, type LucideIcon } from 'lucide-react';
import type { Sprint } from '../api/sprints.api';

export interface SprintDisplayStatus {
  /** Full label, used for the icon title / tooltip. */
  label: string;
  /** Compact label shown inline on the sidebar row. */
  shortLabel: string;
  /** Tailwind text color class. */
  color: string;
  Icon: LucideIcon;
}

/** Resolve a sprint's display status from its `status` flag and date window. */
export function sprintDisplayStatus(sprint: Sprint): SprintDisplayStatus {
  const now = Date.now();
  const start = new Date(sprint.startDate).getTime();
  const end = new Date(sprint.endDate).getTime();
  if (sprint.status === 'completed' || end < now)
    return { label: 'Concluída', shortLabel: 'Concl.', color: 'text-ink-muted', Icon: CheckCircle2 };
  if (start <= now && now <= end)
    return { label: 'Em progresso', shortLabel: 'Em prog.', color: 'text-s-done', Icon: CircleDot };
  return { label: 'Planejamento', shortLabel: 'Futura', color: 'text-s-review', Icon: Clock };
}
