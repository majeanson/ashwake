import { describe, expect, it } from 'vitest';
import { pickLocale } from '@content/locale';
import { EMPTY_PROGRESS } from '@meta/progress';
import { GOALS } from '@content/goals';
import { stringsFor } from '@text/index';
import { resolveTheme } from '@theme/index';
import { dailiesOf, runsOf, type Timeline } from '@meta/timeline';
import { dailySeed } from '@meta/daily';
import { newWorld, type WorldMemory } from '@meta/world';
import { endingPayout } from '@engine/reduce';
import { settle, settleDaily } from './settle';
import { createSession } from './store';
import { walkToEnd } from './walk';

/**
 * What a finished run leaves behind.
 *
 * The half worth testing is not that the numbers land — the core's own suites
 * pin every one of those — but that the two KINDS of run leave different
 * things behind. A daily banked as if it were a world run would put a shared
 * seed's score on the same shelf as private ones and fold ground nobody's
 * world walked, and both are silent: the screens would still render, they
 * would just be showing a lie.
 */

const finished = (seed = 7) => {
  const session = createSession({
    seed,
    theme: resolveTheme(null),
    strings: stringsFor(pickLocale(['en'])),
  });
  walkToEnd(session);
  return session.get();
};

/**
 * The date these tests bank under, and a run actually played on ITS board.
 *
 * The fixture used to hand `settleDaily` a run on seed 7 under a date whose
 * own seed is something else entirely, and it passed, because `settleDaily`
 * took the date on trust (`settle` has refused a foreign seed since
 * 2026-08-29; its other half never did). So every daily test here was banking
 * a score from a board that was never that date's — the exact thing the guard
 * added on 2026-09-09 refuses. A test fixture that could not have happened in
 * the game is a test that pins the wrong game.
 */
const DAY = '2026-08-29';
const onTheDaily = () => finished(dailySeed(DAY));

describe('banking a run', () => {
  it('folds the ground walked into the world and keeps the best', () => {
    const snap = finished();
    const after = settle({
      state: snap.state,
      hud: snap.hud,
      slot: 1,
      world: null,
      records: {},
      timeline: [],
      progress: EMPTY_PROGRESS,
      at: 1_756_000_000_000,
    });
    expect(after.world.worldSeed).toBe(snap.state.rootSeed);
    expect(runsOf(after.timeline, null)).toHaveLength(1);
    expect(Object.keys(after.records).length).toBeGreaterThan(0);
  });
});

/**
 * WHERE THE RUN STANDS.
 *
 * `recordRun` has folded every run into the book since the rules were lifted,
 * so this function has always KNOWN whether a score beat the standing best —
 * and returned the book and nothing else, which is why no ending in this body
 * ever printed NEW BEST (audit, 2026-09-02).
 *
 * The case that has to be right is the empty one: a device with no finished
 * run has no best to be short of, and "0 short of best" under a score is a
 * line lying twice. Ashwake 1 guarded it and named it in the same words.
 */
describe('where a run stands', () => {
  const bank = (records: Parameters<typeof settle>[0]['records']) => {
    const snap = finished();
    return {
      snap,
      after: settle({
        state: snap.state,
        hud: snap.hud,
        slot: 1,
        world: null,
        records,
        timeline: [],
        progress: EMPTY_PROGRESS,
        at: 1_756_000_000_000,
      }),
    };
  };

  it('counts the run, and calls a first finish no record at all', () => {
    const { after } = bank({});
    expect(after.standing.run).toBe(1);
    expect(after.standing.previousBest, 'a device with no history has no best').toBeNull();
  });

  it('says NEW BEST when the score passes the standing one', () => {
    const first = bank({});
    const points = first.snap.hud.points;
    // A book whose best is one point under this run's.
    const { after } = bank({
      endless: {
        runs: 3,
        bestPoints: Math.max(0, points - 1),
        tilesHarvests: 3,
        pointsHarvests: 0,
        arcSum: 1,
        arcRuns: 3,
      },
    });
    expect(after.standing.isNewBest).toBe(true);
    expect(after.standing.run).toBe(4);
  });

  it('reports the gap, and never claims a tie is a win', () => {
    const points = bank({}).snap.hud.points;
    const tie = bank({
      endless: {
        runs: 2,
        bestPoints: points,
        tilesHarvests: 2,
        pointsHarvests: 0,
        arcSum: 1,
        arcRuns: 2,
      },
    });
    expect(tie.after.standing.isNewBest, 'equalling the best is not beating it').toBe(false);
    expect(tie.after.standing.previousBest).toBe(points);

    const behind = bank({
      endless: {
        runs: 2,
        bestPoints: points + 500,
        tilesHarvests: 2,
        pointsHarvests: 0,
        arcSum: 1,
        arcRuns: 2,
      },
    });
    expect(behind.after.standing.previousBest).toBe(points + 500);
  });
});

describe('banking a daily', () => {
  it('touches the ladder and the diary, and nothing else', () => {
    const snap = onTheDaily();
    const after = settleDaily({
      date: DAY,
      state: snap.state,
      hud: snap.hud,
      book: {},
      timeline: [],
      at: 1_756_000_000_000,
    });
    expect(after.book[DAY]?.tries).toBe(1);
    expect(dailiesOf(after.timeline)).toHaveLength(1);
    // The diary's RUN tab is untouched: a daily is not one of this device's
    // own runs, and counting it as one would inflate every total.
    expect(runsOf(after.timeline, null)).toHaveLength(0);
  });

  it('counts a second try without losing the first best', () => {
    const snap = onTheDaily();
    const one = settleDaily({
      date: DAY,
      state: snap.state,
      hud: snap.hud,
      book: {},
      timeline: [],
      at: 1,
    });
    const two = settleDaily({
      date: DAY,
      state: snap.state,
      hud: { ...snap.hud, points: 0 },
      book: one.book,
      timeline: one.timeline,
      at: 2,
    });
    expect(two.book[DAY]?.tries).toBe(2);
    expect(two.book[DAY]?.best).toBe(one.book[DAY]?.best);
    expect(two.isNewBest).toBe(false);
  });
});

/**
 * A daily's board must never be written under a world, and a world's must
 * never be written under a date. The keeper enforces the first
 * (`keeper.test.ts`); what is asserted here is the shape the SHELL has to
 * keep, stated so the day it moves the reason is on record.
 *
 * The failure it guards is silent and one tap away: NEW RUN on a daily's end
 * screen starts a random private run, and if the shell still believes it is in
 * the daily, that run is banked as a try on today's shared ladder — a score
 * from a seed nobody else can play, standing on the board everybody shares.
 */
describe('a daily banked from a board that is not that date’s', () => {
  /**
   * THE OTHER HALF OF THE SEED GUARD (2026-09-09).
   *
   * `settle` has refused a run played on a foreign seed since 2026-08-29 —
   * "a run may only ever be merged into the world it was PLAYED on" — and
   * `settleDaily` took the date on trust. The daily ladder is the one ledger
   * in this game compared BETWEEN people, so a score on it from a private
   * board is the only kind of wrong nobody can notice from outside.
   *
   * Reachable: RESET ALL, from inside a daily, minted a fresh world and
   * restarted the session on the world's seed while never clearing `daily`,
   * so the next run was played on that world and banked here as today's
   * score. `App` clears it now; this is what holds if a sixth door forgets.
   */
  it('refuses it, and leaves the ladder and the diary exactly as they were', () => {
    const foreign = finished(7);
    const book = { [DAY]: { best: 400, tries: 2 } };
    const timeline: Timeline = [];
    const after = settleDaily({
      date: DAY,
      state: foreign.state,
      hud: { ...foreign.hud, points: 999_999 },
      book,
      timeline,
      at: 1,
    });
    expect(after.book, 'the ladder took a score from another board').toBe(book);
    expect(after.timeline, 'the diary took a run from another board').toBe(timeline);
    expect(after.isNewBest).toBe(false);
    // The try count is what the date already stood at: this attempt did not
    // happen on this board.
    expect(after.try).toBe(2);
  });

  it('banks the same run once it is played on that date’s own board', () => {
    const proper = onTheDaily();
    const after = settleDaily({
      date: DAY,
      state: proper.state,
      hud: proper.hud,
      book: {},
      timeline: [],
      at: 1,
    });
    expect(after.book[DAY]?.tries).toBe(1);
  });
});

describe('the line between a daily and a world', () => {
  it('records a daily under its date and a run under its slot', () => {
    const snap = onTheDaily();
    const asDaily = settleDaily({
      date: DAY,
      state: snap.state,
      hud: snap.hud,
      book: {},
      timeline: [],
      at: 1,
    });
    const asRun = settle({
      state: snap.state,
      hud: snap.hud,
      slot: 2,
      world: null,
      records: {},
      timeline: [],
      progress: EMPTY_PROGRESS,
      at: 1,
    });

    expect(dailiesOf(asDaily.timeline)[0]?.date).toBe(DAY);
    expect(runsOf(asRun.timeline, 2)).toHaveLength(1);
    // The same finished run, banked two ways, lands in two different places
    // and never in both.
    expect(runsOf(asDaily.timeline, null)).toHaveLength(0);
    expect(dailiesOf(asRun.timeline)).toHaveLength(0);
  });
});

/**
 * The world survey.
 *
 * `meta/goals.ts` has existed since the rules were lifted with no consumer:
 * five per-world goals — reach 20, four territories, 40% known, every shrine,
 * every perk — that give a world a spine beyond any one run. The two things
 * worth pinning are that a goal reports on the run that MET it, and that it
 * never reports twice, because the world is what remembers that it already
 * did.
 */
describe('the survey', () => {
  const snap = finished();
  const settling = (world: WorldMemory | null) => ({
    state: snap.state,
    hud: snap.hud,
    slot: 1 as const,
    world,
    records: {},
    timeline: [],
    progress: EMPTY_PROGRESS,
    at: 1,
  });

  it('reports a goal the run it is met, and writes it into the world', () => {
    // A world one territory short: this run's fold is what tips it.
    const nearly: WorldMemory = {
      ...newWorld(snap.state.rootSeed),
      territories: ['2,0', '3,0', '4,0', '5,0'],
    };
    const after = settle(settling(nearly));
    expect(after.goals).toContain('territories4');
    expect(after.world.goalsMet).toContain('territories4');
  });

  it('never reports the same goal twice', () => {
    const already: WorldMemory = {
      ...newWorld(snap.state.rootSeed),
      territories: ['2,0', '3,0', '4,0', '5,0'],
      goalsMet: ['territories4'],
    };
    const after = settle(settling(already));
    expect(after.goals).not.toContain('territories4');
    // And it is not written a second time either.
    expect(after.world.goalsMet.filter((g) => g === 'territories4')).toHaveLength(1);
  });

  it('says nothing about a world that has met nothing', () => {
    expect(settle(settling(null)).goals).toEqual([]);
  });

  /**
   * THE SURVEY PAYS, which it never had (2026-08-30).
   *
   * `content/goals.ts` opens by calling these "five world-scale goals, each
   * paying relics ONCE per world the moment it is first met", and
   * `Goal.reward` — 25 to 40 relics apiece — had no consumer anywhere in this
   * repository. The goal was detected, written into `goalsMet` and listed on
   * the end screen, and the purse did not move. Seventh of this body's
   * signature miss and the third of the invisible kind: nothing on screen was
   * wrong, only the number.
   *
   * Asserted as an EXACT total rather than "more than before", because more
   * than before is what a run's own payout already gives.
   */
  it('pays the survey its reward, on top of what the run earned', () => {
    const nearly: WorldMemory = {
      ...newWorld(snap.state.rootSeed),
      territories: ['2,0', '3,0', '4,0', '5,0'],
    };
    const after = settle({ ...settling(nearly), progress: EMPTY_PROGRESS });
    const reward = GOALS.find((g) => g.id === 'territories4')?.reward ?? 0;
    expect(reward, 'the survey pays nothing at all').toBeGreaterThan(0);
    expect(after.goals).toContain('territories4');
    expect(after.progress.relics, 'a goal was met and the purse did not move').toBe(
      endingPayout(snap.state).relics + reward,
    );
  });

  it('pays it ONCE per world, however many runs meet it again', () => {
    const already: WorldMemory = {
      ...newWorld(snap.state.rootSeed),
      territories: ['2,0', '3,0', '4,0', '5,0'],
      goalsMet: ['territories4'],
    };
    const after = settle({ ...settling(already), progress: EMPTY_PROGRESS });
    // The underlying fact stays true forever — four territories do not
    // un-happen — so the ledger is the only thing that can stop it paying.
    expect(after.progress.relics).toBe(endingPayout(snap.state).relics);
  });
});

/**
 * THE SEED GUARD.
 *
 * A run may only ever be merged into the world it was PLAYED on. Ground
 * unioned from a foreign geography is **unremovable** — the world remembers
 * hexes its own seed never generated, and no later run can un-see them.
 *
 * Two things can produce a mismatch, and both are live: a `?seed=` link plays
 * somebody else's world on this device — which is exactly what SHARE hands out
 * — and the shed ladder can drop a world while leaving its run behind, so the
 * next boot mints a fresh world and resumes a run that no longer matches it.
 * That second one is the bug that put this guard in Ashwake 1.
 */
describe('a run played on somebody else’s seed', () => {
  const snap = finished();
  const mine = newWorld(snap.state.rootSeed + 1);

  const settling = {
    state: snap.state,
    hud: snap.hud,
    slot: 1 as const,
    world: mine,
    records: {},
    timeline: [],
    progress: EMPTY_PROGRESS,
    at: 1,
  };

  it('leaves my world exactly as it found it', () => {
    const after = settle(settling);
    // The very object, so identity itself says nothing happened.
    expect(after.world).toBe(mine);
    expect(after.world.revealed).toHaveLength(0);
    expect(after.world.runs).toBe(0);
  });

  it('banks nothing on the shelf of bests either', () => {
    // A shared seed is not one of this device's own runs, and a score on a
    // board somebody else chose does not belong beside them.
    expect(settle(settling).records).toEqual({});
  });

  it('writes no diary row', () => {
    expect(settle(settling).timeline).toHaveLength(0);
  });

  it('still folds a run played on its OWN world', () => {
    const own = { ...settling, world: newWorld(snap.state.rootSeed) };
    expect(settle(own).world.runs).toBe(1);
    expect(settle(own).world.revealed.length).toBeGreaterThan(0);
  });
});

describe('what the player carries out', () => {
  /**
   * Marc, 2026-08-29, after playing: *"I never get relics ... in the old game
   * I still had some."*
   *
   * `settle` folded the world, kept the records and wrote the diary — and
   * handed `progress` back exactly as it was given. So the shop was as empty
   * after a run as before it, which is the roguelite loop not running: every
   * run was the first run.
   *
   * The number is the ENGINE's (`endingPayout`), and the crossing already
   * banked it that way — so this test is as much about the two endings
   * agreeing as about the relics arriving at all.
   */
  it('banks the run’s relics onto the device', () => {
    const snap = finished();
    const before = { ...EMPTY_PROGRESS, relics: 12 };
    const after = settle({
      state: snap.state,
      hud: snap.hud,
      slot: 1,
      world: null,
      records: {},
      timeline: [],
      progress: before,
      at: 1_756_000_000_000,
    });

    const earned = endingPayout(snap.state).relics;
    expect(earned, 'the walked run earned nothing to bank').toBeGreaterThan(0);
    expect(after.progress.relics).toBe(before.relics + earned);
    // Everything else about the ledger is untouched: settling a run is not the
    // place perks are found or upgrades are bought.
    expect(after.progress.found).toEqual(before.found);
    expect(after.progress.bought).toEqual(before.bought);
  });

  it('pays a DETOUR nothing, because a shared world is not this device’s', () => {
    // The seed guard's other half. A `?seed=` link that banked relics would be
    // a link that pays whoever opens it — a thing people would post on purpose.
    const snap = finished();
    const before = { ...EMPTY_PROGRESS, relics: 12 };
    const elsewhere: WorldMemory = newWorld(snap.state.rootSeed + 1);
    const after = settle({
      state: snap.state,
      hud: snap.hud,
      slot: 1,
      world: elsewhere,
      records: {},
      timeline: [],
      progress: before,
      at: 1_756_000_000_000,
    });
    expect(after.progress).toBe(before);
  });
});
