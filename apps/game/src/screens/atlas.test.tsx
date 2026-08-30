import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { pickLocale } from '@content/locale';
import { PERKS } from '@meta/progress';
import { newWorld, UNLOCKS, type WorldMemory } from '@meta/world';
import { stringsFor } from '@text/index';
import { Atlas } from './Atlas';

/**
 * What a world has BECOME, and whether the fractions mean anything.
 *
 * The atlas is seven numbers about a world, and two of them are fractions —
 * which is the shape that can be wrong while looking completely normal. FINDS
 * counted find HEXES claimed against the size of the PERK POOL, two different
 * things wearing one slash, so a world with six find hexes and five perks read
 * **`6/5`**. It came out of the three-hundred-run fixture's screenshot and it
 * is reachable in ordinary play by anyone who claims a sixth find: a find
 * grants a perk only while the shelf has room.
 */

const s = stringsFor(pickLocale(['en']));

const world = (over: Partial<WorldMemory> = {}): WorldMemory => ({ ...newWorld(7), ...over });

describe('the atlas fractions', () => {
  it('never counts a find past the pool it is a fraction of', () => {
    render(
      <Atlas
        world={world({
          // More find hexes claimed than there are perks to grant — a veteran
          // world, and the state that printed `6/5`.
          finds: ['1,0', '2,0', '3,0', '4,0', '5,0', '6,0'],
          perks: PERKS.map((p) => p.id),
        })}
        s={s}
      />,
    );
    expect(screen.getByText(`${PERKS.length}/${PERKS.length}`)).toBeInTheDocument();
    expect(screen.queryByText(`6/${PERKS.length}`)).toBeNull();
  });

  it('reads the hunt as what the world HOLDS, not what it has walked over', () => {
    render(<Atlas world={world({ finds: ['1,0', '2,0'], perks: ['openhand'] })} s={s} />);
    expect(screen.getByText(`1/${PERKS.length}`)).toBeInTheDocument();
  });

  it('counts shrines against the ledger that is actually spendable', () => {
    render(<Atlas world={world({ shrines: ['1,0', '2,0'] })} s={s} />);
    expect(screen.getByText(`2/${UNLOCKS.length}`)).toBeInTheDocument();
  });

  it('says nothing is unlocked on a world with no shrine woken', () => {
    render(<Atlas world={world()} s={s} />);
    expect(screen.queryByText(new RegExp(s.ui.atlasUnlocked))).toBeNull();
  });
});
