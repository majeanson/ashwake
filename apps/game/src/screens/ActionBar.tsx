import type { Theme } from '@theme/tokens';
import type { HudView } from '@view/view';
import type { HarvestChoice } from '@engine/state';
import { CHROME_ICON, CONCEPT_ICON, LANDMARK_ICON, type IconName } from '@theme/icons';
import type { Strings } from '@text/Strings';
import { handColumns, handSpacers, stashSlots } from './hand';
import { useTerrainArt } from '../shell/art';
import { Icon } from '../ui/Icon';
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
 *
 * **The bar is where SPENDING A POCKET lives.** POP, TAKE and SACRIFICE wear
 * the one accent between them and sit in the row a thumb reaches. LUCK spent
 * a day at the right end of this row (2026-08-30, Marc: *"the accented button
 * should be with the luck buttons"*) and moved out again to the board's own
 * corner, beside the camera (2026-09-04, Marc: *"make it live outside the
 * hand next to camera button"*) — see `screens/Camera`. It is a run's
 * currency rather than a pocket's, which reads closer to VIEW and SHARPNESS
 * than to POP and SACRIFICE, and a thumb does not reach for it fifty times a
 * run the way it reaches for the hand.
 *
 * **The row is two buttons, not four.** `singlePayout` is true in the shipped
 * tuning, so POP FOR POINTS never renders; the ordinary late run is POP and
 * SACRIFICE, with TAKE when a pocket earns one. The `.act` note in `ui.css`
 * about a crowded row squeezing to 65px was measured when the purse was here
 * AND points were a choice, and neither is true now.
 */

type ActionBarProps = {
  readonly hud: HudView;
  readonly theme: Theme;
  readonly s: Strings;
  readonly onSelect: (index: number) => void;
  /** Long-press a card: hold that colour up against the board. */
  readonly onLens: (index: number | null) => void;
  /** Tap a stash slot. The index travels: THIS card trades with THIS slot. */
  readonly onHold: (slot: number) => void;
};

export function ActionBar({ hud, theme, s, onSelect, onLens, onHold }: ActionBarProps) {
  // The baked hex per ground, so a card in the hand is the tile it will
  // become. Asked for once here rather than once per card: four slots, one
  // shared manifest, and the answer is the same for every card of a colour.
  const art = useTerrainArt(theme.id);
  const stash = stashSlots(hud.canHold, hud.holdSlots);

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
              // No `held` flag any more: the card lost its words on 2026-08-31
              // (Marc: *"remove text in the hand tiles, keep color and
              // symbol"*), and the HELD badge went with them. `slot` is what
              // says a card is stashed now — it is what draws `data-hold` and
              // the swap label — and `Tile`'s own docblock states the rule
              // this call site has to keep: "a stashed card is the one
              // standing in a stash slot."
              slot={i}
              onPick={() => onHold(i)}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * A verb over a payment, with one accessible name that reads as a sentence.
 * Without it a screen reader runs the two lines together.
 *
 * **The mark rides WITH the verb** (2026-08-30, Marc: *"make em icons,
 * associate in how to play and cards too"*). Beside the word rather than above
 * it: the button is already two lines and a third would make it a tile. The
 * same mark heads the same lesson in the manual and leads the receipt the
 * action leaves behind, which is the whole of "associate" — three places, one
 * shape, and the registry (`@theme/icons`) is the only thing that picks it.
 *
 * `aria-hidden`, because the label says the same thing in words and a screen
 * reader that reads both is reading a decoration aloud. And optional, because
 * a button whose idea appears nowhere else gets no mark: the registry's rule
 * is a mark only for an idea that recurs.
 */
function ActButton({
  testId,
  icon,
  label,
  value,
  bounty = null,
  note = null,
  onClick,
}: {
  readonly testId: string;
  readonly icon?: IconName | undefined;
  readonly label: string;
  readonly value: string;
  /** The word for a standing bounty this press collects, or null. Draws the
   *  site glyph after the verb and joins the accessible name — see POP. */
  readonly bounty?: string | null | undefined;
  /** A third, dim line under the value — POP's pocket count. */
  readonly note?: string | null | undefined;
  readonly onClick: () => void;
}) {
  const name = value === '' ? label : `${label}, ${value}`;
  return (
    <button
      type="button"
      className={bounty === null ? 'act' : 'act bounty'}
      data-action={testId}
      aria-label={bounty === null ? name : `${name}, ${bounty}`}
      onClick={onClick}
    >
      <span className="act-label">
        {icon !== undefined && (
          <span className="act-mark" aria-hidden="true">
            <Icon name={icon} />
          </span>
        )}
        {/*
          THE MARK, NOT THE WORD (Marc, 2026-09-25: "make sure we use symbols
          for all actions, they stand out enough"). The word is the button's
          accessible name above, and the manual's section head; on the button
          the mark and the value carry it.
        */}
        <span className="visually-hidden">{label}</span>
        {bounty !== null && (
          <span className="act-mark act-bounty" aria-hidden="true">
            <Icon name={LANDMARK_ICON.site} />
          </span>
        )}
      </span>
      {value !== '' && <span className="act-value">{value}</span>}
      {note !== null && (
        <span className="act-note" data-hud="pockets">
          {note}
        </span>
      )}
    </button>
  );
}

/**
 * A POCKET'S BUTTONS, OFF THE HAND (Marc, 2026-09-25: _"move pop button out of
 * tile hands, only tiles remain, pop goes next to lens and other buttons,
 * reorder them so its pop, luck, lens, camera"_).
 *
 * POP, SACRIFICE — and NEW RUN on an ended board — were the row above the
 * hand, and that row was RESERVED for the whole run so the board would not
 * resize the first time a pocket ripened (2026-09-08). In the camera cluster
 * they float over the board, so there is nothing to reserve: the row and its
 * spacer are gone, and the board has that height back. The pocket count that
 * was the row's caption rides inside POP. SACRIFICE sits beside POP because
 * it spends the same pocket; Marc's order named the four he looks at.
 */
export function PocketActions({
  hud,
  s,
  onHarvest,
  knowsRelics,
  onNewRun,
}: {
  readonly hud: HudView;
  readonly s: Strings;
  readonly onHarvest: (choice: HarvestChoice) => void;
  readonly knowsRelics: boolean;
  readonly onNewRun: () => void;
}) {
  // See SACRIFICE below: a burn is only offered once relics mean something.
  const burnKnown = !hud.burnPaysRelics || knowsRelics || hud.relics > 0;
  const burn = hud.canHarvest && burnKnown ? hud.harvestBurn : 0;
  return (
    <>
      {hud.canHarvest && (
        <ActButton
          testId="pop"
          icon={CONCEPT_ICON.pop}
          label={s.ui.pop}
          value={
            hud.showPoints
              ? `+${hud.harvestTiles} · ${hud.harvestPoints} pts`
              : `+${hud.harvestTiles} · ×${hud.harvestDepth}`
          }
          /*
          THE BOUNTY, ON THE BUTTON THAT COLLECTS IT (Marc, 2026-09-16).

          The figure was always right — `harvestValue` applies the
          multiplier — but nothing said WHY it was bigger, and
          `HudView.questPays` was computed for two weeks with no reader.
          Ashwake 1's answer, taken as his: the site's own glyph beside the
          verb, and a `bounty` class the stylesheet turns into the same soft
          pool of accent v1 gave BEGIN. The word travels in the accessible
          name too, because the glyph is `aria-hidden` and a screen reader
          is owed the same reason.
        */
          bounty={hud.questPays ? s.lesson.bounty.name : null}
          /*
          HOW MANY DECISIONS ARE WAITING (Marc, 2026-09-16) — the bar's
          caption until the bar went (2026-09-25), inside the button now.
          From TWO: one ready pocket is already said by POP being here.
        */
          note={hud.pocketsReady >= 2 ? s.view.guide.pockets(hud.pocketsReady) : null}
          onClick={() => onHarvest('tiles')}
        />
      )}
      {hud.canHarvest && !hud.singlePayout && hud.showPoints && (
        <ActButton
          testId="pop-points"
          icon={CONCEPT_ICON.pop}
          label={s.ui.pop}
          value={`${hud.harvestPoints} pts`}
          onClick={() => onHarvest('points')}
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
          icon={CONCEPT_ICON.sacrifice}
          label={s.ui.sacrifice}
          value={hud.burnPaysRelics ? s.ui.relicsPaid(burn) : s.ui.luckPaid(burn)}
          onClick={() => onHarvest('burn')}
        />
      )}
      {hud.ended && (
        <ActButton
          testId="new-run"
          icon={CHROME_ICON.newRun}
          label={s.ui.newRun}
          value=""
          onClick={onNewRun}
        />
      )}
    </>
  );
}
