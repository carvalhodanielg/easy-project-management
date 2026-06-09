import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import type { DecorationSet } from '@codemirror/view';
import { buildDecorations } from './livePreview';

function decosFor(doc: string, cursor: number) {
  const state = EditorState.create({
    doc,
    selection: { anchor: cursor },
    extensions: [markdown()],
  });
  return collect(buildDecorations(state), doc.length);
}

function collect(set: DecorationSet, end: number) {
  const out: { from: number; to: number; cls: string | null }[] = [];
  set.between(0, end, (from, to, deco) => {
    out.push({ from, to, cls: (deco.spec.class as string) ?? null });
  });
  return out;
}

describe('buildDecorations (live preview)', () => {
  it('styles a heading and hides its "# " marker when the cursor is elsewhere', () => {
    const out = decosFor('# Hello\nworld', 9); // cursor on line 2
    expect(out.some((d) => d.cls === 'cm-md-h1')).toBe(true);
    expect(out.some((d) => d.cls === null && d.from === 0)).toBe(true); // "# " hidden
  });

  it('leaves the cursor line raw (no decorations)', () => {
    const out = decosFor('# Hello\nworld', 0); // cursor on the heading line
    expect(out).toHaveLength(0);
  });

  it('styles bold and hides the ** markers off the cursor line', () => {
    const out = decosFor('**bold**\nx', 9); // cursor on line 2
    expect(out.some((d) => d.cls === 'cm-md-bold')).toBe(true);
    const hidden = out.filter((d) => d.cls === null);
    expect(hidden).toHaveLength(2); // two ** markers
  });
});
