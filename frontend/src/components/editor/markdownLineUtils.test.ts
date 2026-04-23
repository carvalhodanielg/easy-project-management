import { describe, it, expect } from 'vitest';
import {
  splitLines,
  joinLines,
  getCursorLineIndex,
  lineStartOffset,
} from './markdownLineUtils';

describe('splitLines', () => {
  it('splits a single line', () => {
    expect(splitLines('hello')).toEqual(['hello']);
  });

  it('splits multiple lines', () => {
    expect(splitLines('a\nb\nc')).toEqual(['a', 'b', 'c']);
  });

  it('preserves empty lines', () => {
    expect(splitLines('a\n\nb')).toEqual(['a', '', 'b']);
  });

  it('handles empty string', () => {
    expect(splitLines('')).toEqual(['']);
  });
});

describe('joinLines', () => {
  it('joins single line', () => {
    expect(joinLines(['hello'])).toBe('hello');
  });

  it('joins multiple lines with newlines', () => {
    expect(joinLines(['a', 'b', 'c'])).toBe('a\nb\nc');
  });

  it('round-trips with splitLines', () => {
    const original = '# Heading\n\nSome **bold** text\n- item';
    expect(joinLines(splitLines(original))).toBe(original);
  });

  it('preserves empty lines on round-trip', () => {
    const original = 'a\n\nb';
    expect(joinLines(splitLines(original))).toBe(original);
  });
});

describe('getCursorLineIndex', () => {
  it('returns 0 for cursor at position 0', () => {
    expect(getCursorLineIndex('hello\nworld', 0)).toBe(0);
  });

  it('returns 0 for cursor in the middle of first line', () => {
    expect(getCursorLineIndex('hello\nworld', 3)).toBe(0);
  });

  it('returns 0 for cursor at end of first line', () => {
    expect(getCursorLineIndex('hello\nworld', 5)).toBe(0);
  });

  it('returns 1 for cursor at start of second line', () => {
    expect(getCursorLineIndex('hello\nworld', 6)).toBe(1);
  });

  it('returns 1 for cursor in the middle of second line', () => {
    expect(getCursorLineIndex('hello\nworld', 8)).toBe(1);
  });

  it('returns 2 for cursor on third line', () => {
    expect(getCursorLineIndex('a\nb\nc', 4)).toBe(2);
  });

  it('handles cursor at end of document', () => {
    expect(getCursorLineIndex('a\nb', 3)).toBe(1);
  });

  it('handles single-line document', () => {
    expect(getCursorLineIndex('hello', 3)).toBe(0);
  });
});

describe('lineStartOffset', () => {
  it('returns 0 for line index 0', () => {
    expect(lineStartOffset(['hello', 'world'], 0)).toBe(0);
  });

  it('returns correct offset for second line', () => {
    // 'hello' = 5 chars + 1 newline = 6
    expect(lineStartOffset(['hello', 'world'], 1)).toBe(6);
  });

  it('returns correct offset for third line', () => {
    // 'a\n' = 2, 'bb\n' = 3, total = 5
    expect(lineStartOffset(['a', 'bb', 'ccc'], 2)).toBe(5);
  });

  it('handles empty lines', () => {
    // '' = 0 chars + '\n' = 1
    expect(lineStartOffset(['', 'world'], 1)).toBe(1);
  });

  it('returns 0 for single-line document', () => {
    expect(lineStartOffset(['hello'], 0)).toBe(0);
  });
});
