import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from './client';
import {
  getArchivedSpaces,
  restoreSpace,
  permanentDeleteSpace,
} from './spaces.api';
import {
  getArchivedLists,
  restoreList,
  permanentDeleteList,
} from './lists.api';
import {
  getArchivedSprints,
  restoreSprint,
  permanentDeleteSprint,
} from './sprints.api';
import {
  getArchivedTasks,
  restoreTask,
  permanentDeleteTask,
  emptyTaskTrash,
} from './tasks.api';

const get = vi.mocked(apiClient.get);
const post = vi.mocked(apiClient.post);
const del = vi.mocked(apiClient.delete);

const wrap = (data: unknown) => ({ data: { data } }) as never;

describe('soft delete / trash api', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('spaces', () => {
    it('getArchivedSpaces GETs the trash and unwraps', async () => {
      get.mockResolvedValue(wrap([{ _id: 'sp1', archivedAt: '2026-01-01' }]));
      const result = await getArchivedSpaces();
      expect(get).toHaveBeenCalledWith('/spaces/trash');
      expect(result[0]._id).toBe('sp1');
    });

    it('restoreSpace POSTs to the restore endpoint', async () => {
      post.mockResolvedValue(wrap({ _id: 'sp1', archivedAt: null }));
      const result = await restoreSpace('sp1');
      expect(post).toHaveBeenCalledWith('/spaces/sp1/restore');
      expect(result.archivedAt).toBeNull();
    });

    it('permanentDeleteSpace DELETEs the permanent endpoint', async () => {
      del.mockResolvedValue({} as never);
      await permanentDeleteSpace('sp1');
      expect(del).toHaveBeenCalledWith('/spaces/sp1/permanent');
    });
  });

  describe('lists', () => {
    it('getArchivedLists GETs the space trash', async () => {
      get.mockResolvedValue(wrap([{ _id: 'l1' }]));
      await getArchivedLists('sp1');
      expect(get).toHaveBeenCalledWith('/spaces/sp1/lists/trash');
    });

    it('restoreList POSTs to the restore endpoint', async () => {
      post.mockResolvedValue(wrap({ _id: 'l1' }));
      await restoreList('sp1', 'l1');
      expect(post).toHaveBeenCalledWith('/spaces/sp1/lists/l1/restore');
    });

    it('permanentDeleteList DELETEs the permanent endpoint', async () => {
      del.mockResolvedValue({} as never);
      await permanentDeleteList('sp1', 'l1');
      expect(del).toHaveBeenCalledWith('/spaces/sp1/lists/l1/permanent');
    });
  });

  describe('sprints', () => {
    it('getArchivedSprints GETs the space trash', async () => {
      get.mockResolvedValue(wrap([{ _id: 's1' }]));
      await getArchivedSprints('sp1');
      expect(get).toHaveBeenCalledWith('/spaces/sp1/sprints/trash');
    });

    it('restoreSprint POSTs to the restore endpoint', async () => {
      post.mockResolvedValue(wrap({ _id: 's1' }));
      await restoreSprint('sp1', 's1');
      expect(post).toHaveBeenCalledWith('/spaces/sp1/sprints/s1/restore');
    });

    it('permanentDeleteSprint DELETEs the permanent endpoint', async () => {
      del.mockResolvedValue({} as never);
      await permanentDeleteSprint('sp1', 's1');
      expect(del).toHaveBeenCalledWith('/spaces/sp1/sprints/s1/permanent');
    });
  });

  describe('tasks', () => {
    it('getArchivedTasks GETs the space trash', async () => {
      get.mockResolvedValue(wrap([{ _id: 't1' }]));
      await getArchivedTasks('sp1');
      expect(get).toHaveBeenCalledWith('/spaces/sp1/tasks/trash');
    });

    it('restoreTask POSTs to the restore endpoint', async () => {
      post.mockResolvedValue(wrap({ _id: 't1' }));
      await restoreTask('sp1', 't1');
      expect(post).toHaveBeenCalledWith('/spaces/sp1/tasks/t1/restore');
    });

    it('permanentDeleteTask DELETEs the permanent endpoint', async () => {
      del.mockResolvedValue({} as never);
      await permanentDeleteTask('sp1', 't1');
      expect(del).toHaveBeenCalledWith('/spaces/sp1/tasks/t1/permanent');
    });

    it('emptyTaskTrash DELETEs the task trash endpoint and unwraps', async () => {
      del.mockResolvedValue(wrap({ affected: 3 }));
      const result = await emptyTaskTrash('sp1');
      expect(del).toHaveBeenCalledWith('/spaces/sp1/tasks/trash');
      expect(result).toEqual({ affected: 3 });
    });
  });
});
