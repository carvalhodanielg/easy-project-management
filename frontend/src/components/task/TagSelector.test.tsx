import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { TagSelector } from './TagSelector';
import * as tagsApi from '../../api/tags.api';
import type { Tag } from '../../types/task.types';

vi.mock('../../api/tags.api');

const mockGetTags = vi.mocked(tagsApi.getTags);
const mockCreateTag = vi.mocked(tagsApi.createTag);
const mockUpdateTag = vi.mocked(tagsApi.updateTag);

const TAG_BUG: Tag = { _id: 't1', spaceId: 'sp1', name: 'bug', color: '#EF4444' };
const TAG_FEAT: Tag = { _id: 't2', spaceId: 'sp1', name: 'feature', color: '#3B82F6' };

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={makeQC()}>{children}</QueryClientProvider>;
}

function renderSelector(tags: Tag[] = [], onChange = vi.fn()) {
  return render(
    <TagSelector spaceId="sp1" tags={tags} onChange={onChange} />,
    { wrapper: Wrapper },
  );
}

describe('TagSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTags.mockResolvedValue([TAG_BUG, TAG_FEAT]);
  });

  it('renders assigned tags as pills in closed state', () => {
    renderSelector([TAG_BUG]);
    expect(screen.getByText('bug')).toBeInTheDocument();
    expect(screen.queryByText('feature')).not.toBeInTheDocument();
  });

  it('opens popover when + button is clicked', async () => {
    renderSelector([]);
    fireEvent.click(screen.getByRole('button', { name: /adicionar label/i }));
    await waitFor(() => expect(screen.getByText('bug')).toBeInTheDocument());
    expect(screen.getByText('feature')).toBeInTheDocument();
  });

  it('shows checkmark for assigned tags in the popover', async () => {
    renderSelector([TAG_BUG]);
    fireEvent.click(screen.getByRole('button', { name: /adicionar label/i }));
    await waitFor(() => screen.getByRole('button', { name: /toggle bug/i }));
    expect(screen.getByTestId('tag-check-t1')).toBeInTheDocument();
    expect(screen.queryByTestId('tag-check-t2')).not.toBeInTheDocument();
  });

  it('calls onChange with added tag when an unassigned tag is clicked', async () => {
    const onChange = vi.fn();
    renderSelector([TAG_BUG], onChange);
    fireEvent.click(screen.getByRole('button', { name: /adicionar label/i }));
    await waitFor(() => expect(screen.getByText('feature')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /toggle feature/i }));
    expect(onChange).toHaveBeenCalledWith(['t1', 't2']);
  });

  it('calls onChange with tag removed when an assigned tag is clicked', async () => {
    const onChange = vi.fn();
    renderSelector([TAG_BUG, TAG_FEAT], onChange);
    fireEvent.click(screen.getByRole('button', { name: /adicionar label/i }));
    await waitFor(() => screen.getByRole('button', { name: /toggle bug/i }));
    fireEvent.click(screen.getByRole('button', { name: /toggle bug/i }));
    expect(onChange).toHaveBeenCalledWith(['t2']);
  });

  it('removes tag pill when X is clicked on an assigned pill', () => {
    const onChange = vi.fn();
    renderSelector([TAG_BUG], onChange);
    fireEvent.click(screen.getByRole('button', { name: /remover bug/i }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('creates a new tag and adds it to the task', async () => {
    const newTag: Tag = { _id: 't3', spaceId: 'sp1', name: 'urgent', color: '#6366F1' };
    mockCreateTag.mockResolvedValue(newTag);
    const onChange = vi.fn();
    renderSelector([], onChange);

    fireEvent.click(screen.getByRole('button', { name: /adicionar label/i }));
    await waitFor(() => expect(screen.getByText('bug')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /criar nova label/i }));
    const input = screen.getByPlaceholderText(/nome da label/i);
    fireEvent.change(input, { target: { value: 'urgent' } });
    fireEvent.click(screen.getByRole('button', { name: /^criar$/i }));

    await waitFor(() =>
      expect(mockCreateTag).toHaveBeenCalledWith('sp1', { name: 'urgent', color: '#6366F1' }),
    );
    expect(onChange).toHaveBeenCalledWith(['t3']);
  });

  it('enters edit mode for a tag when pencil is clicked', async () => {
    renderSelector([]);
    fireEvent.click(screen.getByRole('button', { name: /adicionar label/i }));
    await waitFor(() => expect(screen.getByText('bug')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /editar bug/i }));
    expect(screen.getByDisplayValue('bug')).toBeInTheDocument();
  });

  it('calls updateTag when saving an edited tag', async () => {
    mockUpdateTag.mockResolvedValue({ ...TAG_BUG, name: 'bugfix' });
    renderSelector([]);
    fireEvent.click(screen.getByRole('button', { name: /adicionar label/i }));
    await waitFor(() => expect(screen.getByText('bug')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /editar bug/i }));
    const input = screen.getByDisplayValue('bug');
    fireEvent.change(input, { target: { value: 'bugfix' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar edição/i }));

    await waitFor(() =>
      expect(mockUpdateTag).toHaveBeenCalledWith('sp1', 't1', { name: 'bugfix', color: '#EF4444' }),
    );
  });
});
