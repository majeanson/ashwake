import { describe, expect, it } from 'vitest';
import { pickLocale } from '@content/locale';
import { EMPTY_PROGRESS } from '@meta/progress';
import { stringsFor } from '@text/index';
import { resolveTheme } from '@theme/index';
import { dailiesOf, runsOf } from '@meta/timeline';
import { newWorld, type WorldMemory } from '@meta/world';
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

const finished = () => {
  const session = createSession({
    seed: 7,
    theme: resolveTheme(null),
    strings: stringsFor(pickLocale(['en'])),
  });
  walkToEnd(session);
  return session.get();
};

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

describe('banking a daily', () => {
  it('touches the ladder and the diary, and nothing else', () => {
    const snap = finished();
    const after = settleDaily({
      date: '2026-08-29',
      state: snap.state,
      hud: snap.hud,
      book: {},
      timeline: [],
      at: 1_756_000_000_000,
    });
    expect(after.book['2026-08-29']?.tries).toBe(1);
    expect(dailiesOf(after.timeline)).toHaveLength(1);
    // The diary's RUN tab is untouched: a daily is not one of this device's
    // own runs, and counting it as one would inflate every total.
    expect(runsOf(after.timeline, null)).toHaveLength(0);
  });

  it('counts a second try without losing the first best', () => {
    const snap = finished();
    const one = settleDaily({
      date: '2026-08-29',
      state: snap.state,
      hud: snap.hud,
      book: {},
      timeline: [],
      at: 1,
    });
    const two = settleDaily({
      date: '2026-08-29',
      state: snap.state,
      hud: { ...snap.hud, points: 0 },
      book: one.book,
      timeline: one.timeline,
      at: 2,
    });
    expect(two.book['2026-08-29']?.tries).toBe(2);
    expect(two.book['2026-08-29']?.best).toBe(one.book['2026-08-29']?.best);
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
describe('the line between a daily and a world', () => {
  it('records a daily under its date and a run under its slot', () => {
    const snap = finished();
    const asDaily = settleDaily({
      date: '2026-08-29',
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

    expect(dailiesOf(asDaily.timeline)[0]?.date).toBe('2026-08-29');
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
