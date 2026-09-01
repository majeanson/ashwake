import type { Progress } from '@meta/progress';
import type { WorldMemory } from '@meta/world';
import type { Theme } from '@theme/tokens';
import { arcNote, type HudView } from '@view/view';
import type { LessonId } from '@view/lessons';
import { GOALS, type GoalId } from '@content/goals';
import type { Strings } from '@text/Strings';
import { FactGrid } from '../ui/FactGrid';
import { Prose } from '../ui/Prose';
import { useState } from 'react';
import { Atlas } from './Atlas';
import { Payout } from './Payout';
import { Shop } from './Shop';
import { statLabel } from './Hud';
import { useArtSlot } from '../shell/art';

/**
 * How a run ended (Stage 3, 2026-08-29).
 *
 * Score and feel are two separate rewards by ruling (Ashwake 1, 2026-08-19): a
 * run thick with caches and shrines may feel better than its number says, and
 * that is the design rather than a bug. So the score is not the only thing on
 * this screen — the epitaph is what the run WAS, and what still glows past the
 * edge is why there is another one.
 *
 * **NEW RUN sits directly under the score.** Ashwake 1 moved it there after
 * finding players hunting two screens down for the way back in, and that is the
 * whole of "chose to start another" — the gate v2.0 turns on.
 *
 * Every sentence here is the core's: the epitaph is hash-picked from a pool per
 * language, the arc note is `arcNote`, and what glows comes through the HUD.
 * The labels are the same marks the stat row uses, imported rather than
 * re-typed, so the screen cannot invent a word for a number.
 */

export type EndScreenProps = {
  readonly hud: HudView;
  /** Every scoring harvest's points, in order — the run's shape. */
  readonly harvests: readonly number[];
  readonly s: Strings;
  readonly theme: Theme;
  readonly progress: Progress;
  readonly onNewRun: () => void;
  readonly onTerm: (id: LessonId) => void;
  readonly onProgress: (next: (was: Progress) => Progress) => void;
  readonly onMore: () => void;
  /**
   * Hand this run to somebody. Returns what happened so the button can say
   * COPIED where there was no share sheet — a tap that appears to do nothing
   * is the whole reason this needs a return value.
   */
  readonly onShare: () => Promise<'shared' | 'copied' | 'failed'>;
  /** Goals this run was the one to meet, for this world. */
  readonly goals: readonly GoalId[];
  /**
   * Back onto the board this run just ended on.
   *
   * Marc, 2026-08-29: *"in the end screen i loved having my real map to check
   * it back again, keep it that way just like we did."* That was answered with
   * a PNG snapshot, and on 2026-08-30 he looked at it: *"the ground you walked
   * 'picture' is ugly, i dont want a picture i want to actual screengame where
   * we can move around."*
   *
   * He is right, and the picture was never the thing he asked for — "check it
   * back again" is a verb. The board is still MOUNTED behind this screen (the
   * R3F canvas lives once, above every scene, and never remounts), still
   * holding the exact cells the run ended on, still able to pan, pinch and
   * FIT. It was simply covered by an opaque page. So this hands the screen
   * back to it and `App` puts a way out at the bottom; the snapshot is still
   * taken, because the hall of fame's diary rows are the one place a picture
   * IS the right answer.
   */
  readonly onWalk: () => void;
  /**
   * What this run CHANGED, as opposed to what it scored.
   *
   * Perks found and shrine unlocks woken. An ending that reports only a number
   * cannot tell a player that the next run starts different, which is the one
   * thing that makes them press NEW RUN.
   */
  readonly newPerks?: readonly string[];
  readonly newUnlocks?: readonly string[];
  /**
   * The world this run left behind, where there is one (2026-09-01).
   *
   * Marc, of a run whose shrine handed him the fourth draft card: *"in this
   * game I got the shrine 4th tile, id like it shown in the end screen."*
   *
   * The WOKE line above answers "what changed" and cannot answer "where does
   * that leave me" — three shrines of five, and WHICH three. Those are the two
   * facts the atlas already carries, and until now they were three taps away in
   * MORE, on the one screen where they have just been earned. So the atlas is
   * shown here, unchanged: a world is described in one place however you arrive
   * at it, exactly as a cache is.
   *
   * Absent on a detour and on a daily, neither of which has a world.
   */
  readonly world?: WorldMemory | null;
  /** Back to the front door: an ending needs a way out that is not another run. */
  readonly onMainMenu: () => void;
};

export function EndScreen({
  onWalk,
  newPerks,
  newUnlocks,
  world,
  onMainMenu,
  hud,
  harvests,
  s,
  theme,
  progress,
  onNewRun,
  onTerm,
  onProgress,
  onMore,
  onShare,
  goals,
}: EndScreenProps) {
  // What the share button says after it has been tapped. A share sheet needs
  // no word — the sheet IS the feedback — but a silent copy is a tap that
  // looks like it did nothing.
  const [said, setSaid] = useState<string | null>(null);
  const onShare2 = () => {
    void onShare().then((how) => {
      setSaid(how === 'copied' ? s.ui.copied : null);
    });
  };

  // The direction's own board scene, where one is baked. `ui.runEnd` was a
  // declared slot with no file in any direction until 2026-08-29 — the screen
  // simply had no hero, which is a supported state and not the intended one.
  const hero = useArtSlot(theme.id, 'ui.runEnd');

  const summary = hud.summary;
  const arc = summary === null ? null : arcNote(summary, s);

  return (
    <div className="end" data-hud="end">
      {hero !== null && <img className="end-hero" src={hero} alt="" width={876} height={330} />}
      <p className="end-score">{hud.points}</p>

      {hud.epitaph !== null && (
        <p className="end-epitaph">
          <Prose text={hud.epitaph} s={s} onTerm={onTerm} />
        </p>
      )}

      <button type="button" className="door-begin" data-action="new-run" onClick={onNewRun}>
        {s.ui.newRun}
      </button>

      {hud.glowBeyondEdge !== null && (
        <p className="note">
          <Prose text={hud.glowBeyondEdge} s={s} onTerm={onTerm} />
        </p>
      )}

      <FactGrid
        facts={[
          { label: statLabel('tiles', s), value: hud.tiles },
          { label: statLabel('points', s), value: hud.points },
          { label: statLabel('map', s), value: hud.depthValue },
          { label: statLabel('luck', s), value: hud.luck },
        ]}
      />

      {arc !== null && (
        <p className="note">
          <Prose text={arc} s={s} onTerm={onTerm} />
        </p>
      )}

      {/*
        WHAT CHANGED, as opposed to what was scored (2026-08-29).

        Marc: *"make sure we identify new perks, new shrine unlocks, etc."* A
        perk found and a shrine woken are the two things that make the NEXT run
        different, and both were silent here — the shelf simply had one more on
        it the next time you looked. An ending that reports only a number
        cannot say why to press NEW RUN.

        Above the payout for the same reason the survey is: rare beats routine,
        and the breakdown is always there.
      */}
      {(newPerks ?? []).length + (newUnlocks ?? []).length > 0 && (
        <ul className="goals-met" data-hud="gained">
          {(newUnlocks ?? []).map((label) => (
            <li key={`u-${label}`}>{s.ui.woke(label)}</li>
          ))}
          {(newPerks ?? []).map((label) => (
            <li key={`p-${label}`}>{s.ui.perkFound(label)}</li>
          ))}
        </ul>
      )}

      {/*
        WHERE THAT LEAVES THE WORLD (2026-09-01) — see `world` above.

        Directly under the WOKE line, because the two are one sentence: this
        run woke A FOURTH DRAFT CARD, and this world now stands at three
        shrines of five with these three awake. The same component the WORLDS
        panel shows, so a world reads the same wherever you meet it.
      */}
      {world != null && (
        <>
          <h2 className="fact-label end-world-head">{s.ui.thisWorld}</h2>
          <Atlas world={world} s={s} />
        </>
      )}

      {/*
        The SURVEY: what this run was the one to finish, for this world.
        Above the breakdown, because a goal met is the rarest thing an ending
        can carry and the payout is always there.
      */}
      {goals.length > 0 && (
        <ul className="goals-met">
          {goals.map((id) => (
            <li key={id}>{s.goalMet(s.goal[id], GOALS.find((g) => g.id === id)?.reward ?? 0)}</li>
          ))}
        </ul>
      )}

      {/* Why the number was what it was, one tap down — see `Payout`. */}
      {summary !== null && <Payout summary={summary} harvests={harvests} theme={theme} s={s} />}

      {/* The relics this run earned are spent HERE, on the screen where they
          were earned — Ashwake 1's ruling, and the whole of the roguelite
          loop: a run that ends on a purchase is a run that ends pointing at
          the next one. The shop is the same component the shop panel is, with
          its own back button omitted because this is not a panel. */}
      <Shop progress={progress} theme={theme} s={s} onProgress={onProgress} onTerm={onTerm} />

      <nav className="panel-menu">
        {/* SHARE is the game's entire distribution mechanism: it has no store
            listing and no account, so a run reaches another person because
            somebody pasted this. It sits under the score rather than beside
            NEW RUN, which is the one button the v2.0 gate turns on. */}
        <button type="button" data-action="share" onClick={onShare2}>
          {said ?? s.ui.share}
        </button>
        <button type="button" data-door="main" onClick={onMainMenu}>
          {s.ui.mainMenu}
        </button>
        <button type="button" data-door="more" onClick={onMore}>
          {s.ui.more}
        </button>
      </nav>

      {/*
        THE MAP, last: the run you just walked, and you can walk it again.

        Marc: *"in the end screen i loved having my real map to check it back
        again."* It sits under everything because it is the thing you scroll
        BACK to — the numbers answer "how did I do", and this answers "what did
        it look like", which is the question you ask second and the one that
        makes a run memorable.

        It was a PNG of the board and is a DOOR onto the board (2026-08-30) —
        see `onWalk`. Nothing is drawn in the slot, deliberately: a thumbnail
        beside a button that opens the real thing is the ugly picture again, at
        a smaller size.
      */}
      <button type="button" className="end-map" data-action="walk-map" onClick={onWalk}>
        <span className="end-map-name">{s.ui.theMap}</span>
        <span className="end-map-note">{s.ui.walkTheMap}</span>
      </button>
    </div>
  );
}
