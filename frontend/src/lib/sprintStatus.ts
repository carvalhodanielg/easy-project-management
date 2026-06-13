import { CircleDot, CheckCircle2, Clock, type LucideIcon } from 'lucide-react';
import type { Sprint } from '../api/sprints.api';

export interface SprintDisplayStatus {
  /** Full label, used for the icon title / tooltip (no visible inline text). */
  label: string;
  /** Tailwind text color class. */
  color: string;
  Icon: LucideIcon;
}

/** The three sprint states, matching the backend `SprintStatus` enum values. */
export type SprintStatusKey = Sprint['status'];

/**
 * Resolve a sprint's *effective* status from its `status` flag and date window.
 * The backend rarely advances the stored flag (it only auto-completes folder
 * sprints), so the UI derives the real state from the dates: a sprint whose
 * window already ended reads as completed, one currently in its window reads as
 * active, and one still in the future reads as planning.
 */
export function sprintStatusKey(sprint: Sprint): SprintStatusKey {
  const now = Date.now();
  const start = new Date(sprint.startDate).getTime();
  const end = new Date(sprint.endDate).getTime();
  if (sprint.status === 'completed' || end < now) return 'completed';
  if (start <= now && now <= end) return 'active';
  return 'planning';
}

const DISPLAY: Record<SprintStatusKey, SprintDisplayStatus> = {
  completed: { label: 'Concluída', color: 'text-ink-muted', Icon: CheckCircle2 },
  active: { label: 'Em progresso', color: 'text-s-done', Icon: CircleDot },
  planning: { label: 'Planejamento', color: 'text-s-review', Icon: Clock },
};

/** Resolve a sprint's display status (label/color/icon) from its effective state. */
export function sprintDisplayStatus(sprint: Sprint): SprintDisplayStatus {
  return DISPLAY[sprintStatusKey(sprint)];
}
