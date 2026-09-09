import { describe, expect, it } from 'vitest';
import { pickLocale } from '@content/locale';
import { stringsFor } from '@text/index';
import { resolveTheme } from '@theme/index';
import { EMPTY_PROGRESS, meet, TEACH_IDS, type Progress, type TeachId } from '@meta/progress';
import { createSession, type Snapshot } from './store';
import { nextLesson, type Moment } from './teaching';
import { tourTarget } from './tourTarget';
import { walk } from './walk';

/**
 * Where a lesson points (2026-09-08).
 *
 * `tourTarget` copies each moment's predicate out of `shell/teaching.ts` —
 * deliberately, and the copy is the whole hazard. One file decides whether a
 * card is due and the other decides which hex it means, and a predicate edited
 * on one side leaves the other pointing at nothing, or at the wrong nothing.
 * That failure is silent: the card still fires, the camera simply does not go.
 *
 * So the pin below is not "does `tourTarget` return what `tourTarget` returns".
 * It is the one invariant that spans both files: **a targeted lesson has a hex
 * exactly when its moment is true**, asked over thirty real boards. If
 * `teaching.ts` narrows `cache` to unclaimed-and-not-a-beacon, or `ripe` starts
 * counting something else, this fails on the same day.
 *
 * The boards come from a real session walked by `walk`, for `teaching.test.ts`'s
 * reason: a hand-built `BoardView` is a test of a fixture, and the fields in
 * question are exactly the ones that would drift.
 */

/**
 * A walked board, built ONCE per (seed, depth).
 *
 * Five tests over thirty boards is a hundred and fifty runs walked up to forty
 * placements each, and it cost this file its place in CI: green here in 1.7s,
 * timed out on a runner measured at eleven times slower. The boards are
 * immutable and every test asks the same questions of them, so building each
 * one again per test was work nobody wanted done twice — and the fix is the
 * honest one either way, not a bigger timeout on a wasteful test.
 */
const boards = new Map<string, Moment>();
const momentAt = (seed: number, n: number): Moment => {
  const key = `${String(seed)}:${String(n)}`;
  const had = boards.get(key);
  if (had !== undefined) return had;
  const s = createSession({
    seed,
    theme: resolveTheme(null),
    strings: stringsFor(pickLocale(['en'])),
  });
  if (n > 0) walk(s, n);
  const snap: Snapshot = s.get();
  const made: Moment = { board: snap.board, hud: snap.hud, placed: n > 0 };
  boards.set(key, made);
  return made;
};

/** A device that has met everything but one id, so `nextLesson` answers a
 *  single question: is THAT moment true on this board? */
const onlyUnmet = (id: TeachId): Progress =>
  TEACH_IDS.filter((other) => other !== id).reduce<Progress>((p, other) => meet(p, other), {
    ...EMPTY_PROGRESS,
  });

/** The lessons that name a hex, and every other lesson with the reason it does
 *  not. Together they must be all of `TEACH_IDS` — see the last test. */
// WALL and FIELD joined on 2026-09-08, on Marc's answer: all seven concepts
// that stand on the map get the trip. They are the two toast-class entries —
// spoken while a hand is still moving rather than off a card just dismissed —
// and so the two most worth watching in Session A. See `tourTarget.ts`.
const TARGETED: readonly TeachId[] = [
  'ripe',
  'cache',
  'site',
  'shrine',
  'territory',
  'wall',
  'field',
];
const DECLINED: readonly TeachId[] = [
  'story', // what this place is; no place in it
  'place', // the legal edge, which is everywhere at once
  'pop', // a button, and RIPE has just flown to the same pocket
  'costRise', // the run's own arithmetic
  'rare',
  'rareUnique', // in the hand
  'lens',
  'colours', // a way of looking, not a thing looked at
  'luck',
  'purse',
  'relic', // what a run carries out
  'lastGasp',
];

/**
 * The boards, chosen by looking at what is ON them rather than by taste.
 *
 * Seed 3 alone — the first fixture written here — grew nothing but caches in
 * twenty placements, so SHRINE and TERRITORY were being pinned against boards
 * that could never have shown one, and deleting the `!claimed` guard left every
 * test in this file green. These six seeds walked to five depths put all four
 * destinations on one board unclaimed (122 at 20), and each of them ALREADY
 * REACHED with no other of its kind left beside it — 7 at 40 for the cache, 4
 * at 20 for the site, 5 at 8 for the territory, 17 at 20 for the shrine. That
 * last set is what makes the guard a thing this file can fail on: the cells
 * exist, the moment is false, and a target must not be named.
 */
const BOARDS: readonly (readonly [number, number])[] = [3, 4, 5, 7, 17, 122].flatMap((seed) =>
  [0, 3, 8, 20, 40].map((depth) => [seed, depth] as const),
);

describe('the hex a lesson means', () => {
  it('has one exactly when the moment that fires the card is true', () => {
    for (const [seed, depth] of BOARDS) {
      const moment = momentAt(seed, depth);
      for (const id of TARGETED) {
        const fires = nextLesson(moment, onlyUnmet(id))?.id === id;
        expect(
          tourTarget(id, moment.board) !== null,
          `${id} on seed ${String(seed)} at ${String(depth)}: moment ${String(fires)}`,
        ).toBe(fires);
      }
    }
  });

  it('names a cell that is actually the thing the lesson is about', () => {
    for (const [seed, depth] of BOARDS) {
      const { board } = momentAt(seed, depth);
      for (const id of ['cache', 'site', 'shrine', 'territory'] as const) {
        const at = tourTarget(id, board);
        if (at === null) continue;
        const cell = board.cells.find((c) => c.key === at);
        expect(cell?.kind).toBe('landmark');
        expect(cell?.landmark).toBe(id);
        // Never a destination already reached: the card explains what it would
        // pay, and a claimed one has paid.
        expect(cell?.claimed).toBe(false);
      }
      const ripe = tourTarget('ripe', board);
      if (ripe !== null) expect(board.cells.find((c) => c.key === ripe)?.ripe).toBe(true);
    }
  });

  /*
   * The `!claimed` half of the destination predicate, said out loud rather than
   * left to the pin above to imply. The four boards named in `BOARDS` each hold
   * a destination of one kind that the run has already REACHED and no other of
   * that kind beside it, so a `tourTarget` that forgot the guard would name a
   * hex the card is not about — a claimed destination has paid, and the card
   * explains what one would pay.
   */
  it('will not point at a destination that has already been reached', () => {
    const reached: readonly (readonly [
      number,
      number,
      'cache' | 'site' | 'shrine' | 'territory',
    ])[] = [
      [7, 40, 'cache'],
      [4, 20, 'site'],
      [5, 8, 'territory'],
      [17, 20, 'shrine'],
    ];
    for (const [seed, depth, id] of reached) {
      const { board } = momentAt(seed, depth);
      const of = board.cells.filter((c) => c.kind === 'landmark' && c.landmark === id);
      // The fixture is only worth anything while it still holds one, claimed.
      expect(of.length, `${id} on seed ${String(seed)} at ${String(depth)}`).toBeGreaterThan(0);
      expect(of.every((c) => c.claimed)).toBe(true);
      expect(tourTarget(id, board), id).toBeNull();
    }
  });

  it('is silent for every lesson that is not about a place', () => {
    for (const [seed, depth] of BOARDS) {
      const { board } = momentAt(seed, depth);
      for (const id of DECLINED) expect(tourTarget(id, board), id).toBeNull();
    }
  });

  /*
   * The loud half. A `TeachId` added tomorrow falls through the switch's
   * `default` and silently gets no tour — a new concept taught with the camera
   * sitting still, which is exactly the class of miss `CLAUDE.md` opens with.
   * This makes adding one a failing test until somebody has decided which list
   * it belongs in.
   */
  it('has a ruling for every teachable concept, so a new one cannot slip through', () => {
    expect([...TARGETED, ...DECLINED].sort()).toEqual([...TEACH_IDS].sort());
  });
});
