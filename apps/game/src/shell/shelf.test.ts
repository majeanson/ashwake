import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { TUNING } from '@content/tuning';
import { EMPTY_PROGRESS, grantFind, withWorldPerks } from '@meta/progress';
import { newWorld, type WorldMemory } from '@meta/world';
import { economyFor } from './economy';
import { clearEverything, readProgress, setActiveSlot, writeProgress, writeWorld } from './storage';
import { useDevice } from './useDevice';

/**
 * THE PERK SHELF, and where it actually lives (2026-08-30).
 *
 * Perks moved onto the WORLD on 2026-08-26 — Marc's phone ruling, after a
 * shrine promised a fourth draft card beside an Open Hand found two worlds
 * away — and `encodeProgress` has stripped them from the device blob ever
 * since, deliberately, so one world's shelf cannot leak into another's.
 * `decodeProgress` therefore hands back an empty shelf **by contract**.
 *
 * Nothing in this body ever wrote the world's copy, and nothing ever read it
 * back into the ledger. So a find granted a perk into React state, the device
 * blob refused to carry it, and the next boot had no perk at all; and
 * `economyFor` — which reads `world.perks`/`world.worn` — never saw one, so
 * the dials a worn perk sets were never set, in the run it was found in or in
 * any run after. A perk was a name in a toast.
 *
 * Both halves are asserted here, because either alone is silent: the ledger
 * must come back wearing what the world holds, and what it wears must move a
 * number.
 */

const held: WorldMemory = { ...newWorld(4242), perks: ['openhand'], worn: 'openhand' };

beforeEach(() => {
  clearEverything();
});

describe('the device blob cannot keep a perk, and is not asked to', () => {
  it('strips the shelf on the way out and refuses it on the way in', () => {
    writeProgress({ ...EMPTY_PROGRESS, relics: 9, found: ['openhand'], equipped: ['openhand'] });
    const back = readProgress();
    expect(back.relics, 'the purse is a device fact and must survive').toBe(9);
    expect(back.found, 'the device blob smuggled a world’s perk').toEqual([]);
    expect(back.equipped).toEqual([]);
  });
});

describe('what the shell puts back on', () => {
  it('boots wearing the perks the open world holds', () => {
    setActiveSlot(1);
    writeWorld(1, held);
    const { result } = renderHook(() => useDevice({}));
    expect(result.current.progress.found, 'a found perk did not survive a boot').toEqual([
      'openhand',
    ]);
    expect(result.current.progress.equipped).toEqual(['openhand']);
  });

  it('carries the purse across worlds and the shelf never', () => {
    setActiveSlot(1);
    writeProgress({ ...EMPTY_PROGRESS, relics: 40 });
    writeWorld(1, held);
    writeWorld(2, newWorld(777));

    const { result } = renderHook(() => useDevice({}));
    expect(result.current.progress.found).toEqual(['openhand']);

    // Stepping into a world that has found nothing: the relics come along,
    // the perk stays where it was found. Marc's own ruling, 2026-08-26.
    act(() => result.current.setSlot(2));
    expect(result.current.progress.relics).toBe(40);
    expect(result.current.progress.found).toEqual([]);
    expect(result.current.progress.equipped).toEqual([]);
  });

  /**
   * The override paths go through the composite too. `?taught=1` and `?runs=`
   * hand `useDevice` a whole `Progress`, and a fixture that photographed a
   * world holding perks beside a player carrying none would be a picture of
   * exactly the bug this file exists for.
   */
  it('dresses an OVERRIDDEN ledger in the world’s shelf as well', () => {
    setActiveSlot(1);
    writeWorld(1, held);
    const { result } = renderHook(() => useDevice({ taught: true }));
    expect(result.current.progress.found).toEqual(['openhand']);
  });
});

describe('and then it moves a number', () => {
  it('sets the dials a worn perk sets', () => {
    const bare = economyFor({ kind: 'home', world: newWorld(4242), progress: EMPTY_PROGRESS });
    const worn = economyFor({ kind: 'home', world: held, progress: EMPTY_PROGRESS });
    // OPEN HAND trades the stash for a wider draft — two dials that already
    // existed, which is why it is the perk this can watch move.
    expect(bare.draftWidth).toBe(TUNING.draftWidth);
    expect(worn.draftWidth, 'a worn perk changed no dial').toBeGreaterThan(bare.draftWidth);
    expect(worn.holdSlots).toBe(0);
  });

  /**
   * The whole chain, in the order it happens on a phone: a find grants,
   * the grant is what the world keeps, and the NEXT run opens under it.
   */
  it('carries a find all the way from the hex to the next run’s economy', () => {
    const world = newWorld(4242);
    const shelf = grantFind(withWorldPerks(EMPTY_PROGRESS, world.perks, world.worn), 4242, '9,-4');
    expect(shelf, 'a find granted nothing').not.toBeNull();

    const after: WorldMemory = {
      ...world,
      perks: shelf!.progress.found,
      worn: shelf!.progress.equipped[0] ?? null,
    };
    expect(after.perks).toHaveLength(1);
    expect(after.worn, 'a granted perk was not worn, so it changed nothing').not.toBeNull();

    const next = economyFor({ kind: 'home', world: after, progress: EMPTY_PROGRESS });
    expect(next, 'the perk reached the world and not the economy').not.toEqual(
      economyFor({ kind: 'home', world, progress: EMPTY_PROGRESS }),
    );
  });
});
