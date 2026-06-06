import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CommentThread } from './CommentThread';
import * as commentsApi from '../../api/comments.api';
import { useAuthStore } from '../../store/auth.store';

vi.mock('../../api/comments.api');
vi.mock('../../store/auth.store');
vi.mock('../../api/attachments.api', async () => {
  const actual = await vi.importActual<typeof import('../../api/attachments.api')>('../../api/attachments.api');
  return {
    ...actual,
    uploadAttachment: vi.fn().mockResolvedValue({
      _id: 'att1', originalName: 'doc.pdf', url: '/uploads/x.pdf', mimeType: 'application/pdf', sizeBytes: 10,
    }),
    deleteAttachment: vi.fn().mockResolvedValue(undefined),
  };
});

const COMMENTS = [
  {
    _id: 'c1',
    content: 'Primeiro comentário',
    author: { _id: 'u1', displayName: 'Alice', email: '', avatarUrl: null },
    createdAt: new Date().toISOString(),
    edited: false,
    attachments: [],
  },
];

function renderComponent() {
  vi.mocked(commentsApi.getComments).mockResolvedValue(COMMENTS as never);
  vi.mocked(useAuthStore).mockReturnValue({ _id: 'u1', displayName: 'Alice', email: '', avatarUrl: null });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CommentThread spaceId="sp1" taskId="t1" />
    </QueryClientProvider>,
  );
}

describe('CommentThread', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders existing comments', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Primeiro comentário')).toBeInTheDocument();
    });
  });

  it('shows comment textarea', () => {
    renderComponent();
    expect(screen.getByPlaceholderText(/escreva um comentário/i)).toBeInTheDocument();
  });

  it('shows edit and delete buttons for own comments', async () => {
    renderComponent();
    await waitFor(() => screen.getByText('Primeiro comentário'));
    expect(screen.getByLabelText('Editar')).toBeInTheDocument();
    expect(screen.getByLabelText('Excluir')).toBeInTheDocument();
  });

  it('shows edit textarea when edit button clicked', async () => {
    renderComponent();
    await waitFor(() => screen.getByText('Primeiro comentário'));
    fireEvent.click(screen.getByLabelText('Editar'));
    await waitFor(() => {
      expect(screen.getByDisplayValue('Primeiro comentário')).toBeInTheDocument();
    });
  });

  it('uploads a selected file and submits the comment with its attachment id', async () => {
    const user = userEvent.setup();
    vi.mocked(commentsApi.createComment).mockResolvedValue({} as never);
    const { container } = renderComponent();

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File(['x'], 'doc.pdf', { type: 'application/pdf' }));

    expect(await screen.findByText('doc.pdf')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /comentar/i }));

    await waitFor(() => {
      expect(commentsApi.createComment).toHaveBeenCalledWith('sp1', 't1', '', ['att1'], []);
    });
  });
});
