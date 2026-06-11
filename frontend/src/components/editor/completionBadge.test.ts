import { describe, it, expect } from 'vitest';
import type { Completion } from '@codemirror/autocomplete';
import {
  renderCompletionBadge,
  buildLineIcon,
  MENTION_ICON,
  TASK_ICON,
} from './completionBadge';

function paths(node: Node | null): string[] {
  const el = node as HTMLElement;
  return [...el.querySelectorAll('path')].map((p) => p.getAttribute('d') ?? '');
}

describe('buildLineIcon', () => {
  it('builds a stroked 24x24 svg with one path per entry', () => {
    const svg = buildLineIcon(['M1 1h2', 'M3 3h4']);
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    expect(svg.getAttribute('fill')).toBe('none');
    expect(paths(svg)).toEqual(['M1 1h2', 'M3 3h4']);
  });
});

describe('renderCompletionBadge', () => {
  it('renders a line-icon badge for @ user mentions (type keyword)', () => {
    const badge = renderCompletionBadge({ label: '@Ana', type: 'keyword' } as Completion);
    expect((badge as HTMLElement).className).toBe('cm-block-icon');
    expect(paths(badge)).toEqual(MENTION_ICON);
  });

  it('renders a line-icon badge for @@ task refs (type class)', () => {
    const badge = renderCompletionBadge({ label: 'Tarefa', type: 'class' } as Completion);
    expect((badge as HTMLElement).className).toBe('cm-block-icon');
    expect(paths(badge)).toEqual(TASK_ICON);
  });

  it('renders the block icon for / block options (type text)', () => {
    const icon = ['M5 12h14'];
    const badge = renderCompletionBadge({ label: 'Divisória', type: 'text', icon } as Completion & {
      icon: string[];
    });
    expect((badge as HTMLElement).className).toBe('cm-block-icon');
    expect(paths(badge)).toEqual(icon);
  });

  it('returns null for a block option without an icon', () => {
    expect(renderCompletionBadge({ label: 'x', type: 'text' } as Completion)).toBeNull();
  });
});
