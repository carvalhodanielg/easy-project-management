import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SortableSubtaskRow } from './SortableSubtaskRow';
import type { Task } from '../../types/task.types';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn(), useParams: () => ({ spaceId: 'sp1' }) };
});

vi.mock('../../api/tasks.api', () => ({
  getSubtasks: vi.fn().mockResolvedValue([]),
  updateTask: vi.fn(),
}));

const SUBTASK: Task = {
  _id: 's1',
  name: 'Subtarefa de teste',
  status: 'pendente',
  priority: 'normal',
  storyPoints: null,
  dueDate: null,
  assignees: [],
  tags: [],
  subtaskCount: 0,
  blockedBy: [],
  blocks: [],
  description: '',
  parentTask: 't1',
  listId: 'l1',
  sprintId: null,
  position: 0,
  createdBy: 'u1',
  createdAt: '',
  updatedAt: '',
};

function renderSortable(task: Task = SUBTASK) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/spaces/sp1']}>
        <Routes>
          <Route
            path="/spaces/:spaceId"
            element={
              <DndContext>
                <SortableContext items={[task._id]} strategy={verticalListSortingStrategy}>
                  <SortableSubtaskRow task={task} parentId="t1" />
                </SortableContext>
              </DndContext>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SortableSubtaskRow', () => {
  it('renders the subtask name', () => {
    renderSortable();
    expect(screen.getByText('Subtarefa de teste')).toBeInTheDocument();
  });

  it('renders a grip handle button', () => {
    renderSortable();
    expect(screen.getByRole('button', { name: /arrastar subtarefa/i })).toBeInTheDocument();
  });

  it('grip handle is not pointer-events-none', () => {
    renderSortable();
    const grip = screen.getByRole('button', { name: /arrastar subtarefa/i });
    expect(grip.classList.contains('pointer-events-none')).toBe(false);
  });
});
