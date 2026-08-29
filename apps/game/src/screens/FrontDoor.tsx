import { ICON_DATA_URI, NAME } from '@meta/identity';
import type { Strings } from '@text/Strings';

/**
 * The front door (Stage 3, 2026-08-29).
 *
 * The first screen anyone sees, and the one a stranger judges the whole game
 * by. Ashwake 1's shape: the mark, the name, the tagline, one loud way in, and
 * everything else quiet underneath.
 *
 * **Focus goes to the dialog rather than to BEGIN.** Ashwake 1's ruling, and
 * the reason is that landing on BEGIN puts a focus ring on the one control a
 * player was about to press anyway, which reads as the screen having already
 * been used.
 */

export type FrontDoorProps = {
  readonly s: Strings;
  /** A run already in progress — BEGIN becomes RESUME. */
  readonly resuming: boolean;
  readonly onBegin: () => void;
  readonly onHowToPlay: () => void;
  readonly onSettings: () => void;
};

export function FrontDoor({ s, resuming, onBegin, onHowToPlay, onSettings }: FrontDoorProps) {
  return (
    <div className="front-door" role="dialog" aria-modal="true" aria-label={NAME} tabIndex={-1}>
      <img className="door-mark" src={ICON_DATA_URI} alt="" width={72} height={72} />
      <h1 className="door-name">{NAME}</h1>
      <p className="note door-tagline">{s.tagline}</p>

      <button type="button" className="door-begin" data-door="begin" onClick={onBegin}>
        {resuming ? s.ui.resume : s.ui.begin}
      </button>

      <nav className="panel-menu door-more">
        <button type="button" data-door="how" onClick={onHowToPlay}>
          {s.ui.howToPlay}
        </button>
        <button type="button" data-door="settings" onClick={onSettings}>
          {s.ui.settings}
        </button>
      </nav>
    </div>
  );
}
