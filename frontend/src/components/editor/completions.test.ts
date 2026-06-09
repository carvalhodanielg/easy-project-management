import { describe, it, expect, vi } from 'vitest';
import { CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import {
  mentionCompletionSource,
  taskCompletionSource,
  slashCompletionSource,
  resolveTemplate,
  SLASH_BLOCKS,
  type MentionMember,
  type TaskRef,
} from './completions';

function ctx(doc: string, pos = doc.length, explicit = false) {
  const state = EditorState.create({ doc });
  return new CompletionContext(state, pos, explicit);
}

const MEMBERS: MentionMember[] = [
  { _id: 'u1', displayName: 'Daniel Carvalho' },
  { _id: 'u2', displayName: 'Ana Souza' },
];

describe('mentionCompletionSource', () => {
  it('returns null when there is no @ before the cursor', () => {
    const src = mentionCompletionSource(() => MEMBERS);
    expect(src(ctx('hello world'))).toBeNull();
  });

  it('filters members by the query after @ and inserts a mention link', () => {
    const src = mentionCompletionSource(() => MEMBERS);
    const res = src(ctx('oi @dan')) as CompletionResult;
    expect(res).not.toBeNull();
    expect(res.from).toBe(3);
    expect(res.options).toHaveLength(1);
    expect(res.options[0].apply).toBe('[@Daniel Carvalho](mention:u1) ');
  });

  it('lists all members on a bare @', () => {
    const src = mentionCompletionSource(() => MEMBERS);
    const res = src(ctx('@', 1, true)) as CompletionResult;
    expect(res.options).toHaveLength(2);
  });
});

describe('taskCompletionSource', () => {
  const TASKS: TaskRef[] = [{ _id: 't1', name: 'Corrigir login' }];

  it('does not trigger for a # at the start of a line (heading)', async () => {
    const fetchTasks = vi.fn(async () => TASKS);
    const src = taskCompletionSource(fetchTasks);
    expect(await src(ctx('# Tit'))).toBeNull();
    expect(fetchTasks).not.toHaveBeenCalled();
  });

  it('fetches tasks for a mid-line # and inserts a task link', async () => {
    const fetchTasks = vi.fn(async (q: string) => {
      expect(q).toBe('login');
      return TASKS;
    });
    const src = taskCompletionSource(fetchTasks);
    const res = (await src(ctx('ver #login'))) as CompletionResult;
    expect(res).not.toBeNull();
    expect(res.options[0].apply).toBe('[Corrigir login](task:t1) ');
  });
});

describe('slashCompletionSource', () => {
  it('triggers only when / is first non-space char of the line', () => {
    const src = slashCompletionSource();
    expect(src(ctx('texto /'))).toBeNull();
    const res = src(ctx('/')) as CompletionResult;
    expect(res).not.toBeNull();
    expect(res.options.length).toBe(SLASH_BLOCKS.length);
  });

  it('filters blocks by label/keyword', () => {
    const src = slashCompletionSource();
    const res = src(ctx('/cod')) as CompletionResult;
    expect(res.options).toHaveLength(1);
    expect(res.options[0].label).toBe('Código');
  });
});

describe('resolveTemplate', () => {
  it('extracts the cursor offset from the | marker', () => {
    expect(resolveTemplate('# |')).toEqual({ insert: '# ', cursor: 2 });
  });

  it('places the cursor inside a code fence', () => {
    const { insert, cursor } = resolveTemplate('```\n|\n```');
    expect(insert).toBe('```\n\n```');
    expect(cursor).toBe(4);
  });
});
