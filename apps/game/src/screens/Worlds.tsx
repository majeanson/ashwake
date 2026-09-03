import type { WorldMemory } from '@meta/world';
import type { GoalId } from '@content/goals';
import type { Strings } from '@text/Strings';
import { Atlas } from './Atlas';
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
  /**
   * BEGIN AT CAMP — the hex a camp run would wake at, or null where this
   * world may not camp (`shell/store.ts`'s `campFor`).
   *
   * The fifth shrine's unlock, and the last piece of world memory to cross
   * into this body (2026-08-30): `newRun` has taken a `wakeAt` since Stage 1
   * and the shell passed `null`, because the unlock gated a button that did
   * not exist — so a world that had woken every shrine had one rung of its
   * ladder open onto nothing.
   *
   * It lives HERE rather than on the front door for Ashwake 1's own reason:
   * it is a way INTO this world, and this panel is the list of those.
   */
  readonly camp?: { readonly ring: number; readonly onBegin: () => void } | null;
  /**
   * Which of the five world goals the ACTIVE world has met.
   *
   * Computed by the shell rather than here: the answer depends on the device's
   * perk shelf as well as on the world (`metGoalIds` takes both), and a panel
   * that read `progress` to decide a rule would be a second place for that rule
   * to be wrong. See `Atlas`'s `survey`.
   */
  readonly survey?: readonly GoalId[];
};

export function Worlds({
  s,
  active,
  worlds,
  onBack,
  onOpen,
  onAbandon,
  camp,
  survey,
}: WorldsProps) {
  return (
    <Panel
      id="worlds"
      title={s.ui.worlds}
      back={s.ui.back}
      closeAll={s.ui.closeAll}
      onBack={onBack}
    >
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
              {' · '}
              {/*
                A WORD, not an arrow (2026-09-02).

                `↗` was the last raw glyph left in this build, and `screens/Hud`
                documents removing exactly this character for exactly this
                reason: marks are for cross-screen CONCEPTS and stats stay
                words. Reach has no registry entry, should not gain one for a
                list row's sake, and is not an icon — so the arrow was a symbol
                invented in one place, which is what D10 rules against.

                `s.ui.stats.map` is the same word the stat row prints over the
                board, so a world's reach in the list and a run's reach on the
                board are one term rather than two.
              */}
              {world === null
                ? s.ui.emptyWorld
                : `${world.runs} · ${world.bestPoints} · ${s.ui.stats.map} ${world.farthestReach}`}
            </button>
          );
        })}
        {/*
          Under the three, because it is a fourth way in rather than a fourth
          world — and only where the world can actually offer it: the CAMP
          shrine woken and at least one territory held.
        */}
        {camp != null && (
          <button type="button" data-go="camp" onClick={camp.onBegin}>
            {s.ui.camp(camp.ring)}
          </button>
        )}
      </PanelMenu>

      {/*
        The ATLAS of the world you are standing in: what it has become across
        every run played on it. Under the list rather than inside a row —
        seven facts per slot would make the list a wall, and the only world
        whose history you are about to act on is the one you are in.
      */}
      {worlds[active] !== null && <Atlas world={worlds[active]} s={s} survey={survey ?? []} />}

      {worlds[active] !== null && (
        <section>
          <Confirming
            label={s.ui.newWorld}
            armed={s.ui.newWorldArmed(active)}
            onConfirm={() => onAbandon(active)}
          />
          <p className="note">{s.lesson.relic.core}</p>
        </section>
      )}
    </Panel>
  );
}
