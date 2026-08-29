import type { Progress } from '@meta/progress';
import type { Theme } from '@theme/tokens';
import { arcNote, type HudView } from '@view/view';
import type { LessonId } from '@view/lessons';
import type { GoalId } from '@content/goals';
import type { Strings } from '@text/Strings';
import { FactGrid } from '../ui/FactGrid';
import { Prose } from '../ui/Prose';
import { useState } from 'react';
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
};

export function EndScreen({
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
        The SURVEY: what this run was the one to finish, for this world.
        Above the breakdown, because a goal met is the rarest thing an ending
        can carry and the payout is always there.
      */}
      {goals.length > 0 && (
        <ul className="goals-met">
          {goals.map((id) => (
            <li key={id}>{s.goalMet(s.goal[id])}</li>
          ))}
        </ul>
      )}

      {/* Why the number was what it was, one tap down — see `Payout`. */}
      {summary !== null && <Payout summary={summary} harvests={harvests} s={s} />}

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
        <button type="button" data-door="more" onClick={onMore}>
          {s.ui.more}
        </button>
      </nav>
    </div>
  );
}
