import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

/** Dispatch a keydown event, optionally targeting a specific element. */
function press(
  key: string,
  opts: {
    target?: EventTarget;
    ctrlKey?: boolean;
    metaKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
  } = {},
) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ctrlKey: opts.ctrlKey,
    metaKey: opts.metaKey,
    altKey: opts.altKey,
    shiftKey: opts.shiftKey,
  });
  const target = opts.target ?? document.body;
  target.dispatchEvent(event);
  return event;
}

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('fires the handler mapped to a single key', () => {
    const onN = vi.fn();
    renderHook(() => useKeyboardShortcuts({ n: onN }));

    press('n');

    expect(onN).toHaveBeenCalledTimes(1);
  });

  it('matches keys case-insensitively (uppercase N)', () => {
    const onN = vi.fn();
    renderHook(() => useKeyboardShortcuts({ n: onN }));

    press('N');

    expect(onN).toHaveBeenCalledTimes(1);
  });

  it('fires distinct handlers for distinct keys', () => {
    const onN = vi.fn();
    const onF = vi.fn();
    const onHelp = vi.fn();
    const onEsc = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({ n: onN, f: onF, '?': onHelp, escape: onEsc }),
    );

    press('f');
    press('?');
    press('Escape');

    expect(onN).not.toHaveBeenCalled();
    expect(onF).toHaveBeenCalledTimes(1);
    expect(onHelp).toHaveBeenCalledTimes(1);
    expect(onEsc).toHaveBeenCalledTimes(1);
  });

  it('does nothing for an unmapped key', () => {
    const onN = vi.fn();
    renderHook(() => useKeyboardShortcuts({ n: onN }));

    expect(() => press('z')).not.toThrow();
    expect(onN).not.toHaveBeenCalled();
  });

  it('ignores keydown originating from an <input>', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    const onN = vi.fn();
    renderHook(() => useKeyboardShortcuts({ n: onN }));

    press('n', { target: input });

    expect(onN).not.toHaveBeenCalled();
  });

  it('ignores keydown originating from a <textarea>', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    const onN = vi.fn();
    renderHook(() => useKeyboardShortcuts({ n: onN }));

    press('n', { target: textarea });

    expect(onN).not.toHaveBeenCalled();
  });

  it('ignores keydown originating from a <select>', () => {
    const select = document.createElement('select');
    document.body.appendChild(select);
    const onN = vi.fn();
    renderHook(() => useKeyboardShortcuts({ n: onN }));

    press('n', { target: select });

    expect(onN).not.toHaveBeenCalled();
  });

  it('ignores keydown originating from a contenteditable element', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    document.body.appendChild(div);
    const onN = vi.fn();
    renderHook(() => useKeyboardShortcuts({ n: onN }));

    press('n', { target: div });

    expect(onN).not.toHaveBeenCalled();
  });

  it('ignores single-key shortcuts when ctrl/meta/alt is held', () => {
    const onN = vi.fn();
    renderHook(() => useKeyboardShortcuts({ n: onN }));

    press('n', { ctrlKey: true });
    press('n', { metaKey: true });
    press('n', { altKey: true });

    expect(onN).not.toHaveBeenCalled();
  });

  it('still fires when only shift is held (needed for "?")', () => {
    const onHelp = vi.fn();
    renderHook(() => useKeyboardShortcuts({ '?': onHelp }));

    press('?', { shiftKey: true });

    expect(onHelp).toHaveBeenCalledTimes(1);
  });

  it('prevents default when a handler fires', () => {
    renderHook(() => useKeyboardShortcuts({ n: vi.fn() }));

    const event = press('n');

    expect(event.defaultPrevented).toBe(true);
  });

  it('still fires Escape even when the target is an input', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    const onEsc = vi.fn();
    renderHook(() => useKeyboardShortcuts({ escape: onEsc }));

    press('Escape', { target: input });

    expect(onEsc).toHaveBeenCalledTimes(1);
  });

  it('removes the listener on unmount', () => {
    const onN = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts({ n: onN }));

    unmount();
    press('n');

    expect(onN).not.toHaveBeenCalled();
  });

  it('does not fire disabled shortcuts', () => {
    const onN = vi.fn();
    renderHook(() => useKeyboardShortcuts({ n: onN }, { enabled: false }));

    press('n');

    expect(onN).not.toHaveBeenCalled();
  });
});
