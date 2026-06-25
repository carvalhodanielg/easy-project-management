import type { CompletionContext, CompletionResult, CompletionSource } from '@codemirror/autocomplete';
import type { EditorView } from '@codemirror/view';

export interface MentionMember {
  _id: string;
  displayName: string;
}

export interface TaskRef {
  _id: string;
  name: string;
}

/** Escape `]` and `)` so a mention/task label can't break out of the markdown link. */
function escapeLabel(text: string): string {
  return text.replace(/[[\]()]/g, '\\$&');
}

/** Is the `#`/`/` at `from` the first non-whitespace char on its line? */
function atLineStart(context: CompletionContext, from: number): boolean {
  const line = context.state.doc.lineAt(from);
  return context.state.doc.sliceString(line.from, from).trim() === '';
}

/**
 * `@` mentions of space members. Inserts `[@Name](mention:id) ` so the reference
 * survives markdown round-trips and renders as a clickable chip in reading mode.
 * Members are read lazily so the source always sees the latest query cache.
 */
export function mentionCompletionSource(getMembers: () => MentionMember[]): CompletionSource {
  return (context: CompletionContext): CompletionResult | null => {
    const match = context.matchBefore(/@\w*/);
    if (!match) return null;
    if (match.from === match.to && !context.explicit) return null;
    // `@@` is a task reference (handled by taskCompletionSource), not a mention.
    if (match.from > 0 && context.state.doc.sliceString(match.from - 1, match.from) === '@') {
      return null;
    }

    const query = match.text.slice(1).toLowerCase();
    const options = getMembers()
      .filter((m) => m.displayName.toLowerCase().includes(query))
      .map((m) => ({
        label: '@' + m.displayName,
        displayLabel: m.displayName,
        type: 'keyword',
        apply: `[@${escapeLabel(m.displayName)}](mention:${m._id}) `,
      }));

    return { from: match.from, to: match.to, options, filter: false };
  };
}

/**
 * `@@` references to tasks/subtasks of the space. Uses `@@` (not `#`) so it never
 * collides with markdown headings. Async: results come from the task search query.
 * Inserts `[Name](task:id) `.
 */
export function taskCompletionSource(
  fetchTasks: (query: string) => Promise<TaskRef[]>,
): CompletionSource {
  return async (context: CompletionContext): Promise<CompletionResult | null> => {
    const match = context.matchBefore(/@@[\w ]*/);
    if (!match) return null;

    const query = match.text.slice(2).trim();

    const tasks = await fetchTasks(query);
    if (context.aborted) return null;

    return {
      from: match.from,
      to: match.to,
      filter: false,
      options: tasks.map((t) => ({
        label: t.name,
        type: 'class',
        apply: `[${escapeLabel(t.name)}](task:${t._id}) `,
      })),
    };
  };
}

export interface SlashBlock {
  label: string;
  detail: string;
  keywords: string[];
  /** Text inserted in place of the `/query`. `|` marks the final cursor position. */
  template: string;
  /** SVG path `d` strings (24x24 viewBox) for the dropdown's leading line icon. */
  icon: string[];
}

export const SLASH_BLOCKS: SlashBlock[] = [
  { label: 'Título', detail: 'Cabeçalho grande', keywords: ['titulo', 'heading', 'h1'], template: '# |', icon: ['M4 12h8', 'M4 18V6', 'M12 18V6', 'm17 12 3-2v8'] },
  { label: 'Subtítulo', detail: 'Cabeçalho médio', keywords: ['subtitulo', 'h2'], template: '## |', icon: ['M4 12h8', 'M4 18V6', 'M12 18V6', 'M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1'] },
  { label: 'Sub-subtítulo', detail: 'Cabeçalho pequeno', keywords: ['h3'], template: '### |', icon: ['M4 12h8', 'M4 18V6', 'M12 18V6', 'M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2', 'M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2'] },
  { label: 'Lista', detail: 'Lista com marcadores', keywords: ['lista', 'bullet', 'ul'], template: '- |', icon: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'] },
  { label: 'Lista numerada', detail: 'Lista ordenada', keywords: ['numerada', 'ordered', 'ol'], template: '1. |', icon: ['M10 6h11', 'M10 12h11', 'M10 18h11', 'M4 6h1v4', 'M4 10h2', 'M6 18H4c0-1 2-2 2-3s-1-1.5-2-1'] },
  { label: 'Tarefa', detail: 'Checkbox', keywords: ['tarefa', 'checkbox', 'todo'], template: '- [ ] |', icon: ['m3 17 2 2 4-4', 'm3 7 2 2 4-4', 'M13 6h8', 'M13 12h8', 'M13 18h8'] },
  { label: 'Citação', detail: 'Bloco de citação', keywords: ['citacao', 'quote', 'blockquote'], template: '> |', icon: ['M6 17h3l2-4V7H5v6h3z', 'M14 17h3l2-4V7h-6v6h3z'] },
  { label: 'Código', detail: 'Bloco de código', keywords: ['codigo', 'code', 'fence'], template: '```\n|\n```', icon: ['m16 18 6-6-6-6', 'm8 6-6 6 6 6'] },
  { label: 'Divisória', detail: 'Linha horizontal', keywords: ['divisoria', 'hr', 'rule'], template: '---\n|', icon: ['M5 12h14'] },
  { label: 'Tabela', detail: 'Tabela markdown', keywords: ['tabela', 'table'], template: '| | |\n| --- | --- |\n| | |', icon: ['M3 3h18v18H3z', 'M3 9h18', 'M3 15h18', 'M9 3v18', 'M15 3v18'] },
];

/** Resolve a slash template into the inserted text and the resulting cursor offset. */
export function resolveTemplate(template: string): { insert: string; cursor: number } {
  const cursor = template.indexOf('|');
  const insert = template.replace('|', '');
  return { insert, cursor: cursor === -1 ? insert.length : cursor };
}

/**
 * `/` block menu (Notion/Obsidian style). Only triggers when `/` is the first
 * non-whitespace char of the line; replaces the `/query` with the block template.
 */
export function slashCompletionSource(): CompletionSource {
  return (context: CompletionContext): CompletionResult | null => {
    const match = context.matchBefore(/\/\w*/);
    if (!match) return null;
    if (!atLineStart(context, match.from)) return null;

    const query = match.text.slice(1).toLowerCase();
    const options = SLASH_BLOCKS.filter(
      (b) => b.label.toLowerCase().includes(query) || b.keywords.some((k) => k.includes(query)),
    ).map((b) => ({
      label: b.label,
      detail: b.detail,
      type: 'text',
      // Custom field read by renderCompletionBadge to draw the leading line icon.
      icon: b.icon,
      apply: (view: EditorView, _c: unknown, from: number, to: number) => {
        const { insert, cursor } = resolveTemplate(b.template);
        view.dispatch({
          changes: { from, to, insert },
          selection: { anchor: from + cursor },
        });
      },
    }));

    return { from: match.from, to: match.to, options, filter: false };
  };
}
