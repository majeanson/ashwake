import { describe, expect, it } from 'vitest';
import { pickLocale } from '@content/locale';
import { TUNING } from '@content/tuning';
import { stringsFor } from '@text/index';
import { resolveTheme } from '@theme/index';
import { EMPTY_PROGRESS, meet, TEACH_IDS, type Progress, type TeachId } from '@meta/progress';
import { createSession, type Snapshot } from './store';
import { lessonOf, type LessonId } from '@view/lessons';
import {
  CARD_GAP,
  CUE_MS,
  CUE_SELECTOR,
  cueOf,
  stepCue,
  SCHEDULE,
  newDots,
  nextLesson,
  sinceSpoke,
  toastLine,
  tourTarget,
  told,
  type Moment,
  coachStep,
  offerDots,
  opensAt,
  purseOpened,
  toldBy,
  guided,
  mustPop,
  phaseOf,
} from './teaching';
import { walk } from './walk';

/** The moments a lesson is told by: the slots that open it, or are it. */
const momentsOf = (lesson: LessonId): readonly TeachId[] =>
  SCHEDULE.filter((slot) => (slot.opens?.lesson ?? slot.id) === lesson).map((slot) => slot.id);

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

/** The same device once THE MAP has been told: the fog's chips are on offer. */
const MAPPED: Progress = meet(WALKED, 'map');

/** Seed 122 at depth 20 puts all four destinations on one board unclaimed. */
const destinations = (): Moment => {
  const s = createSession({
    seed: 122,
    theme: resolveTheme(null),
    strings: stringsFor(pickLocale(['en'])),
  });
  walk(s, 20);
  const snap = s.get();
  return { board: snap.board, hud: snap.hud, placed: true };
};

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

  it('tells the CARAVAN when it is in town with a pop to try, and never before the POP card', () => {
    // 2026-09-30. Its own card says "that is the moment to try a pop", so it
    // fires only while one can be tried; and the walk's POP card (the RIPE
    // moment, which tells `pop` too) stands ahead of it in the schedule.
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
    const ahead = SCHEDULE.map((s) => s.id);
    expect(ahead.indexOf('ripe')).toBeLessThan(ahead.indexOf('caravan'));
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
    // it in `ORDER`, never spoke. STORY and GOAL have their own cards in `App`;
    // PURSE is raised by opening the purse and never by a moment, but it draws
    // an ordinary lesson card now (LUCK's, 2026-10-13), so it is checked too.
    const ownCard = new Set(['story', 'goal']);
    for (const { id } of SCHEDULE.filter((s) => s.as === 'card'))
      if (!ownCard.has(id))
        expect(lessonOf(opensAt(id).lesson), `${id} has no lesson to draw`).toBeDefined();
  });
});

describe('the schedule covers every moment (2026-10-13)', () => {
  it('has one slot per teachable id, apart from the two written by the first pop and run and the companions a card tells', () => {
    const ids = SCHEDULE.map((s) => s.id);
    expect(new Set(ids).size, 'a duplicate slot').toBe(ids.length);
    // This list is the whole of the exception, so a moment dropped from the
    // schedule by accident is not mistaken for one dropped on purpose.
    const companions = SCHEDULE.flatMap((s) => s.tells ?? []);
    expect(companions).toEqual(['luck']);
    // `luck` has a slot of its own (the tour's card).
    expect(companions.filter((id) => !ids.includes(id))).toEqual([]);
    expect(new Set<string>([...ids, 'walked', 'toured', ...companions])).toEqual(
      new Set<string>(TEACH_IDS),
    );
  });

  it('puts RIPE and POP under their own lessons and the expedition’s moments under THE EXPEDITION', () => {
    expect([...momentsOf('ripe')].sort()).toEqual(['ripe']);
    expect([...momentsOf('pop')].sort()).toEqual(['pop']);
    expect([...momentsOf('expedition')].sort()).toEqual(['goal', 'place', 'story', 'wall']);
    expect(opensAt('ripe')).toEqual({ lesson: 'ripe' });
    expect(opensAt('pop')).toEqual({ lesson: 'pop' });
    expect(opensAt('wall')).toEqual({ lesson: 'expedition', row: 'wall' });
  });

  it('tells RIPE and POP with a card each: the walk has two short ones, not one wall', () => {
    const { board } = destinations();
    expect(toldBy('ripe', board)).toEqual(['ripe']);
    expect(toldBy('pop', board)).toEqual(['pop']);
    // With RIPE told the walk goes on to the pop, on the first pocket that can be cashed.
    const now = { ...momentAt(3), hud: { ...momentAt(3).hud, canHarvest: true } };
    expect(nextLesson(now, taughtExcept('pop'))?.id).toBe('pop');
  });

  it('tells LUCK with the purse card, so the tour’s LUCK card does not repeat it', () => {
    expect(toldBy('purse', destinations().board)).toEqual(['purse', 'luck']);
    // The purse opened first, mid-tour, before the pace has let LUCK's own card
    // out: once that card is read, LUCK is not offered a second time.
    const now = { ...momentAt(3), hud: { ...momentAt(3).hud, luck: 1 } };
    const tour = meet({ ...EMPTY_PROGRESS }, 'walked');
    expect(nextLesson(now, tour)).toEqual({ id: 'luck', as: 'card' });
    const read = toldBy('purse', destinations().board).reduce(told, tour);
    expect(nextLesson(now, read)).not.toEqual({ id: 'luck', as: 'card' });
  });

  it('opens the purse silently when LUCK is already told, and with the card when not', () => {
    expect(purseOpened(EMPTY_PROGRESS)).toBe('card');
    expect(purseOpened(told(EMPTY_PROGRESS, 'luck'))).toBe('silent');
    expect(purseOpened(told(EMPTY_PROGRESS, 'purse'))).toBeNull();
    expect(purseOpened(told(told(EMPTY_PROGRESS, 'luck'), 'purse'))).toBeNull();
  });

  // 2026-10-13. The ledger names a moment and the registry a concept: the
  // `colours` moment tells THE FOUR GROUNDS, the fog's six tell THE MAP, and
  // everything that draws a lesson goes through `opensAt`.
  it('opens a lesson that exists, and the manual can find its moment again', () => {
    const { board } = destinations();
    for (const slot of SCHEDULE) {
      const { lesson, row } = opensAt(slot.id, board);
      if (slot.opens === undefined) {
        expect(lesson, `${slot.id} opens something other than itself`).toBe(slot.id);
        continue;
      }
      expect(lessonOf(lesson), `${slot.id} opens a lesson that is not there`).toBeDefined();
      expect(momentsOf(lesson), `${lesson} is not told by ${slot.id}`).toContain(slot.id);
      // A row it names is a row the lesson has, in both languages.
      if (row !== undefined) {
        for (const locale of ['en', 'fr-CA'] as const) {
          const heads = lessonOf(lesson)?.rowHeads?.(stringsFor(locale)) ?? [];
          expect(
            heads.map((h) => h.key),
            `${slot.id} opens a row ${row} that is not there`,
          ).toContain(row);
        }
      }
    }
    expect(opensAt('colours').lesson).toBe('grounds');
  });

  it('moves rare + unique under MAGIC, the purse and the reroll hint under LUCK, and the cost, last gasp and relics under THE RUN’S END', () => {
    expect([...momentsOf('magic')].sort()).toEqual(['rare', 'rareUnique']);
    expect([...momentsOf('luck')].sort()).toEqual(['luck', 'purse', 'reroll']);
    expect([...momentsOf('end')].sort()).toEqual(['costRise', 'lastGasp', 'relic']);
    expect(opensAt('rare')).toEqual({ lesson: 'magic', row: 'magic' });
    expect(opensAt('rareUnique')).toEqual({ lesson: 'magic', row: 'unique' });
    expect(opensAt('purse')).toEqual({ lesson: 'luck' });
    expect(opensAt('relic')).toEqual({ lesson: 'end', row: 'relic' });
  });

  it('makes the first relic a chip, not a card: it no longer interrupts', () => {
    expect(SCHEDULE.find((s) => s.id === 'relic')?.as).toBe('chip');
    // The cost and the last placement stay the toasts they were.
    expect(SCHEDULE.find((s) => s.id === 'costRise')?.as).toBe('toast');
    expect(SCHEDULE.find((s) => s.id === 'lastGasp')?.as).toBe('toast');
  });

  it('gives every chip of the map a row to lead, so its label is the thing offered', () => {
    for (const slot of SCHEDULE.filter((s) => s.as === 'chip' && s.opens?.lesson === 'map')) {
      expect(opensAt(slot.id).row, slot.id).toBeDefined();
    }
  });

  it('moves the fog’s six moments, and only them, under THE MAP', () => {
    expect([...momentsOf('map')].sort()).toEqual(
      ['map', 'cache', 'site', 'shrine', 'territory', 'lens', 'field'].sort(),
    );
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
    for (const id of ['rare', 'rareUnique', 'territory', 'shrine', 'relic'] as const) {
      for (const n of [0, 3, 8, 20]) {
        expect(nextLesson(momentAt(n), taughtExcept(id))?.id).not.toBe(id);
      }
    }
  });

  it('offers a chip while its moment is true and until it is opened', () => {
    // The destinations are chips once THE MAP has been told. A board that
    // shows one of them offers it, and opening it (telling it) clears it.
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
      for (const id of newDots(now, MAPPED)) {
        found = true;
        expect(newDots(now, told(MAPPED, id))).not.toContain(id);
      }
    }
    expect(found, 'no walked board ever showed a chip').toBe(true);
  });

  it('draws no card for a chip lesson until it is tapped', () => {
    for (const id of ['rare', 'rareUnique', 'territory', 'shrine', 'relic'] as const) {
      expect(SCHEDULE.find((s) => s.id === id)?.as, id).toBe('chip');
      expect(
        lessonOf(opensAt(id).lesson),
        `${id} needs a lesson for its chip to open`,
      ).toBeDefined();
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
    expect(newDots(now, MAPPED).length).toBeGreaterThan(0);
    expect(newDots({ ...now, since: CARD_GAP - 1 }, MAPPED)).toEqual([]);
    expect(newDots({ ...now, since: CARD_GAP }, MAPPED).length).toBeGreaterThan(0);
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
    const both = offerDots([], ['territory', 'rareUnique'], MAPPED);
    expect(both).toEqual(['territory', 'rareUnique']);
    expect(offerDots(both, [], MAPPED)).toEqual(both);
    // Opening one (its lesson met) takes that one away and leaves the other.
    expect(offerDots(both, [], told(MAPPED, 'territory'))).toEqual(['rareUnique']);
  });

  it('adds a new chip after the ones already showing', () => {
    expect(offerDots(['territory'], ['territory', 'shrine'], MAPPED)).toEqual([
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

  it('is a chip again once the first run is over, and the map card comes first', () => {
    // Free of the tour, the first destination in view tells THE MAP; the
    // territory waits behind it as a chip.
    expect(nextLesson(board(), taughtExcept('map'))?.id).toBe('map');
    expect(newDots(board(), WALKED)).not.toContain('territory');
    expect(nextLesson(board(), MAPPED)?.id).not.toBe('territory');
    expect(newDots(board(), MAPPED)).toContain('territory');
  });

  it('is the map card at the territory row, and tells the territory AND the map', () => {
    // The tour's exception bypasses `after`: this card tells the concept, so it
    // cannot wait on itself.
    expect(touring.met).not.toContain('map');
    expect(nextLesson(board(), touring)).toEqual({ id: 'territory', as: 'card' });
    expect(opensAt('territory')).toEqual({ lesson: 'map', row: 'territory' });
    expect(toldBy('territory', board().board)).toEqual(['territory', 'map']);
  });
});

describe('THE MAP is one card, then chips (2026-10-13)', () => {
  it('fires on the first unclaimed destination, paced, and opens at that destination’s row', () => {
    const now = destinations();
    const device = taughtExcept('map');
    expect(nextLesson(now, device)).toEqual({ id: 'map', as: 'card' });
    // Paced like the cache card it replaced.
    expect(nextLesson({ ...now, since: CARD_GAP - 1 }, device)).toBeNull();
    // The row is the kind of the cell it found, through the predicate its
    // `when` and `target` share.
    const target = tourTarget('map', now.board);
    const cell = now.board.cells.find((c) => c.key === target);
    expect(cell?.kind).toBe('landmark');
    expect(cell?.claimed).toBe(false);
    expect(opensAt('map', now.board)).toEqual({ lesson: 'map', row: cell?.landmark });
    // With no board there is no row to name.
    expect(opensAt('map')).toEqual({ lesson: 'map' });
  });

  it('tells the concept and the kind it showed, so that kind is not offered again', () => {
    const { board } = destinations();
    const kind = board.cells.find((c) => c.kind === 'landmark' && !c.claimed)?.landmark;
    expect(kind).toBeDefined();
    const tells = toldBy('map', board);
    expect(tells).toEqual(['map', kind]);
    // The other kinds in view are chips now; the one told is not.
    const after = tells.reduce(told, WALKED);
    const dots = newDots({ board, hud: destinations().hud, placed: true }, after);
    expect(dots).not.toContain(kind);
    expect(dots.length).toBeGreaterThan(0);
  });

  it('keeps the fog’s chips back until the map has been told', () => {
    const now = destinations();
    for (const id of ['cache', 'site', 'shrine', 'territory'] as const)
      expect(newDots(now, WALKED), id).not.toContain(id);
    expect(newDots(now, MAPPED).length).toBeGreaterThan(0);
    // The gate is the ledger's, not the board's: an offered chip is withdrawn
    // too, should the concept somehow be unmet.
    expect(offerDots(['shrine'], [], WALKED)).toEqual([]);
    expect(offerDots(['shrine'], [], MAPPED)).toEqual(['shrine']);
  });

  it('tells a toast only itself: the lens and native ground are told as themselves', () => {
    const { board } = destinations();
    expect(toldBy('lens', board)).toEqual(['lens']);
    expect(toldBy('field', board)).toEqual(['field']);
    expect(toldBy('cache', board)).toEqual(['cache', 'map']);
  });
});

describe('cues (2026-10-15)', () => {
  it('every cue a moment or a step names has a selector', () => {
    const named = [
      ...SCHEDULE.flatMap((slot) => (slot.cue === undefined ? [] : [slot.cue])),
      ...(['place', 'match', 'grow', 'pop', 'build', 'bank', 'end'] as const).map(stepCue),
    ];
    expect(named.length).toBeGreaterThan(0);
    for (const cue of named) expect(CUE_SELECTOR[cue]).toBeTruthy();
  });

  it('cueOf answers a moment, and null for one about no control', () => {
    expect(cueOf('luck')).toBe('purse');
    expect(cueOf('pop')).toBe('pop');
    expect(cueOf('map')).toBeNull();
  });

  it('the dial is a positive number of ms, and 0 would turn cues off', () => {
    expect(CUE_MS).toBeGreaterThan(0);
  });
});
