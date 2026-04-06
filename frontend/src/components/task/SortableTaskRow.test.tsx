import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SortableTaskRow } from './SortableTaskRow';
import type { Task } from '../../types/task.types';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn(), useParams: () => ({ spaceId: 'sp1' }) };
});

vi.mock('../../api/tasks.api', () => ({
  getSubtasks: vi.fn().mockResolvedValue([]),
}));

const TASK: Task = {
  _id: 't1',
  name: 'Implementar autenticação',
  status: 'em_progresso',
  priority: 'alta',
  storyPoints: 5,
  dueDate: null,
  assignees: [],
  tags: [],
  subtaskCount: 0,
  blockedBy: [],
  blocks: [],
  description: '',
  parentTask: null,
  listId: 'l1',
  sprintId: null,
  position: 0,
  createdBy: 'u1',
  createdAt: '',
  updatedAt: '',
};

function renderSortable(task: Task = TASK) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/spaces/sp1']}>
        <Routes>
          <Route
            path="/spaces/:spaceId"
            element={
              <DndContext>
                <SortableContext items={[task._id]} strategy={verticalListSortingStrategy}>
                  <SortableTaskRow task={task} spaceId="sp1" />
                </SortableContext>
              </DndContext>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SortableTaskRow', () => {
  it('renders task name', () => {
    renderSortable();
    expect(screen.getByText('Implementar autenticação')).toBeInTheDocument();
  });

  it('renders drag handle button', () => {
    renderSortable();
    expect(screen.getByRole('button', { name: /arrastar tarefa/i })).toBeInTheDocument();
  });

  it('drag handle has grab cursor style class', () => {
    renderSortable();
    const handle = screen.getByRole('button', { name: /arrastar tarefa/i });
    expect(handle.className).toContain('grab');
  });
});
