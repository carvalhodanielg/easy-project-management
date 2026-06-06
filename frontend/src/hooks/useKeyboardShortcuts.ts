import { useEffect, useRef } from 'react';

export type ShortcutHandler = (event: KeyboardEvent) => void;

/**
 * Map of normalized key → handler. Keys are matched case-insensitively
 * (compared in lower-case), e.g. `n`, `f`, `?`, `escape`.
 */
export type ShortcutMap = Record<string, ShortcutHandler>;

interface Options {
  /** When false, no shortcuts fire. Defaults to true. */
  enabled?: boolean;
}

/** Keys that are allowed to fire even while the user is typing in a field. */
const ALWAYS_ALLOWED = new Set(['escape']);

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  // jsdom doesn't always reflect `isContentEditable`; fall back to the attribute.
  const editable = target.getAttribute('contenteditable');
  if (editable === '' || editable === 'true' || editable === 'plaintext-only') return true;
  return false;
}

/**
 * Registers global keyboard shortcuts.
 *
 * Single-key shortcuts are suppressed while the user is typing in an input,
 * textarea, select or contenteditable element, and when a modifier key
 * (ctrl/meta/alt) is held — so they never clash with browser shortcuts.
 * `Escape` is always allowed, even from within a field.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap, options: Options = {}) {
  const { enabled = true } = options;
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      // Modifier-held combos are left to the browser / other handlers.
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const key = event.key.toLowerCase();
      const handler = shortcutsRef.current[key];
      if (!handler) return;

      if (!ALWAYS_ALLOWED.has(key) && isTypingTarget(event.target)) return;

      event.preventDefault();
      handler(event);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
