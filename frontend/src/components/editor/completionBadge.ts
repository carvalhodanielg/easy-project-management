import type { Completion } from '@codemirror/autocomplete';

/** Person glyph for `@` user mentions (path-only, lucide-style). */
export const MENTION_ICON = ['M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8', 'M6 21v-1a6 6 0 0 1 12 0v1'];

/** Checked-square glyph for `@@` task references (path-only, lucide-style). */
export const TASK_ICON = [
  'M21 10.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.5',
  'm9 11 3 3L22 4',
];

/** Build a monochrome 24x24 line icon (lucide-style) from SVG path `d` strings. */
export function buildLineIcon(paths: string[]): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  for (const d of paths) {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  return svg;
}

/** Wrap a line icon in the shared `.cm-block-icon` badge container. */
function badge(paths: string[]): HTMLElement {
  const el = document.createElement('span');
  el.className = 'cm-block-icon';
  el.appendChild(buildLineIcon(paths));
  return el;
}

/**
 * Leading badge for each completion, all sharing the same muted line-icon look
 * (Obsidian-style): a person glyph for `@` member mentions (type `keyword`), a
 * checked-square for `@@` task refs (type `class`), and the block's own icon for
 * the `/` menu (type `text`).
 */
export function renderCompletionBadge(completion: Completion): Node | null {
  if (completion.type === 'keyword') return badge(MENTION_ICON);
  if (completion.type === 'class') return badge(TASK_ICON);
  const icon = (completion as Completion & { icon?: string[] }).icon;
  if (completion.type === 'text' && icon?.length) return badge(icon);
  return null;
}
