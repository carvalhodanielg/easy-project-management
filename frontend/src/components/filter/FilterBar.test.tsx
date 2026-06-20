import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { FilterBar } from './FilterBar';
import type { FilterState } from '../../hooks/useTaskFilter';

const DEFAULT_FILTERS: FilterState = {
  q: '',
  status: [],
  priority: [],
  assignees: [],
  tags: [],
  groupBy: undefined,
  subtaskMode: 'collapsed',
};

const DEFAULT_PROPS = {
  filters: DEFAULT_FILTERS,
  onToggleStatus: vi.fn(),
  onTogglePriority: vi.fn(),
  onToggleAssignee: vi.fn(),
  onToggleTag: vi.fn(),
  onSetGroupBy: vi.fn(),
  onSetSearch: vi.fn(),
  onSetSubtaskMode: vi.fn(),
  onReset: vi.fn(),
  isActive: false,
};

describe('FilterBar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders search input', () => {
    render(<FilterBar {...DEFAULT_PROPS} />);
    expect(screen.getByPlaceholderText(/buscar tarefas/i)).toBeInTheDocument();
  });

  it('renders filter button', () => {
    render(<FilterBar {...DEFAULT_PROPS} />);
    expect(screen.getByText('Filtros')).toBeInTheDocument();
  });

  it('calls onSetSearch (debounced) when user types', () => {
    vi.useFakeTimers();
    try {
      render(<FilterBar {...DEFAULT_PROPS} />);
      fireEvent.change(screen.getByPlaceholderText(/buscar tarefas/i), {
        target: { value: 'auth' },
      });
      // Debounced: not fired immediately.
      expect(DEFAULT_PROPS.onSetSearch).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(DEFAULT_PROPS.onSetSearch).toHaveBeenCalledWith('auth');
    } finally {
      vi.useRealTimers();
    }
  });

  it('calls onSetSubtaskMode when subtask mode changes', () => {
    render(<FilterBar {...DEFAULT_PROPS} />);
    fireEvent.change(screen.getByDisplayValue('Recolhidas'), {
      target: { value: 'separated' },
    });
    expect(DEFAULT_PROPS.onSetSubtaskMode).toHaveBeenCalledWith('separated');
  });

  it('shows clear button when filters are active', () => {
    render(<FilterBar {...DEFAULT_PROPS} isActive={true} />);
    expect(screen.getByText(/limpar/i)).toBeInTheDocument();
  });

  it('calls onReset when clear button clicked', () => {
    render(<FilterBar {...DEFAULT_PROPS} isActive={true} />);
    fireEvent.click(screen.getByText(/limpar/i));
    expect(DEFAULT_PROPS.onReset).toHaveBeenCalled();
  });

  it('shows active status chips', () => {
    render(
      <FilterBar
        {...DEFAULT_PROPS}
        filters={{ ...DEFAULT_FILTERS, status: ['pendente'] }}
        isActive={true}
      />,
    );
    expect(screen.getByText(/pendente/i)).toBeInTheDocument();
  });

  // ── Grupo A: seção Responsável no dropdown ──────────────────────────────

  it('does NOT show assignee section when members prop is absent', () => {
    render(<FilterBar {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByText('Filtros'));
    expect(screen.queryByText('Responsável')).not.toBeInTheDocument();
  });

  it('shows assignee section in dropdown when members are provided', () => {
    const members = [
      { _id: 'u1', displayName: 'Alice' },
      { _id: 'u2', displayName: 'Bob' },
    ];
    render(<FilterBar {...DEFAULT_PROPS} members={members} />);
    fireEvent.click(screen.getByText('Filtros'));
    expect(screen.getByText('Responsável')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('calls onToggleAssignee with member id when clicked', () => {
    const members = [{ _id: 'u1', displayName: 'Alice' }];
    render(<FilterBar {...DEFAULT_PROPS} members={members} />);
    fireEvent.click(screen.getByText('Filtros'));
    fireEvent.click(screen.getByText('Alice'));
    expect(DEFAULT_PROPS.onToggleAssignee).toHaveBeenCalledWith('u1');
  });

  it('marks member button as active when id is in filters.assignees', () => {
    const members = [
      { _id: 'u1', displayName: 'Alice' },
      { _id: 'u2', displayName: 'Bob' },
    ];
    render(
      <FilterBar
        {...DEFAULT_PROPS}
        members={members}
        filters={{ ...DEFAULT_FILTERS, assignees: ['u1'] }}
      />,
    );
    fireEvent.click(screen.getByText('Filtros'));
    // When the dropdown is open AND a chip is also rendered, 'Alice' appears twice.
    // The dropdown button is always the last match in DOM order (chip comes first in the flex bar).
    const allAlice = screen.getAllByText('Alice');
    const allBob = screen.getAllByText('Bob');
    const aliceDropdownBtn = allAlice[allAlice.length - 1].closest('button')!;
    const bobDropdownBtn = allBob[allBob.length - 1].closest('button')!;
    expect(aliceDropdownBtn).toHaveClass('text-brand');
    expect(bobDropdownBtn).not.toHaveClass('text-brand');
  });

  // ── Grupo B: chips de responsável ativo ────────────────────────────────

  it('does not show assignee chip when assignees set but members prop absent', () => {
    render(
      <FilterBar
        {...DEFAULT_PROPS}
        filters={{ ...DEFAULT_FILTERS, assignees: ['u1'] }}
        isActive={true}
      />,
    );
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('shows assignee chip for each selected assignee when members provided', () => {
    const members = [
      { _id: 'u1', displayName: 'Alice' },
      { _id: 'u2', displayName: 'Bob' },
    ];
    render(
      <FilterBar
        {...DEFAULT_PROPS}
        members={members}
        filters={{ ...DEFAULT_FILTERS, assignees: ['u1', 'u2'] }}
        isActive={true}
      />,
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows chip only for selected assignees', () => {
    const members = [
      { _id: 'u1', displayName: 'Alice' },
      { _id: 'u2', displayName: 'Bob' },
    ];
    render(
      <FilterBar
        {...DEFAULT_PROPS}
        members={members}
        filters={{ ...DEFAULT_FILTERS, assignees: ['u1'] }}
        isActive={true}
      />,
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });

  it('calls onToggleAssignee when assignee chip is clicked', () => {
    const members = [{ _id: 'u1', displayName: 'Alice' }];
    render(
      <FilterBar
        {...DEFAULT_PROPS}
        members={members}
        filters={{ ...DEFAULT_FILTERS, assignees: ['u1'] }}
        isActive={true}
      />,
    );
    fireEvent.click(screen.getByText('Alice').closest('button')!);
    expect(DEFAULT_PROPS.onToggleAssignee).toHaveBeenCalledWith('u1');
  });
});
