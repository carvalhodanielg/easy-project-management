import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import { TaskRow } from './TaskRow';
import type { Task } from '../../types/task.types';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn(), useParams: () => ({ spaceId: 'sp1' }) };
});

const TASK: Task = {
  _id: 't1',
  name: 'Implementar autenticação',
  status: 'em_progresso',
  priority: 'alta',
  storyPoints: 5,
  dueDate: null,
  assignees: [{ _id: 'u1', email: 'a@b.com', displayName: 'Alice', avatarUrl: null }],
  tags: [{ _id: 'tg1', name: 'Backend', color: '#6366F1', spaceId: 'sp1' }],
  subtaskCount: 0,
  blockedBy: [],
  blocks: [],
  description: '',
  parentTask: null,
  listId: 'l1',
  sprintId: null,
  createdAt: '',
  updatedAt: '',
};

function renderRow(task: Task = TASK, props = {}) {
  return render(
    <MemoryRouter initialEntries={['/spaces/sp1']}>
      <Routes>
        <Route path="/spaces/:spaceId" element={<TaskRow task={task} {...props} />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TaskRow', () => {
  it('renders task name', () => {
    renderRow();
    expect(screen.getByText('Implementar autenticação')).toBeInTheDocument();
  });

  it('renders assignee avatar initial', () => {
    renderRow();
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders tag', () => {
    renderRow();
    expect(screen.getByText('Backend')).toBeInTheDocument();
  });

  it('renders story points', () => {
    renderRow();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows expand button when onToggleExpand is provided', () => {
    const onToggle = vi.fn();
    renderRow({ ...TASK, subtaskCount: 2 }, { onToggleExpand: onToggle });
    const btn = screen.getByRole('button', { name: /expandir|recolher/i });
    expect(btn).toBeInTheDocument();
  });

  it('calls onToggleExpand when toggle button clicked', () => {
    const onToggle = vi.fn();
    renderRow({ ...TASK, subtaskCount: 2 }, { onToggleExpand: onToggle, isExpanded: false });
    const btn = screen.getByRole('button', { name: /expandir/i });
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalled();
  });

  it('shows overdue date in red class', () => {
    const pastTask = { ...TASK, dueDate: '2020-06-15T12:00:00.000Z' };
    renderRow(pastTask);
    const dateEl = screen.getByText(/jun/i);
    expect(dateEl.className).toContain('danger');
  });

  it('shows checkbox when onSelect is provided', () => {
    const onSelect = vi.fn();
    renderRow(TASK, { onSelect, isSelected: false });
    expect(screen.getByRole('button', { name: /selecionar/i })).toBeInTheDocument();
  });

  it('calls onSelect when checkbox clicked', () => {
    const onSelect = vi.fn();
    renderRow(TASK, { onSelect, isSelected: false });
    const btn = screen.getByRole('button', { name: /selecionar/i });
    fireEvent.click(btn);
    expect(onSelect).toHaveBeenCalledWith('t1', 'main');
  });

  it('shows selected state when isSelected is true', () => {
    const onSelect = vi.fn();
    renderRow(TASK, { onSelect, isSelected: true });
    expect(screen.getByRole('button', { name: /desmarcar/i })).toBeInTheDocument();
  });
});
