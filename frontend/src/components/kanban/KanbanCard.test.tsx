import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KanbanCard } from './KanbanCard';
import type { Task } from '../../types/task.types';

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useParams: () => ({ spaceId: 'sp1' }),
}));
vi.mock('@dnd-kit/core', () => ({
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

describe('KanbanCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exposes the task as a labelled button', () => {
    render(<KanbanCard task={task()} />);
    expect(screen.getByRole('button', { name: 'Minha tarefa' })).toBeInTheDocument();
  });

  it('opens the task when Enter is pressed on the card', () => {
    render(<KanbanCard task={task()} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Minha tarefa' }), { key: 'Enter' });
    expect(navigate).toHaveBeenCalledWith('/spaces/sp1/tasks/t1');
  });

  it('labels the drag handle', () => {
    render(<KanbanCard task={task()} />);
    expect(screen.getByRole('button', { name: 'Arrastar Minha tarefa' })).toBeInTheDocument();
  });
});
