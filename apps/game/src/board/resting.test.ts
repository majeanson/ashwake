import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REST_MS, useResting } from './resting';

/**
 * WHEN THE BOARD STOPS BREATHING, AND HOW FAST IT WAKES (P5.4).
 *
 * The whole subject is a clock, so the whole test is fake timers. What it pins
 * is the pair of promises the feature rests on: it sleeps only after a real
 * pause, and it wakes on the FIRST touch — because a board that takes a moment
 * to come back would be a worse bug than the battery it saves.
 */

describe('resting', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('is awake while the pause is still short', () => {
    const { result } = renderHook(() => useResting(REST_MS));
    expect(result.current).toBe(false);
    act(() => {
      vi.advanceTimersByTime(REST_MS - 1);
    });
    expect(result.current, 'the board rested a millisecond early').toBe(false);
  });

  it('rests once nothing has happened for long enough', () => {
    const { result } = renderHook(() => useResting(REST_MS));
    act(() => {
      vi.advanceTimersByTime(REST_MS);
    });
    expect(result.current, 'the board never stopped breathing').toBe(true);
  });

  /*
   * Each of the four, separately: a list like this is exactly the kind that
   * loses an entry in a refactor, and the one that goes is always the one
   * nobody tested. `keydown` matters most — it is the whole keyboard path, and
   * `e2e/a11y.spec.ts` plays entire runs on it.
   */
  for (const event of ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const) {
    it(`wakes on ${event}, immediately`, () => {
      const { result } = renderHook(() => useResting(REST_MS));
      act(() => {
        vi.advanceTimersByTime(REST_MS);
      });
      expect(result.current).toBe(true);

      act(() => {
        window.dispatchEvent(new Event(event));
      });
      expect(result.current, `${event} did not wake the board`).toBe(false);
    });
  }

  it('rests again after the wake, on the same clock', () => {
    const { result } = renderHook(() => useResting(REST_MS));
    act(() => {
      vi.advanceTimersByTime(REST_MS);
    });
    act(() => {
      window.dispatchEvent(new Event('pointerdown'));
    });
    act(() => {
      vi.advanceTimersByTime(REST_MS - 1);
    });
    expect(result.current, 'the second pause was shorter than the first').toBe(false);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);
  });

  /*
   * A tab nobody is looking at is the clearest case there is, and it does not
   * wait for the pause: hidden means resting at once.
   */
  it('rests the moment the tab goes away, and wakes when it comes back', () => {
    const { result } = renderHook(() => useResting(REST_MS));
    const visibility = vi.spyOn(document, 'visibilityState', 'get');

    visibility.mockReturnValue('hidden');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current, 'a hidden tab kept breathing').toBe(true);

    visibility.mockReturnValue('visible');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current, 'coming back did not wake it').toBe(false);
    visibility.mockRestore();
  });

  /**
   * THE DIAL THAT ZEROES IT, which `CLAUDE.md` asks of every system.
   *
   * `?rest=0` must behave exactly like every build before this one: no sleep,
   * ever, however long the pause. Checked in both directions — including that
   * turning it off wakes a board that had already rested, which is why the
   * hook derives its answer rather than storing it.
   */
  it('never rests when the dial is zero', () => {
    const { result } = renderHook(() => useResting(0));
    act(() => {
      vi.advanceTimersByTime(REST_MS * 10);
    });
    expect(result.current, 'the off switch did not turn it off').toBe(false);
  });

  it('wakes a resting board when the dial is turned off', () => {
    const { result, rerender } = renderHook(({ ms }: { ms: number }) => useResting(ms), {
      initialProps: { ms: REST_MS },
    });
    act(() => {
      vi.advanceTimersByTime(REST_MS);
    });
    expect(result.current).toBe(true);
    rerender({ ms: 0 });
    expect(result.current, 'the board stayed asleep after the dial was zeroed').toBe(false);
  });
});
