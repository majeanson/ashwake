import type { WorldMemory } from '@meta/world';
import type { Strings } from '@text/Strings';
import { Confirming } from '../ui/Confirming';
import { Panel, PanelMenu } from '../ui/Panel';
import { SLOTS, type Slot } from '../shell/storage';

/**
 * THE THREE WORLDS (Stage 4, 2026-08-29).
 *
 * A world is a seed and everything this device remembers about it — the ground
 * walked, the shrines woken, the perks found. Three of them, because one is a
 * game you either continue or abandon and three is a game you can keep a long
 * one going in while trying something else.
 *
 * Every row says what that slot IS rather than only what it is called: a world
 * with history reads its runs and its best, and an empty slot says it is
 * empty. Ashwake 1's finding — a list of three identical buttons is a list
 * nobody can choose from.
 *
 * **Leaving a world is a two-tap arm.** It is the most destructive thing on
 * this screen and the one whose consequence is easiest to misread: NEW WORLD
 * does not make a fourth, it replaces the one you are standing in.
 */

export type WorldsProps = {
  readonly s: Strings;
  readonly active: Slot;
  /** What each slot holds; `null` where nobody has played yet. */
  readonly worlds: Readonly<Record<Slot, WorldMemory | null>>;
  readonly onBack: () => void;
  readonly onOpen: (slot: Slot) => void;
  readonly onAbandon: (slot: Slot) => void;
};

export function Worlds({ s, active, worlds, onBack, onOpen, onAbandon }: WorldsProps) {
  return (
    <Panel id="worlds" title={s.ui.worlds} back={s.ui.back} onBack={onBack}>
      <PanelMenu>
        {SLOTS.map((slot) => {
          const world = worlds[slot];
          const here = slot === active;
          return (
            <button
              key={slot}
              type="button"
              data-slot={slot}
              aria-current={here}
              onClick={() => onOpen(slot)}
            >
              {s.ui.worldN(slot)}
              {here ? ' · ' : ' — '}
              {world === null
                ? s.ui.emptyWorld
                : `${world.runs} · ${world.bestPoints} · ↗ ${world.farthestReach}`}
            </button>
          );
        })}
      </PanelMenu>

      {worlds[active] !== null && (
        <section>
          <Confirming
            label={s.ui.newWorld}
            armed={`${s.ui.newWorld} — ${s.ui.worldN(active)}?`}
            onConfirm={() => onAbandon(active)}
          />
          <p className="note">{s.lesson.relic.core}</p>
        </section>
      )}
    </Panel>
  );
}
