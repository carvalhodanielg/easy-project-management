import { syntaxTree } from '@codemirror/language';
import { Decoration, type DecorationSet, ViewPlugin, type ViewUpdate, EditorView } from '@codemirror/view';
import type { EditorState, Range } from '@codemirror/state';

/**
 * Phase-1 "Live Preview" (Obsidian style): on lines that do NOT contain the
 * cursor/selection, inline markers (`**`, `*`, `` ` ``, `~~`, heading `#`) are
 * hidden and the content is styled; the line the cursor is on stays raw so it's
 * naturally editable. Multiline blocks (code fences, tables) are left untouched
 * here — they render via the markdown highlight in the editor and fully in the
 * reading mode.
 */
const HEADING_CLASS: Record<string, string> = {
  ATXHeading1: 'cm-md-h1',
  ATXHeading2: 'cm-md-h2',
  ATXHeading3: 'cm-md-h3',
  ATXHeading4: 'cm-md-h4',
  ATXHeading5: 'cm-md-h5',
  ATXHeading6: 'cm-md-h6',
};

const STYLE_CLASS: Record<string, string> = {
  StrongEmphasis: 'cm-md-bold',
  Emphasis: 'cm-md-italic',
  Strikethrough: 'cm-md-strike',
  InlineCode: 'cm-md-code',
};

const HIDE_MARK = new Set(['EmphasisMark', 'CodeMark', 'StrikethroughMark']);

const hide = Decoration.replace({});

export function buildDecorations(state: EditorState): DecorationSet {
  const { doc, selection } = state;
  const ranges: Range<Decoration>[] = [];

  const touchesSelection = (from: number, to: number): boolean => {
    const lineFrom = doc.lineAt(from).from;
    const lineTo = doc.lineAt(to).to;
    return selection.ranges.some((r) => r.from <= lineTo && r.to >= lineFrom);
  };

  syntaxTree(state).iterate({
    enter: (node) => {
      if (touchesSelection(node.from, node.to)) return;

      const headingClass = HEADING_CLASS[node.name];
      if (headingClass) {
        ranges.push(Decoration.mark({ class: headingClass }).range(node.from, node.to));
        return;
      }
      const styleClass = STYLE_CLASS[node.name];
      if (styleClass) {
        ranges.push(Decoration.mark({ class: styleClass }).range(node.from, node.to));
        return;
      }
      if (node.name === 'HeaderMark') {
        // Hide the `#`s plus the single space that follows.
        let to = node.to;
        if (doc.sliceString(to, to + 1) === ' ') to += 1;
        ranges.push(hide.range(node.from, to));
        return;
      }
      if (HIDE_MARK.has(node.name)) {
        ranges.push(hide.range(node.from, node.to));
      }
    },
  });

  return Decoration.set(ranges, true);
}

export const livePreview = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view.state);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildDecorations(update.state);
      }
    }
  },
  { decorations: (v) => v.decorations },
);
