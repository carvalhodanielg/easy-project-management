import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { useBulkPatchTasks } from './useBulkPatchTasks';
import * as tasksApi from '../api/tasks.api';

vi.mock('../api/tasks.api');

const bulkPatch = vi.mocked(tasksApi.bulkPatchTasks);

function wrapperWith(qc: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('useBulkPatchTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bulkPatch.mockResolvedValue({ affected: 2 });
  });

  it('calls bulkPatchTasks with the spaceId and payload', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useBulkPatchTasks('sp1'), {
      wrapper: wrapperWith(qc),
    });

    act(() => {
      result.current.mutate({ taskIds: ['t1', 't2'], action: 'status', status: 'feito' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(bulkPatch).toHaveBeenCalledWith('sp1', {
      taskIds: ['t1', 't2'],
      action: 'status',
      status: 'feito',
    });
  });

  it('invalidates the tasks query for the space on success', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useBulkPatchTasks('sp1'), {
      wrapper: wrapperWith(qc),
    });

    act(() => {
      result.current.mutate({ taskIds: ['t1'], action: 'delete' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['tasks', 'sp1'] }),
    );
  });
});
