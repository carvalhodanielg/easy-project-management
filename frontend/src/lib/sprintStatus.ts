import { CircleDot, CheckCircle2, Clock, type LucideIcon } from 'lucide-react';
import type { Sprint } from '../api/sprints.api';

export interface SprintDisplayStatus {
  /** Full label, used for the icon title / tooltip (no visible inline text). */
  label: string;
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
    return { label: 'Concluída', color: 'text-ink-muted', Icon: CheckCircle2 };
  if (start <= now && now <= end)
    return { label: 'Em progresso', color: 'text-s-done', Icon: CircleDot };
  return { label: 'Planejamento', color: 'text-s-review', Icon: Clock };
}
