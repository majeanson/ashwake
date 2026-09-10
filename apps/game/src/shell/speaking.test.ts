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

const floor = (over: Partial<Floor> = {}): Floor => ({
  card: 'luck',
  said: false,
  touring: false,
  speaking: 0,
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
    ]) {
      expect(mayTeach(floor(over)), JSON.stringify(over)).toBe(false);
    }
  });
});
