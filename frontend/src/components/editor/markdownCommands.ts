import type { EditorView, KeyBinding } from '@codemirror/view';
import { EditorSelection, type StateCommand } from '@codemirror/state';

/**
 * Toggle a wrapping marker (`**`, `*`, …) around every selection range.
 * If the selection is already wrapped, the markers are removed; otherwise they
 * are added. Empty selections insert the markers and place the cursor between.
 */
export function toggleWrap(marker: string): StateCommand {
  return ({ state, dispatch }) => {
    const len = marker.length;

    const tr = state.changeByRange((range) => {
      const before = state.sliceDoc(range.from - len, range.from);
      const after = state.sliceDoc(range.to, range.to + len);
      const alreadyWrapped = before === marker && after === marker;

      if (alreadyWrapped) {
        return {
          changes: [
            { from: range.from - len, to: range.from },
            { from: range.to, to: range.to + len },
          ],
          range: EditorSelection.range(range.from - len, range.to - len),
        };
      }

      return {
        changes: [
          { from: range.from, insert: marker },
          { from: range.to, insert: marker },
        ],
        range: EditorSelection.range(range.from + len, range.to + len),
      };
    });

    dispatch(state.update(tr, { scrollIntoView: true, userEvent: 'input.wrap' }));
    return true;
  };
}

export const toggleBold = toggleWrap('**');
export const toggleItalic = toggleWrap('*');

export const markdownKeymap: readonly KeyBinding[] = [
  { key: 'Mod-b', run: toggleBold as (view: EditorView) => boolean, preventDefault: true },
  { key: 'Mod-i', run: toggleItalic as (view: EditorView) => boolean, preventDefault: true },
];
