import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NoteDetailPage } from './NoteDetailPage';
import * as notesApi from '../../api/notes.api';

vi.mock('../../api/notes.api');
vi.mock('../../store/auth.store');
vi.mock('../../components/ui/MentionTextarea', () => ({
  MentionTextarea: () => <div data-testid="mention-textarea" />,
}));

// Lightweight stub of the unified editor: exposes value via a textarea, forwards
// onChange on input and onBlur on blur, so we can assert the page's save wiring.
vi.mock('../../components/editor/MarkdownEditor', () => ({
  MarkdownEditor: ({
    value,
    onChange,
    onBlur,
  }: {
    value: string;
    onChange: (v: string) => void;
    onBlur?: () => void;
  }) => (
    <textarea
      data-testid="markdown-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => onBlur?.()}
    />
  ),
}));

const NOTE = {
  _id: 'n1',
  title: 'Minha Nota',
  content: 'conteúdo original',
  spaceId: 'sp1',
  sprintId: 'sprint1',
  createdBy: { _id: 'u1', displayName: 'Daniel', email: '', avatarUrl: null },
  label: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderPage() {
  vi.mocked(notesApi.getNote).mockResolvedValue(NOTE as never);
  vi.mocked(notesApi.getNoteComments).mockResolvedValue([] as never);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/spaces/sp1/notes/n1']}>
        <Routes>
          <Route path="/spaces/:spaceId/notes/:noteId" element={<NoteDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('NoteDetailPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the unified MarkdownEditor with the note content', async () => {
    renderPage();
    const editor = await screen.findByTestId('markdown-editor');
    expect(editor).toHaveValue('conteúdo original');
  });

  it('saves the content on blur', async () => {
    vi.mocked(notesApi.updateNote).mockResolvedValue(NOTE as never);
    renderPage();
    const editor = await screen.findByTestId('markdown-editor');
    fireEvent.change(editor, { target: { value: 'novo conteúdo' } });
    fireEvent.blur(editor);
    await waitFor(() => {
      expect(notesApi.updateNote).toHaveBeenCalledWith('sp1', 'n1', { content: 'novo conteúdo' });
    });
  });

  it('does not save on blur when the content is unchanged', async () => {
    vi.mocked(notesApi.updateNote).mockResolvedValue(NOTE as never);
    renderPage();
    const editor = await screen.findByTestId('markdown-editor');
    fireEvent.blur(editor);
    await Promise.resolve();
    expect(notesApi.updateNote).not.toHaveBeenCalled();
  });

  it('no longer renders a manual "Salvar" button', async () => {
    renderPage();
    await screen.findByTestId('markdown-editor');
    expect(screen.queryByRole('button', { name: /salvar/i })).not.toBeInTheDocument();
  });

  it('no longer renders an Editar/Preview toggle', async () => {
    renderPage();
    await screen.findByTestId('markdown-editor');
    expect(screen.queryByRole('button', { name: /preview/i })).not.toBeInTheDocument();
  });
});
