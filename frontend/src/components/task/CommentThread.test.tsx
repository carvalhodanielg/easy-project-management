import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommentThread } from './CommentThread';
import * as commentsApi from '../../api/comments.api';
import { useAuthStore } from '../../store/auth.store';

vi.mock('../../api/comments.api');
vi.mock('../../store/auth.store');

const currentUser = { _id: 'user-1', email: 'me@test.com', displayName: 'Alice', avatarUrl: null };
const otherUser = { _id: 'user-2', email: 'other@test.com', displayName: 'Bob', avatarUrl: null };

const mockComments: commentsApi.Comment[] = [
  {
    _id: 'c1',
    taskId: 'task-1',
    author: currentUser,
    content: 'First comment',
    attachments: [],
    edited: false,
    createdAt: '2025-01-01T10:00:00.000Z',
    updatedAt: '2025-01-01T10:00:00.000Z',
  },
  {
    _id: 'c2',
    taskId: 'task-1',
    author: otherUser,
    content: 'Second comment',
    attachments: [],
    edited: true,
    createdAt: '2025-01-01T11:00:00.000Z',
    updatedAt: '2025-01-01T12:00:00.000Z',
  },
];

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderThread(comments = mockComments) {
  vi.mocked(commentsApi.getComments).mockResolvedValue(comments);
  vi.mocked(useAuthStore).mockReturnValue(currentUser as never);

  return render(
    <QueryClientProvider client={makeClient()}>
      <CommentThread spaceId="space-1" taskId="task-1" />
    </QueryClientProvider>,
  );
}

describe('CommentThread', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders comment content', async () => {
    renderThread();
    expect(await screen.findByText('First comment')).toBeInTheDocument();
    expect(screen.getByText('Second comment')).toBeInTheDocument();
  });

  it('shows comment count', async () => {
    renderThread();
    expect(await screen.findByText('Comments (2)')).toBeInTheDocument();
  });

  it('shows (edited) marker for edited comments', async () => {
    renderThread();
    await screen.findByText('Second comment');
    expect(screen.getByText(/edited/)).toBeInTheDocument();
  });

  it('shows Edit/Delete only for own comments', async () => {
    renderThread();
    await screen.findByText('First comment');
    // Own comment (c1) has edit/delete buttons
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('shows attachment links', async () => {
    const withAttachment: commentsApi.Comment[] = [
      {
        ...mockComments[0],
        attachments: [
          { _id: 'att-1', originalName: 'file.pdf', url: '/uploads/file.pdf', mimeType: 'application/pdf', sizeBytes: 1024 },
        ],
      },
    ];
    renderThread(withAttachment);
    expect(await screen.findByText(/file\.pdf/)).toBeInTheDocument();
  });

  it('posts a new comment', async () => {
    const newComment: commentsApi.Comment = {
      _id: 'c3',
      taskId: 'task-1',
      author: currentUser,
      content: 'New comment',
      attachments: [],
      edited: false,
      createdAt: '2025-01-01T13:00:00.000Z',
      updatedAt: '2025-01-01T13:00:00.000Z',
    };
    vi.mocked(commentsApi.createComment).mockResolvedValue(newComment);
    vi.mocked(commentsApi.getComments)
      .mockResolvedValueOnce(mockComments)
      .mockResolvedValue([...mockComments, newComment]);

    renderThread();
    await screen.findByText('First comment');

    const textarea = screen.getByPlaceholderText('Write a comment...');
    fireEvent.change(textarea, { target: { value: 'New comment' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post Comment' }));

    await waitFor(() => {
      expect(commentsApi.createComment).toHaveBeenCalledTimes(1);
      const [sid, tid, content] = vi.mocked(commentsApi.createComment).mock.calls[0];
      expect(sid).toBe('space-1');
      expect(tid).toBe('task-1');
      expect(content).toBe('New comment');
    });
  });

  it('enters edit mode when Edit is clicked', async () => {
    renderThread();
    await screen.findByText('First comment');

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByDisplayValue('First comment')).toBeInTheDocument();
  });

  it('saves edited comment', async () => {
    const updated = { ...mockComments[0], content: 'Updated content', edited: true };
    vi.mocked(commentsApi.updateComment).mockResolvedValue(updated);
    vi.mocked(commentsApi.getComments)
      .mockResolvedValueOnce(mockComments)
      .mockResolvedValue([updated, mockComments[1]]);

    renderThread();
    await screen.findByText('First comment');

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const editArea = screen.getByDisplayValue('First comment');
    fireEvent.change(editArea, { target: { value: 'Updated content' } });

    const saveButtons = screen.getAllByRole('button', { name: 'Save' });
    fireEvent.click(saveButtons[0]);

    await waitFor(() =>
      expect(commentsApi.updateComment).toHaveBeenCalledWith(
        'space-1', 'task-1', 'c1', 'Updated content',
      ),
    );
  });

  it('cancels edit without saving', async () => {
    renderThread();
    await screen.findByText('First comment');

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(commentsApi.updateComment).not.toHaveBeenCalled();
    expect(screen.getByText('First comment')).toBeInTheDocument();
  });

  it('deletes a comment', async () => {
    vi.mocked(commentsApi.deleteComment).mockResolvedValue(undefined);
    vi.mocked(commentsApi.getComments)
      .mockResolvedValueOnce(mockComments)
      .mockResolvedValue([mockComments[1]]);

    renderThread();
    await screen.findByText('First comment');

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(commentsApi.deleteComment).toHaveBeenCalledWith('space-1', 'task-1', 'c1'),
    );
  });

  it('renders empty state with zero count', async () => {
    renderThread([]);
    expect(await screen.findByText('Comments (0)')).toBeInTheDocument();
  });
});
