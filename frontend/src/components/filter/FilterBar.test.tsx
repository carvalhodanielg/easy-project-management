import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FilterBar } from './FilterBar';
import { FilterState } from '../../hooks/useTaskFilter';

const emptyFilters: FilterState = {
  status: [],
  priority: [],
  assignees: [],
  tags: [],
  groupBy: undefined,
  includeSubtasks: false,
  q: '',
};

const defaultProps = {
  filters: emptyFilters,
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
  it('renders search input', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search tasks...')).toBeInTheDocument();
  });

  it('calls onSetSearch when typing', () => {
    render(<FilterBar {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('Search tasks...'), { target: { value: 'bug' } });
    expect(defaultProps.onSetSearch).toHaveBeenCalledWith('bug');
  });

  it('shows filter popover when Filters button is clicked', () => {
    render(<FilterBar {...defaultProps} />);
    fireEvent.click(screen.getByText(/Filters/));
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
  });

  it('calls onToggleStatus when a status chip is clicked', () => {
    render(<FilterBar {...defaultProps} />);
    fireEvent.click(screen.getByText(/Filters/));
    fireEvent.click(screen.getByRole('button', { name: 'Pendente' }));
    expect(defaultProps.onToggleStatus).toHaveBeenCalledWith('pendente');
  });

  it('calls onTogglePriority when a priority chip is clicked', () => {
    render(<FilterBar {...defaultProps} />);
    fireEvent.click(screen.getByText(/Filters/));
    fireEvent.click(screen.getByRole('button', { name: 'Alta' }));
    expect(defaultProps.onTogglePriority).toHaveBeenCalledWith('alta');
  });

  it('shows member and tag options when provided', () => {
    render(
      <FilterBar
        {...defaultProps}
        members={[{ _id: 'u1', displayName: 'Alice' }]}
        tags={[{ _id: 't1', name: 'bug', color: '#FF0000' }]}
      />,
    );
    fireEvent.click(screen.getByText(/Filters/));
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('bug')).toBeInTheDocument();
  });

  it('calls onToggleAssignee when member chip is clicked', () => {
    const onToggleAssignee = vi.fn();
    render(
      <FilterBar
        {...defaultProps}
        onToggleAssignee={onToggleAssignee}
        members={[{ _id: 'u1', displayName: 'Alice' }]}
      />,
    );
    fireEvent.click(screen.getByText(/Filters/));
    fireEvent.click(screen.getByText('Alice'));
    expect(onToggleAssignee).toHaveBeenCalledWith('u1');
  });

  it('shows Clear button only when isActive', () => {
    const { rerender } = render(<FilterBar {...defaultProps} isActive={false} />);
    expect(screen.queryByText('Clear')).not.toBeInTheDocument();

    rerender(<FilterBar {...defaultProps} isActive={true} />);
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('calls onReset when Clear is clicked', () => {
    const onReset = vi.fn();
    render(<FilterBar {...defaultProps} isActive={true} onReset={onReset} />);
    fireEvent.click(screen.getByText('Clear'));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('calls onSetGroupBy when group select changes', () => {
    render(<FilterBar {...defaultProps} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'status' } });
    expect(defaultProps.onSetGroupBy).toHaveBeenCalledWith('status');
  });

  it('calls onToggleSubtasks when checkbox changes', () => {
    render(<FilterBar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText(/Subtasks/));
    expect(defaultProps.onToggleSubtasks).toHaveBeenCalledTimes(1);
  });

  it('closes popover when Done is clicked', () => {
    render(<FilterBar {...defaultProps} />);
    fireEvent.click(screen.getByText(/Filters/));
    expect(screen.getByText('Status')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByText('Status')).not.toBeInTheDocument();
  });
});
