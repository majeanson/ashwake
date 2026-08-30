import { CONCEPT_MARK, type Theme } from '@theme/tokens';
import type { HudView } from '@view/view';
import type { HarvestChoice } from '@engine/state';
import type { Strings } from '@text/Strings';
import { handColumns, handSpacers, stashSlots } from './hand';
import { useTerrainArt } from '../shell/art';
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
  /** Tap a stash slot. The index travels: THIS card trades with THIS slot. */
  readonly onHold: (slot: number) => void;
  readonly onHarvest: (choice: HarvestChoice) => void;
  /** Whether the device has met relics — the gate on offering a burn. */
  readonly knowsRelics: boolean;
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
  onHold,
  onHarvest,
  knowsRelics,
  onPurse,
  purseOpen,
  onNewRun,
}: ActionBarProps) {
  // The baked hex per ground, so a card in the hand is the tile it will
  // become. Asked for once here rather than once per card: four slots, one
  // shared manifest, and the answer is the same for every card of a colour.
  const art = useTerrainArt(theme.id);
  const stash = stashSlots(hud.canHold, hud.holdSlots);
  // See SACRIFICE below: a burn is only offered once relics mean something.
  const burnKnown = !hud.burnPaysRelics || knowsRelics || hud.relics > 0;
  const burn = hud.canHarvest && burnKnown ? hud.harvestBurn : 0;

  return (
    <div className="controls">
      <div
        className="hand"
        data-hud="hand"
        // The stash rides the same grid as the draft, as its last columns —
        // Ashwake 1 moved held cards INTO the hand on 2026-08-27 and it is
        // half of why the board got a fifth of the screen back. How many
        // columns that row takes is `handColumns`, which is not the sum: six
        // across is 56px a card on a 390px phone, too narrow for the ground's
        // name.
        style={
          {
            '--hand-cols': handColumns(hud.draftWidth, stash),
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
            art={art[card.colour]}
            selected={card.selected}
            onPick={() => onSelect(i)}
            onLens={() => onLens(i)}
          />
        ))}
        {/* A hand one card short keeps its slot, so the row does not reflow
            under a thumb in the two taps between a stash and the next deal. */}
        {Array.from({ length: handSpacers(hud.draft.length, hud.draftWidth) }, (_, i) => (
          <div key={`gap-${i}`} className="tile gap" aria-hidden="true" />
        ))}
        {Array.from({ length: stash }, (_, i) => {
          const held = hud.held[i];
          // The index travels either way: an empty slot is "put this away"
          // and a full one is "trade with this", and the reducer reads which
          // from whether the slot holds anything. One gesture, and the slot
          // you touch is the slot you mean.
          return held === undefined ? (
            <button
              key={`hold-${i}`}
              type="button"
              className="tile hold"
              data-hold={i}
              aria-label={s.ui.holdEmpty}
              onClick={() => onHold(i)}
            >
              {s.ui.hold}
            </button>
          ) : (
            <Tile
              key={`hold-${i}`}
              colour={held.colour}
              rarity={held.rarity}
              theme={theme}
              s={s}
              art={art[held.colour]}
              held
              slot={i}
              onPick={() => onHold(i)}
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
        {/*
          TAKE — spend the pocket for a rare tile instead of for its payout.
          Offered only when the pocket actually earns one, which is what
          `harvestTreasure` answers.
        */}
        {hud.canHarvest && hud.harvestTreasure !== null && (
          <ActButton
            testId="pop-treasure"
            label={s.ui.take}
            // `s.payout.rarity` already names all three, for the end
            // screen's breakdown. One word per rarity, in one place.
            value={`1 ${s.payout.rarity[hud.harvestTreasure]}`}
            onClick={() => onHarvest('treasure')}
          />
        )}
        {/*
          SACRIFICE — burn the pocket for relics, or for luck where relics are
          not the currency yet.

          Gated on the player having MET relics or holding some (Ashwake 1's
          `burnKnown`): offering to trade a pocket for a thing the game has not
          introduced is a button whose value is a mystery, and a mystery on the
          one action that destroys a pocket is the wrong place for one.
        */}
        {burn > 0 && (
          <ActButton
            testId="pop-burn"
            label={s.ui.sacrifice}
            value={hud.burnPaysRelics ? s.ui.relicsPaid(burn) : s.ui.luckPaid(burn)}
            onClick={() => onHarvest('burn')}
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
            {/*
              The REGISTRY's mark, not a lookalike (2026-08-30).

              `CONCEPT_MARK.luck` is ✤ and exists because luck is one of the two
              currencies that follow a player between the board, the purse, the
              shop and the end screen. Every one of those speaks ✤; this button,
              which is the door to the purse and the most-seen luck on the
              screen, was drawing ♦. `Hud` had the identical bug and was fixed
              on 2026-08-29 with a comment saying the stat row was "the one
              place that did not" — it was not.
            */}
            {CONCEPT_MARK.luck} {hud.luck}
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
      aria-label={value === '' ? label : `${label}, ${value}`}
      onClick={onClick}
    >
      <span className="act-label">{label}</span>
      {value !== '' && <span className="act-value">{value}</span>}
    </button>
  );
}
