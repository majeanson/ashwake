import { describe, expect, it } from 'vitest';
import { pickLocale } from '@content/locale';
import { distance, parse } from '@engine/hex';
import { homeOf, reachOf } from '@engine/rules';
import { newWorld, UNLOCKS, type WorldMemory } from '@meta/world';
import { stringsFor } from '@text/index';
import { resolveTheme } from '@theme/index';
import { campFor, createSession } from './store';

/**
 * BEGIN AT CAMP — the last piece of world memory to cross (2026-08-30).
 *
 * `newRun` has taken a `wakeAt` since Stage 1 and the shell passed `null` from
 * the one place that could have passed anything else, because the unlock gates
 * a button this body never built. So the fifth shrine — the last rung of the
 * ladder, appended for Marc's own *"stretch the ledger a bit"* — woke a door
 * onto nothing: it was announced, toasted, listed in the atlas and on the end
 * screen, and changed nothing at all. Same shape as the four inert mechanics
 * and the three inert numbers before it.
 *
 * Marc's anchor is the design (2026-08-19, `ideas/waypoints.md`): **every camp
 * restarts the climb.** Deep ground you HOLD becomes ground you can start
 * from, and the score is measured from where you wake rather than from origin
 * — which is `homeOf`'s whole job, and the reason `mergeRun`'s farthest-reach
 * fold was moved onto it in Ashwake 1.
 */

const ORIGIN = { q: 0, r: 0 };

/** A world with the first `n` shrines woken and these territories held. */
const world = (n: number, territories: readonly string[]): WorldMemory => ({
  ...newWorld(4242),
  shrines: Array.from({ length: n }, (_, i) => `${i + 1},0`),
  territories: [...territories],
});

const session = (wakeAt: string | null) =>
  createSession({
    seed: 4242,
    theme: resolveTheme(null),
    strings: stringsFor(pickLocale(['en'])),
    memory: { claimed: ['9,-4', '3,0'], finds: [], rearmed: {} },
    wakeAt,
  });

describe('whether a world may camp at all', () => {
  it('refuses until the CAMP shrine is woken — the fifth', () => {
    for (let n = 0; n < UNLOCKS.length; n++) {
      expect(campFor(world(n, ['9,-4'])), `${n} shrines opened the camp`).toBeNull();
    }
    expect(campFor(world(UNLOCKS.length, ['9,-4']))).toBe('9,-4');
  });

  it('refuses a fully-awake world that holds no ground', () => {
    // The unlock is not the offer: a camp is a place, and a world with no
    // territory has nowhere to wake.
    expect(campFor(world(UNLOCKS.length, []))).toBeNull();
  });

  it('has nothing to offer where there is no world', () => {
    expect(campFor(null)).toBeNull();
  });

  it('wakes at the FARTHEST territory held, not the first claimed', () => {
    const at = campFor(world(UNLOCKS.length, ['2,0', '11,-5', '4,1']));
    expect(at).toBe('11,-5');
    expect(distance(parse(at!), ORIGIN)).toBe(11);
  });
});

describe('a run that begins at camp', () => {
  it('grows the plane from the camp instead of from origin', () => {
    const camped = session('9,-4').get().state;
    expect(camped.wakeAt).toBe('9,-4');
    expect(homeOf(camped)).toEqual(parse('9,-4'));
    // The board it opens is around the camp: origin is not on it.
    expect(camped.cells['9,-4']).toBeDefined();
    expect(camped.cells['0,0']).toBeUndefined();
  });

  it('measures the climb from where it woke, so the camp is not free reach', () => {
    // The bug this anchoring exists for, stated: a camp run that measured
    // from origin would bank a farthest of 9 before placing a single tile,
    // and REACH 20 — a 25-relic goal — could be minted by waking far out and
    // putting down one hex.
    expect(reachOf(session('9,-4').get().state)).toBe(0);
    expect(reachOf(session(null).get().state)).toBe(0);
  });

  it('is off unless it is asked for — every other run still wakes at origin', () => {
    const plain = session(null).get().state;
    expect(plain.wakeAt).toBeNull();
    expect(homeOf(plain)).toEqual(ORIGIN);
    expect(plain.cells['0,0']).toBeDefined();
  });

  it('carries the world it was lent, exactly as an ordinary run does', () => {
    // A camp is a way into THIS world, so it starts holding what the world
    // holds — and `startingPerk` reads that list, which is what makes a camp
    // run a richer one rather than merely a farther one.
    const camped = session('9,-4').get().state;
    expect(camped.claimed).toEqual(['9,-4', '3,0']);
    expect(camped.tiles).toBeGreaterThan(camped.tuning.startingTiles);
  });
});
