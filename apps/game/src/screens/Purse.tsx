import { namesOf, type Theme } from '@theme/tokens';
import type { HudView, SpendView } from '@view/view';
import type { Strings } from '@text/Strings';

/**
 * The luck purse, as a drawer (Stage 3, 2026-08-29).
 *
 * It opens ABOVE the action bar rather than pushing it, so the bar never moves
 * under a thumb that is already reaching for it — Ashwake 1's arrangement, and
 * the reason its toggle needs `aria-controls`.
 *
 * Unaffordable rows are SHOWN and disabled rather than hidden. What luck is for
 * is half the reason to collect it, and a menu that only appears once you can
 * afford it teaches nobody what they were saving toward.
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
    <div className="spends" id="spends" data-hud="purse">
      {hud.odds !== null && <p className="note">{hud.odds}</p>}
      {hud.spends.map((spend) => (
        <button
          key={`${spend.on}-${spend.colour ?? ''}`}
          type="button"
          data-spend={spend.on}
          disabled={!spend.affordable}
          className={spend.on === 'tithe' ? 'armed' : undefined}
          onClick={() => onSpend(spend)}
        >
          {wordFor(spend, s, names)} · {spend.cost}
        </button>
      ))}
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
      return spend.relics === undefined
        ? s.ui.sacrificeLuck
        : `${s.ui.sacrificeLuck} → ${spend.relics}`;
  }
}
