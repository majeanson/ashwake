import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newRun } from '@engine/reduce';
import { dailySeed } from '@meta/daily';
import { TUNING } from '@content/tuning';
import { newWorld } from '@meta/world';
import { keeperFor } from './keeper';
import { clearEverything, readDailyRun, readRun, readWorld, SLOTS } from './storage';

/**
 * **The relic farm, made structurally impossible.**
 *
 * Ashwake 1, 2026-08-19: a crossing moves a run from one world into another,
 * and if the OLD session is still alive when the new one starts — a pending
 * save, an app resumed from the background mid-fade — it writes its own state
 * over the world just crossed into, and the relics spent to cross come back.
 * In a loop, the economy is over.
 *
 * Every test here is that shape. None of them is about care; all of them are
 * about a keeper having a lifetime.
 */

const state = () => newRun(7, TUNING);

describe('a keeper', () => {
  beforeEach(() => {
    clearEverything();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    clearEverything();
  });

  it('remembers a run, once it settles', () => {
    const keeper = keeperFor(1);
    keeper.saveRun(state());
    // Not yet: every placement writing synchronously would put a JSON encode
    // of the whole board in the middle of a tap.
    expect(readRun(1)).toBeNull();
    vi.runAllTimers();
    expect(readRun(1)).not.toBeNull();
  });

  it('writes what is pending the moment it is asked to', () => {
    const keeper = keeperFor(1);
    keeper.saveRun(state());
    keeper.flush();
    expect(readRun(1)).not.toBeNull();
  });

  it('writes NOTHING after it is dropped', () => {
    const keeper = keeperFor(1);
    keeper.drop();
    keeper.saveRun(state());
    keeper.saveWorld(newWorld(7));
    keeper.flush();
    vi.runAllTimers();
    expect(readRun(1)).toBeNull();
    expect(readWorld(1)).toBeNull();
  });

  it('drops a save that was already queued when the session ended', () => {
    // THE bug. A timer scheduled before the drop still fires afterwards, so
    // the guard has to live inside the flush and not only at the call sites.
    const keeper = keeperFor(1);
    keeper.saveRun(state());
    keeper.drop();
    vi.runAllTimers();
    expect(readRun(1)).toBeNull();
  });

  it('cannot write over a world the next session already owns', () => {
    // The crossing, in miniature: the old keeper is dropped, the new one takes
    // the slot, and then the old one is asked to save. It must not answer.
    const crossed = newWorld(99);
    const old = keeperFor(1);
    old.saveRun(state());
    old.drop();

    const next = keeperFor(1);
    next.saveWorld(crossed);
    next.flush();

    old.saveWorld(newWorld(7));
    old.flush();
    vi.runAllTimers();

    expect(readWorld(1)?.worldSeed).toBe(crossed.worldSeed);
    expect(readRun(1)).toBeNull();
  });

  it('says whether it is still the one in charge', () => {
    const keeper = keeperFor(1);
    expect(keeper.alive()).toBe(true);
    keeper.drop();
    expect(keeper.alive()).toBe(false);
  });

  it('keeps three worlds apart', () => {
    const one = keeperFor(1);
    const two = keeperFor(2);
    one.saveWorld(newWorld(11));
    two.saveWorld(newWorld(22));
    one.flush();
    two.flush();
    expect(readWorld(1)?.worldSeed).toBe(11);
    expect(readWorld(2)?.worldSeed).toBe(22);
    expect(readWorld(3)).toBeNull();
  });
});

/**
 * The daily is a place, not a fourth world (Stage 4, 2026-08-29).
 *
 * The rule it has to keep is small and the bug it prevents is not: a daily
 * board is every phone's board, so there is no ground "this world" walked and
 * nothing about it may reach a world's memory. The keeper is where that holds,
 * because the keeper is the only thing that writes.
 */
describe('a daily keeper', () => {
  it('writes the board under the date, not under a slot', () => {
    const keeper = keeperFor({ daily: '2026-08-29' });
    /*
     * On THAT DATE'S board, because `readDailyRun` checks the seed as well as
     * the date now (2026-09-09) — and because a daily run on seed 1 is a thing
     * that cannot happen in the game. This said `newRun(1, TUNING)` and passed,
     * which is the same fixture problem `settle.test.ts` had: the assertion is
     * about the keeper's PLACE, and a board it could never have been handed
     * makes that assertion about nothing.
     */
    const state = newRun(dailySeed('2026-08-29'), TUNING);
    keeper.saveRun(state);
    keeper.flush();

    expect(readDailyRun('2026-08-29')).not.toBeNull();
    // And the same board is not offered for any other date.
    expect(readDailyRun('2026-08-30')).toBeNull();
    for (const slot of SLOTS) expect(readRun(slot)).toBeNull();
  });

  it('refuses to write a world at all', () => {
    const keeper = keeperFor({ daily: '2026-08-29' });
    keeper.saveWorld(newWorld(7));
    keeper.flush();
    for (const slot of SLOTS) expect(readWorld(slot)).toBeNull();
  });
});
