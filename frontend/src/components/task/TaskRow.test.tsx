import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { TaskRow } from './TaskRow';
import { Task } from '../../types/task.types';

const mockTask: Task = {
  _id: 'task-1',
  spaceId: 'space-1',
  listId: 'list-1',
  sprintId: null,
  name: 'Fix login bug',
  description: '',
  status: 'pendente',
  priority: 'alta',
  assignees: [{ _id: 'u1', email: 'dev@test.com', displayName: 'Dev User', avatarUrl: null }],
  startDate: null,
  dueDate: null,
  tags: [],
  storyPoints: 8,
  parentTask: null,
  blockedBy: [],
  blocks: [],
  position: 0,
  createdBy: 'u1',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

function renderRow(task: Task) {
  return render(
    <MemoryRouter initialEntries={['/spaces/space-1/lists/list-1']}>
      <Routes>
        <Route path="/spaces/:spaceId/lists/:listId" element={<TaskRow task={task} />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TaskRow', () => {
  it('renders task name', () => {
    renderRow(mockTask);
    expect(screen.getByText('Fix login bug')).toBeInTheDocument();
  });

  it('renders story points', () => {
    renderRow(mockTask);
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    renderRow(mockTask);
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });

  it('renders assignee avatar initial', () => {
    renderRow(mockTask);
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('renders task with no story points', () => {
    renderRow({ ...mockTask, storyPoints: null });
    expect(screen.queryByText('8')).not.toBeInTheDocument();
  });

  it('renders expand toggle when onToggleExpand is provided', () => {
    render(
      <MemoryRouter initialEntries={['/spaces/space-1/lists/list-1']}>
        <Routes>
          <Route path="/spaces/:spaceId/lists/:listId" element={<TaskRow task={mockTask} onToggleExpand={vi.fn()} isExpanded={false} />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /expand subtasks/i })).toBeInTheDocument();
  });

  it('does not render expand toggle by default', () => {
    renderRow(mockTask);
    expect(screen.queryByRole('button', { name: /expand subtasks/i })).not.toBeInTheDocument();
  });

  it('shows a date element colored red for overdue tasks', () => {
    const overdueTask = { ...mockTask, dueDate: '2020-06-15T12:00:00.000Z' };
    const { container } = renderRow(overdueTask);
    // jsdom converts hex to rgb; check any span has the overdue color
    const spans = container.querySelectorAll('span');
    const overdueDateSpan = Array.from(spans).find(
      (el) => el.style.color === 'rgb(255, 77, 79)',
    );
    expect(overdueDateSpan).toBeDefined();
  });
});
