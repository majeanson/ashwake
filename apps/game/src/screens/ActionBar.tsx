import type { Theme } from '@theme/tokens';
import type { HudView } from '@view/view';
import type { Strings } from '@text/Strings';
import { Tile } from '../ui/Tile';

/**
 * The bottom of the screen: one hand, one action bar (Stage 3, 2026-08-29).
 *
 * Ashwake 1 rebuilt this on 2026-08-27 and it took the board from ~53% of the
 * screen to 69–73% — **the single biggest readability change it ever made**.
 * The shape it arrived at is the one here: held cards live IN the hand rather
 * than on their own row, and the actions are one bar underneath.
 *
 * The two-line action button is its own small rule. A verb over a payment reads
 * at a glance, and WebKit read the two lines as one word — "POP5 tiles · 6 pts"
 * — until each button was given a deterministic accessible name of its own.
 * That is what `aria-label` is doing here, and it is not decoration.
 */

export type ActionBarProps = {
  readonly hud: HudView;
  readonly theme: Theme;
  readonly s: Strings;
  readonly onSelect: (index: number) => void;
  /** Long-press a card: hold that colour up against the board. */
  readonly onLens: (index: number | null) => void;
  readonly onHarvest: (choice: 'tiles' | 'points') => void;
  readonly onPurse: () => void;
  readonly purseOpen: boolean;
  readonly onNewRun: () => void;
};

export function ActionBar({
  hud,
  theme,
  s,
  onSelect,
  onLens,
  onHarvest,
  onPurse,
  purseOpen,
  onNewRun,
}: ActionBarProps) {
  return (
    <div className="controls">
      <div
        className="hand"
        data-hud="hand"
        // The stash rides the same grid as the draft, as its last column —
        // Ashwake 1 moved held cards INTO the hand on 2026-08-27 and it is
        // half of why the board got a fifth of the screen back.
        style={
          {
            '--hand-cols': hud.draftWidth + (hud.canHold ? hud.holdSlots : 0),
          } as React.CSSProperties
        }
      >
        {hud.draft.map((card, i) => (
          <Tile
            key={card.id}
            colour={card.colour}
            rarity={card.rarity}
            theme={theme}
            s={s}
            selected={card.selected}
            onPick={() => onSelect(i)}
            onLens={() => onLens(i)}
          />
        ))}
        {hud.canHold &&
          Array.from({ length: hud.holdSlots }, (_, i) => {
            const held = hud.held[i];
            return held === undefined ? (
              <button key={`hold-${i}`} type="button" className="tile hold" disabled>
                {s.ui.hold}
              </button>
            ) : (
              <Tile
                key={`hold-${i}`}
                colour={held.colour}
                rarity={held.rarity}
                theme={theme}
                s={s}
                held
              />
            );
          })}
      </div>

      <div className="action-bar" data-hud="actions">
        {hud.canHarvest && (
          <ActButton
            testId="pop"
            label={s.ui.pop}
            value={
              hud.showPoints
                ? `+${hud.harvestTiles} · ${hud.harvestPoints} pts`
                : `+${hud.harvestTiles} · ×${hud.harvestDepth}`
            }
            onClick={() => onHarvest('tiles')}
          />
        )}
        {hud.canHarvest && !hud.singlePayout && hud.showPoints && (
          <ActButton
            testId="pop-points"
            label={s.ui.pop}
            value={`${hud.harvestPoints} pts`}
            onClick={() => onHarvest('points')}
          />
        )}
        {hud.ended && (
          <ActButton testId="new-run" label={s.ui.newRun} value="" onClick={onNewRun} />
        )}
        {hud.spends.length > 0 && (
          <button
            type="button"
            className="purse-toggle"
            data-action="purse"
            // The drawer opens ABOVE this button, so it is earlier in the
            // document than its own control — which is exactly the case
            // `aria-controls` exists for.
            aria-expanded={purseOpen}
            aria-controls="spends"
            onClick={onPurse}
            style={{ marginLeft: 'auto' }}
          >
            ♦ {hud.luck}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * A verb over a payment, with one accessible name that reads as a sentence.
 * Without it a screen reader runs the two lines together.
 */
function ActButton({
  testId,
  label,
  value,
  onClick,
}: {
  readonly testId: string;
  readonly label: string;
  readonly value: string;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="act"
      data-action={testId}
      aria-label={value === '' ? label : `${label} — ${value}`}
      onClick={onClick}
    >
      <span className="act-label">{label}</span>
      {value !== '' && <span className="act-value">{value}</span>}
    </button>
  );
}
