import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { toast } from 'sonner';
import { useMoveTaskWithUndo } from './useMoveTaskWithUndo';

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

describe('useMoveTaskWithUndo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('runs moveFn, calls onMoved and shows an undo toast', async () => {
    const moveFn = vi.fn().mockResolvedValue(undefined);
    const undoFn = vi.fn().mockResolvedValue(undefined);
    const onMoved = vi.fn();
    const qc = newClient();

    const { result } = renderHook(() => useMoveTaskWithUndo('sp1'), {
      wrapper: wrapperWith(qc),
    });

    act(() => {
      result.current.run({
        moveFn,
        undoFn,
        message: 'Tarefa movida para Sprint 3',
        onMoved,
      });
    });

    await waitFor(() => expect(moveFn).toHaveBeenCalled());
    expect(onMoved).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      'Tarefa movida para Sprint 3',
      expect.objectContaining({
        action: expect.objectContaining({ label: 'Desfazer' }),
      }),
    );
  });

  it('invalidates the tasks query after move', async () => {
    const qc = newClient();
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

    const { result } = renderHook(() => useMoveTaskWithUndo('sp1'), {
      wrapper: wrapperWith(qc),
    });

    act(() => {
      result.current.run({
        moveFn: vi.fn().mockResolvedValue(undefined),
        undoFn: vi.fn().mockResolvedValue(undefined),
        message: 'x',
      });
    });

    await waitFor(() => expect(mockToast).toHaveBeenCalled());
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['tasks', 'sp1'] }),
    );
  });

  it('the toast undo action runs undoFn', async () => {
    const undoFn = vi.fn().mockResolvedValue(undefined);
    const qc = newClient();

    const { result } = renderHook(() => useMoveTaskWithUndo('sp1'), {
      wrapper: wrapperWith(qc),
    });

    act(() => {
      result.current.run({
        moveFn: vi.fn().mockResolvedValue(undefined),
        undoFn,
        message: 'x',
      });
    });

    await waitFor(() => expect(mockToast).toHaveBeenCalled());

    const opts = mockToast.mock.calls[0][1] as unknown as {
      action: { onClick: () => void };
    };
    act(() => opts.action.onClick());

    await waitFor(() => expect(undoFn).toHaveBeenCalled());
  });

  it('calls onSettled after a successful move', async () => {
    const onSettled = vi.fn();
    const qc = newClient();

    const { result } = renderHook(() => useMoveTaskWithUndo('sp1'), {
      wrapper: wrapperWith(qc),
    });

    act(() => {
      result.current.run({
        moveFn: vi.fn().mockResolvedValue(undefined),
        undoFn: vi.fn().mockResolvedValue(undefined),
        message: 'x',
        onSettled,
      });
    });

    await waitFor(() => expect(onSettled).toHaveBeenCalled());
  });

  it('calls onSettled even when the move fails', async () => {
    const onSettled = vi.fn();
    const qc = newClient();

    const { result } = renderHook(() => useMoveTaskWithUndo('sp1'), {
      wrapper: wrapperWith(qc),
    });

    act(() => {
      result.current.run({
        moveFn: vi.fn().mockRejectedValue(new Error('boom')),
        undoFn: vi.fn(),
        message: 'x',
        onSettled,
      });
    });

    await waitFor(() => expect(onSettled).toHaveBeenCalled());
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('does not show a toast when the move fails', async () => {
    const qc = newClient();
    const { result } = renderHook(() => useMoveTaskWithUndo('sp1'), {
      wrapper: wrapperWith(qc),
    });

    act(() => {
      result.current.run({
        moveFn: vi.fn().mockRejectedValue(new Error('boom')),
        undoFn: vi.fn(),
        message: 'x',
      });
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(mockToast).not.toHaveBeenCalled();
  });
});
