import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TUNING } from '@content/tuning';
import { newRun } from '@engine/reduce';
import type { ShedRungId } from '@meta/shedLadder';
import { newWorld } from '@meta/world';
import {
  clearEverything,
  holdShed,
  onShed,
  readRun,
  readTimeline,
  takeHeldSheds,
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

beforeEach(() => {
  clearEverything();
  // The pen is module state: a report kept by the last test is a report this
  // one would find. Emptied here rather than in each test that fills it.
  takeHeldSheds();
});
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
    /*
     * UNSUBSCRIBED, like the two above (2026-09-13).
     *
     * This one dropped its handle, so a no-op listener stayed in the registry
     * for the rest of the file. Harmless while every test only counted its
     * OWN reports — and not harmless at all once a test asked what happens
     * when NOBODY is listening, which is what `a shed report with nowhere to
     * say it` below is about: the leaked listener made the watcher set
     * non-empty and the reports were delivered to it instead of being kept.
     * Two tests failed on a fixture rather than on the subject.
     */
    const stop = onShed(() => undefined);
    vi.stubGlobal('localStorage', fullAfter(3));

    writeWorld(1, newWorld(7));
    writeWorld(2, newWorld(8));
    writeTimeline([{ at: 1, kind: 'world', event: 'settled', slot: 1, worldSeed: 7 }]);
    // Slot 1 is active by default, so slot 2 is the one the ladder may spend.
    writeRun(1, newRun(7, TUNING));

    expect(readRun(1)).not.toBeNull();
    stop();
  });
});

/**
 * A REPORT THAT HAS NOWHERE TO GO IS KEPT (2026-09-13, `PASS.md` P8.2).
 *
 * Marc's ruling: a rung spent before the game is on screen is said at the
 * first board frame, not at the front door. Two ways the sentence was lost,
 * and the first build of this fixed only one of them:
 *
 *  1. **Nobody subscribed yet.** The boot write can run before `App` mounts,
 *     and `reportShed` into an empty watcher set used to be a no-op.
 *  2. **Subscribed, with no screen.** `App` registers in an effect and `.toast`
 *     is rendered only while `playing`, so a report delivered at the front door
 *     sets a note that nothing displays. This is the one that actually
 *     happened, and holding only case 1 caught nothing at all.
 *
 * One pen for both, so there is one thing to drain. Unit tests rather than an
 * e2e one, and that is a finding rather than a preference — see the skip in
 * `e2e/quota.spec.ts`: a full device cannot be staged in a real Chromium,
 * because a store at quota loses a seeded value across the reload whether or
 * not this game is running at all.
 */
describe('a shed report with nowhere to say it', () => {
  it('is kept when nothing is listening, and handed over once', () => {
    vi.stubGlobal('localStorage', fullAfter(1));
    writeTimeline([{ at: 1, kind: 'world', event: 'settled', slot: 1, worldSeed: 7 }]);
    // No `onShed` anywhere: this is the boot write, before the shell exists.
    writeRun(1, newRun(7, TUNING));

    expect(takeHeldSheds(), 'a rung spent with no listener was dropped').toContain('timeline');
    expect(takeHeldSheds(), 'the pen was handed over twice').toHaveLength(0);
  });

  it('is not kept when somebody is listening', () => {
    const spent: ShedRungId[] = [];
    const stop = onShed((rung) => spent.push(rung));

    vi.stubGlobal('localStorage', fullAfter(1));
    writeTimeline([{ at: 1, kind: 'world', event: 'settled', slot: 1, worldSeed: 7 }]);
    writeRun(1, newRun(7, TUNING));

    expect(spent).toContain('timeline');
    expect(takeHeldSheds(), 'a report that WAS shown was also penned').toHaveLength(0);
    stop();
  });

  it('can be put back by a listener that has no screen', () => {
    // What `App` does at the front door: subscribed, and nowhere to speak.
    const stop = onShed((rung) => holdShed(rung));

    vi.stubGlobal('localStorage', fullAfter(1));
    writeTimeline([{ at: 1, kind: 'world', event: 'settled', slot: 1, worldSeed: 7 }]);
    writeRun(1, newRun(7, TUNING));

    expect(takeHeldSheds(), 'a listener with no screen could not put it back').toContain(
      'timeline',
    );
    stop();
  });

  it('keeps each rung once, however many writes spend it', () => {
    vi.stubGlobal('localStorage', fullAfter(1));
    writeTimeline([{ at: 1, kind: 'world', event: 'settled', slot: 1, worldSeed: 7 }]);
    // A full device spends the same rung on write after write. The pen must
    // not become a queue that grows for as long as nobody is looking.
    for (let n = 0; n < 5; n++) {
      writeTimeline([{ at: n, kind: 'world', event: 'settled', slot: 1, worldSeed: 7 }]);
      writeRun(1, newRun(7, TUNING));
    }

    expect(takeHeldSheds().filter((r) => r === 'timeline')).toHaveLength(1);
  });
});
