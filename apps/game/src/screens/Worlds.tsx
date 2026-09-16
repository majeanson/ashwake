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

type WorldsProps = {
  readonly s: Strings;
  /**
   * The slot this panel is ABOUT — whose atlas it draws and whose ground the
   * abandon control would clear. Always a world, even on a daily, because
   * that is the world the player will step back into.
   */
  readonly active: Slot;
  /**
   * The world the run in progress is actually ON, or null (2026-09-09).
   *
   * Marc: *"highlight the current world were in when were in a world
   * playing with the menu opened."* Separate from `active`, and the
   * separation IS the feature: `active` is a world even while the player is
   * on a daily or standing at the front door, so marking `active` as "you
   * are here" would point at a world nobody is in. Null says nobody is in
   * one, and the list marks nothing.
   */
  readonly here: Slot | null;
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
  here,
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
          /*
           * THE WORLD YOU ARE STANDING IN (2026-09-09).
           *
           * `aria-current` has been on this row since the panel was built and
           * **nothing has ever drawn it** — the same shape as the other misses
           * this week: the fact was computed and no pixel read it. A screen
           * reader has always said "current"; an eye got nothing.
           *
           * It was also pointed at the wrong thing. It read `slot === active`,
           * and `active` is a world even on a daily, so a player mid-daily was
           * told they were standing in a world they had left. `here` is null
           * there, and the list marks nothing.
           */
          const isHere = slot === here;
          return (
            <button
              key={slot}
              type="button"
              data-slot={slot}
              /* The style hook is its own attribute rather than
                 `[aria-current='true']`: an ARIA attribute is a promise to a
                 screen reader, and hanging a look off it makes the two
                 impossible to change apart. */
              {...(isHere ? { 'data-here': '' } : {})}
              aria-current={isHere}
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
              {/*
                And SAID, not only coloured. An accent border is the house's
                mark for "this is the selected one" (`.directions`), and it is
                the whole signal there — fine for a preference a player just
                set, thin for a STATE they arrive to and have to read off the
                screen. A word cannot be missed by a colour-blind eye, a dim
                phone or a screenshot, and the catalogue owns it in both
                languages like every other sentence (D4).
              */}
              {isHere && <span className="world-here">{s.ui.hereNow}</span>}
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

        A LOOK FINDING, STATED WHERE THE DOOR IS (2026-09-16, `NEXT.md` §1a).
        Session A's sheet asked whether Marc opens the atlas more than once a
        run, and his answer after a couple of plays was *"did not notice it"*.
        That is not a fact about the atlas — it is a fact about THIS door:
        MORE, then WORLDS, then below the world picker, with no word on any
        screen a player is on that says an atlas exists. Whether it earns a
        door of its own, a line on the end screen that names it, or nothing,
        is a screen decision and not one this file can derive.
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
