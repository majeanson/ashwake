import { describe, expect, it } from 'vitest';
import { TUNING } from '@content/tuning';
import { newRun } from '@engine/reduce';
import { dailySeed } from '@meta/daily';
import { newWorld } from '@meta/world';
import { bootPlan, type BootDisk } from './boot';

/**
 * THE BOOT LADDER (`PASS.md` P2.1).
 *
 * `MODES.md`'s **boot** door, which is the odd one out in that table twice: it
 * does not go through `enterRun`, and **it is the only place `detour` can
 * become true.** That file's opening line says every mode bug it records was a
 * door forgetting a flag, and this is the door with the most flags — and until
 * this file it had no test at all, because calling it meant building a live
 * session out of `location` and four storage functions.
 *
 * The disk is injected, so each test here describes a device rather than
 * writing one.
 */

const HOME = 4242;
const DAY = '2026-09-10';

const state = (seed: number) => newRun(seed, TUNING, [], [], null);

/** A device with nothing on it but a minted world seed. */
const fresh = (over: Partial<BootDisk> = {}): BootDisk => ({
  dailyRun: () => null,
  run: () => null,
  worldSeed: () => HOME,
  world: () => null,
  ...over,
});

describe('a plain visit', () => {
  it('opens on this device’s own world, and is no detour', () => {
    const plan = bootPlan('', 1, fresh());
    expect(plan.seed).toBe(HOME);
    expect(plan.daily).toBeNull();
    expect(plan.detour).toBe(false);
    expect(plan.resume).toBeNull();
    expect(plan.wakeAt).toBeNull();
  });

  it('resumes the run this device left unfinished', () => {
    const left = state(HOME);
    const plan = bootPlan('', 1, fresh({ run: () => left }));
    expect(plan.resume).toBe(left);
    expect(plan.seed).toBe(HOME);
  });

  /*
   * THE RUNG A TEST GOT WRONG FIRST, so it is written out.
   *
   * A saved run outranks home for the SEED — the ladder is "the URL, then the
   * run this device left unfinished, then home" — so a slot holding a run
   * played on a foreign board opens on that board, and `detour` says so. It
   * has to work this way: `readRun(slot)` deliberately has no seed guard
   * (`MODES.md`'s reader table says why) so a shared link survives a reload,
   * and a reload that dropped the query string would otherwise deal a fresh
   * board over a run in progress.
   *
   * The seed guard here is about RESUMABILITY, not about which board opens:
   * once the seed is settled, a run whose `rootSeed` disagrees with it is not
   * resumable — and after this ladder it never can, which is the assertion.
   */
  it('opens on a saved run’s own board, and calls it a detour', () => {
    const elsewhere = state(999);
    const plan = bootPlan('', 1, fresh({ run: () => elsewhere }));
    expect(plan.seed).toBe(999);
    expect(plan.resume).toBe(elsewhere);
    expect(plan.detour, 'a run on a foreign seed was not flagged').toBe(true);
  });

  it('never hands back a run whose seed is not the one it settled on', () => {
    // The URL pins the seed, so the saved run cannot move it — and then the
    // guard drops the run rather than resuming a board from somewhere else.
    const elsewhere = state(999);
    const plan = bootPlan(`?seed=${String(HOME)}`, 1, fresh({ run: () => elsewhere }));
    expect(plan.seed).toBe(HOME);
    expect(plan.resume).toBeNull();
  });
});

describe('a shared link', () => {
  it('plays the seed in the URL, and says it is a detour', () => {
    const plan = bootPlan('?seed=7', 1, fresh());
    expect(plan.seed).toBe(7);
    expect(plan.detour).toBe(true);
    expect(plan.daily).toBeNull();
  });

  /*
   * THE RELOAD, and it is why the URL outranks the saved run for the SEED but
   * the saved run is still consulted. `readRun` deliberately has no seed guard
   * so a shared link can be picked up again on reload; the guard is here.
   */
  it('picks its own run back up on a reload', () => {
    const theirs = state(7);
    const plan = bootPlan('?seed=7', 1, fresh({ run: () => theirs }));
    expect(plan.seed).toBe(7);
    expect(plan.resume, 'a reloaded shared link dealt a fresh board').toBe(theirs);
    expect(plan.detour).toBe(true);
  });

  it('is not a detour when the link happens to be this device’s own world', () => {
    const plan = bootPlan(`?seed=${String(HOME)}`, 1, fresh());
    expect(plan.seed).toBe(HOME);
    expect(plan.detour, 'a link to your own world is not somebody else’s board').toBe(false);
  });

  it('ignores a seed that is not a number', () => {
    expect(bootPlan('?seed=abc', 1, fresh()).seed).toBe(HOME);
    expect(bootPlan('?seed=Infinity', 1, fresh()).seed).toBe(HOME);
  });

  /*
   * The two the core had already decided, and which this ladder disagreed with
   * on both counts until 2026-09-10 — the note at `asked` in `boot.ts` says
   * how that was found.
   *
   * A fractional seed is TRUNCATED rather than passed on, because a hand-typed
   * 7.9 must open the same world as 7 rather than one no other phone can
   * reproduce. And zero is a seed: `|| null` could not tell 0 from nothing,
   * which is the mistake `dial` exists to avoid one import away.
   */
  it('truncates a fractional seed, the way `parseRoute` does', () => {
    expect(bootPlan('?seed=7.9', 1, fresh()).seed).toBe(7);
    expect(bootPlan('?seed=-7.9', 1, fresh()).seed).toBe(-7);
  });

  it('treats zero as a seed rather than as an absence', () => {
    expect(bootPlan('?seed=0', 1, fresh()).seed).toBe(0);
    expect(bootPlan('?seed=0', 1, fresh()).detour).toBe(true);
    // A bare `?seed=` is 0 too, pinned as SHIPPED in `route.test.ts` rather
    // than designed. Nothing generates that link.
    expect(bootPlan('?seed=', 1, fresh()).seed).toBe(0);
  });
});

describe('a shared daily', () => {
  it('opens the date’s board, and is NOT a detour', () => {
    const plan = bootPlan(`?daily=${DAY}`, 1, fresh());
    expect(plan.daily).toBe(DAY);
    expect(plan.seed).toBe(dailySeed(DAY));
    // A daily is walled off by being a Place the keeper knows, which is a
    // different mechanism from a detour and must not be confused with one.
    expect(plan.detour, 'a daily was called a detour').toBe(false);
  });

  it('resumes that date’s board and no other', () => {
    const todays = state(dailySeed(DAY));
    const plan = bootPlan(`?daily=${DAY}`, 1, fresh({ dailyRun: () => todays }));
    expect(plan.resume).toBe(todays);
    // The slot's own run is not consulted at all on a daily.
    const other = bootPlan(`?daily=${DAY}`, 1, fresh({ run: () => state(HOME) }));
    expect(other.resume).toBeNull();
  });

  it('is not a daily when the date is not one', () => {
    // `parseRoute` validates against the epoch, so a hand-typed or truncated
    // date simply is not a daily and the page opens at home.
    for (const bad of ['?daily=nonsense', '?daily=2026-13-40', '?daily=', '?daily=1999-01-01']) {
      const plan = bootPlan(bad, 1, fresh());
      expect(plan.daily, bad).toBeNull();
      expect(plan.seed, bad).toBe(HOME);
    }
  });
});

describe('the shot queries', () => {
  it('deals a fresh board rather than resuming', () => {
    const left = state(HOME);
    // A scripted board is walked from nothing every time, or the picture is of
    // whatever the last run happened to leave.
    expect(bootPlan('?place=40', 1, fresh({ run: () => left })).resume).toBeNull();
    expect(bootPlan('?end=1', 1, fresh({ run: () => left })).resume).toBeNull();
  });

  it('reads and clamps the placement count', () => {
    expect(bootPlan('?place=40', 1, fresh()).place).toBe(40);
    expect(bootPlan('?place=-5', 1, fresh()).place).toBe(0);
    expect(bootPlan('?place=3.7', 1, fresh()).place).toBe(3);
    expect(bootPlan('?end=1', 1, fresh()).toEnd).toBe(true);
    expect(bootPlan('', 1, fresh()).toEnd).toBe(false);
  });

  /*
   * `?place=0` is not a shot query, and this is `dial`'s rule spent: zero is a
   * real answer, so a URL that asks for no placements is asking for the
   * ordinary board — resume and all.
   */
  it('treats `?place=0` as no shot query at all', () => {
    const left = state(HOME);
    const plan = bootPlan('?place=0', 1, fresh({ run: () => left }));
    expect(plan.place).toBe(0);
    expect(plan.resume).toBe(left);
  });
});

describe('BEGIN AT CAMP, on the URL', () => {
  /**
   * A world with enough history for `campFor` to have a camp in it.
   *
   * FIVE shrines, because `camp` is the fifth rung of `UNLOCKS` and
   * `unlockedBy` is `UNLOCKS.slice(0, shrines.length)` — a world with four is
   * fully awake by the old ledger and still has no camp. The first draft of
   * this fixture gave it territories and no shrines, which is a world with
   * somewhere to camp and no permission to.
   */
  const camped = (): BootDisk => {
    const world = newWorld(HOME);
    return fresh({
      world: () => ({
        ...world,
        shrines: ['1,0', '2,0', '3,0', '4,0', '5,0'],
        territories: ['0,0', '3,0', '6,0'],
      }),
    });
  };

  it('camps on a fresh run in this device’s own world', () => {
    const plan = bootPlan('?camp=1', 1, camped());
    expect(plan.wakeAt, 'a camp was not chosen on a world that has one').not.toBeNull();
  });

  /*
   * The four guards, and each is a mode this level knows about and `campFor`
   * does not: a RESUMED run carries its own wake hex already, and neither a
   * detour nor a daily has a world to have a farthest territory in.
   */
  it('never camps a resumed run', () => {
    const disk = camped();
    const plan = bootPlan('?camp=1', 1, { ...disk, run: () => state(HOME) });
    expect(plan.resume).not.toBeNull();
    expect(plan.wakeAt).toBeNull();
  });

  it('never camps a detour', () => {
    const plan = bootPlan('?camp=1&seed=7', 1, camped());
    expect(plan.detour).toBe(true);
    expect(plan.wakeAt).toBeNull();
  });

  it('never camps a daily', () => {
    const plan = bootPlan(`?camp=1&daily=${DAY}`, 1, camped());
    expect(plan.daily).toBe(DAY);
    expect(plan.wakeAt).toBeNull();
  });

  it('does not camp without the flag', () => {
    expect(bootPlan('', 1, camped()).wakeAt).toBeNull();
  });
});

describe('the slot', () => {
  it('asks the disk about the slot it was given', () => {
    const asked: number[] = [];
    bootPlan('', 3, fresh({ worldSeed: (slot) => (asked.push(slot), HOME) }));
    expect(asked).toEqual([3]);
  });
});
