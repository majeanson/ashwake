import { describe, expect, it } from 'vitest';
import { CROSSING } from '@content/goals';
import { TUNING } from '@content/tuning';
import { newRun } from '@engine/reduce';
import { EMPTY_PROGRESS, type Progress } from '@meta/progress';
import { newWorld } from '@meta/world';
import { worldEventsOf } from '@meta/timeline';
import { carriedBy, cross, dowryOf } from './cross';

/**
 * Leaving a world.
 *
 * Once every unlock is yours, a further shrine has nothing left to give —
 * unless it is the way onward. The two things worth pinning are the two that
 * hurt if they drift: **the offer and the payment are one number**, and
 * **nothing of the place comes with you**.
 */

const state = newRun(7, TUNING);
const held = (territories: number) => ({
  ...newWorld(7),
  territories: Array.from({ length: territories }, (_, i) => `${i + 2},0`),
});

describe('the dowry', () => {
  it('pays a base, and more for a world held thoroughly', () => {
    expect(dowryOf(newWorld(7))).toBe(CROSSING.baseRelics);
    expect(dowryOf(held(4))).toBe(CROSSING.baseRelics + 4 * CROSSING.relicsPerTerritory);
    // Finishing a world pays better than rushing its exit — the whole reason
    // this is not a flat number.
    expect(dowryOf(held(4))).toBeGreaterThan(dowryOf(held(0)));
  });

  it('answers for a world that does not exist yet', () => {
    expect(dowryOf(null)).toBe(CROSSING.baseRelics);
  });
});

describe('crossing', () => {
  const now = {
    state,
    world: held(2),
    progress: { ...EMPTY_PROGRESS, relics: 5 },
    timeline: [],
    seed: 99,
    at: 1_756_000_000_000,
  };

  it('pays exactly what it offered', () => {
    // The one bug that cannot be allowed here: the card says one figure and
    // the bank takes another, and the player only finds out once the world is
    // gone. Both come from `carriedBy`, so they are the same by construction.
    const after = cross(now);
    expect(after.carried).toBe(carriedBy(now.state, now.world));
    expect(after.progress.relics).toBe(now.progress.relics + after.carried);
  });

  it('carries the run home as well as the dowry', () => {
    // A crossing pays what walking to that shrine and STOPPING would have
    // paid, plus the dowry — `endingPayout` is the engine's own arithmetic.
    expect(carriedBy(state, held(2))).toBeGreaterThanOrEqual(dowryOf(held(2)));
  });

  it('leaves the place behind and takes nothing of it', () => {
    const after = cross(now);
    expect(after.world.worldSeed).toBe(99);
    expect(after.world.territories).toHaveLength(0);
    expect(after.world.shrines).toHaveLength(0);
    expect(after.world.revealed).toHaveLength(0);
  });

  it('keeps the perks, because those are the DEVICE and not the place', () => {
    const withPerks = { ...now, progress: { ...now.progress, found: ['stonewalker' as const] } };
    expect(cross(withPerks).progress.found).toEqual(['stonewalker']);
  });

  it('writes the world it LEFT into the diary, with what it paid', () => {
    const after = cross(now);
    const [entry] = worldEventsOf(after.timeline, null).filter((e) => e.event === 'crossed');
    expect(entry?.worldSeed).toBe(held(2).worldSeed);
    expect(entry?.n).toBe(after.carried);
  });
});

/**
 * What the card promises, and what actually happens.
 *
 * The crossing's card says "the ground, the territories, the shrines you woke
 * here and everything you have BOUGHT stay behind". Everything but the last
 * clause was true when it was written: upgrade levels lived on the device, so
 * crossing kept the whole build and the dowry was a bonus rather than the
 * trade it is tuned as.
 */
describe('what the crossing costs', () => {
  const built = {
    state,
    world: held(2),
    progress: {
      ...EMPTY_PROGRESS,
      relics: 5,
      found: ['stonewalker' as const],
      // A real upgrade id: an invented one would make every assertion below
      // pass without proving anything.
      bought: { tiles: 3 } as Progress['bought'],
    },
    timeline: [],
    seed: 99,
    at: 1,
  };

  it('leaves the build behind', () => {
    expect(cross(built).progress.bought).toEqual({});
  });

  it('still carries the relics and the perks', () => {
    const after = cross(built);
    expect(after.progress.relics).toBeGreaterThan(built.progress.relics);
    expect(after.progress.found).toEqual(['stonewalker']);
  });

  it('makes the dowry a trade rather than a bonus', () => {
    // The whole point of the number: a world held thoroughly pays more to
    // leave, and leaving costs you the build you paid for there.
    expect(cross(built).progress.bought).not.toEqual(built.progress.bought);
    expect(cross(built).carried).toBeGreaterThan(0);
  });
});
