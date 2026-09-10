import { describe, expect, it } from 'vitest';
import { newWorld } from '@meta/world';
import { heldFor } from './held';

/**
 * WHICH COPY ANSWERS FOR A SEED (`PASS.md` P2.9).
 *
 * The rule was three lines inside a `useCallback` in `App.tsx` and had no test,
 * because there was no way to call it. It is the same rule `settle`'s guard and
 * `memoryFor` enforce — a run may only ever be merged into the world it was
 * PLAYED on — and this is the reader's half of it: **a copy whose seed does not
 * match is a wrong answer, not a miss.** Ground unioned from a foreign
 * geography is unremovable afterwards, which is why the distinction is worth a
 * function.
 */

const world = (seed: number) => newWorld(seed);

describe('the live world, by seed', () => {
  it('prefers the held copy when it is this world', () => {
    const held = world(7);
    const disk = world(7);
    expect(heldFor(held, disk, 7)).toBe(held);
  });

  it('falls back to the disk when nothing is held yet', () => {
    const disk = world(7);
    expect(heldFor(null, disk, 7)).toBe(disk);
  });

  /*
   * The case the seed check exists for. A `?seed=` visitor is standing in a
   * slot, so the disk under them holds THEIR world while the run is somebody
   * else's — and a held copy can outlive a door the same way.
   */
  it('refuses a held copy from another world rather than filling from disk', () => {
    // The held copy is world 7's; the question is about world 9. The disk
    // holding a matching world would be a coincidence and is tested below —
    // what matters here is that a mismatched HELD copy is not handed back.
    expect(heldFor(world(7), null, 9)).toBeNull();
  });

  it('refuses a disk copy from another world', () => {
    expect(heldFor(null, world(7), 9)).toBeNull();
  });

  it('takes the disk when the held copy is the foreign one', () => {
    const disk = world(9);
    expect(heldFor(world(7), disk, 9)).toBe(disk);
  });

  it('answers null when this device has no such world at all', () => {
    expect(heldFor(null, null, 7)).toBeNull();
  });
});
