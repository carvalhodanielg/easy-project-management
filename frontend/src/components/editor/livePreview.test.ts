import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { type DecorationSet, WidgetType } from '@codemirror/view';
import { buildDecorations, ImageWidget, CheckboxWidget } from './livePreview';

function decosFor(doc: string, cursor: number) {
  const state = EditorState.create({
    doc,
    selection: { anchor: cursor },
    extensions: [markdown({ base: markdownLanguage })],
  });
  return collect(buildDecorations(state), doc.length);
}

function collect(set: DecorationSet, end: number) {
  const out: { from: number; to: number; cls: string | null; widget: WidgetType | null }[] = [];
  set.between(0, end, (from, to, deco) => {
    out.push({
      from,
      to,
      cls: (deco.spec.class as string) ?? null,
      widget: (deco.spec.widget as WidgetType) ?? null,
    });
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
    const hidden = out.filter((d) => d.cls === null && d.widget === null);
    expect(hidden).toHaveLength(2); // two ** markers
  });

  it('renders an image as a widget when the cursor is elsewhere', () => {
    const out = decosFor('![alt](http://x/a.png)\nworld', 24); // cursor on line 2
    const img = out.find((d) => d.widget instanceof ImageWidget);
    expect(img).toBeDefined();
    expect((img!.widget as ImageWidget).src).toBe('http://x/a.png');
    expect((img!.widget as ImageWidget).alt).toBe('alt');
  });

  it('leaves the image as raw markdown on the cursor line', () => {
    const out = decosFor('![alt](http://x/a.png)\nworld', 3); // cursor on the image line
    expect(out.some((d) => d.widget instanceof ImageWidget)).toBe(false);
  });

  it('styles every line of a fenced code block', () => {
    const out = decosFor('```json\n{ "x": 123 }\n```\nafter', 26); // cursor on last line
    const codeLines = out.filter((d) => d.cls?.includes('cm-md-codeblock'));
    expect(codeLines).toHaveLength(3); // opening fence, content, closing fence
    expect(out.some((d) => d.cls?.includes('cm-md-codeblock-first'))).toBe(true);
    expect(out.some((d) => d.cls?.includes('cm-md-codeblock-last'))).toBe(true);
  });

  it('renders a clickable checkbox even on the cursor line', () => {
    const out = decosFor('- [ ] fazer algo', 0); // cursor on the task line
    const box = out.find((d) => d.widget instanceof CheckboxWidget);
    expect(box).toBeDefined();
    expect((box!.widget as CheckboxWidget).checked).toBe(false);
  });

  it('marks a checked checkbox as checked', () => {
    const out = decosFor('- [x] feito', 0);
    const box = out.find((d) => d.widget instanceof CheckboxWidget);
    expect((box!.widget as CheckboxWidget).checked).toBe(true);
  });
});
