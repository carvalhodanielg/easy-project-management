import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssigneeSelector } from './AssigneeSelector';
import * as spacesApi from '../../api/spaces.api';
import type { SpaceMember } from '../../types/space.types';
import type { User } from '../../types/user.types';

vi.mock('../../api/spaces.api');

const alice: User = { _id: 'u1', email: 'alice@test.com', displayName: 'Alice', avatarUrl: null };
const bob: User = { _id: 'u2', email: 'bob@test.com', displayName: 'Bob', avatarUrl: null };

const mockMembers: SpaceMember[] = [
  { _id: 'm1', spaceId: 'space-1', userId: alice, role: 'editor' },
  { _id: 'm2', spaceId: 'space-1', userId: bob, role: 'viewer' },
];

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderSelector(assignees: User[], onChange = vi.fn()) {
  vi.mocked(spacesApi.getSpaceMembers).mockResolvedValue(mockMembers);
  return {
    onChange,
    ...render(
      <QueryClientProvider client={makeClient()}>
        <AssigneeSelector spaceId="space-1" assignees={assignees} onChange={onChange} />
      </QueryClientProvider>,
    ),
  };
}

describe('AssigneeSelector', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders initials of current assignees', () => {
    renderSelector([alice]);
    expect(screen.getByTitle('Alice')).toBeInTheDocument();
  });

  it('renders "+" button to open member list', () => {
    renderSelector([]);
    expect(screen.getByRole('button', { name: '+' })).toBeInTheDocument();
  });

  it('opens dropdown with space members on "+" click', async () => {
    renderSelector([]);
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('calls onChange with new id when adding an unassigned member', async () => {
    const { onChange } = renderSelector([]);
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Alice' }));
    expect(onChange).toHaveBeenCalledWith(['u1']);
  });

  it('calls onChange without id when removing an assigned member', async () => {
    const { onChange } = renderSelector([alice, bob]);
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    // alice is already assigned — clicking her dropdown button removes her
    fireEvent.click(await screen.findByRole('button', { name: 'Alice' }));
    expect(onChange).toHaveBeenCalledWith(['u2']);
  });

  it('removes assignee via × chip button without opening dropdown', async () => {
    const { onChange } = renderSelector([alice]);
    fireEvent.click(screen.getByRole('button', { name: '×' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('closes dropdown when clicking outside', async () => {
    const { baseElement } = renderSelector([]);
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    expect(await screen.findByText('Alice')).toBeInTheDocument();
    fireEvent.mouseDown(baseElement);
    await waitFor(() => expect(screen.queryByText('Alice')).not.toBeInTheDocument());
  });
});
