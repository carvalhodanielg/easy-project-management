import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from './client';
import { getInvitation, acceptInvitation } from './invitations.api';
import { inviteSpaceMember, revokeInvitation } from './spaces.api';

const get = vi.mocked(apiClient.get);
const post = vi.mocked(apiClient.post);
const del = vi.mocked(apiClient.delete);

describe('invitations api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inviteSpaceMember POSTs email + role and unwraps the result', async () => {
    post.mockResolvedValue({
      data: {
        data: {
          invitation: { _id: 'i1', email: 'a@b.com', status: 'pending' },
          inviteUrl: 'http://app/invite/accept?token=tok',
        },
      },
    } as never);

    const result = await inviteSpaceMember('sp1', 'A@B.com', 'viewer');

    expect(post).toHaveBeenCalledWith('/spaces/sp1/invitations', {
      email: 'A@B.com',
      role: 'viewer',
    });
    expect(result.inviteUrl).toBe('http://app/invite/accept?token=tok');
  });

  it('getInvitation GETs the public token endpoint', async () => {
    get.mockResolvedValue({
      data: { data: { email: 'a@b.com', valid: true, spaceName: 'S' } },
    } as never);

    const ctx = await getInvitation('tok');

    expect(get).toHaveBeenCalledWith('/invitations/tok');
    expect(ctx.valid).toBe(true);
  });

  it('acceptInvitation POSTs to the accept endpoint and returns the space', async () => {
    post.mockResolvedValue({
      data: { data: { _id: 'sp1', name: 'S' } },
    } as never);

    const space = await acceptInvitation('tok');

    expect(post).toHaveBeenCalledWith('/invitations/tok/accept');
    expect(space._id).toBe('sp1');
  });

  it('revokeInvitation DELETEs the invitation', async () => {
    del.mockResolvedValue({} as never);

    await revokeInvitation('sp1', 'i1');

    expect(del).toHaveBeenCalledWith('/spaces/sp1/invitations/i1');
  });
});
