import { syntaxTree } from '@codemirror/language';
import {
  Decoration,
  type DecorationSet,
  ViewPlugin,
  type ViewUpdate,
  EditorView,
  WidgetType,
} from '@codemirror/view';
import type { EditorState, Range } from '@codemirror/state';
import { resolveAttachmentUrl } from '../../api/attachments.api';

/** Renders an embedded image inline (Obsidian style) on non-cursor lines. */
export class ImageWidget extends WidgetType {
  readonly src: string;
  readonly alt: string;
  constructor(src: string, alt: string) {
    super();
    this.src = src;
    this.alt = alt;
  }
  eq(other: ImageWidget): boolean {
    return other.src === this.src && other.alt === this.alt;
  }
  toDOM(): HTMLElement {
    const img = document.createElement('img');
    img.className = 'cm-md-image';
    img.src = resolveAttachmentUrl(this.src);
    img.alt = this.alt;
    img.loading = 'lazy';
    return img;
  }
}

/** A clickable checkbox replacing a `[ ]`/`[x]` task marker; toggles the text on click. */
export class CheckboxWidget extends WidgetType {
  readonly checked: boolean;
  readonly from: number;
  readonly to: number;
  constructor(checked: boolean, from: number, to: number) {
    super();
    this.checked = checked;
    this.from = from;
    this.to = to;
  }
  eq(other: CheckboxWidget): boolean {
    return other.checked === this.checked && other.from === this.from && other.to === this.to;
  }
  toDOM(view: EditorView): HTMLElement {
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.className = 'cm-md-checkbox';
    box.checked = this.checked;
    box.addEventListener('mousedown', (e) => {
      e.preventDefault();
      view.dispatch({
        changes: { from: this.from, to: this.to, insert: this.checked ? '[ ]' : '[x]' },
      });
    });
    return box;
  }
  ignoreEvent(): boolean {
    return true;
  }
}

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
      // Always-on (cursor-independent) decorations:
      if (node.name === 'FencedCode') {
        const startLine = doc.lineAt(node.from).number;
        const endLine = doc.lineAt(Math.min(node.to, doc.length)).number;
        for (let n = startLine; n <= endLine; n++) {
          const line = doc.line(n);
          let cls = 'cm-md-codeblock';
          if (n === startLine) cls += ' cm-md-codeblock-first';
          if (n === endLine) cls += ' cm-md-codeblock-last';
          ranges.push(Decoration.line({ class: cls }).range(line.from));
        }
        return;
      }
      if (node.name === 'TaskMarker') {
        const checked = /\[[xX]\]/.test(doc.sliceString(node.from, node.to));
        ranges.push(
          Decoration.replace({ widget: new CheckboxWidget(checked, node.from, node.to) }).range(
            node.from,
            node.to,
          ),
        );
        return;
      }

      if (touchesSelection(node.from, node.to)) return;

      if (node.name === 'Image') {
        const urlNode = node.node.getChild('URL');
        const src = urlNode ? doc.sliceString(urlNode.from, urlNode.to) : '';
        const alt = /^!\[([^\]]*)\]/.exec(doc.sliceString(node.from, node.to))?.[1] ?? '';
        if (src) {
          ranges.push(
            Decoration.replace({ widget: new ImageWidget(src, alt) }).range(node.from, node.to),
          );
        }
        return false; // don't decorate the markdown inside the replaced image
      }

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
