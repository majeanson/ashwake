import { describe, expect, test } from 'vitest';
import type { Motif } from '@theme/tokens';
import { PROP_HEIGHT, propGeometry, propRise, REWARDS } from './landmarks';

/**
 * What a prop has to be true of, in every motif (2026-08-29).
 *
 * The props were built by looking, which is right, and then went a whole stage
 * with nothing measuring them — so the shrine spent it lying flat under a
 * comment that said it was standing on edge, and nobody could have known
 * without doing the arithmetic. This file is that arithmetic. It does not
 * decide what a destination should LOOK like; it holds the three things that
 * are true of any prop that works: it lands on its ground, it is big enough to
 * see from across the board, and it is not so big that it hides the number
 * printed under it.
 *
 * A settlement's destinations are a different set of objects
 * (`settlementGeometry`), so every check runs over both motifs — which is also
 * what stops a new motif shipping a prop buried in the floor.
 */

const MOTIFS: readonly Motif[] = ['plane', 'settlement'];

/** Where a prop's bottom, top and widest point end up once it is risen. */
function standing(reward: (typeof REWARDS)[number], motif: Motif) {
  const geometry = propGeometry(reward, motif);
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (box === null) throw new Error(`${motif}/${reward} has no bounding box`);
  const rise = propRise(reward, motif);
  return { bottom: box.min.y + rise, top: box.max.y + rise, width: box.max.x - box.min.x };
}

describe.each(MOTIFS)('a %s prop', (motif) => {
  test.each(REWARDS)('%s lands on its ground rather than sinking into it', (reward) => {
    const { bottom } = standing(reward, motif);
    // The shrine is the one exception and it is deliberate — see its own
    // comment in `landmarks.ts`. Everything else touches down.
    if (reward === 'shrine') {
      expect(bottom).toBeGreaterThan(0.3);
      return;
    }
    // A hair under zero is a polyhedron's vertex, not a prop half-buried: the
    // plane's crystal sits 0.025 of a hex into the ground on purpose, because
    // it grew there.
    expect(bottom).toBeGreaterThan(-0.03);
    expect(bottom).toBeLessThan(0.02);
  });

  test.each(REWARDS)('%s stands tall enough to see and narrow enough to see past', (reward) => {
    const { top, width } = standing(reward, motif);
    // A destination is the thing you can spot from across the board. Below a
    // third of a hex it is a smudge at the zoom ceiling, which is what the
    // first pass at these was.
    expect(top).toBeGreaterThan(PROP_HEIGHT * 0.4);
    expect(top).toBeLessThanOrEqual(PROP_HEIGHT * 1.15);
    // And it stands ON a hex that still has to show its own ground and its own
    // number: a prop wider than the hex is a lid.
    expect(width).toBeLessThanOrEqual(1);
  });
});

/**
 * The ruling, as a test: the settlement re-reads three of the five and leaves
 * two alone, because a threshold is a threshold in both fictions and a find is
 * the one thing nobody put where it is. If a later pass changes one of those
 * two, this fails and asks for the argument.
 */
test('the settlement changes the built destinations and leaves the other two', () => {
  const differs = REWARDS.filter((reward) => {
    const plane = standing(reward, 'plane');
    const settlement = standing(reward, 'settlement');
    return plane.top !== settlement.top || plane.width !== settlement.width;
  });
  expect(differs).toEqual(['cache', 'site', 'territory']);
});
