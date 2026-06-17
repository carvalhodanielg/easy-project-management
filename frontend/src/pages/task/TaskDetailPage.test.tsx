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
vi.mock('../../components/editor/MarkdownEditor', () => ({
  // Forwards onChange/onBlur so tests can simulate an attachment insert, which the
  // real editor performs as `onChange(newValue)` immediately followed by `onBlur()`.
  MarkdownEditor: ({
    onChange,
    onBlur,
  }: {
    onChange: (v: string) => void;
    onBlur?: () => void;
  }) => (
    <div data-testid="markdown-editor">
      <button
        data-testid="simulate-attach-insert"
        onClick={() => {
          onChange('![img](http://api/uploads/x.png)');
          onBlur?.();
        }}
      />
    </div>
  ),
}));

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
  subtaskCount: 2,
  blockedBy: [],
  blocks: [],
  listId: 'l1',
  sprintId: null,
  parentTask: null,
  createdAt: '',
  updatedAt: '',
};

const SUBTASK = { ...TASK, _id: 't1', name: 'Subtarefa Atual', parentTask: 'parent1' };
const SUBTASK_NO_LIST = { ...SUBTASK, listId: null };

const SIBLINGS = [
  { ...TASK, _id: 't1', name: 'Subtarefa Atual', parentTask: 'parent1' },
  { ...TASK, _id: 't2', name: 'Outra Subtarefa',  parentTask: 'parent1' },
];

function renderPage() {
  vi.mocked(tasksApi.getTask).mockResolvedValue(TASK as never);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/spaces/sp1/tasks/t1']}>
        <Routes>
          <Route path="/spaces/:spaceId/tasks/:taskId" element={<TaskDetailPage />} />
          <Route path="/spaces/:spaceId/lists/:listId" element={<div data-testid="list-page" />} />
          <Route path="/spaces/:spaceId" element={<div data-testid="space-page" />} />
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
  vi.mocked(tasksApi.getSubtasks).mockResolvedValue(SIBLINGS as never);
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

  it('subtasks column contains SubtaskList for a top-level task', async () => {
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

  it('saves the freshly inserted attachment markdown, not the stale description', async () => {
    vi.mocked(tasksApi.updateTask).mockResolvedValue(TASK as never);
    renderPage();
    const btn = await screen.findByTestId('simulate-attach-insert');
    fireEvent.click(btn);
    await waitFor(() => {
      expect(tasksApi.updateTask).toHaveBeenCalledWith('sp1', 't1', {
        description: '![img](http://api/uploads/x.png)',
      });
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

  it('does not show parent task link for a top-level task', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Tarefa Teste'));
    expect(screen.queryByTestId('parent-task-link')).not.toBeInTheDocument();
  });

  it('does not show parent task breadcrumb for a top-level task', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Tarefa Teste'));
    expect(screen.queryByTestId('parent-task-breadcrumb')).not.toBeInTheDocument();
  });

  it('close button navigates to the task list page, not back in history', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Tarefa Teste'));
    fireEvent.click(screen.getByTestId('close-button'));
    await waitFor(() => {
      expect(screen.getByTestId('list-page')).toBeInTheDocument();
    });
  });

  it('clicking the backdrop navigates to the task list page', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Tarefa Teste'));
    fireEvent.click(screen.getByTestId('task-detail-backdrop'));
    await waitFor(() => {
      expect(screen.getByTestId('list-page')).toBeInTheDocument();
    });
  });
});

describe('TaskDetailPage — deep link / reload persistence', () => {
  beforeEach(() => vi.clearAllMocks());

  // Simulates a hard page reload landing directly on the task deep link:
  // the SPA history has a single entry, so there is nothing to `navigate(-1)` to.
  function renderDeepLink() {
    vi.mocked(tasksApi.getTask).mockResolvedValue(TASK as never);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/spaces/sp1/tasks/t1']} initialIndex={0}>
          <Routes>
            <Route path="/spaces/:spaceId/tasks/:taskId" element={<TaskDetailPage />} />
            <Route path="/spaces/:spaceId/lists/:listId" element={<div data-testid="list-page" />} />
            <Route path="/spaces/:spaceId" element={<div data-testid="space-page" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it('restores the open task from the deep link without redirecting to a list', async () => {
    renderDeepLink();
    await waitFor(() => {
      expect(screen.getByText('Tarefa Teste')).toBeInTheDocument();
    });
    expect(screen.getByTestId('task-detail-backdrop')).toBeInTheDocument();
    expect(screen.queryByTestId('list-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('space-page')).not.toBeInTheDocument();
  });

  it('loading state stays on a valid in-app route instead of navigating back out of the SPA', async () => {
    // Never resolve the task so the page is stuck in the loading state, mimicking
    // the moment right after a reload while the deep-linked task is still fetching.
    vi.mocked(tasksApi.getTask).mockReturnValue(new Promise(() => {}) as never);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/spaces/sp1/tasks/t1']} initialIndex={0}>
          <Routes>
            <Route path="/spaces/:spaceId/tasks/:taskId" element={<TaskDetailPage />} />
            <Route path="/spaces/:spaceId/lists/:listId" element={<div data-testid="list-page" />} />
            <Route path="/spaces/:spaceId" element={<div data-testid="space-page" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const loadingBackdrop = await screen.findByTestId('task-detail-loading-backdrop');
    fireEvent.click(loadingBackdrop);

    // Clicking the loading backdrop on a fresh deep link must land on a real
    // in-app route (the space root), not attempt `navigate(-1)` which would
    // leave the SPA / fall back to the list root.
    await waitFor(() => {
      expect(screen.getByTestId('space-page')).toBeInTheDocument();
    });
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

  it('shows parent task link in left column', async () => {
    renderSubtaskPage();
    await waitFor(() => {
      expect(screen.getByTestId('parent-task-link')).toBeInTheDocument();
    });
    expect(screen.getByTestId('parent-task-link')).toHaveTextContent('Tarefa Pai');
  });

  it('shows all sibling subtasks in the left column', async () => {
    renderSubtaskPage();
    await waitFor(() => {
      expect(screen.getAllByText('Subtarefa Atual').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Outra Subtarefa')).toBeInTheDocument();
    });
  });

  it('marks the current task with a visual indicator', async () => {
    renderSubtaskPage();
    await waitFor(() => {
      expect(screen.getByTestId('current-subtask-row')).toBeInTheDocument();
    });
  });

  it('does not mark other siblings as current', async () => {
    renderSubtaskPage();
    await waitFor(() => screen.getByText('Outra Subtarefa'));
    const all = screen.queryAllByTestId('current-subtask-row');
    expect(all).toHaveLength(1);
  });

  it('does not render SubtaskList when viewing a subtask', async () => {
    renderSubtaskPage();
    await waitFor(() => screen.getByTestId('parent-task-link'));
    expect(screen.queryByTestId('subtask-list')).not.toBeInTheDocument();
  });

  it('clicking parent task breadcrumb navigates to parent', async () => {
    renderSubtaskPage();
    await waitFor(() => screen.getByTestId('parent-task-breadcrumb'));
    fireEvent.click(screen.getByTestId('parent-task-breadcrumb'));
    await waitFor(() => {
      expect(screen.getByTestId('parent-page')).toBeInTheDocument();
    });
  });

  it('close button on subtask with no listId falls back to parent task listId', async () => {
    vi.mocked(tasksApi.getTask).mockImplementation((_spaceId, taskId) => {
      if (taskId === 'parent1') return Promise.resolve(PARENT_TASK as never);
      return Promise.resolve(SUBTASK_NO_LIST as never);
    });
    vi.mocked(tasksApi.getSubtasks).mockResolvedValue(SIBLINGS as never);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/spaces/sp1/tasks/t1']}>
          <Routes>
            <Route path="/spaces/:spaceId/tasks/:taskId" element={<TaskDetailPage />} />
            <Route path="/spaces/:spaceId/lists/:listId" element={<div data-testid="list-page" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    // Wait until the parent task has loaded (breadcrumb appears) so the close
    // fallback can read its listId.
    await waitFor(() => screen.getByTestId('parent-task-breadcrumb'));
    fireEvent.click(screen.getByTestId('close-button'));
    await waitFor(() => {
      expect(screen.getByTestId('list-page')).toBeInTheDocument();
    });
  });
});
