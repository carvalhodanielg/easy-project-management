import { QueryClient } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { toast } from 'sonner';
import { moveTaskStatus } from './moveTaskStatus';
import * as tasksApi from '../../api/tasks.api';
import { Task } from '../../types/task.types';

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }));
vi.mock('../../api/tasks.api', () => ({ updateTask: vi.fn() }));

const mockToast = vi.mocked(toast);
const mockUpdate = vi.mocked(tasksApi.updateTask);

const task = (over: Partial<Task> = {}): Task =>
  ({ _id: 't1', name: 'T', status: 'pendente', ...over } as Task);

function clientWith(tasks: Task[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(['tasks', 'sp1'], tasks);
  return qc;
}

describe('moveTaskStatus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('optimistically updates the cached task status', () => {
    mockUpdate.mockReturnValue(new Promise(() => {})); // never settles
    const qc = clientWith([task()]);

    moveTaskStatus(qc, 'sp1', 't1', 'feito');

    expect(qc.getQueryData<Task[]>(['tasks', 'sp1'])?.[0].status).toBe('feito');
    expect(mockUpdate).toHaveBeenCalledWith('sp1', 't1', { status: 'feito' });
  });

  it('rolls the cache back and shows an error toast when the write fails', async () => {
    mockUpdate.mockRejectedValue(new Error('boom'));
    const qc = clientWith([task()]);

    moveTaskStatus(qc, 'sp1', 't1', 'feito');
    // optimistic state applied immediately
    expect(qc.getQueryData<Task[]>(['tasks', 'sp1'])?.[0].status).toBe('feito');

    await vi.waitFor(() => expect(mockToast.error).toHaveBeenCalled());
    // visible rollback: status restored to its prior value
    expect(qc.getQueryData<Task[]>(['tasks', 'sp1'])?.[0].status).toBe('pendente');
  });
});
