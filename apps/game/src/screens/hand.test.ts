import { describe, expect, it } from 'vitest';
import { PERK_DIALS } from '@content/goals';
import { TUNING } from '@content/tuning';
import { UNLOCKS } from '@meta/world';
import { handColumns, handSpacers, stashSlots } from './hand';

/**
 * The hand's shape, pinned because it is Marc's call and not a preference.
 *
 * **ONE ROW, whatever the count** (2026-08-30): *"be thorough in ui/ux so we
 * DON'T lose any height space and have maximum map."* It used to wrap at six,
 * which cost 60 measured pixels of board — and six is the ordinary hand of any
 * world that has woken two shrines, so most of a device's life was played
 * against a two-row hand.
 *
 * What makes one row safe is arithmetic rather than taste, and it is the part
 * worth pinning: the rules cannot deal more than six, and six across clears
 * the 44px tap floor on the narrowest phone this game supports.
 */
describe('how wide the hand is', () => {
  it('gives every card its own column, at every count', () => {
    for (const n of [1, 2, 3, 4, 5, 6]) expect(handColumns(n, 0)).toBe(n);
    expect(handColumns(4, 2)).toBe(6);
    expect(handColumns(3, 1)).toBe(4);
  });

  it('never asks for zero columns', () => {
    expect(handColumns(0, 0)).toBe(1);
  });

  /**
   * The guard the one-row rule rests on.
   *
   * A row of `n` cards on a 320px phone is `(320 - 2 * 8 - (n - 1) * 5.6) / n`
   * pixels a card — the shell's padding and the grid's gap — and every control
   * in this game is held to 44px by `e2e/targets.spec.ts`. Six fits with two
   * pixels to spare; seven does not. So this asserts the DIALS, not the layout:
   * if a future unlock or perk could deal a seventh card, one row stops being
   * safe and this fails before anybody has to notice it on a phone.
   */
  it('cannot be asked for a row too narrow to tap', () => {
    const NARROW = 320;
    const cardPx = (n: number): number => (NARROW - 16 - (n - 1) * 5.6) / n;

    const drafts = TUNING.draftWidth + UNLOCKS.filter((u) => u.id === 'draft').length;
    const slots = TUNING.holdSlots + UNLOCKS.filter((u) => u.id === 'hold').length;
    // OPEN HAND deals more and takes the stash away entirely, so it is its own
    // total rather than an addition to the one above.
    const widest = Math.max(drafts + slots, PERK_DIALS.openHandDraft);

    expect(widest, 'the rules can deal more cards than a row was sized for').toBeLessThanOrEqual(6);
    expect(
      cardPx(widest),
      'the widest hand puts a card under the tap floor',
    ).toBeGreaterThanOrEqual(44);
    expect(cardPx(widest + 1), 'the guard is not actually near the edge').toBeLessThan(44);
  });
});

describe('the spacers', () => {
  it('holds a slot for every card the hand has not dealt back', () => {
    expect(handSpacers(3, 4)).toBe(1);
    expect(handSpacers(4, 4)).toBe(0);
  });

  it('never goes negative when the hand is somehow over-full', () => {
    expect(handSpacers(6, 4)).toBe(0);
  });
});

describe('the stash', () => {
  it('draws nothing at all when the dial is off', () => {
    expect(stashSlots(false, 0)).toBe(0);
    expect(stashSlots(false, 2)).toBe(0);
  });

  it('draws one card per slot once it exists', () => {
    expect(stashSlots(true, 2)).toBe(2);
    // A stash that exists is a stash you can see, even at a dial of one.
    expect(stashSlots(true, 0)).toBe(1);
  });
});
