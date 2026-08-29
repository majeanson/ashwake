import { ICON_DATA_URI, NAME } from '@meta/identity';
import type { Strings } from '@text/Strings';
import type { ThemeId } from '@theme/tokens';
import { useArtSlot } from '../shell/art';

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
  /** Which direction's lockup to look for. */
  readonly themeId: ThemeId;
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
  themeId,
}: FrontDoorProps) {
  const lockup = useArtSlot(themeId, 'ui.logo');
  return (
    <div className="front-door" role="dialog" aria-modal="true" aria-label={NAME} tabIndex={-1}>
      {/*
        The baked lockup where a direction has one, the drawn mark where it
        does not — and the NAME stays either way.

        `ui.logo` has been a declared slot since the core was lifted and was
        empty in every direction until the bakers came back (2026-08-29). The
        heading is not replaced by the picture: the lockup already reads
        ASHWAKE, so the `<h1>` is hidden from sight and kept for the document
        outline and for anyone listening rather than looking. A screen whose
        title exists only inside a PNG has no title.
      */}
      {lockup === null ? (
        <img className="door-mark" src={ICON_DATA_URI} alt="" width={72} height={72} />
      ) : (
        <img className="door-lockup" src={lockup} alt="" width={876} height={450} />
      )}
      <h1 className={lockup === null ? 'door-name' : 'door-name visually-hidden'}>{NAME}</h1>
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
