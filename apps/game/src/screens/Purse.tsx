import { COLOUR_ICON } from '@theme/icons';
import { hex, namesOf, type Theme } from '@theme/tokens';
import { Icon } from '../ui/Icon';
import type { HudView, SpendView } from '@view/view';
import type { Strings } from '@text/Strings';

/**
 * The luck purse, as a drawer (Stage 3, 2026-08-29; laid out 2026-08-29).
 *
 * It opens ABOVE the action bar rather than pushing it, so the bar never moves
 * under a thumb that is already reaching for it — Ashwake 1's arrangement, and
 * the reason its toggle needs `aria-controls`.
 *
 * Unaffordable rows are SHOWN and disabled rather than hidden. What luck is for
 * is half the reason to collect it, and a menu that only appears once you can
 * afford it teaches nobody what they were saving toward.
 *
 * ## Its own CLOSE button is gone, and the drawer moved (2026-09-08)
 *
 * Marc: *"remove the go back button but keep the footer, or make it pop above
 * (y-axis wise) the buttons of luck and camera so we dont get locked out"* —
 * and, asked which, both.
 *
 * The lockout was real and structural. This drawer's bottom edge sat at the
 * action bar's top edge, and the camera cluster is pinned to that same corner
 * of the board — at a HIGHER rung on the z ladder, deliberately, so the LUCK
 * button that opens the drawer cannot be painted over by it. Which means the
 * cluster was painted over THIS: over the bottom-right of the drawer, which is
 * exactly where a right-aligned close button and the last spend rows sit. The
 * way out was under the two buttons the whole time.
 *
 * So the drawer clears the cluster now (`.spends` in `ui.css`) and closes by
 * the button that opened it, which is where it started before 2026-09-05 and is
 * one fewer control on a screen Marc had just said has too many. The scrimless
 * drawer keeps no door of its own; LUCK is a toggle and reads as one.
 *
 * **The layout is 2026-08-29** (Marc: "improve ui/ux for when [luck] popup is
 * up, its ugly"), and the ugliness was structural rather than decorative. It
 * was a wrapped row of small buttons each reading `WORD · 5`, which asks a
 * player to do three things at once: work out that the number is a price, hold
 * what they can afford in their head, and tell a colour STEER from a verb when
 * both are set in the same face at the same size. So:
 *
 *   - **The purse says what is in it.** A price means nothing beside a number
 *     nobody is showing you. The head carries the luck and the odds it buys.
 *   - **One row per spend, price on the right.** A column of prices can be
 *     read down; prices scattered through a wrapped row cannot.
 *   - **A steer wears its ground.** The colour rows are the only ones naming a
 *     PLACE rather than an action, and they carry the same swatch and
 *     `COLOUR_ICON` the hand's cards and the manual's legend use — nothing here
 *     invents a symbol.
 */

export type PurseProps = {
  readonly hud: HudView;
  readonly theme: Theme;
  readonly s: Strings;
  readonly onSpend: (spend: SpendView) => void;
};

export function Purse({ hud, theme, s, onSpend }: PurseProps) {
  const names = namesOf(theme, s.locale);

  return (
    <div className="drawer spends" id="spends" data-hud="purse">
      <div className="spends-head">
        <span className="fact-label">{s.lesson.luck.name}</span>
        <b className="spends-luck">{hud.luck}</b>
        {hud.odds !== null && <span className="spends-odds note">{hud.odds}</span>}
      </div>

      {hud.spends.map((spend) => {
        const steer = spend.on === 'steer' && spend.colour !== null ? spend.colour : null;
        return (
          <button
            key={`${spend.on}-${spend.colour ?? ''}`}
            type="button"
            className={`spend-row${spend.on === 'tithe' ? ' armed' : ''}`}
            data-spend={spend.on}
            disabled={!spend.affordable}
            onClick={() => onSpend(spend)}
          >
            {steer !== null && (
              <span
                className="spend-swatch"
                aria-hidden="true"
                style={{ background: hex(theme.terrain[steer].fill) }}
              >
                <Icon name={COLOUR_ICON[steer]} />
              </span>
            )}
            <span className="spend-name">{wordFor(spend, s, names)}</span>
            {/* The price, and it is a price: aligned in a column so the row a
                player can afford is findable without reading every word. */}
            <span className="spend-cost">{spend.cost}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * What a spend is called.
 *
 * The verbs are the catalogue's and the ground names are the DIRECTION's, per
 * language — a steer toward red is called by whatever that direction calls its
 * red, which is LICHEN in torchlit's French and not a translation of anything.
 */
function wordFor(
  spend: SpendView,
  s: Strings,
  names: Readonly<Record<'green' | 'yellow' | 'red' | 'blue', string>>,
): string {
  switch (spend.on) {
    case 'reroll':
      return s.ui.redraw;
    case 'steer':
      return spend.colour === null ? s.ui.redraw : names[spend.colour];
    case 'forge':
      return s.ui.forge;
    case 'tithe':
      // The catalogue's sentence, not an arrow glued between two facts by a
      // component: "becomes" is a word, and which word it is belongs to a
      // language (D4) — and `→` was the last symbol character left in the
      // chrome after D10 took the rest.
      return spend.relics === undefined ? s.ui.sacrificeLuck : s.ui.sacrificeLuckFor(spend.relics);
  }
}
