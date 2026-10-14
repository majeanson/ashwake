import { describe, expect, it } from 'vitest';
import { pickLocale } from '@content/locale';
import { TUNING } from '@content/tuning';
import { stringsFor } from '@text/index';
import { resolveTheme } from '@theme/index';
import { EMPTY_PROGRESS, meet, TEACH_IDS, type Progress } from '@meta/progress';
import { createSession, type Snapshot } from './store';
import { lessonOf } from '@view/lessons';
import {
  CARD_GAP,
  SCHEDULE,
  newDots,
  nextLesson,
  sinceSpoke,
  toastLine,
  told,
  type Moment,
  coachStep,
  offerDots,
  guided,
  mustPop,
  phaseOf,
} from './teaching';
import { walk } from './walk';

/**
 * When the game speaks (2026-09-02).
 *
 * `teaching.ts` is 167 lines deciding the whole of a stranger's first minute,
 * and it had no test — while its own docblock says *"Pure ... which is what
 * lets it be tested by handing it two views."* The invitation was written and
 * never taken up.
 *
 * What is worth pinning is not the list of moments — that is data, and reading
 * it back would be a test of the file against itself. It is the three RULES the
 * docblock states, because each of them is a promise about what a player
 * experiences and each fails silently:
 *
 *   1. **A priority list, not a queue.** The first unmet-and-true moment fires
 *      and the rest stay armed. Two cards over one board is a second card
 *      dismissed unread.
 *   2. **Cards outrank toasts** — a concept interrupts, a consequence does not.
 *   3. **Once per device.** The ledger is what stops a moment that stays true
 *      from firing on every action.
 *
 * The views come from a real session for the reason `store.test.ts` uses one:
 * a hand-built `HudView` is a test of a fixture, and the fields this file reads
 * are exactly the ones that would drift.
 */

const session = () =>
  createSession({
    seed: 3,
    theme: resolveTheme(null),
    strings: stringsFor(pickLocale(['en'])),
  });

/** A moment, from a run that has been walked `n` placements deep. */
const momentAt = (n: number): Moment => {
  const s = session();
  if (n > 0) walk(s, n);
  const snap: Snapshot = s.get();
  return { board: snap.board, hud: snap.hud, placed: n > 0 };
};

/** A device that has met everything except the named lessons. */
const taughtExcept = (...keep: readonly string[]): Progress =>
  TEACH_IDS.filter((id) => !keep.includes(id)).reduce<Progress>((p, id) => meet(p, id), {
    ...EMPTY_PROGRESS,
  });

/** A device whose first run has been walked and toured: nothing is held back. */
const WALKED: Progress = meet(meet({ ...EMPTY_PROGRESS }, 'walked'), 'toured');

describe('the teaching drip', () => {
  it('opens on STORY: the first thing a stranger is told is what this place is', () => {
    const said = nextLesson(momentAt(0), EMPTY_PROGRESS);
    expect(said?.id).toBe('story');
    // A concept, not a consequence: it holds the screen rather than pointing
    // at the board.
    expect(said?.as).toBe('card');
  });

  it('returns the first unmet-and-true moment, toast or card alike', () => {
    // For one day (2026-09-03) toast-class moments were skipped, because the
    // shell had no speaker and an unspeakable toast stood in front of every
    // card behind it. The speaker exists now (`App`'s `speakLesson`), so the
    // priority list is whole again: WALL, a toast, fires ahead of the cards
    // behind it in `ORDER`.
    const said = nextLesson(momentAt(8), taughtExcept('wall', 'colours'));
    expect(said?.id).toBe('wall');
    expect(said?.as).toBe('toast');
  });

  it('a spoken toast unblocks the card standing behind it', () => {
    // THE JAM the one-day skip existed to break, now broken the honest way:
    // the toast SPEAKS and is told, and the card behind it fires on the next
    // ask. COLOURS is true on any walked board with a hand.
    const jammed = taughtExcept('wall', 'colours');
    const first = nextLesson(momentAt(8), jammed);
    expect(first?.as).toBe('toast');
    const next = nextLesson(momentAt(8), told(jammed, 'wall'));
    expect(next?.id).toBe('colours');
    expect(next?.as).toBe('card');
  });

  it('tells the CARAVAN when it is in town with a pop to try, and never before POP', () => {
    // 2026-09-30. Its own card says "that is the moment to try a pop", so it
    // fires only while one can be tried; and POP's moment is exactly that, so
    // the card about popping always lands first.
    const walked = momentAt(8);
    const at = (caravan: Moment['hud']['caravan'], canHarvest: boolean): Moment => ({
      ...walked,
      hud: { ...walked.hud, caravan, canHarvest },
    });
    expect(nextLesson(at('town', true), taughtExcept('caravan'))).toEqual({
      id: 'caravan',
      as: 'card',
    });
    for (const quiet of [at('town', false), at('coming', true), at('left', true), at(null, true)])
      expect(nextLesson(quiet, taughtExcept('caravan'))).toBeNull();
    expect(nextLesson(at('town', true), taughtExcept('pop', 'caravan'))?.id).toBe('pop');
  });

  it('says ONE thing, however many moments are true at once', () => {
    // A walked board has a legal edge, a cost above one, a hand, walls — several
    // moments true together, and a virgin ledger for all of them.
    const now = momentAt(8);
    const said = nextLesson(now, EMPTY_PROGRESS);
    expect(said).not.toBeNull();

    // And the ones it passed over are still there: telling the first does not
    // spend the rest. This is the difference between a priority list and a
    // queue, and the reason two cards never stack over one board.
    const next = nextLesson(now, told(EMPTY_PROGRESS, said!.id));
    expect(next).not.toBeNull();
    expect(next?.id).not.toBe(said?.id);
  });

  it('has a sentence for every toast-class moment its board can prove', () => {
    // The speaker's word table (`toastLine`): every toast id must come back
    // with a whole sentence, or the drip is back to returning words nobody
    // hears. Whether the MOMENT is true is `nextLesson`'s job, not the
    // table's — only FIELD (below) answers null, because its sentence needs
    // a cell the board may not hold.
    const s = stringsFor(pickLocale(['en']));
    const theme = resolveTheme(null);
    const sess = session();
    const tuning = sess.get().state.tuning;
    const fresh = momentAt(0);
    const walked = momentAt(8);
    for (const [id, at] of [
      ['place', fresh],
      ['costRise', walked],
      ['wall', walked],
      ['lens', walked],
      ['lastGasp', walked],
    ] as const) {
      const line = toastLine(id, at, tuning, theme, s);
      expect(line, `${id} has no sentence`).not.toBeNull();
      expect(line).not.toBe('');
    }
  });

  it('leaves FIELD armed when no native cell is in view, not spent', () => {
    // A fresh world has no territory and so no native ground; `toastLine`
    // answers null and the caller must not mark it told. The purse lesson is
    // the standing proof of what a ledger entry spent on unshown words costs.
    const s = stringsFor(pickLocale(['en']));
    const theme = resolveTheme(null);
    const sess = session();
    expect(toastLine('field', momentAt(8), sess.get().state.tuning, theme, s)).toBeNull();
  });

  it('goes quiet once the device has been told everything', () => {
    // The whole point of the ledger: a moment that stays true — a legal edge, a
    // cost above one — must not speak on every single action.
    const everything = TEACH_IDS.reduce<Progress>((p, id) => meet(p, id), { ...EMPTY_PROGRESS });
    expect(nextLesson(momentAt(8), everything)).toBeNull();
    expect(nextLesson(momentAt(0), everything)).toBeNull();
  });

  it('says nothing twice, even while its moment is still true', () => {
    const now = momentAt(0);
    const first = nextLesson(now, EMPTY_PROGRESS);
    expect(first?.id).toBe('story');
    // The board has not changed at all; only the ledger has.
    expect(nextLesson(now, told(EMPTY_PROGRESS, 'story'))?.id).not.toBe('story');
  });

  it('never fires PURSE from a moment, because the purse owns its own', () => {
    // `isTrue` returns false for it on purpose: it is raised by the player
    // OPENING the purse (`App`'s `onPurse`). A moment that is always false is
    // only honest while something else owns the moment — so this pins that it
    // is still nothing this file can produce, and the day somebody makes it
    // true here they will find out that two things now own one lesson.
    for (const n of [0, 4, 8, 16]) {
      expect(nextLesson(momentAt(n), taughtExcept('purse'))).toBeNull();
    }
  });

  it('marks told idempotently, so a double-dismiss cannot double-write', () => {
    const once = told(EMPTY_PROGRESS, 'ripe');
    expect(told(once, 'ripe')).toEqual(once);
  });
});

describe('every card the drip can fire', () => {
  it('is a card something draws', () => {
    // 2026-09-30. COLOURS was in `CARDS` with no lesson, so `LessonCard`
    // returned nothing for it: never shown, never told, and LAST GASP, behind
    // it in `ORDER`, never spoke. STORY has its own card in `App`, and PURSE
    // is raised by opening the purse (`purseLesson`) and never by a moment.
    const ownCard = new Set(['story', 'goal', 'purse']);
    for (const { id } of SCHEDULE.filter((s) => s.as === 'card'))
      if (!ownCard.has(id)) expect(lessonOf(id), `${id} has no lesson to draw`).toBeDefined();
  });
});

describe('the schedule covers every moment (2026-10-13)', () => {
  it('has one slot per teachable id, apart from the two written by the first pop and run', () => {
    const ids = SCHEDULE.map((s) => s.id);
    expect(new Set(ids).size, 'a duplicate slot').toBe(ids.length);
    expect(new Set<string>([...ids, 'walked', 'toured'])).toEqual(new Set<string>(TEACH_IDS));
  });

  it('gives every chip a moment to be offered by', () => {
    for (const slot of SCHEDULE.filter((s) => s.as === 'chip'))
      expect(typeof slot.when, slot.id).toBe('function');
  });
});

describe('the pace (2026-10-12): one new idea at a time', () => {
  it('holds a paced lesson back until the gap has passed, and then releases it', () => {
    // LENS is paced and true from six tiles on; everything else is told.
    const device = taughtExcept('lens');
    const now = momentAt(8);
    expect(nextLesson(now, device)?.id).toBe('lens');
    expect(nextLesson({ ...now, since: CARD_GAP - 1 }, device)).toBeNull();
    expect(nextLesson({ ...now, since: CARD_GAP }, device)?.id).toBe('lens');
  });

  it('never holds back the opening beats, RIPE, POP or LAST GASP', () => {
    // A first frame an instant after the game spoke: the story still comes.
    expect(nextLesson({ ...momentAt(0), since: 0 }, EMPTY_PROGRESS)?.id).toBe('story');
    expect(nextLesson({ ...momentAt(0), since: 0 }, told(EMPTY_PROGRESS, 'story'))?.id).toBe(
      'goal',
    );
  });

  it('keeps the held moment armed rather than dropping it', () => {
    const device = taughtExcept('lens');
    const now = momentAt(8);
    expect(nextLesson({ ...now, since: 0 }, device)).toBeNull();
    // Nothing was told in between, so it is still there.
    expect(nextLesson({ ...now, since: 99 }, device)?.id).toBe('lens');
  });

  it('counts placements since the game last spoke, and forgets across runs', () => {
    expect(sinceSpoke(null, 7)).toBeUndefined();
    expect(sinceSpoke(3, 7)).toBe(4);
    // A new run restarts placements at 0, below the remembered count.
    expect(sinceSpoke(9, 2)).toBeUndefined();
  });
});

describe('the NEW chips (2026-10-12): offered, never fired', () => {
  it('never returns a chip lesson from the drip, so one cannot hold a card back', () => {
    for (const id of ['rare', 'rareUnique', 'territory', 'shrine'] as const) {
      for (const n of [0, 3, 8, 20]) {
        expect(nextLesson(momentAt(n), taughtExcept(id))?.id).not.toBe(id);
      }
    }
  });

  it('offers a chip while its moment is true and until it is opened', () => {
    // CACHE is a card; the chips are the four that are not. A board that shows
    // one of them offers it, and opening it (telling it) clears it.
    // Seed 122 at depth 20 puts all four destinations on one board unclaimed
    // (see `tourTarget.test.ts`, which chose it by looking at the boards).
    let found = false;
    for (const [seed, n] of [[122, 20]] as const) {
      const s = createSession({
        seed,
        theme: resolveTheme(null),
        strings: stringsFor(pickLocale(['en'])),
      });
      walk(s, n);
      const snap = s.get();
      const now: Moment = { board: snap.board, hud: snap.hud, placed: true };
      for (const id of newDots(now, WALKED)) {
        found = true;
        expect(newDots(now, told(WALKED, id))).not.toContain(id);
      }
    }
    expect(found, 'no walked board ever showed a chip').toBe(true);
  });

  it('draws no card for a chip lesson until it is tapped', () => {
    for (const id of ['rare', 'rareUnique', 'territory', 'shrine'] as const) {
      expect(SCHEDULE.find((s) => s.id === id)?.as, id).toBe('chip');
      expect(lessonOf(id), `${id} needs a lesson for its chip to open`).toBeDefined();
    }
  });
});

describe('REDRAW, offered on a poor hand (2026-10-12)', () => {
  const poor = (over: Partial<Moment['hud']>): Moment => {
    const now = momentAt(8);
    return {
      ...now,
      hud: {
        ...now.hud,
        poorHand: true,
        luck: 99,
        spends: now.hud.spends.map((spend) => ({ ...spend, affordable: true })),
        ...over,
      },
    };
  };

  it('says it once, as a toast with the real cost, when the hand is poor and luck can pay', () => {
    const now = poor({});
    const due = nextLesson(now, taughtExcept('reroll'));
    expect(due?.id).toBe('reroll');
    expect(due?.as).toBe('toast');
    const line = toastLine(
      'reroll',
      now,
      TUNING,
      resolveTheme(null),
      stringsFor(pickLocale(['en'])),
    );
    const cost = now.hud.spends.find((spend) => spend.on === 'reroll')!.cost;
    expect(line).toContain(String(cost));
  });

  it('stays quiet on a good hand, and when luck cannot pay (a hint about a dead button is a taunt)', () => {
    expect(nextLesson(poor({ poorHand: false }), taughtExcept('reroll'))).toBeNull();
    const broke = poor({});
    const unaffordable: Moment = {
      ...broke,
      hud: {
        ...broke.hud,
        spends: broke.hud.spends.map((spend) => ({ ...spend, affordable: false })),
      },
    };
    expect(nextLesson(unaffordable, taughtExcept('reroll'))).toBeNull();
  });
});

describe('the chips keep the pace too (2026-10-12)', () => {
  it('shows none within the gap of the last thing the game said, and returns after it', () => {
    // Seed 122 at depth 20 shows a shrine and a territory unclaimed.
    const s = createSession({
      seed: 122,
      theme: resolveTheme(null),
      strings: stringsFor(pickLocale(['en'])),
    });
    walk(s, 20);
    const snap = s.get();
    const now: Moment = { board: snap.board, hud: snap.hud, placed: true };
    expect(newDots(now, WALKED).length).toBeGreaterThan(0);
    expect(newDots({ ...now, since: CARD_GAP - 1 }, WALKED)).toEqual([]);
    expect(newDots({ ...now, since: CARD_GAP }, WALKED).length).toBeGreaterThan(0);
  });
});

describe('the first run is walked, then toured (2026-10-12)', () => {
  const walkLessons = ['story', 'goal', 'place', 'colours', 'ripe', 'pop'] as const;
  const afterWalk = walkLessons.reduce<Progress>((p, id) => told(p, id), EMPTY_PROGRESS);
  const touring = told(afterWalk, 'walked');

  it('has three phases: walk until the first pop lands, tour until the first run ends', () => {
    expect(phaseOf(EMPTY_PROGRESS)).toBe('walk');
    // The card about popping is not the pop.
    expect(phaseOf(afterWalk)).toBe('walk');
    expect(phaseOf(touring)).toBe('tour');
    expect(phaseOf(WALKED)).toBe('free');
    expect(guided(touring)).toBe(true);
    expect(guided(WALKED)).toBe(false);
  });

  it('says one thing per step of the walk: place, colours, surround, then pop', () => {
    expect(coachStep(momentAt(0), EMPTY_PROGRESS)).toBe('place');
    // The lit tile the place line points at is real: one is chosen at the start.
    expect(momentAt(0).hud.draft.some((d) => d.selected)).toBe(true);
    expect(coachStep(momentAt(1), EMPTY_PROGRESS)).toBe('match');
    expect(coachStep(momentAt(3), EMPTY_PROGRESS)).toBe('grow');
    const ripe = { ...momentAt(3), hud: { ...momentAt(3).hud, canHarvest: true } };
    expect(coachStep(ripe, EMPTY_PROGRESS)).toBe('pop');
    expect(coachStep(ripe, WALKED)).toBeNull();
  });

  it('forces the first pop: a waiting pocket refuses placement, and only in the walk', () => {
    const base = momentAt(3);
    const ripe = { ...base, hud: { ...base.hud, canHarvest: true } };
    expect(mustPop(ripe, EMPTY_PROGRESS)).toBe(true);
    expect(mustPop(base, EMPTY_PROGRESS)).toBe(false);
    // Once the pop has landed the player is free to place with a pocket waiting.
    expect(mustPop(ripe, touring)).toBe(false);
    expect(mustPop(ripe, WALKED)).toBe(false);
    expect(mustPop({ ...ripe, hud: { ...ripe.hud, ended: true } }, EMPTY_PROGRESS)).toBe(false);
  });

  it('tours the rest of the first run: build, bank the biggest, then how it ends', () => {
    const base = momentAt(4);
    const at = (tiles: number, cost: number, canHarvest: boolean) => ({
      ...base,
      hud: { ...base.hud, tiles, cost, canHarvest },
    });
    expect(coachStep(at(30, 1, false), touring)).toBe('build');
    // Plenty of tiles: a pocket waiting is no reason to stop building.
    expect(coachStep(at(30, 1, true), touring)).toBe('build');
    expect(coachStep(at(4, 1, true), touring)).toBe('bank');
    // Nothing ripe: nothing to bank, keep building.
    expect(coachStep(at(4, 1, false), touring)).toBe('build');
    // Fewer tiles than the next placement costs: the end, taught.
    expect(coachStep(at(2, 3, true), touring)).toBe('end');
    expect(coachStep(at(0, 3, false), touring)).toBe('end');
  });

  it('holds every other lesson and every chip back until the first run has ended', () => {
    const now = momentAt(14);
    expect(nextLesson(now, afterWalk)).toBeNull();
    expect(newDots(now, afterWalk)).toEqual([]);
    expect(newDots(now, touring)).toEqual([]);
    // Held back, not dropped: the same board speaks once the first run is over.
    expect(nextLesson(now, WALKED)).not.toBeNull();
  });

  it('explains LUCK, then MAGIC as a card (a chip nobody taps is a lesson that never happens)', () => {
    const now = { ...momentAt(10), hud: { ...momentAt(10).hud, luck: 3 } };
    expect(nextLesson(now, touring)).toEqual({ id: 'luck', as: 'card' });
    const told1 = told(touring, 'luck');
    expect(nextLesson(now, told1)).toEqual({ id: 'rare', as: 'card' });
    expect(nextLesson(now, told(told1, 'rare'))).toBeNull();
    // Outside the tour MAGIC stays a chip, never a card.
    expect(nextLesson(now, told(WALKED, 'luck'))?.id).not.toBe('rare');
  });

  it('teaches how a run ends where there is no clock, not only on the last placement', () => {
    const base = momentAt(4);
    const ending = { ...base, hud: { ...base.hud, left: null, tiles: 2, cost: 3 } };
    const calm = { ...base, hud: { ...base.hud, left: null, tiles: 30, cost: 3 } };
    // A device that has been told everything else.
    const hungry = taughtExcept('lastGasp');
    expect(nextLesson(ending, hungry)?.id).toBe('lastGasp');
    expect(nextLesson(calm, hungry)).toBeNull();
  });

  it('the coach has words in both languages', () => {
    for (const locale of ['en', 'fr-CA'] as const) {
      const s = stringsFor(locale);
      for (const step of [
        'place',
        'match',
        'grow',
        'pop',
        'popFirst',
        'build',
        'bank',
        'end',
      ] as const) {
        expect(s.coach[step].length).toBeGreaterThan(20);
      }
    }
  });
});

describe('a chip stays until it is opened (2026-10-12)', () => {
  it('keeps both chips when one is opened, and when the pace would hide them', () => {
    // Both offered; the pace now says there is nothing fresh.
    const both = offerDots([], ['territory', 'rareUnique'], WALKED);
    expect(both).toEqual(['territory', 'rareUnique']);
    expect(offerDots(both, [], WALKED)).toEqual(both);
    // Opening one (its lesson met) takes that one away and leaves the other.
    expect(offerDots(both, [], told(WALKED, 'territory'))).toEqual(['rareUnique']);
  });

  it('adds a new chip after the ones already showing', () => {
    expect(offerDots(['territory'], ['territory', 'shrine'], WALKED)).toEqual([
      'territory',
      'shrine',
    ]);
  });
});

describe('a territory is explained as it appears, in the tour (2026-10-13)', () => {
  // Seed 122 at depth 20 shows a shrine and a territory unclaimed.
  const board = (): Moment => {
    const s = createSession({
      seed: 122,
      theme: resolveTheme(null),
      strings: stringsFor(pickLocale(['en'])),
    });
    walk(s, 20);
    const snap = s.get();
    return { board: snap.board, hud: snap.hud, placed: true };
  };
  const touring = [
    ...(['story', 'goal', 'place', 'colours', 'ripe', 'pop', 'walked'] as const),
  ].reduce<Progress>((p, id) => told(p, id), EMPTY_PROGRESS);

  it('is a card in the tour, not a chip', () => {
    expect(nextLesson(board(), touring)).toEqual({ id: 'territory', as: 'card' });
    expect(newDots(board(), touring)).toEqual([]);
  });

  it('does not bring the shrine with it: only the territory is on the tour', () => {
    const afterTerritory = told(touring, 'territory');
    expect(nextLesson(board(), afterTerritory)?.id).not.toBe('shrine');
  });

  it('is a chip again once the first run is over', () => {
    expect(nextLesson(board(), WALKED)?.id).not.toBe('territory');
    expect(newDots(board(), WALKED)).toContain('territory');
  });
});
