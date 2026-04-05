import { render, screen, fireEvent } from '@testing-library/react';
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
  includeSubtasks: false,
};

const DEFAULT_PROPS = {
  filters: DEFAULT_FILTERS,
  onToggleStatus: vi.fn(),
  onTogglePriority: vi.fn(),
  onToggleAssignee: vi.fn(),
  onToggleTag: vi.fn(),
  onSetGroupBy: vi.fn(),
  onSetSearch: vi.fn(),
  onToggleSubtasks: vi.fn(),
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

  it('calls onSetSearch when user types', () => {
    render(<FilterBar {...DEFAULT_PROPS} />);
    fireEvent.change(screen.getByPlaceholderText(/buscar tarefas/i), {
      target: { value: 'auth' },
    });
    expect(DEFAULT_PROPS.onSetSearch).toHaveBeenCalledWith('auth');
  });

  it('calls onToggleSubtasks when checkbox clicked', () => {
    render(<FilterBar {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(DEFAULT_PROPS.onToggleSubtasks).toHaveBeenCalled();
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
});
