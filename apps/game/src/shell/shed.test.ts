import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TUNING } from '@content/tuning';
import { newRun } from '@engine/reduce';
import type { ShedRungId } from '@meta/shedLadder';
import { newWorld } from '@meta/world';
import {
  clearEverything,
  onShed,
  readRun,
  readTimeline,
  writeRun,
  writeTimeline,
  writeWorld,
} from './storage';

/**
 * A full disk sheds; it does not lose the run.
 *
 * `meta/shedLadder.ts` has existed since the rules were lifted and had no
 * caller: `write` swallowed the quota error with a comment saying the next
 * write would be the retry. That is true right up until the disk is genuinely
 * full, and then every write fails forever and **the run in progress — the one
 * thing on the device that cannot be regenerated — is what dies.**
 *
 * The ladder's ORDER survived a real bug (Ashwake 1, 2026-08-20): an earlier
 * version shed a world while leaving its run, so the next boot minted a fresh
 * world and resumed a run whose seed no longer matched it. Hence: cheap things
 * first, and never the world being played.
 *
 * **Named for its SUBJECT, not for a module** — the one place this directory
 * departs from `x.ts` ↔ `x.test.ts`, and deliberately. What it pins crosses
 * several files at once and belongs to none of them; a name that picked one
 * would send a reader to the wrong place for the other half. `bridge`, `camp`,
 * `homeworld`, `shed` and `shelf` are the five, and they are the five that
 * describe a behaviour rather than a file (noted 2026-09-02).
 */

/** A `localStorage` that refuses to grow past `room` entries. */
function fullAfter(room: number): Storage {
  const held = new Map<string, string>();
  return {
    get length() {
      return held.size;
    },
    key: (i: number) => [...held.keys()][i] ?? null,
    getItem: (k: string) => held.get(k) ?? null,
    removeItem: (k: string) => void held.delete(k),
    clear: () => held.clear(),
    setItem(k: string, v: string) {
      if (!held.has(k) && held.size >= room) {
        const err = new Error('QuotaExceededError');
        err.name = 'QuotaExceededError';
        throw err;
      }
      held.set(k, v);
    },
  };
}

beforeEach(() => clearEverything());
afterEach(() => vi.unstubAllGlobals());

describe('a write that will not fit', () => {
  it('sheds the diary and saves the run anyway', () => {
    const spent: ShedRungId[] = [];
    // Unsubscribed after the assertion: `onShed` hands one back since
    // 2026-09-02, and a registry that accumulates across tests is a listener
    // from the last test still counting during this one.
    const stop = onShed((rung) => spent.push(rung));

    // Two slots of room: enough for the diary, not enough for the diary AND
    // the run that arrives after it.
    vi.stubGlobal('localStorage', fullAfter(2));
    writeTimeline([{ at: 1, kind: 'world', event: 'settled', slot: 1, worldSeed: 7 }]);
    // Fill the remaining slot so the run has nowhere to go.
    writeWorld(1, newWorld(7));

    const run = newRun(7, TUNING);
    writeRun(1, run);

    // The run landed, and the ladder says what it cost.
    expect(readRun(1)).not.toBeNull();
    expect(spent.length).toBeGreaterThan(0);
    // Nothing above the diary was needed, so nothing above it was spent.
    expect(spent).not.toContain('otherWorlds');
    expect(readTimeline()).toHaveLength(0);
    stop();
  });

  it('spends the cheapest rung it can and stops there', () => {
    const spent: ShedRungId[] = [];
    // Unsubscribed after the assertion: `onShed` hands one back since
    // 2026-09-02, and a registry that accumulates across tests is a listener
    // from the last test still counting during this one.
    const stop = onShed((rung) => spent.push(rung));

    vi.stubGlobal('localStorage', fullAfter(1));
    writeTimeline([{ at: 1, kind: 'world', event: 'settled', slot: 1, worldSeed: 7 }]);
    writeRun(1, newRun(7, TUNING));

    expect(readRun(1)).not.toBeNull();
    // The FIRST rung that frees enough room is the last one spent — the
    // ladder climbs, it does not empty itself.
    expect(spent).toHaveLength(1);
    stop();
  });

  it('never gives up the world being played', () => {
    onShed(() => undefined);
    vi.stubGlobal('localStorage', fullAfter(3));

    writeWorld(1, newWorld(7));
    writeWorld(2, newWorld(8));
    writeTimeline([{ at: 1, kind: 'world', event: 'settled', slot: 1, worldSeed: 7 }]);
    // Slot 1 is active by default, so slot 2 is the one the ladder may spend.
    writeRun(1, newRun(7, TUNING));

    expect(readRun(1)).not.toBeNull();
  });
});
