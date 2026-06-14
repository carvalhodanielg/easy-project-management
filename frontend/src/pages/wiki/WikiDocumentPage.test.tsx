import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { WikiDocumentPage } from './WikiDocumentPage';
import * as wikiApi from '../../api/wiki.api';

vi.mock('../../api/wiki.api');

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

const DOC = {
  _id: 'd1',
  folderId: 'f1',
  spaceId: 'sp1',
  title: 'Documento',
  content: 'texto original',
  createdBy: 'u1',
  lastEditedBy: 'u1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderPage() {
  vi.mocked(wikiApi.getDocument).mockResolvedValue(DOC as never);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/spaces/sp1/wiki/documents/d1']}>
        <Routes>
          <Route path="/spaces/:spaceId/wiki/documents/:documentId" element={<WikiDocumentPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('WikiDocumentPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the unified MarkdownEditor with the document content', async () => {
    renderPage();
    const editor = await screen.findByTestId('markdown-editor');
    expect(editor).toHaveValue('texto original');
  });

  it('saves the content on blur (no autosave timer needed)', async () => {
    vi.useFakeTimers();
    vi.mocked(wikiApi.updateDocument).mockResolvedValue(DOC as never);
    renderPage();
    const editor = await vi.waitFor(() => screen.getByTestId('markdown-editor'));
    fireEvent.change(editor, { target: { value: 'texto editado' } });

    // No save happens just from typing — it is not debounce/timer driven.
    vi.advanceTimersByTime(5000);
    expect(wikiApi.updateDocument).not.toHaveBeenCalled();

    fireEvent.blur(editor);
    await vi.waitFor(() => {
      expect(wikiApi.updateDocument).toHaveBeenCalledWith('sp1', 'd1', { content: 'texto editado' });
    });
    vi.useRealTimers();
  });

  it('does not save on blur when the content is unchanged', async () => {
    vi.mocked(wikiApi.updateDocument).mockResolvedValue(DOC as never);
    renderPage();
    const editor = await screen.findByTestId('markdown-editor');
    fireEvent.blur(editor);
    await Promise.resolve();
    expect(wikiApi.updateDocument).not.toHaveBeenCalled();
  });
});
