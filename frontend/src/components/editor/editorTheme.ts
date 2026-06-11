import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

/** CodeMirror theme mapped to the app's CSS variables (works in light/dark). */
export const editorTheme = EditorView.theme({
  '&': {
    color: 'var(--color-ink)',
    backgroundColor: 'transparent',
    fontSize: '14px',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'inherit', lineHeight: '1.7' },
  '.cm-content': {
    fontFamily: 'inherit',
    padding: '8px 0',
    caretColor: 'var(--color-ink)',
  },
  '.cm-line': { padding: '0 12px' },
  '.cm-cursor': { borderLeftColor: 'var(--color-ink)' },
  '.cm-placeholder': { color: 'var(--color-ink-muted)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'color-mix(in srgb, var(--color-brand) 25%, transparent)',
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-line)',
    borderRadius: '3px',
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  },
  '.cm-tooltip-autocomplete > ul': {
    fontFamily: 'inherit',
    maxHeight: '16em',
    maxWidth: '320px',
    padding: '6px',
  },
  '.cm-tooltip-autocomplete > ul > li': {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '7px 11px',
    borderRadius: '2px',
    color: 'var(--color-ink)',
    lineHeight: '1.3',
  },
  '.cm-tooltip-autocomplete > ul > li:hover': {
    backgroundColor: 'color-mix(in srgb, var(--color-brand) 12%, transparent)',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--color-brand)',
    color: '#fff',
  },
  '.cm-completionLabel': {
    flex: '1',
    minWidth: '0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontWeight: '400',
  },
  // Neutralize the CodeMirror base theme's bold/underline on the matched query text.
  '.cm-completionMatchedText': { fontWeight: 'inherit', textDecoration: 'none' },
  '.cm-completionDetail': {
    color: 'var(--color-ink-dim)',
    fontStyle: 'normal',
    marginLeft: 'auto',
    flex: '0 0 auto',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected] .cm-completionDetail': {
    color: 'rgba(255,255,255,0.7)',
  },

  /* Shared dropdown leading line icon for mentions, tasks and `/` blocks
     (lucide-style, monochrome; emitted by renderCompletionBadge) */
  '.cm-block-icon': {
    flex: '0 0 auto',
    width: '22px',
    height: '22px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-ink-dim)',
  },
  '.cm-block-icon svg': { width: '15px', height: '15px' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected] .cm-block-icon': { color: '#fff' },

  /* Live-preview embedded image */
  '.cm-md-image': {
    maxWidth: '100%',
    maxHeight: '320px',
    borderRadius: '8px',
    display: 'block',
    margin: '2px 0',
  },

  /* Live-preview clickable task checkbox */
  '.cm-md-checkbox': {
    cursor: 'pointer',
    accentColor: 'var(--color-brand)',
    verticalAlign: 'middle',
    margin: '0 2px',
  },

  /* Live-preview fenced code block */
  '.cm-md-codeblock': {
    backgroundColor: 'var(--color-lift)',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.85em',
    borderLeft: '1px solid var(--color-line)',
    borderRight: '1px solid var(--color-line)',
  },
  '.cm-md-codeblock-first': {
    borderTop: '1px solid var(--color-line)',
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px',
    paddingTop: '2px',
  },
  '.cm-md-codeblock-last': {
    borderBottom: '1px solid var(--color-line)',
    borderBottomLeftRadius: '8px',
    borderBottomRightRadius: '8px',
    paddingBottom: '2px',
  },

  /* Live-preview content styling (classes emitted by livePreview.ts) */
  '.cm-md-bold': { fontWeight: '700' },
  '.cm-md-italic': { fontStyle: 'italic' },
  '.cm-md-strike': { textDecoration: 'line-through' },
  '.cm-md-code': {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.85em',
    backgroundColor: 'var(--color-lift)',
    borderRadius: '3px',
    padding: '0.1em 0.3em',
  },
  '.cm-md-h1': { fontSize: '1.5em', fontWeight: '700', lineHeight: '1.3' },
  '.cm-md-h2': { fontSize: '1.3em', fontWeight: '700', lineHeight: '1.3' },
  '.cm-md-h3': { fontSize: '1.15em', fontWeight: '600' },
  '.cm-md-h4': { fontWeight: '600' },
  '.cm-md-h5': { fontWeight: '600' },
  '.cm-md-h6': { fontWeight: '600' },
});

/** Syntax coloring for source/live modes. */
export const editorHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: t.heading, fontWeight: '700', color: 'var(--color-ink)' },
    { tag: t.strong, fontWeight: '700' },
    { tag: t.emphasis, fontStyle: 'italic' },
    { tag: t.strikethrough, textDecoration: 'line-through' },
    { tag: t.monospace, fontFamily: "'JetBrains Mono', monospace", color: 'var(--color-brand-hi)' },
    { tag: [t.link, t.url], color: 'var(--color-brand-hi)', textDecoration: 'underline' },
    { tag: t.processingInstruction, color: 'var(--color-ink-dim)' },
    { tag: t.quote, color: 'var(--color-ink-dim)' },
    { tag: t.keyword, color: 'var(--color-brand-hi)' },
    { tag: t.string, color: 'var(--color-s-done)' },
    { tag: t.comment, color: 'var(--color-ink-dim)', fontStyle: 'italic' },
    { tag: [t.number, t.bool], color: 'var(--color-p-high)' },
  ]),
);
