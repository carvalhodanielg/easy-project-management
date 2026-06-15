import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useModalA11y } from './useModalA11y';

function Dialog({ onClose }: { onClose: () => void }) {
  const ref = useModalA11y<HTMLDivElement>(onClose);
  return (
    <div ref={ref} role="dialog" aria-modal="true" tabIndex={-1} aria-label="Test dialog">
      <button>first</button>
      <button>middle</button>
      <button>last</button>
    </div>
  );
}

describe('useModalA11y', () => {
  it('moves focus to the first focusable element on open', () => {
    render(<Dialog onClose={vi.fn()} />);
    expect(screen.getByText('first')).toHaveFocus();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<Dialog onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('traps Tab from the last element back to the first', () => {
    render(<Dialog onClose={vi.fn()} />);
    screen.getByText('last').focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByText('first')).toHaveFocus();
  });

  it('traps Shift+Tab from the first element to the last', () => {
    render(<Dialog onClose={vi.fn()} />);
    screen.getByText('first').focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(screen.getByText('last')).toHaveFocus();
  });

  it('returns focus to the opener when it unmounts', () => {
    const opener = document.createElement('button');
    opener.textContent = 'opener';
    document.body.appendChild(opener);
    opener.focus();
    expect(opener).toHaveFocus();

    const { unmount } = render(<Dialog onClose={vi.fn()} />);
    expect(screen.getByText('first')).toHaveFocus();

    unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });
});
