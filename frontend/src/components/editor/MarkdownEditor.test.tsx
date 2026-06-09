import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MarkdownEditor } from './MarkdownEditor';

// CodeMirror is third-party; mock it to a plain textarea so the test exercises
// the component's own logic (mode switching, reading render, onChange).
vi.mock('@uiw/react-codemirror', () => ({
  default: ({ value, onChange }: { value: string; onChange?: (v: string) => void }) => (
    <textarea data-testid="cm" value={value} onChange={(e) => onChange?.(e.target.value)} />
  ),
}));

vi.mock('../../api/spaces.api', () => ({ getSpaceMembers: vi.fn(async () => []) }));
vi.mock('../../api/tasks.api', () => ({ getTasks: vi.fn(async () => []) }));
vi.mock('../../api/attachments.api', () => ({
  ACCEPT_ATTACHMENTS: 'image/*',
  buildMarkdownEmbed: () => '',
  isAllowedFile: () => true,
  uploadAttachment: vi.fn(),
}));

function renderEditor(props: Partial<Parameters<typeof MarkdownEditor>[0]> = {}) {
  const onChange = vi.fn();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MarkdownEditor value="# Olá" onChange={onChange} spaceId="sp1" placeholder="vazio" {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { onChange };
}

describe('MarkdownEditor', () => {
  it('renders the three mode buttons and starts in live mode', () => {
    renderEditor();
    expect(screen.getByRole('button', { name: /Live/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Código/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Leitura/ })).toBeInTheDocument();
    expect(screen.getByTestId('cm')).toBeInTheDocument();
  });

  it('switches to reading mode and renders markdown as HTML', () => {
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: /Leitura/ }));
    expect(screen.queryByTestId('cm')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Olá');
  });

  it('forwards edits through onChange', () => {
    const { onChange } = renderEditor();
    fireEvent.change(screen.getByTestId('cm'), { target: { value: '# Oi' } });
    expect(onChange).toHaveBeenCalledWith('# Oi');
  });
});
