import { describe, expect, it } from 'vitest';
import { handColumns, handSpacers, stashSlots } from './hand';

/**
 * The hand's shape, pinned because it is Marc's call and not a preference.
 *
 * A second row costs about 79px of board — *"we lost too much game space"* —
 * and six across is 56px a card on a 390px phone, wide enough for a thumb and
 * too narrow for the ground's NAME. This body was drawing `draft + stash`
 * columns, which is exactly the six-across case the rule exists to prevent.
 */
describe('how wide the hand is', () => {
  it('keeps one row while the cards stay thumbable', () => {
    for (const n of [1, 2, 3, 4, 5]) expect(handColumns(n, 0)).toBe(n);
  });

  it('goes 2×3 at six, which is Marc’s own call', () => {
    expect(handColumns(4, 2)).toBe(3);
    expect(handColumns(6, 0)).toBe(3);
  });

  it('falls back to four across at seven and eight', () => {
    expect(handColumns(5, 2)).toBe(4);
    expect(handColumns(6, 2)).toBe(4);
  });

  it('never asks for zero columns', () => {
    expect(handColumns(0, 0)).toBe(1);
  });

  it('counts the stash in, because it rides the same row', () => {
    // The bug this replaces: four dealt beside two slots drew SIX columns.
    expect(handColumns(4, 2)).toBeLessThan(4 + 2);
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
