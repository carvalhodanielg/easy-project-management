import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { toast } from 'sonner';
import { useDeleteTaskWithUndo } from './useDeleteTaskWithUndo';

vi.mock('sonner', () => ({ toast: vi.fn() }));

const mockToast = vi.mocked(toast);

function wrapperWith(qc: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

describe('useDeleteTaskWithUndo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('runs deleteFn, calls onDeleted and shows an undo toast', async () => {
    const deleteFn = vi.fn().mockResolvedValue(undefined);
    const restoreFn = vi.fn().mockResolvedValue(undefined);
    const onDeleted = vi.fn();
    const qc = newClient();

    const { result } = renderHook(() => useDeleteTaskWithUndo('sp1'), {
      wrapper: wrapperWith(qc),
    });

    act(() => {
      result.current.run({
        deleteFn,
        restoreFn,
        message: 'Tarefa movida para a lixeira',
        onDeleted,
      });
    });

    await waitFor(() => expect(deleteFn).toHaveBeenCalled());
    expect(onDeleted).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      'Tarefa movida para a lixeira',
      expect.objectContaining({
        action: expect.objectContaining({ label: 'Desfazer' }),
      }),
    );
  });

  it('invalidates tasks, subtasks and trash queries after delete', async () => {
    const qc = newClient();
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteTaskWithUndo('sp1'), {
      wrapper: wrapperWith(qc),
    });

    act(() => {
      result.current.run({
        deleteFn: vi.fn().mockResolvedValue(undefined),
        restoreFn: vi.fn().mockResolvedValue(undefined),
        message: 'x',
      });
    });

    await waitFor(() => expect(mockToast).toHaveBeenCalled());
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['tasks', 'sp1'] }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['trash'] }),
    );
  });

  it('the toast undo action runs restoreFn', async () => {
    const restoreFn = vi.fn().mockResolvedValue(undefined);
    const qc = newClient();

    const { result } = renderHook(() => useDeleteTaskWithUndo('sp1'), {
      wrapper: wrapperWith(qc),
    });

    act(() => {
      result.current.run({
        deleteFn: vi.fn().mockResolvedValue(undefined),
        restoreFn,
        message: 'x',
      });
    });

    await waitFor(() => expect(mockToast).toHaveBeenCalled());

    const opts = mockToast.mock.calls[0][1] as {
      action: { onClick: () => void };
    };
    act(() => opts.action.onClick());

    await waitFor(() => expect(restoreFn).toHaveBeenCalled());
  });

  it('does not show a toast when the delete fails', async () => {
    const qc = newClient();
    const { result } = renderHook(() => useDeleteTaskWithUndo('sp1'), {
      wrapper: wrapperWith(qc),
    });

    act(() => {
      result.current.run({
        deleteFn: vi.fn().mockRejectedValue(new Error('boom')),
        restoreFn: vi.fn(),
        message: 'x',
      });
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(mockToast).not.toHaveBeenCalled();
  });
});
