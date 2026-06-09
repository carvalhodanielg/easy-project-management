import { describe, it, expect } from 'vitest';
import { EditorState, EditorSelection, type StateCommand, type Transaction } from '@codemirror/state';
import { toggleBold, toggleItalic } from './markdownCommands';

function run(cmd: StateCommand, doc: string, from: number, to = from) {
  let state = EditorState.create({ doc, selection: EditorSelection.single(from, to) });
  cmd({ state, dispatch: (tr: Transaction) => { state = tr.state; } });
  return {
    doc: state.doc.toString(),
    from: state.selection.main.from,
    to: state.selection.main.to,
  };
}

describe('toggleBold', () => {
  it('wraps the selection in ** and keeps it selected', () => {
    const r = run(toggleBold, 'hello', 0, 5);
    expect(r.doc).toBe('**hello**');
    expect(r.doc.slice(r.from, r.to)).toBe('hello');
  });

  it('unwraps an already-bold selection', () => {
    const r = run(toggleBold, '**hello**', 2, 7);
    expect(r.doc).toBe('hello');
  });

  it('inserts empty markers and places the cursor between them', () => {
    const r = run(toggleBold, '', 0);
    expect(r.doc).toBe('****');
    expect(r.from).toBe(2);
    expect(r.to).toBe(2);
  });
});

describe('toggleItalic', () => {
  it('wraps the selection in a single *', () => {
    const r = run(toggleItalic, 'hi', 0, 2);
    expect(r.doc).toBe('*hi*');
  });
});
