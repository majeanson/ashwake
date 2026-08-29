import { arcNote, type HudView } from '@view/view';
import type { LessonId } from '@view/lessons';
import type { Strings } from '@text/Strings';
import { FactGrid } from '../ui/FactGrid';
import { Prose } from '../ui/Prose';
import { statLabel } from './Hud';

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
  readonly s: Strings;
  readonly onNewRun: () => void;
  readonly onTerm: (id: LessonId) => void;
};

export function EndScreen({ hud, s, onNewRun, onTerm }: EndScreenProps) {
  const summary = hud.summary;
  const arc = summary === null ? null : arcNote(summary, s);

  return (
    <div className="end" data-hud="end">
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
    </div>
  );
}
