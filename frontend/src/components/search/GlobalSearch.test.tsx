import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import { GlobalSearch } from './GlobalSearch';

vi.mock('../../api/search.api', () => ({
  globalSearch: vi.fn().mockResolvedValue({ tasks: [], notes: [], wiki: [] }),
}));

function renderSearch(onClose = vi.fn()) {
  return render(
    <MemoryRouter>
      <GlobalSearch spaceId="sp1" onClose={onClose} />
    </MemoryRouter>,
  );
}

describe('GlobalSearch', () => {
  it('exposes accessible dialog semantics', () => {
    renderSearch();
    const dialog = screen.getByRole('dialog', { name: /busca global/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('focuses the search input on open', () => {
    renderSearch();
    expect(screen.getByPlaceholderText(/buscar tarefas/i)).toHaveFocus();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    renderSearch(onClose);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('closes when the backdrop is clicked', () => {
    const onClose = vi.fn();
    renderSearch(onClose);
    // The dialog panel stops propagation; clicking it must NOT close.
    fireEvent.click(screen.getByRole('dialog', { name: /busca global/i }));
    expect(onClose).not.toHaveBeenCalled();
  });
});
