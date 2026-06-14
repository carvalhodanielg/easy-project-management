// Stable palette so each epic keeps the same colour across the UI (group header,
// the epic's own row, and the membership chips on its child rows). The colour is
// derived deterministically from a key so no per-epic colour is stored
// server-side. We key by the epic's display name because that is the only value
// available in every place the colour is needed (the group header receives the
// epic name as its `groupKey`). Two epics sharing a name would share a colour —
// a purely cosmetic collision.
export const EPIC_PALETTE = ['#7C3AED', '#3B82F6', '#22C55E', '#F59E0B', '#EC4899', '#14B8A6', '#F97316'];

export function epicColor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return EPIC_PALETTE[Math.abs(hash) % EPIC_PALETTE.length];
}
