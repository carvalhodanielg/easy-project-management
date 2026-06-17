import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { KanbanColumn } from './KanbanColumn';
import type { Task } from '../../types/task.types';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ spaceId: 'sp1' }),
}));
vi.mock('@dnd-kit/core', () => ({
  useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  }),
}));

const task = (over: Partial<Task> = {}): Task =>
  ({
    _id: 't1',
    name: 'Minha tarefa',
    status: 'pendente',
    priority: 'normal',
    storyPoints: null,
    tags: [],
    assignees: [],
    dueDate: null,
    ...over,
  } as unknown as Task);

describe('KanbanColumn', () => {
  it('shows an empty state when the column has no tasks', () => {
    render(<KanbanColumn status="pendente" tasks={[]} />);
    expect(screen.getByText(/sem tarefas/i)).toBeInTheDocument();
  });

  it('does not show the empty state when there are tasks', () => {
    render(<KanbanColumn status="pendente" tasks={[task()]} />);
    expect(screen.queryByText(/sem tarefas/i)).not.toBeInTheDocument();
    expect(screen.getByText('Minha tarefa')).toBeInTheDocument();
  });
});
