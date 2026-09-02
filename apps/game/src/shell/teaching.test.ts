import { describe, expect, it } from 'vitest';
import { pickLocale } from '@content/locale';
import { stringsFor } from '@text/index';
import { resolveTheme } from '@theme/index';
import { EMPTY_PROGRESS, meet, TEACH_IDS, type Progress } from '@meta/progress';
import { createSession, type Snapshot } from './store';
import { nextLesson, told, type Moment } from './teaching';
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

describe('the teaching drip', () => {
  it('opens on PLACE: the first thing a stranger is told is that there is somewhere to put a tile', () => {
    const said = nextLesson(momentAt(0), EMPTY_PROGRESS);
    expect(said?.id).toBe('place');
    // A consequence, not a concept: it points at the board rather than holding
    // the screen in front of it.
    expect(said?.as).toBe('toast');
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

  it('gives a concept a card and a consequence a line', () => {
    // RIPE is a concept: it is a rule about the board that has to be understood
    // before anything else makes sense.
    const ripe = nextLesson(momentAt(8), taughtExcept('ripe'));
    if (ripe !== null) expect(ripe.as).toBe('card');

    // COST RISING is a consequence of a rule already taught.
    const cost = nextLesson(momentAt(8), taughtExcept('costRise'));
    if (cost !== null) expect(cost.as).toBe('toast');
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
    expect(first?.id).toBe('place');
    // The board has not changed at all; only the ledger has.
    expect(nextLesson(now, told(EMPTY_PROGRESS, 'place'))?.id).not.toBe('place');
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
