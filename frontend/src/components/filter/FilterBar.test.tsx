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

  it('offers a "Por épico" grouping option and reports it on change', () => {
    render(<FilterBar {...DEFAULT_PROPS} />);
    const groupSelect = screen.getByDisplayValue('Sem agrupamento');
    expect(
      screen.getByRole('option', { name: 'Por épico' }),
    ).toBeInTheDocument();
    fireEvent.change(groupSelect, { target: { value: 'epic' } });
    expect(DEFAULT_PROPS.onSetGroupBy).toHaveBeenCalledWith('epic');
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
});
