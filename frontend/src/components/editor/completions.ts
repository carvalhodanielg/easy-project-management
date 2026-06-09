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

    const query = match.text.slice(1).toLowerCase();
    const options = getMembers()
      .filter((m) => m.displayName.toLowerCase().includes(query))
      .map((m) => ({
        label: '@' + m.displayName,
        type: 'keyword',
        apply: `[@${escapeLabel(m.displayName)}](mention:${m._id}) `,
      }));

    return { from: match.from, to: match.to, options, filter: false };
  };
}

/**
 * `#` references to tasks/subtasks of the space. Skipped at line start so `# `
 * stays a markdown heading. Async: results come from the task search query.
 * Inserts `[Name](task:id) `.
 */
export function taskCompletionSource(
  fetchTasks: (query: string) => Promise<TaskRef[]>,
): CompletionSource {
  return async (context: CompletionContext): Promise<CompletionResult | null> => {
    const match = context.matchBefore(/#[\w ]*/);
    if (!match) return null;
    if (atLineStart(context, match.from)) return null; // `# ` is a heading

    const query = match.text.slice(1).trim();
    if (!query && !context.explicit) return null;

    const tasks = await fetchTasks(query);
    if (context.aborted) return null;

    return {
      from: match.from,
      to: match.to,
      filter: false,
      options: tasks.map((t) => ({
        label: '#' + t.name,
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
}

export const SLASH_BLOCKS: SlashBlock[] = [
  { label: 'Título', detail: 'Cabeçalho grande', keywords: ['titulo', 'heading', 'h1'], template: '# |' },
  { label: 'Subtítulo', detail: 'Cabeçalho médio', keywords: ['subtitulo', 'h2'], template: '## |' },
  { label: 'Sub-subtítulo', detail: 'Cabeçalho pequeno', keywords: ['h3'], template: '### |' },
  { label: 'Lista', detail: 'Lista com marcadores', keywords: ['lista', 'bullet', 'ul'], template: '- |' },
  { label: 'Lista numerada', detail: 'Lista ordenada', keywords: ['numerada', 'ordered', 'ol'], template: '1. |' },
  { label: 'Tarefa', detail: 'Checkbox', keywords: ['tarefa', 'checkbox', 'todo'], template: '- [ ] |' },
  { label: 'Citação', detail: 'Bloco de citação', keywords: ['citacao', 'quote', 'blockquote'], template: '> |' },
  { label: 'Código', detail: 'Bloco de código', keywords: ['codigo', 'code', 'fence'], template: '```\n|\n```' },
  { label: 'Divisória', detail: 'Linha horizontal', keywords: ['divisoria', 'hr', 'rule'], template: '---\n|' },
  { label: 'Tabela', detail: 'Tabela markdown', keywords: ['tabela', 'table'], template: '| | |\n| --- | --- |\n| | |' },
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
