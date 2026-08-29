import { AUTO_THEME_ID, THEMES } from '@theme/index';
import type { ThemeId } from '@theme/tokens';
import type { Strings } from '@text/Strings';
import { Swatch } from '../ui/Swatch';

/**
 * The direction strip — `?themes=1` (Stage 5, 2026-08-29).
 *
 * A workbench, not a feature. Ashwake 1 answered this with a 955-line
 * `gallery.html` showing every surface of every direction side by side, and
 * that page answers a different question than the one being asked here: a
 * direction is judged on a **board**, on a phone, in portrait, and a grid of
 * swatches is a picture of the paint rather than of the game.
 *
 * So this puts the choice over the board instead of over a menu. SETTINGS can
 * already switch directions and always could — the problem is that the panel
 * doing the switching COVERS the thing being judged, which makes comparing
 * five of them five round trips through a menu. Here the board never leaves
 * the screen and a direction is one tap.
 *
 * Behind a query dial and off by default, exactly like `?tilt=`, `?light=` and
 * `?relief=`: every look question in this codebase is argued by putting the
 * number in the URL and looking, and this is the same tool for the one look
 * question that is not a number.
 *
 * It writes through the same `onTheme` the settings panel does, so a direction
 * picked here is REMEMBERED — which matters, because the way this gets used is
 * to leave the phone on one direction and come back to it an hour later.
 */

export type DirectionsProps = {
  readonly s: Strings;
  /** What the device has stored, which may be AUTO. */
  readonly stored: ThemeId;
  readonly onTheme: (id: ThemeId) => void;
};

export function Directions({ s, stored, onTheme }: DirectionsProps) {
  return (
    <div className="directions" role="group" aria-label={s.ui.appearance} data-hud="directions">
      {THEMES.map((each) => (
        <button
          key={each.id}
          type="button"
          data-theme-pick={each.id}
          aria-pressed={stored === each.id}
          // The name is the accessible label rather than visible text: the
          // strip has to leave the board readable underneath it, and a row of
          // five names would be a second HUD.
          aria-label={each.name[s.locale]}
          title={each.name[s.locale]}
          onClick={() => onTheme(each.id)}
        >
          <Swatch theme={each} />
        </button>
      ))}
      <button
        type="button"
        data-theme-pick={AUTO_THEME_ID}
        aria-pressed={stored === AUTO_THEME_ID}
        onClick={() => onTheme(AUTO_THEME_ID)}
      >
        {s.ui.auto}
      </button>
    </div>
  );
}
