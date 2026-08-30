import { beforeEach, describe, expect, it } from 'vitest';
import { TUNING } from '@content/tuning';
import { parse } from '@engine/hex';
import { destinationAt, findAt } from '@engine/world';
import { metGoalIds, newlyMetGoals } from '@meta/goals';
import { canAfford, levelOf, UPGRADES, withWorldPerks } from '@meta/progress';
import { knownFraction, UNLOCKS } from '@meta/world';
import { FIXTURE_SEED, historyAsked, purseAfter, seedDevice, worldAged } from './fixture';
import { clearEverything, memoryFor, readProgress, readTimeline, readWorld } from './storage';

/**
 * The instrument, held against itself.
 *
 * A fixture that lies is worse than no fixture: a screenshot of an impossible
 * device teaches you to distrust the whole report. So the two questions here
 * are the two a picture cannot answer — is every landmark it claims a REAL
 * landmark on that seed, and does a three-hundred-run world actually differ
 * from a five-run one in every number a player can see?
 *
 * The second is the one the last two sessions needed. `0 relics · 0 of 5
 * shrines` on a world played three hundred times is the shape both of
 * 2026-08-30's bugs would have taken here.
 */

const YOUNG = 5;
const OLD = 300;

beforeEach(() => {
  clearEverything();
});

describe('a fixture world is made of real ground', () => {
  const world = worldAged(FIXTURE_SEED, OLD);

  it('claims only hexes that actually hold a territory', () => {
    expect(world.territories.length).toBeGreaterThan(0);
    for (const k of world.territories) {
      const { q, r } = parse(k);
      expect(destinationAt(FIXTURE_SEED, q, r, TUNING)?.reward, `${k} is not a territory`).toBe(
        'territory',
      );
    }
  });

  it('wakes only hexes that actually hold a shrine', () => {
    expect(world.shrines).toHaveLength(UNLOCKS.length);
    for (const k of world.shrines) {
      const { q, r } = parse(k);
      expect(destinationAt(FIXTURE_SEED, q, r, TUNING)?.reward, `${k} is not a shrine`).toBe(
        'shrine',
      );
    }
  });

  it('takes only hexes that actually hide a find', () => {
    expect(world.finds.length).toBeGreaterThan(0);
    for (const k of world.finds) {
      const { q, r } = parse(k);
      expect(findAt(FIXTURE_SEED, q, r, TUNING), `${k} hides no find`).not.toBeNull();
    }
  });

  it('holds a perk for the finds it took, and wears one', () => {
    expect(world.perks.length).toBeGreaterThan(0);
    expect(world.perks.length).toBeLessThanOrEqual(world.finds.length);
    expect(world.worn).not.toBeNull();
  });

  /**
   * The atlas's one fraction. A filled disc would read 100% for every world
   * past its first run, which is a story about a plane that is not infinite.
   */
  it('knows a lot of its world without knowing all of it', () => {
    const known = knownFraction(world);
    expect(known).toBeGreaterThan(0.3);
    expect(known).toBeLessThan(1);
  });
});

describe('three hundred runs in does not look like five', () => {
  const young = worldAged(FIXTURE_SEED, YOUNG);
  const old = worldAged(FIXTURE_SEED, OLD);

  it('reaches further, holds more, and wakes more', () => {
    expect(old.farthestReach).toBeGreaterThan(young.farthestReach);
    expect(old.territories.length).toBeGreaterThan(young.territories.length);
    expect(old.shrines.length).toBeGreaterThan(young.shrines.length);
    expect(old.bestPoints).toBeGreaterThan(young.bestPoints);
    expect(old.revealed.length).toBeGreaterThan(young.revealed.length);
  });

  it('has met milestones the young world has not', () => {
    const survey = (w: typeof old) =>
      metGoalIds(w, withWorldPerks(purseAfter(w, 1), w.perks, w.worn));
    expect(survey(old).length).toBeGreaterThan(survey(young).length);
  });

  /**
   * And has already been PAID for them. A world whose `goalsMet` is empty owes
   * every reward at once, so the next run to end in it dumps a lump of relics
   * and prints four GOAL MET lines — a picture of a milestone taken at the
   * wrong moment.
   */
  it('has already been paid for the milestones it met', () => {
    expect(old.goalsMet.length).toBeGreaterThan(0);
    expect([...old.goalsMet].sort()).toEqual(
      [...metGoalIds(old, withWorldPerks(purseAfter(old, OLD), old.perks, old.worn))].sort(),
    );
    // And nothing is claimed that the world has not reached.
    expect(newlyMetGoals(old, withWorldPerks(purseAfter(old, OLD), old.perks, old.worn))).toEqual(
      [],
    );
  });

  it('banks relics and spends some of them, in both ages', () => {
    for (const [age, world] of [
      [YOUNG, young],
      [OLD, old],
    ] as const) {
      const purse = purseAfter(world, age);
      expect(purse.relics, `a world ${age} runs deep banked nothing`).toBeGreaterThan(0);
      const levels = UPGRADES.reduce((n, u) => n + levelOf(purse, u.id), 0);
      expect(levels, `a world ${age} runs deep bought nothing`).toBeGreaterThan(0);
    }
    expect(UPGRADES.reduce((n, u) => n + levelOf(purseAfter(old, OLD), u.id), 0)).toBeGreaterThan(
      UPGRADES.reduce((n, u) => n + levelOf(purseAfter(young, YOUNG), u.id), 0),
    );
  });

  /**
   * The MIDDLE age is the one the shop is worth photographing at, and this is
   * the assertion that says why the audit has three ages rather than two.
   *
   * A shop needs rows on both sides of the line to be a picture of anything: a
   * spend that emptied the purse makes every row unaffordable, which looks
   * exactly like a purse that never earned. At three hundred runs the ladder
   * is simply finished — every upgrade maxed, nothing left to buy — which is a
   * true and useful picture, and a different one.
   */
  it('leaves a mid-life shop with something affordable and something not', () => {
    const mid = worldAged(FIXTURE_SEED, 30);
    const purse = purseAfter(mid, 30);
    expect(UPGRADES.some((u) => canAfford(purse, u))).toBe(true);
    expect(UPGRADES.some((u) => !canAfford(purse, u))).toBe(true);
  });

  it('finishes the ladder by three hundred runs', () => {
    const purse = purseAfter(old, OLD);
    for (const upgrade of UPGRADES) {
      expect(levelOf(purse, upgrade.id), `${upgrade.id} was still buyable`).toBe(upgrade.levels);
    }
  });
});

describe('seeding the device', () => {
  it('writes a played world, a younger one, and leaves the third empty', () => {
    seedDevice(OLD);
    expect(readWorld(1)?.runs).toBe(OLD);
    expect(readWorld(2)?.runs).toBeGreaterThan(0);
    expect(readWorld(2)?.runs).toBeLessThan(OLD);
    expect(readWorld(3), 'the worlds panel needs an empty row to photograph').toBeNull();
  });

  it('lends the opened world its own ground back', () => {
    seedDevice(OLD);
    const world = readWorld(1)!;
    // The same seam a real returning run comes through: the world's seed, and
    // what `memoryFor` hands `newRun`.
    expect(memoryFor(1, world.worldSeed).claimed).toEqual(world.territories);
  });

  it('fills the purse, the shop, the diary and the shelf', () => {
    seedDevice(OLD);
    const progress = readProgress();
    expect(progress.relics).toBeGreaterThan(0);
    expect(Object.keys(progress.bought).length).toBeGreaterThan(0);
    expect(readTimeline().length).toBeGreaterThan(0);
    // The teaching ledger is met, or every screen is a picture of a card.
    expect(progress.met.length).toBeGreaterThan(0);
  });

  it('is the same device twice — a fixture nobody can compare is not one', () => {
    seedDevice(OLD);
    const first = readWorld(1);
    clearEverything();
    seedDevice(OLD);
    expect(readWorld(1)).toEqual(first);
  });
});

describe('the query it answers to', () => {
  it('reads a count, and nothing else', () => {
    expect(historyAsked('?runs=300')).toBe(300);
    expect(historyAsked('?runs=5&theme=daylight')).toBe(5);
    expect(historyAsked('?theme=daylight')).toBeNull();
    expect(historyAsked('?runs=')).toBeNull();
    expect(historyAsked('?runs=nope')).toBeNull();
    // A player's device is never seeded by accident: zero and below are not
    // a history, they are a typo.
    expect(historyAsked('?runs=0')).toBeNull();
    expect(historyAsked('?runs=-4')).toBeNull();
  });
});
