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
  readonly onMore: () => void;
  readonly onDaily: () => void;
  /** Today's standing, already worded by the catalogue — `dailyBadge`. */
  readonly dailyBadge: string;
};

export function FrontDoor({
  s,
  resuming,
  onBegin,
  onHowToPlay,
  onSettings,
  onMore,
  onDaily,
  dailyBadge,
}: FrontDoorProps) {
  return (
    <div className="front-door" role="dialog" aria-modal="true" aria-label={NAME} tabIndex={-1}>
      <img className="door-mark" src={ICON_DATA_URI} alt="" width={72} height={72} />
      <h1 className="door-name">{NAME}</h1>
      <p className="note door-tagline">{s.tagline}</p>

      <button type="button" className="door-begin" data-door="begin" onClick={onBegin}>
        {resuming ? s.ui.resume : s.ui.begin}
      </button>

      {/* Today's board, under BEGIN and above the quiet choices: it is the
          second thing a returning player wants and never the first thing a
          stranger should meet. The badge is the catalogue's sentence — this
          screen counts nothing. */}
      <button type="button" className="door-daily" data-door="daily" onClick={onDaily}>
        {dailyBadge}
      </button>

      <nav className="panel-menu door-more">
        <button type="button" data-door="how" onClick={onHowToPlay}>
          {s.ui.howToPlay}
        </button>
        <button type="button" data-door="settings" onClick={onSettings}>
          {s.ui.settings}
        </button>
        {/* Everything that is not the first minute lives one tap deeper. The
            door stays three choices wide for a stranger; MORE is where a
            returning player's worlds, shop and hall of fame are. */}
        <button type="button" data-door="more" onClick={onMore}>
          {s.ui.more}
        </button>
      </nav>
    </div>
  );
}
