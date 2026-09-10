import { describe, expect, it } from 'vitest';
import type { CellView } from '@render/Renderer';
import { tapMeans, type Reach } from './tap';

/**
 * `INTERACTIONS.md`'S FIRST TABLE, ROW BY ROW (`PASS.md` P2.3).
 *
 * That table is the answer to "did we get back what we had", and its own
 * summary of this region is that **four of this body's inert mechanics were
 * controls rendered here and connected to nothing** — three of its eight rows
 * were a "silent no-op". The decision was an eight-branch cascade with each
 * branch doing its work between the `if` and the `return`, so the ORDER — which
 * is the whole rule — could only be read by reading the effects.
 *
 * The order is what these tests are for. Every case below is a row of that
 * table, and the two ORDERING tests at the end are the pairs where a cell is
 * two things at once and the rule has to say which wins.
 */

/** A hex with nothing remarkable about it. */
const plain = (over: Partial<CellView> = {}): CellView =>
  ({
    kind: 'empty',
    legal: false,
    ripe: false,
    remembered: false,
    beacon: false,
    landmark: null,
    ...over,
  }) as CellView;

const reach = (over: Partial<Reach> = {}): Reach => ({
  touring: false,
  inHand: 3,
  lens: null,
  known: null,
  ...over,
});

describe('a tap on the board', () => {
  it('brings a touring board home, and does nothing else', () => {
    // Whatever is under the finger. The board stays live through a trip, so a
    // thumb that has just pressed GOT IT was raycasting into a board in
    // flight — and placing is the one thing here that cannot be undone.
    for (const cell of [plain({ legal: true }), plain({ ripe: true }), plain()]) {
      expect(tapMeans(cell, reach({ touring: true })).does).toBe('return');
    }
  });

  it('prices a ripe tile', () => {
    expect(tapMeans(plain({ ripe: true }), reach()).does).toBe('price');
  });

  it('places on a legal hex', () => {
    expect(tapMeans(plain({ legal: true }), reach()).does).toBe('place');
  });

  /* The row `INTERACTIONS.md` records as a silent no-op in Ashwake 1. */
  it('says so when the hand is empty, rather than doing nothing', () => {
    expect(tapMeans(plain({ legal: true }), reach({ inHand: 0 })).does).toBe('hand-empty');
  });

  it('lights a colour it remembers under the fog', () => {
    const tap = tapMeans(plain({ remembered: true }), reach({ known: 'green' }));
    expect(tap.does).toBe('lens-on');
    if (tap.does !== 'lens-on') throw new Error('unreachable');
    expect(tap.colour).toBe('green');
  });

  /*
   * The same tap lets go — one of the three ways a lens can be put down, and
   * the one that was unreachable in this body until 2026-09-01 because
   * `HexField`'s raycast refused remembered ground.
   */
  it('puts the lens down on a second tap of the same ground', () => {
    const tap = tapMeans(plain({ remembered: true }), reach({ known: 'green', lens: 'green' }));
    expect(tap.does).toBe('lens-off');
  });

  it('puts the lens down on fog it knows nothing about', () => {
    expect(tapMeans(plain({ remembered: true }), reach({ lens: 'red' })).does).toBe('lens-off');
  });

  it('describes remembered fog when no lens is lit and nothing is known', () => {
    expect(tapMeans(plain({ remembered: true }), reach()).does).toBe('describe');
  });

  it('opens the card for a landmark the board has reached', () => {
    expect(tapMeans(plain({ kind: 'landmark', landmark: 'cache' }), reach()).does).toBe('card');
  });

  /*
   * A MODAL over every glow on the horizon is the wrong weight for "what is
   * that" — the sentence answers it in full, and it even ends "Build your
   * chain out to it." A young board is mostly edge.
   */
  it('only says what a beacon is, and never throws a card', () => {
    expect(
      tapMeans(plain({ kind: 'landmark', landmark: 'shrine', beacon: true }), reach()).does,
    ).toBe('describe');
  });

  it('only says what a remembered landmark is', () => {
    expect(
      tapMeans(plain({ kind: 'landmark', landmark: 'site', remembered: true }), reach()).does,
    ).toBe('describe');
  });

  it('describes anything else', () => {
    expect(tapMeans(plain(), reach()).does).toBe('describe');
    expect(tapMeans(plain({ kind: 'wall' }), reach()).does).toBe('describe');
  });
});

describe('the order, where a hex is two things at once', () => {
  /*
   * A ripe tile is also legal. Pricing is the answer a tap on one wants — the
   * player is choosing which pocket POP spends — and placing on it would spend
   * a tile on a hex they were aiming a harvest at.
   */
  it('prices a ripe hex rather than placing on it', () => {
    expect(tapMeans(plain({ ripe: true, legal: true }), reach()).does).toBe('price');
  });

  /* And the empty hand cannot swallow a pricing tap either. */
  it('still prices a ripe hex with an empty hand', () => {
    expect(tapMeans(plain({ ripe: true, legal: true }), reach({ inHand: 0 })).does).toBe('price');
  });

  /*
   * Remembered ground can carry a landmark. The LENS wins while there is one to
   * work, because the fog tap is a way of LOOKING and the card is a definition
   * — and the row above already refuses a card for remembered ground anyway.
   */
  it('works the lens on remembered ground before anything else', () => {
    const cell = plain({ remembered: true, kind: 'landmark', landmark: 'cache' });
    expect(tapMeans(cell, reach({ known: 'blue' })).does).toBe('lens-on');
  });

  /* Touring outranks every one of them. */
  it('lets a tour end take precedence over the lens', () => {
    const cell = plain({ remembered: true });
    expect(tapMeans(cell, reach({ touring: true, known: 'blue' })).does).toBe('return');
  });
});
