import type { WareId } from '@content/caravan';
import type { Strings } from '@text/Strings';
import type { HudView } from '@view/view';

/**
 * THE CARAVAN, on the board (2026-09-29; `engine/caravan.ts` is the rule).
 *
 * Two pieces. `CaravanAsk` is the line under the header that says whether
 * the caravan is in town — and nothing of what it wants (2026-09-30, Marc:
 * _"caravan is in town" and "caravan left town" so people can try their
 * pop_). It said the size and a countdown for one day, and that made the
 * caravan a target to aim at rather than a reason to pop. When a ware is owed
 * and its picker has been put down, the same line becomes the way back to it.
 * `CaravanPicker` is the choice itself: three wares, one tap, or LATER.
 *
 * Every sentence is the catalogue's (`s.caravan`), every fact the view's.
 */

type AskProps = {
  readonly hud: HudView;
  readonly s: Strings;
  /** Reopen the picker when a ware is waiting and it was put down. */
  readonly onOpen: () => void;
  /** Whether the picker is open — the line gives way to it. */
  readonly picking: boolean;
  /** A panel is open over the board: the line is out of reach with it. */
  readonly inert?: boolean;
};

export function CaravanAsk({ hud, s, onOpen, picking, inert = false }: AskProps) {
  const ask = hud.caravan;
  if (ask === null) return null;
  return (
    // A slot of the line's own height, so the board does not resize when the
    // line becomes the 44px way back to a waiting ware: that control sits
    // OVER the slot and the board's top edge, never in the flow (review).
    <div className="caravan-slot" inert={inert}>
      <AskLine hud={hud} s={s} onOpen={onOpen} picking={picking} ask={ask} />
    </div>
  );
}

function AskLine({
  hud,
  s,
  onOpen,
  picking,
  ask,
}: Omit<AskProps, 'inert'> & { readonly ask: NonNullable<HudView['caravan']> }) {
  if (hud.offersWaiting > 0 && !picking)
    return (
      <button type="button" className="caravan-ask waiting" data-hud="caravan" onClick={onOpen}>
        {s.caravan.open(hud.offersWaiting)}
      </button>
    );

  return (
    <p className={`caravan-ask ${ask}`} data-hud="caravan" data-caravan={ask}>
      {s.caravan[ask]}
    </p>
  );
}

type PickerProps = {
  readonly offer: readonly WareId[];
  readonly waiting: number;
  readonly s: Strings;
  readonly onPick: (pick: number) => void;
  readonly onLater: () => void;
};

export function CaravanPicker({ offer, waiting, s, onPick, onLater }: PickerProps) {
  return (
    <div className="drawer spends caravan-picker" data-hud="caravan-picker">
      <div className="spends-head">
        <span className="fact-label">{s.caravan.choose}</span>
      </div>
      {offer.map((ware, i) => (
        <button
          key={ware}
          type="button"
          className="spend-row caravan-ware"
          data-ware={ware}
          onClick={() => onPick(i)}
        >
          <span className="spend-name">
            <b>{s.caravan.ware[ware].name}</b>
            <span className="note caravan-ware-note">{s.caravan.ware[ware].note}</span>
          </span>
        </button>
      ))}
      {waiting > 1 && <p className="note">{s.caravan.waiting(waiting - 1)}</p>}
      <button type="button" className="caravan-later" data-action="caravan-later" onClick={onLater}>
        {s.caravan.later}
      </button>
    </div>
  );
}
