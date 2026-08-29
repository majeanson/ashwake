import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useMediaQuery, useReducedMotion } from './useMedia';

/**
 * A preference is FOLLOWED, not sampled once.
 *
 * This body read `prefers-color-scheme` inside a `useMemo` and `prefers-
 * reduced-motion` nowhere at all. Both matter more here than they would
 * elsewhere because of `CLAUDE.md`'s one-page rule: the only reloads this game
 * allows are the service-worker update and the failure panel, so a preference
 * read at boot is a preference wrong until the player closes the tab. Someone
 * who turns motion down mid-run has almost certainly turned it down BECAUSE of
 * what is on screen, and telling them to restart the game is not an answer.
 */

/** A `matchMedia` whose answers can be changed, the way an OS changes them. */
function fakeMatchMedia(): { set: (query: string, on: boolean) => void } {
  const listeners = new Map<string, Set<(event: MediaQueryListEvent) => void>>();
  const state = new Map<string, boolean>();

  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return state.get(query) ?? false;
    },
    media: query,
    addEventListener: (_: string, fn: (event: MediaQueryListEvent) => void) => {
      const set = listeners.get(query) ?? new Set();
      set.add(fn);
      listeners.set(query, set);
    },
    removeEventListener: (_: string, fn: (event: MediaQueryListEvent) => void) => {
      listeners.get(query)?.delete(fn);
    },
  }));

  return {
    set: (query, on) => {
      state.set(query, on);
      for (const fn of listeners.get(query) ?? []) {
        fn({ matches: on } as MediaQueryListEvent);
      }
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('following a media query', () => {
  it('answers what the device says now', () => {
    const media = fakeMatchMedia();
    media.set('(prefers-reduced-motion: reduce)', true);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('CHANGES when the device changes, without a reload', () => {
    const media = fakeMatchMedia();
    media.set('(prefers-color-scheme: light)', false);
    const { result } = renderHook(() => useMediaQuery('(prefers-color-scheme: light)'));
    expect(result.current).toBe(false);

    act(() => media.set('(prefers-color-scheme: light)', true));
    expect(result.current).toBe(true);

    // And back: a phone crossing sunrise and sunset in one session is the
    // ordinary case, not a clever one.
    act(() => media.set('(prefers-color-scheme: light)', false));
    expect(result.current).toBe(false);
  });

  it('lets go of the listener when it unmounts', () => {
    const media = fakeMatchMedia();
    const { result, unmount } = renderHook(() => useMediaQuery('(prefers-contrast: more)'));
    unmount();
    // A listener that outlives its component sets state on an unmounted tree.
    act(() => media.set('(prefers-contrast: more)', true));
    expect(result.current).toBe(false);
  });

  it('answers false where there is no matchMedia at all', () => {
    // Old WebViews and some test environments. A preference that cannot be
    // read is a preference nobody switched ON, which is the honest default for
    // every query here.
    vi.stubGlobal('matchMedia', undefined);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });
});
