import { beforeEach, describe, expect, it } from 'vitest';
import { newRun } from '@engine/reduce';
import { pickLocale } from '@content/locale';
import { newWorld } from '@meta/world';
import { stringsFor } from '@text/index';
import { resolveTheme } from '@theme/index';
import { settle } from './settle';
import { createSession } from './store';
import { walkToEnd } from './walk';
import { EMPTY_PROGRESS } from '@meta/progress';
import {
  clearEverything,
  clearSlot,
  memoryFor,
  NO_MEMORY,
  readWorld,
  worldSeedFor,
  writeWorld,
} from './storage';

/**
 * A WORLD IS A PLACE — the thing this body lost and did not notice.
 *
 * Marc, 2026-08-29: *"different seeds produce different maps, review how it
 * was before vs. now"*, and, separately, *"i gain perks with shrines but in
 * the end screen i still see 0/5, i never get relics as well."* Those turned
 * out to be one bug. Ashwake 1 mints a world's seed once and re-derives every
 * run's geography from it (`../tiles/src/shell/keeper.ts`: "the seed
 * re-derives from `world.worldSeed` on the session that starts next"). This
 * body minted none at all: a fresh device opened on the literal `1`, and NEW
 * RUN, the world switcher and RESET ALL each rolled `Math.random()`.
 *
 * So every run after a world existed was played on a foreign seed — and
 * `settle`'s guard, which is correct and which exists precisely to stop a
 * foreign run polluting a world, classified all of them as detours and banked
 * nothing. The roguelite loop had been switched off by the shell.
 *
 * These are the two ends of that: the seed a run is played on, and what the
 * world lends it.
 */

beforeEach(() => {
  clearEverything();
});

/** A run played to its end on a seed, the way `settle.test.ts` builds one. */
const finished = (seed: number) => {
  const session = createSession({
    seed,
    theme: resolveTheme(null),
    strings: stringsFor(pickLocale(['en'])),
  });
  walkToEnd(session);
  return session.get();
};

describe('the world a run is played on', () => {
  it('mints a seed for a slot that has never had one, and keeps it', () => {
    const first = worldSeedFor(1);
    expect(first, 'a fresh world was born on the old fallback constant').not.toBe(1);
    expect(worldSeedFor(1), 'the world changed under a player who did nothing').toBe(first);
    expect(readWorld(1)?.worldSeed, 'the seed was minted but never written down').toBe(first);
  });

  it('gives each slot its own world, so switching worlds switches the ground', () => {
    expect(worldSeedFor(1)).not.toBe(worldSeedFor(2));
  });

  it('starts again on a fresh seed once a slot is cleared', () => {
    const before = worldSeedFor(1);
    clearSlot(1);
    expect(worldSeedFor(1), 'NEW WORLD handed back the world it replaced').not.toBe(before);
  });

  /**
   * The bug, stated as the test that would have caught it: a run on the
   * world's own seed banks, and a run on any other seed does not.
   *
   * A real finished run rather than a hand-built state — `settle` reads the
   * hud, the log and the ground walked, and a fixture that stubbed those would
   * be testing the fixture.
   */
  it('banks a run played on the world, and refuses one played anywhere else', () => {
    const played = finished(4242);
    const world = { ...newWorld(4242), runs: 3 };

    const home = settle({
      state: played.state,
      hud: played.hud,
      slot: 1,
      world,
      records: {},
      timeline: [],
      progress: EMPTY_PROGRESS,
      at: 1_756_000_000_000,
    });
    expect(home.world, 'a run on its own world banked nothing').not.toBe(world);

    // The very same run, offered to a world it was not played on.
    const foreign = settle({
      state: played.state,
      hud: played.hud,
      slot: 1,
      world: newWorld(999),
      records: {},
      timeline: [],
      progress: EMPTY_PROGRESS,
      at: 1_756_000_000_000,
    });
    expect(foreign.progress.relics, 'a detour paid out').toBe(0);
    expect(foreign.goals, 'a detour met a goal').toEqual([]);
  });
});

describe('what a world lends the run it opens', () => {
  it('hands back its territories and spent finds', () => {
    writeWorld(1, {
      ...newWorld(77),
      territories: ['0,0', '3,-1'],
      finds: ['2,2'],
    });
    const lent = memoryFor(1, 77);
    expect(lent.claimed).toEqual(['0,0', '3,-1']);
    expect(lent.finds).toEqual(['2,2']);
  });

  it('lends nothing to a run on a seed that is not its own', () => {
    writeWorld(1, { ...newWorld(77), territories: ['0,0'] });
    // A shared `?seed=` link, or a daily: somebody else's geography, and
    // ground unioned across the two would be unremovable afterwards.
    expect(memoryFor(1, 78)).toEqual(NO_MEMORY);
  });

  it('lends nothing where there is no world yet', () => {
    expect(memoryFor(2, 5)).toEqual(NO_MEMORY);
  });

  /**
   * The whole point of lending it: a returning run starts already holding what
   * earlier runs claimed. `newRun` has taken these riders since Stage 1 and
   * nothing in this body ever filled them, so a territory was written down
   * every run and read back never.
   */
  it('starts a returning run richer for the ground it already holds', () => {
    writeWorld(1, { ...newWorld(77), territories: ['5,-2', '7,1'] });
    const lent = memoryFor(1, 77);
    const fresh = newRun(77);
    const returning = newRun(77, fresh.tuning, lent.claimed, lent.finds, null, lent.rearmed);

    // `startingPerk` is what conquest BUYS — the one consequence of the held
    // list that is visible before a single placement. A dial at zero would
    // make the two equal, which is why the tuning is asserted first rather
    // than the test quietly passing on a system that is switched off.
    expect(fresh.tuning.territoryTiles, 'the territory perk is off').toBeGreaterThan(0);
    expect(returning.tiles, 'the world lent its ground and the run ignored it').toBeGreaterThan(
      fresh.tiles,
    );
  });
});
