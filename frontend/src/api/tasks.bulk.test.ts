import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./client', () => ({
  apiClient: { patch: vi.fn() },
}));

import { apiClient } from './client';
import { bulkPatchTasks } from './tasks.api';

const patch = vi.mocked(apiClient.patch);

describe('bulkPatchTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    patch.mockResolvedValue({ data: { data: { affected: 2 } } } as never);
  });

  it('PATCHes the unified bulk endpoint with taskIds + payload', async () => {
    await bulkPatchTasks('sp1', {
      taskIds: ['t1', 't2'],
      action: 'status',
      status: 'feito',
    });

    expect(patch).toHaveBeenCalledWith('/spaces/sp1/tasks/bulk', {
      taskIds: ['t1', 't2'],
      action: 'status',
      status: 'feito',
    });
  });

  it('returns the affected count from the wrapped response', async () => {
    const result = await bulkPatchTasks('sp1', {
      taskIds: ['t1', 't2'],
      action: 'delete',
    });
    expect(result).toEqual({ affected: 2 });
  });

  it('supports a move payload', async () => {
    await bulkPatchTasks('sp1', {
      taskIds: ['t1'],
      action: 'move',
      sprintId: 'sprint1',
    });
    expect(patch).toHaveBeenCalledWith('/spaces/sp1/tasks/bulk', {
      taskIds: ['t1'],
      action: 'move',
      sprintId: 'sprint1',
    });
  });
});
