import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('a', 300));
    expect(result.current).toBe('a');
  });

  it('only updates after the delay has elapsed', () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), {
      initialProps: { v: 'a' },
    });

    rerender({ v: 'ab' });
    expect(result.current).toBe('a'); // not yet

    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe('a'); // still not

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('ab'); // now updated
  });

  it('coalesces rapid changes into a single update', () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), {
      initialProps: { v: '' },
    });

    rerender({ v: 'b' });
    act(() => vi.advanceTimersByTime(100));
    rerender({ v: 'bu' });
    act(() => vi.advanceTimersByTime(100));
    rerender({ v: 'bug' });
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe(''); // no full window passed yet

    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('bug'); // settles on the final value only
  });
});
