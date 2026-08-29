import { COLOURS } from '@content/tuning';
import { hex, type Theme } from '@theme/tokens';

/**
 * A direction, shown rather than named (Stage 4, 2026-08-29).
 *
 * The appearance picker was a column of text buttons, which asks a player to
 * choose a LOOK from a list of words — the one decision on that screen where
 * the answer is entirely visual. A direction is its four grounds, its ink and
 * its ground colour, so that is what this draws: the actual tokens, straight
 * from the theme, at the size of a thumbnail.
 *
 * Reads the theme it is drawing rather than CSS variables, because the CSS
 * variables belong to the direction currently APPLIED — every swatch would
 * come out the same colour, which is the exact opposite of the point.
 */
export function Swatch({ theme }: { readonly theme: Theme }) {
  return (
    <span
      className="swatch"
      aria-hidden="true"
      style={{ background: hex(theme.ink.bg), borderColor: hex(theme.ink.panelEdge) }}
    >
      {COLOURS.map((colour) => (
        <span key={colour} style={{ background: hex(theme.terrain[colour].fill) }} />
      ))}
      {/* The ink, last and narrow: it is what every word on the screen will be
          written in, and it is the half of a direction a palette strip leaves
          out. A direction whose grounds are lovely and whose ink is unreadable
          should look wrong here. */}
      <span className="swatch-ink" style={{ background: hex(theme.ink.ink) }} />
    </span>
  );
}
