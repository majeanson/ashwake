import { knownFraction, unlockedBy, UNLOCKS, unlockLabel, type WorldMemory } from '@meta/world';
import { PERKS } from '@meta/progress';
import type { Strings } from '@text/Strings';
import { FactGrid } from '../ui/FactGrid';

/**
 * The atlas: what a world has BECOME (Stage 5, 2026-08-29).
 *
 * A world outlives every run played on it, and until now the only thing the
 * game said about one was a single line in the worlds list. This is the rest:
 * how far it has been walked, how much of it is known, what it holds, and
 * which of its systems are awake.
 *
 * **Not a map.** Ashwake 1 kept the same facts as a block in the manual and
 * never drew the world — and its reason travels: the plane is infinite, so a
 * picture of a world is a picture of an arbitrary window onto one, while these
 * numbers are true whatever you frame. `knownFraction` says as much in the
 * core: *"any percentage is a story about YOUR world, and this is the least
 * misleading story available."*
 *
 * A RECORD is a different kind of fact from the numbers a run is played
 * against, which is why FARTHEST lives here and REACH lives in the stat row.
 */

export function Atlas({ world, s }: { readonly world: WorldMemory; readonly s: Strings }) {
  const awake = unlockedBy(world);

  return (
    <section className="atlas">
      <FactGrid
        facts={[
          { label: s.ui.atlasRuns, value: world.runs },
          { label: s.ui.atlasBest, value: world.bestPoints },
          { label: s.ui.atlasFarthest, value: world.farthestReach },
          // Rounded to whole points: a world is not known to a decimal, and
          // `knownFraction` is already the least misleading story available.
          { label: s.ui.atlasKnown, value: `${Math.round(knownFraction(world) * 100)}%` },
          { label: s.ui.atlasTerritories, value: world.territories.length },
          { label: s.ui.atlasShrines, value: `${world.shrines.length}/${UNLOCKS.length}` },
          /*
           * The perk hunt, and the numerator is the SHELF (2026-08-30).
           *
           * It counted `world.finds.length` — find HEXES claimed — against
           * `PERKS.length`, the size of the perk pool, which are two different
           * things wearing one fraction. A find grants a perk only while the
           * shelf has room, so a world with six find hexes and five perks read
           * **`6/5`**, which is either a bug in the game or a bug in
           * arithmetic and a player cannot tell which. Found in the
           * three-hundred-run fixture's shot, and reachable in ordinary play by
           * anyone who claims a sixth find.
           *
           * The denominator settles it: the row asks "how much of the hunt is
           * done", so the numerator is what you HOLD. It is also the fraction
           * Marc quoted when the finds were not paying at all — *"in the end
           * screen I still see 0/5"*.
           */
          { label: s.ui.atlasFinds, value: `${world.perks.length}/${PERKS.length}` },
        ]}
      />
      {awake.length > 0 && (
        <p className="note">
          {s.ui.atlasUnlocked} ·{' '}
          {awake.map((id) => unlockLabel(id as (typeof UNLOCKS)[number]['id'], s)).join(' · ')}
        </p>
      )}
    </section>
  );
}
