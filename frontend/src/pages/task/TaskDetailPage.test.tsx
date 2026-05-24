import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TaskDetailPage } from './TaskDetailPage';
import * as tasksApi from '../../api/tasks.api';

vi.mock('../../api/tasks.api');
vi.mock('../../components/task/CommentThread', () => ({ CommentThread: () => <div data-testid="comment-thread" /> }));
vi.mock('../../components/task/ActivityLog', () => ({ ActivityLog: () => <div data-testid="activity-log" /> }));
vi.mock('../../components/task/SubtaskList', () => ({ SubtaskList: () => <div data-testid="subtask-list" /> }));
vi.mock('../../components/task/DependenciesSection', () => ({
  DependenciesSection: () => <div data-testid="dependencies-section" />,
  isTaskBlocked: () => false,
}));
vi.mock('../../components/task/AssigneeSelector', () => ({ AssigneeSelector: () => <div data-testid="assignee-selector" /> }));
vi.mock('../../components/editor/MarkdownLiveEditor', () => ({ MarkdownLiveEditor: () => <div data-testid="markdown-editor" /> }));

const TASK = {
  _id: 't1',
  name: 'Tarefa Teste',
  description: 'desc',
  status: 'pendente' as const,
  priority: 'normal' as const,
  storyPoints: null,
  dueDate: null,
  startDate: null,
  assignees: [],
  tags: [],
  subtaskCount: 0,
  blockedBy: [],
  blocks: [],
  listId: 'l1',
  sprintId: null,
  parentTask: null,
  createdAt: '',
  updatedAt: '',
};

const PARENT_TASK = {
  _id: 'parent1',
  name: 'Tarefa Pai',
  description: '',
  status: 'em_progresso' as const,
  priority: 'normal' as const,
  storyPoints: null,
  dueDate: null,
  startDate: null,
  assignees: [],
  tags: [],
  subtaskCount: 1,
  blockedBy: [],
  blocks: [],
  listId: 'l1',
  sprintId: null,
  parentTask: null,
  createdAt: '',
  updatedAt: '',
};

const SUBTASK = {
  ...TASK,
  _id: 't1',
  name: 'Subtarefa Teste',
  parentTask: 'parent1',
};

function renderPage() {
  vi.mocked(tasksApi.getTask).mockResolvedValue(TASK as never);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/spaces/sp1/tasks/t1']}>
        <Routes>
          <Route path="/spaces/:spaceId/tasks/:taskId" element={<TaskDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderSubtaskPage() {
  vi.mocked(tasksApi.getTask).mockImplementation((_spaceId, taskId) => {
    if (taskId === 'parent1') return Promise.resolve(PARENT_TASK as never);
    return Promise.resolve(SUBTASK as never);
  });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/spaces/sp1/tasks/t1']}>
        <Routes>
          <Route path="/spaces/:spaceId/tasks/:taskId" element={<TaskDetailPage />} />
          <Route path="/spaces/:spaceId/tasks/parent1" element={<div data-testid="parent-page" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TaskDetailPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the three-column layout after loading', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('task-detail-col-subtasks')).toBeInTheDocument();
      expect(screen.getByTestId('task-detail-col-main')).toBeInTheDocument();
      expect(screen.getByTestId('task-detail-col-activity')).toBeInTheDocument();
    });
  });

  it('subtasks column contains SubtaskList', async () => {
    renderPage();
    await waitFor(() => {
      const col = screen.getByTestId('task-detail-col-subtasks');
      expect(col).toContainElement(screen.getByTestId('subtask-list'));
    });
  });

  it('main column contains description editor', async () => {
    renderPage();
    await waitFor(() => {
      const col = screen.getByTestId('task-detail-col-main');
      expect(col).toContainElement(screen.getByTestId('markdown-editor'));
    });
  });

  it('activity column contains ActivityLog and CommentThread', async () => {
    renderPage();
    await waitFor(() => {
      const col = screen.getByTestId('task-detail-col-activity');
      expect(col).toContainElement(screen.getByTestId('activity-log'));
      expect(col).toContainElement(screen.getByTestId('comment-thread'));
    });
  });

  it('renders task title in header', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Tarefa Teste')).toBeInTheDocument();
    });
  });

  it('does not show parent task breadcrumb for a top-level task', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Tarefa Teste'));
    expect(screen.queryByTestId('parent-task-breadcrumb')).not.toBeInTheDocument();
  });

  it('does not show tarefa mãe section for a top-level task', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Tarefa Teste'));
    expect(screen.queryByTestId('parent-task-link')).not.toBeInTheDocument();
  });
});

describe('TaskDetailPage — subtask navigation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows parent task name in header breadcrumb', async () => {
    renderSubtaskPage();
    await waitFor(() => {
      expect(screen.getByTestId('parent-task-breadcrumb')).toBeInTheDocument();
    });
    expect(screen.getByTestId('parent-task-breadcrumb')).toHaveTextContent('Tarefa Pai');
  });

  it('shows parent task link in left column under "Tarefa mãe"', async () => {
    renderSubtaskPage();
    await waitFor(() => {
      expect(screen.getByTestId('parent-task-link')).toBeInTheDocument();
    });
    expect(screen.getByTestId('parent-task-link')).toHaveTextContent('Tarefa Pai');
  });

  it('left column shows "Subtarefas" section alongside "Tarefa mãe"', async () => {
    renderSubtaskPage();
    await waitFor(() => {
      expect(screen.getByTestId('parent-task-link')).toBeInTheDocument();
      expect(screen.getByTestId('subtask-list')).toBeInTheDocument();
    });
  });

  it('clicking parent task breadcrumb navigates to parent', async () => {
    renderSubtaskPage();
    await waitFor(() => screen.getByTestId('parent-task-breadcrumb'));
    fireEvent.click(screen.getByTestId('parent-task-breadcrumb'));
    await waitFor(() => {
      expect(screen.getByTestId('parent-page')).toBeInTheDocument();
    });
  });
});
