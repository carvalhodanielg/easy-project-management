import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ShortcutsModal } from './ShortcutsModal';

describe('ShortcutsModal', () => {
  it('lists the available keyboard shortcuts', () => {
    render(<ShortcutsModal onClose={vi.fn()} />);

    expect(
      screen.getByRole('heading', { name: /atalhos de teclado/i }),
    ).toBeInTheDocument();
    // The four shortcut keys should be shown.
    expect(screen.getByText('N')).toBeInTheDocument();
    expect(screen.getByText('F')).toBeInTheDocument();
    expect(screen.getByText('?')).toBeInTheDocument();
    expect(screen.getByText('Esc')).toBeInTheDocument();
    // And their descriptions (Portuguese).
    expect(screen.getByText(/nova tarefa/i)).toBeInTheDocument();
    expect(screen.getByText(/filtros/i)).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<ShortcutsModal onClose={onClose} />);

    fireEvent.click(screen.getByLabelText(/fechar/i));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<ShortcutsModal onClose={onClose} />);

    fireEvent.click(screen.getByTestId('shortcuts-modal-backdrop'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
