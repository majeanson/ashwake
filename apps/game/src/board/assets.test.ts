import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ART_HOLD_MS, NO_ASSETS, preloadAssets, useAssets } from './assets';

/**
 * THE BOARD WAITS FOR ITS ART, BRIEFLY, AND NEVER TWICE (2026-09-11).
 *
 * What is pinned is the three answers `useAssets` can give and the order they
 * come in: nothing while the PNGs are worth waiting for, the procedural floor
 * once they are not, and the book the moment it lands — at once, if it landed
 * before the board mounted. The fourth promise is the one that matters most
 * to a phone: a direction change never takes the board away.
 *
 * The line is a `fetch` that answers when told to. Each direction gets its own
 * because the loader keeps one promise per direction for the life of the
 * module — which is the feature, and is why the pending one is never opened.
 */

/** A fetch that answers only when told to. */
function line(): { readonly open: () => void; readonly fetch: ReturnType<typeof vi.fn> } {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const fetch = vi.fn(async () => {
    await gate;
    return new Response('{}', { status: 200 });
  });
  vi.stubGlobal('fetch', fetch);
  return { open: release, fetch };
}

describe('the art, or nothing, or the floor', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('answers nothing while the art is on its way, then the floor at the cap', () => {
    vi.useFakeTimers();
    line();
    const { result } = renderHook(() => useAssets('settlement', true));
    expect(result.current, 'the field drew before the art had a chance').toBeNull();
    act(() => {
      vi.advanceTimersByTime(ART_HOLD_MS - 1);
    });
    expect(result.current).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current, 'the cap did not let the floor draw').toBe(NO_ASSETS);
  });

  it('hands over the book the moment it lands', async () => {
    const wire = line();
    const { result } = renderHook(() => useAssets('daylight', true));
    expect(result.current).toBeNull();
    wire.open();
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current, 'the book was the floor').not.toBe(NO_ASSETS);
  });

  it('answers at once when the book was preloaded before the board mounted', async () => {
    line().open();
    await preloadAssets('daylight');
    const { result } = renderHook(() => useAssets('daylight', true));
    expect(result.current).not.toBeNull();
    expect(result.current).not.toBe(NO_ASSETS);
  });

  it('asks for nothing when the dial is at zero', () => {
    const wire = line();
    const { result } = renderHook(() => useAssets('settlement', false));
    expect(result.current).toBe(NO_ASSETS);
    expect(wire.fetch).not.toHaveBeenCalled();
  });

  /*
   * There is a board on screen when the direction changes, and a field that
   * vanished for a second while the new PNGs arrived would be worse than the
   * floor — so the hold is for the FIRST board only.
   */
  it('never takes the board away on a direction change', async () => {
    line().open();
    await preloadAssets('daylight');
    const { result, rerender } = renderHook(
      ({ id }: { id: 'daylight' | 'settlement' }) => useAssets(id, true),
      { initialProps: { id: 'daylight' } },
    );
    expect(result.current).not.toBeNull();
    rerender({ id: 'settlement' });
    expect(result.current, 'the field vanished on a direction change').toBe(NO_ASSETS);
  });
});
