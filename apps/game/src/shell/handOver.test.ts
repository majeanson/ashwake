import { describe, expect, it } from 'vitest';
import { pickLocale } from '@content/locale';
import { stringsFor } from '@text/index';
import { newRun } from '@engine/reduce';
import { TUNING } from '@content/tuning';
import { toHudView } from '@view/view';
import { handOverOf } from './handOver';

/**
 * THE SHARE'S ONE FORK (`PASS.md` P2.7).
 *
 * A daily and a world run share nothing but the verb, and the fork between
 * them was spelled out TWICE inside one handler in `App.tsx` — once for the
 * sentence and once for the card. They had to agree or the picture would show
 * a number the text did not, on the one artefact whose whole job is being
 * screenshotted. These tests are what "agree by construction" is worth.
 */

const s = stringsFor(pickLocale(['en']));
const state = newRun(7, TUNING, [], [], null);
const hud = toHudView(state, s);

const facts = (over: Partial<Parameters<typeof handOverOf>[0]> = {}) =>
  handOverOf({ daily: null, state, hud, standing: null, book: null, ...over }, s);

describe('a world run', () => {
  it('carries its seed, and the card prints it', () => {
    const { subject, card } = facts();
    expect(subject.kind).toBe('run');
    if (subject.kind !== 'run') throw new Error('unreachable');
    expect(subject.seed).toBe(state.rootSeed);
    expect(card.footerLine).toContain(String(state.rootSeed));
  });

  it('says RUN n once the record book knows which run this is', () => {
    expect(facts({ standing: { isNewBest: false, run: 12 } }).card.topLine).toContain('12');
    // Run zero is "no record book yet", not the twelfth run's neighbour, so
    // the line stays empty rather than saying RUN 0.
    expect(facts({ standing: { isNewBest: false, run: 0 } }).card.topLine).toBe('');
    expect(facts({ standing: null }).card.topLine).toBe('');
  });

  it('heads the card with NEW BEST only when the run set one', () => {
    expect(facts({ standing: { isNewBest: true, run: 3 } }).card.headline).not.toBeNull();
    expect(facts({ standing: { isNewBest: false, run: 3 } }).card.headline).toBeNull();
    expect(facts({ standing: null }).card.headline).toBeNull();
  });
});

describe('a daily', () => {
  const DAY = '2026-09-10';

  /*
   * A date is not a seed anybody outside this device's book can open, so the
   * footer stays empty rather than printing a number that means nothing —
   * exactly as the text share drops it. That parity is the point.
   */
  it('carries its date and prints no seed', () => {
    const { subject, card } = facts({ daily: DAY, book: {} });
    expect(subject.kind).toBe('daily');
    if (subject.kind !== 'daily') throw new Error('unreachable');
    expect(subject.date).toBe(DAY);
    expect(card.footerLine).toBe('');
    expect(card.footerLine).not.toContain(String(state.rootSeed));
  });

  /*
   * The try is CONFESSED rather than hidden — the daily's own honesty rule —
   * and it comes off the same decoded book the badge does. One read, so the
   * sentence and the picture cannot disagree about which try this was.
   */
  it('confesses the try, off the same book the badge reads', () => {
    const book = { [DAY]: { best: 400, tries: 4 } };
    const { subject, card } = facts({ daily: DAY, book });
    if (subject.kind !== 'daily') throw new Error('unreachable');
    expect(subject.tries).toBe(4);
    expect(card.topLine).not.toBe('');
  });

  it('calls an unrecorded date the first try', () => {
    const { subject } = facts({ daily: DAY, book: {} });
    if (subject.kind !== 'daily') throw new Error('unreachable');
    expect(subject.tries).toBe(1);
    // And a book that is null — which a world run passes — must not throw
    // here either, because `daily` is what decides the branch.
    const nulled = facts({ daily: DAY, book: null });
    if (nulled.subject.kind !== 'daily') throw new Error('unreachable');
    expect(nulled.subject.tries).toBe(1);
  });

  /*
   * The ladder line already carries the number RUN/TRY would say, so the
   * daily's top line is the badge and never `s.ui.ending.run`.
   */
  it('uses the ladder badge rather than a run number', () => {
    const withRun = facts({
      daily: DAY,
      book: { [DAY]: { best: 400, tries: 2 } },
      standing: { isNewBest: false, run: 99 },
    });
    expect(withRun.card.topLine).not.toContain('99');
  });
});

describe('both halves', () => {
  it('draw the card from the same numbers the screen showed', () => {
    for (const over of [{}, { daily: '2026-09-10', book: {} }]) {
      const { subject, card } = facts(over);
      expect(subject.points).toBe(hud.points);
      expect(card.scoreLine).toContain(String(hud.points));
      expect(card.reachLine).toContain(String(hud.depthValue));
      // The arc is the run's own shape, one number per scoring harvest.
      expect(card.arc).toEqual(state.log.harvests.map((h) => h.points));
    }
  });
});
