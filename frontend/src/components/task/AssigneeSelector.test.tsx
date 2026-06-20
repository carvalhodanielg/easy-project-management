import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AssigneeSelector } from './AssigneeSelector';
import type { SpaceMember } from '../../types/space.types';

vi.mock('../../api/spaces.api', () => ({
  getSpaceMembers: vi.fn(),
}));

import * as spacesApi from '../../api/spaces.api';

const MEMBERS: SpaceMember[] = [
  {
    _id: 'm1',
    spaceId: 'sp1',
    role: 'editor',
    userId: { _id: 'u1', email: 'ana@x.com', displayName: 'Ana', avatarUrl: null },
  },
  {
    _id: 'm2',
    spaceId: 'sp1',
    role: 'viewer',
    userId: { _id: 'u2', email: 'bia@x.com', displayName: 'Bia', avatarUrl: null },
  },
];

function renderSelector() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onChange = vi.fn();
  render(
    <QueryClientProvider client={qc}>
      <AssigneeSelector assignees={[]} spaceId="sp1" onChange={onChange} />
    </QueryClientProvider>,
  );
  return { onChange };
}

describe('AssigneeSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(spacesApi.getSpaceMembers).mockResolvedValue(MEMBERS);
  });

  it('opens the member list when clicking the add button', async () => {
    renderSelector();
    fireEvent.click(screen.getByRole('button', { name: /adicionar responsável/i }));
    expect(await screen.findByRole('button', { name: 'Ana' })).toBeInTheDocument();
  });

  it('calls onChange and closes the list when a member is selected', async () => {
    const { onChange } = renderSelector();
    fireEvent.click(screen.getByRole('button', { name: /adicionar responsável/i }));

    const option = await screen.findByRole('button', { name: 'Ana' });
    fireEvent.click(option);

    expect(onChange).toHaveBeenCalledWith(['u1']);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Ana' })).not.toBeInTheDocument(),
    );
  });
});
