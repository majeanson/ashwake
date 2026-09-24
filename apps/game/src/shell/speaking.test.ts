import { describe, expect, it } from 'vitest';
import { mayTeach, type Floor } from './speaking';

/**
 * ONE SPEAKER AT A TIME (`PASS.md` P2.4).
 *
 * The rule was a five-part condition inside a JSX guard with twenty-five lines
 * of comment above it, and every clause is a bug that has happened. It could
 * not be asked a question; now it can, and these are the questions the comment
 * describes.
 *
 * The registry half — `useSpeaking` — is a hook and stays untested here on
 * purpose: what it owns is `setTimeout` bookkeeping whose invariant (the count
 * IS the registry's size) is held by there being one door in and one door out.
 * `App`'s `forgetEnding` is the only caller of `silence`, and `e2e/cards.spec`
 * is what proves a receipt lands after its cascade. A hook harness here would
 * test React, not the rule.
 */

/*
 * EVERY FIELD, WRITTEN OUT — and the compiler will not ask for it (2026-09-23).
 *
 * `watching` was added to `Floor` on the day the replay landed, and this
 * fixture kept compiling without it: a spread of a `Partial<Floor>` satisfies
 * the required properties of `Floor` as far as the checker is concerned, since
 * it cannot know which keys the spread actually carries. So the default floor
 * quietly had `watching: undefined`, which behaves like `false` and is not the
 * same as saying so.
 *
 * Worth stating because `MODES.md` makes the opposite claim about the `Door`
 * table — "the compiler asks every one of them when a flag is added" — and
 * that claim is true THERE, where each door is a whole literal with no spread.
 * A fixture built by spreading is the shape where it stops being true.
 */
const floor = (over: Partial<Floor> = {}): Floor => ({
  card: 'luck',
  said: false,
  touring: false,
  speaking: 0,
  watching: false,
  ended: false,
  ...over,
});

describe('may a lesson interrupt', () => {
  it('yes, when the board has nothing else to say', () => {
    expect(mayTeach(floor())).toBe(true);
  });

  it('not when no lesson has come due', () => {
    expect(mayTeach(floor({ card: null }))).toBe(false);
  });

  /*
   * `story` has its own door on the front screen. Raised here as well it would
   * arrive twice, which is the reason it is named rather than filtered by the
   * ledger.
   */
  it('never the story, which has its own door', () => {
    expect(mayTeach(floor({ card: 'story' }))).toBe(false);
  });

  /*
   * A RECEIPT OUTRANKS A LESSON. A receipt is about something the player just
   * did; a lesson is about something they could do, and its moment stays true
   * until it is told. Stacking both is two modal dialogs over one board.
   */
  it('not over a receipt that is holding the screen', () => {
    expect(mayTeach(floor({ said: true }))).toBe(false);
  });

  /*
   * A card raised while the board is away showing the last card's subject would
   * be a lesson read over a moving map, and the trip behind its scrim would be
   * a camera move nobody sees.
   */
  it('not while the board is away on a tour', () => {
    expect(mayTeach(floor({ touring: true }))).toBe(false);
  });

  /*
   * THE ONE MARC REPORTED (2026-09-09): *"make sure no cards can pop while the
   * first pop is happening (i think i had luck explained and coudnt see)."*
   *
   * A pop's receipt waits out the cascade, so for the whole of that wait there
   * is no card raised — `said` is false — and a lesson that came due on the
   * same dispatch opened over the animation and was unmounted the instant the
   * receipt landed. Shown, and withdrawn before it could be read. **This is the
   * clause `said` alone cannot cover**, which is why both exist.
   */
  it('not while a receipt is still in the air, even though none is shown', () => {
    expect(mayTeach(floor({ said: false, speaking: 1 }))).toBe(false);
    // Two can be in flight at once — a first-pop lesson and the pop's own
    // receipt — which is why it is a count and not a flag.
    expect(mayTeach(floor({ speaking: 2 }))).toBe(false);
  });

  it('yes again once the last receipt has landed', () => {
    expect(mayTeach(floor({ speaking: 0 }))).toBe(true);
  });

  /* Any one clause is enough to hold a lesson back, and they hold together. */
  it('is held by any one of them', () => {
    for (const over of [
      { card: null },
      { card: 'story' },
      { said: true },
      { touring: true },
      { speaking: 1 },
      { watching: true },
      { ended: true },
    ]) {
      expect(mayTeach(floor(over)), JSON.stringify(over)).toBe(false);
    }
  });
});

/**
 * AND NOT OVER A REPLAY (2026-09-23).
 *
 * The clause the audit pass added, and the one case that is reachable without
 * anybody doing anything unusual: the last placement of a run can both end it
 * and raise a lesson, and a run that earned a ✦ then plays itself back. The
 * card would be read over a film of a finished run — and dismissing it fires
 * `showOnBoard`, which flies the camera to a hex in the middle of the replay.
 *
 * The lesson is not LOST by being refused here; `mayTeach` decides when a
 * moment may interrupt, never whether it was true.
 */
describe('a lesson and a film', () => {
  it('waits while a run is being watched', () => {
    expect(mayTeach(floor({ watching: true }))).toBe(false);
  });

  it('and interrupts again the moment the film is over', () => {
    expect(mayTeach(floor({ watching: false }))).toBe(true);
  });
});

/**
 * AND NOT ON AN ENDED RUN (Marc, 2026-09-24: _"dont show and dont count as
 * learned"_).
 *
 * The `watching` clause held a card due on the last placement until the film
 * was over, and it then landed on the end screen, over the score. Refused
 * outright now; the "not counted" half needs no code here, because a card is
 * told only when it is dismissed and a card never raised is never dismissed.
 */
describe('a lesson and an ended run', () => {
  it('is refused once the run is over', () => {
    expect(mayTeach(floor({ ended: true }))).toBe(false);
  });

  it('including after the film, which is where it used to land', () => {
    expect(mayTeach(floor({ watching: false, ended: true }))).toBe(false);
  });
});
