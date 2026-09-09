import { beforeEach, describe, expect, it } from 'vitest';
import { newRun } from '@engine/reduce';
import { TUNING } from '@content/tuning';
import { pickLocale } from '@content/locale';
import { newWorld, worldFromRun } from '@meta/world';
import { newlyMetGoals, sealGoals } from '@meta/goals';
import type { HexKey } from '@engine/hex';
import type { GameState } from '@engine/state';
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
  settleWorldInto,
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
 *
 * **Named for its SUBJECT, not for a module** — the one place this directory
 * departs from `x.ts` ↔ `x.test.ts`, and deliberately. What it pins crosses
 * several files at once and belongs to none of them; a name that picked one
 * would send a reader to the wrong place for the other half. `bridge`, `camp`,
 * `homeworld`, `shed` and `shelf` are the five, and they are the five that
 * describe a behaviour rather than a file (noted 2026-09-02).
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

describe('a board kept as a world (2026-09-09)', () => {
  /**
   * THE WHOLE CHAIN, because Marc asked for it in those words: *"make sure
   * territories follow up in a new world if we go from daily to world."*
   *
   * Four files stand between a territory claimed on a daily and a territory
   * standing claimed on the first run of the world that daily became —
   * `meta/world.ts`'s `worldFromRun`, `shell/storage.ts`'s `settleWorldInto`
   * and `memoryFor`, and `engine/reduce.ts`'s `newRun` — and every one of
   * them was already tested in isolation while the chain was broken: the fold
   * simply left `territories` behind. This is the seam test, and it belongs in
   * this file for this file's own stated reason: what it pins crosses several
   * modules and belongs to none of them.
   */
  it('carries a territory claimed on a daily into the world that daily becomes', () => {
    const seed = 8181;
    const at: HexKey = '3,-1';
    const played = finished(seed);
    const daily: GameState = {
      ...played.state,
      cells: {
        ...played.state.cells,
        [at]: { kind: 'landmark', reward: 'territory', colour: 'green', claimed: true },
      },
    };

    settleWorldInto(2, sealGoals(worldFromRun(seed, daily), EMPTY_PROGRESS));
    expect(readWorld(2)?.territories, 'the claim did not reach the world').toEqual([at]);

    // And the run that opens there starts with it already yours.
    const lent = memoryFor(2, seed);
    expect(lent.claimed, 'the world did not lend the claim back').toContain(at);
    // And the engine opens holding it. It is not on the BOARD yet — a fresh
    // run reveals only its arrival clearing — but it is in the run's claim
    // ledger, which is what makes it reveal already yours and its field
    // already native when the ground reaches it. That last step is pinned on
    // a walked board in `meta/world.test.ts`; what was broken was this seam.
    const opened = newRun(seed, TUNING, lent.claimed, lent.finds);
    expect(opened.claimed, 'the run opened without the claim').toContain(at);
  });

  /**
   * And the survey is not paid for it — see `meta/goals.ts`'s `sealGoals`.
   * A planted world's ground, territories and reach are three of the five
   * goals' inputs, and the payout runs at the end of the NEXT run, so without
   * the seal one placement in the new world collected relics for a survey
   * nothing there had done.
   */
  it('pays no survey relics for what the board arrived holding', () => {
    const seed = 8282;
    const played = finished(seed);
    const conquered: GameState = {
      ...played.state,
      cells: {
        ...played.state.cells,
        ...Object.fromEntries(
          (['3,-1', '4,-1', '5,-1', '6,-1'] as HexKey[]).map((k) => [
            k,
            { kind: 'landmark', reward: 'territory', colour: 'green', claimed: true } as const,
          ]),
        ),
      },
    };
    const planted = sealGoals(worldFromRun(seed, conquered), EMPTY_PROGRESS);
    expect(planted.territories.length, 'the fixture claimed nothing').toBe(4);
    expect(newlyMetGoals(planted, EMPTY_PROGRESS), 'a planted world owed relics').toEqual([]);
    // Unsealed, it owed for a survey it did not do.
    expect(newlyMetGoals(worldFromRun(seed, conquered), EMPTY_PROGRESS)).toContain('territories4');
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

  /**
   * REARMED LANDMARKS, the third rider — and the one whose absence is
   * invisible.
   *
   * Marc, 2026-08-20: *"shrines and hidden finds should transform into either
   * points or cache (randomized) per new run"*, so a veteran world's map keeps
   * changing faces instead of filling up with spent stone. `rearmedSpent`
   * rolls it, `memoryFor` carries it, and the reducer obeys the map — but a
   * run that simply ignored the list would draw a board that looks completely
   * normal. Only the numbers would differ.
   */
  it('rearms the landmarks this world has already spent', () => {
    writeWorld(1, { ...newWorld(77), finds: ['6,-3', '8,1'], runs: 3 });
    const lent = memoryFor(1, 77);
    expect(Object.keys(lent.rearmed).length, 'nothing was reborn at all').toBeGreaterThan(0);
    for (const kind of Object.values(lent.rearmed)) expect(['cache', 'site']).toContain(kind);

    const returning = newRun(77, TUNING, lent.claimed, lent.finds, null, lent.rearmed);
    // It reaches the run's own state, which is what makes it replay-honest:
    // the same run resumed or re-derived agrees about what is out there.
    expect(returning.rearmed).toEqual(lent.rearmed);
  });
});
