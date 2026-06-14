import type { Task } from '../types/task.types';

export type EpicLayoutItem =
  | { kind: 'separator'; key: string }
  | { kind: 'task'; task: Task };

// Restructures the position-ordered top-level tasks of a list for display so that
// epic blocks read clearly:
//  - In-list children of an epic that is present in this list are dropped from the
//    top level. They are shown nested under the (auto-expanded) epic instead, so
//    they appear exactly once. A child whose epic is NOT in this list stays put —
//    there is no epic block here to nest it under.
//  - A separator is inserted between two consecutive blocks whenever either side is
//    an epic, giving a clear break between an epic and the surrounding loose tasks
//    or other epics. No leading or trailing separator.
export function buildEpicLayout(tasks: Task[]): EpicLayoutItem[] {
  const epicIds = new Set(tasks.filter((t) => t.isEpic).map((t) => t._id));
  const topLevel = tasks.filter((t) => !(t.epicId && epicIds.has(t.epicId)));

  const items: EpicLayoutItem[] = [];
  for (let i = 0; i < topLevel.length; i++) {
    const curr = topLevel[i];
    const prev = topLevel[i - 1];
    if (prev && (prev.isEpic || curr.isEpic)) {
      items.push({ kind: 'separator', key: `sep-${prev._id}-${curr._id}` });
    }
    items.push({ kind: 'task', task: curr });
  }
  return items;
}
