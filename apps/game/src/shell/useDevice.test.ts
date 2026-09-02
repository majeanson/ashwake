import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { TEACH_IDS } from '@meta/progress';
import { newWorld } from '@meta/world';
import {
  clearEverything,
  readRun,
  readShopLevels,
  setActiveSlot,
  writeShopLevels,
  writeWorld,
} from './storage';
import { useDevice } from './useDevice';

/**
 * WHAT THIS DEVICE REMEMBERS, and the one thing it owns outright (2026-09-02).
 *
 * `useDevice.ts` is 300 lines holding every piece of device state — the
 * settings, the teaching ledger, which world is open — and it had no test of
 * its own, while `shelf.test.ts` and `homeworld.test.ts` reached through it for
 * facts about somewhere else. That is a file being USED by tests without being
 * TESTED by them.
 *
 * What is pinned here is what belongs to this hook and to nothing else:
 *
 *   - **The keeper's lifetime.** Its own docblock calls it the point of the
 *     file — *"switching slots drops the old keeper before the new one exists,
 *     so there is no moment when two keepers could both write to the same
 *     world"* — and it is the thing that has already gone wrong: the unmount
 *     cleanup captured the keeper from MOUNT, so after any `move()` the one
 *     actually holding the run was never dropped and the original was dropped
 *     twice. Found by the rules of hooks, once they were pointed at `.ts`.
 *   - **`?taught=1` fills the teaching ledger and NOTHING else.** It used to
 *     hand over a whole replacement `Progress`, which erased a device history
 *     the moment one existed (2026-08-30, the shop that photographed 0 relics).
 *   - **The build belongs to the world**, and to the slot the player will come
 *     back to rather than to the daily they walked through.
 */

beforeEach(() => {
  clearEverything();
  setActiveSlot(1);
});

describe('the keeper', () => {
  it('hands the run on rather than leaving two writers on one world', () => {
    const { result } = renderHook(() => useDevice({}));
    const first = result.current.keeper;

    act(() => result.current.setDaily('2026-09-02'));
    const second = result.current.keeper;

    // A new PLACE is a new keeper, and the old one is refused before the new
    // one exists — which is what stops a pending write from the world landing
    // in the daily.
    expect(second, 'the daily kept the world’s keeper').not.toBe(first);
    expect(first.alive()).toBe(false);
    expect(second.alive()).toBe(true);
  });

  it('drops the keeper it is HOLDING when the page goes, not the one it opened with', () => {
    const { result, unmount } = renderHook(() => useDevice({}));
    act(() => result.current.setDaily('2026-09-02'));
    const second = result.current.keeper;

    unmount();

    // The bug this pins: the cleanup captured `first` at mount, so `second` —
    // the one with the interval and the pending write — outlived the page,
    // and `first` was dropped a second time.
    expect(second.alive(), 'the live keeper survived the page').toBe(false);
  });

  it('comes back to the world after the daily, on a keeper of the world’s own', () => {
    const { result } = renderHook(() => useDevice({}));
    act(() => result.current.setDaily('2026-09-02'));
    const inDaily = result.current.keeper;
    act(() => result.current.setDaily(null));

    expect(result.current.daily).toBeNull();
    expect(inDaily.alive()).toBe(false);
    expect(result.current.keeper.alive()).toBe(true);
  });
});

describe('?taught=1', () => {
  it('fills the teaching ledger and touches nothing else', () => {
    writeShopLevels(1, { tiles: 4 });
    writeWorld(1, { ...newWorld(11), perks: ['openhand'], worn: 'openhand' });

    const { result } = renderHook(() => useDevice({ taught: true }));

    for (const id of TEACH_IDS) expect(result.current.progress.met).toContain(id);
    // The 2026-08-30 bug: a whole replacement `Progress` built on
    // `EMPTY_PROGRESS` threw away the build and the shelf on the way in, and
    // the audit's three-hundred-run shop photographed a purse of nothing.
    expect(result.current.progress.bought, 'the build was erased').toEqual({ tiles: 4 });
    expect(result.current.progress.found, 'the shelf was erased').toEqual(['openhand']);
  });

  it('is an override and never a write: the device is not taught by being asked', () => {
    renderHook(() => useDevice({ taught: true }));
    // A fixture is a lens on a device, not a change to one. Rendering the hook
    // again without the flag has to give a virgin ledger back.
    const { result } = renderHook(() => useDevice({}));
    expect(result.current.progress.met).toEqual([]);
  });
});

describe('the shop levels', () => {
  it('are written beside the world they were bought in', () => {
    const { result } = renderHook(() => useDevice({}));
    act(() => result.current.setProgress((was) => ({ ...was, bought: { tiles: 2 } })));
    expect(readShopLevels(1)).toEqual({ tiles: 2 });
    expect(readShopLevels(2), 'a purchase leaked into another world').toBeNull();
  });

  it('follow the SLOT, not the place — a daily has no shop of its own', () => {
    const { result } = renderHook(() => useDevice({}));
    act(() => result.current.setDaily('2026-09-02'));
    act(() => result.current.setProgress((was) => ({ ...was, bought: { odds: 1 } })));
    // Bought on the way through the daily, and it belongs to the world the
    // player will come back to.
    expect(readShopLevels(1)).toEqual({ odds: 1 });
  });
});

describe('where a run is written', () => {
  it('is the place, not the slot: a daily never lands in a world’s key', () => {
    const { result } = renderHook(() => useDevice({}));
    act(() => result.current.setDaily('2026-09-02'));
    // The reason the keeper is made from the PLACE and the place is set before
    // anything else — see `shell/beginning.ts`.
    expect(result.current.daily).toBe('2026-09-02');
    expect(result.current.slot, 'the daily took the world with it').toBe(1);
    expect(readRun(1)).toBeNull();
  });
});
