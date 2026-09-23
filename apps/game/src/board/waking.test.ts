import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WAKE_MS, useWaking } from './waking';

/**
 * THE OPENING BEAT IS A CLOCK, so the whole test is fake timers (2026-09-23).
 *
 * What it pins is the three things a beat over a LIVE board has to promise:
 * it does not raise itself, it ends on its own, and a second opening inside
 * one beat restarts the clock rather than stacking a second timer — which is
 * the case a world switch and a NEW RUN from the end screen both produce, and
 * the one where a stacked timer would leave a scrim over a run in progress.
 */

describe('waking', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('does not raise itself', () => {
    const { result } = renderHook(() => useWaking(WAKE_MS));
    expect(result.current.waking, 'the beat was on screen before a run opened').toBe(false);
  });

  it('is on screen for as long as it is given', () => {
    const { result } = renderHook(() => useWaking(WAKE_MS));
    act(() => result.current.wake());
    expect(result.current.waking).toBe(true);
    act(() => {
      vi.advanceTimersByTime(WAKE_MS - 1);
    });
    expect(result.current.waking, 'the beat ended a millisecond early').toBe(true);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.waking, 'the beat never ended').toBe(false);
  });

  /*
   * The stacked-timer case, stated as the bug it would be: open, wait most of
   * the beat, open again. The second beat must run its own full length from
   * the second opening — if the first timer survived, the scrim would lift a
   * fraction of a second into a run the player is already playing.
   */
  it('restarts rather than stacking when a second run opens inside the beat', () => {
    const { result } = renderHook(() => useWaking(WAKE_MS));
    act(() => result.current.wake());
    act(() => {
      vi.advanceTimersByTime(WAKE_MS - 100);
    });
    act(() => result.current.wake());
    act(() => {
      vi.advanceTimersByTime(101);
    });
    expect(result.current.waking, "the first run's timer ended the second run's beat").toBe(true);
    act(() => {
      vi.advanceTimersByTime(WAKE_MS);
    });
    expect(result.current.waking).toBe(false);
  });

  /*
   * `?wake=0`, which is every build before this one. The hook must not merely
   * report false — it must schedule nothing, or a dial turned off would still
   * be running a timer on every opening for the life of the page.
   */
  it('the dial at zero raises nothing and schedules nothing', () => {
    const { result } = renderHook(() => useWaking(0));
    act(() => result.current.wake());
    expect(result.current.waking).toBe(false);
    expect(vi.getTimerCount(), 'a timer was scheduled for a beat that never shows').toBe(0);
  });

  /* Reduced motion reaches this as a zero from `Board`, and the case it has to
     answer is the mid-beat one: the scrim must LIFT, not hang. */
  it('lifts a beat already on screen when the dial goes to zero', () => {
    const { result, rerender } = renderHook(({ ms }) => useWaking(ms), {
      initialProps: { ms: WAKE_MS },
    });
    act(() => result.current.wake());
    expect(result.current.waking).toBe(true);
    rerender({ ms: 0 });
    expect(result.current.waking, 'a scrim was left hanging over a live board').toBe(false);
  });
});
