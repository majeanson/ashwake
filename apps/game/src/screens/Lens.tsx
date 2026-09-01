import type { Colour } from '@content/tuning';
import { COLOUR_ICON } from '@theme/icons';
import type { Strings } from '@text/Strings';
import { Icon } from '../ui/Icon';

/**
 * The colour lens's own way out (2026-09-01).
 *
 * Marc: *"discovered biomes should be highlightable and a quick 'Lens off'
 * button (see other repo)."* Ashwake 1 has had one since 2026-08-27 and this
 * body's `INTERACTIONS.md` listed it under "what is still missing", filed as a
 * convenience because two gestures already let a lens go: a second long-press
 * on the card that lit it, and a second tap on the fog. Both ask the player to
 * remember which one they used — and one of the two, the fog tap, has been
 * unreachable in this body since it was written (`HexField`'s raycast refused
 * remembered ground), so half the way out was not there at all.
 *
 * **It is chrome, so it floats over the board** — the rule the corners were
 * split on (2026-08-30): chrome floats, actions sit in the footer. Holding a
 * colour up is a way of LOOKING at a run, not a move in one, so it belongs up
 * here with MENU rather than down with POP.
 *
 * TOP-LEFT, which is the one corner of the board nothing else has claimed:
 * MENU is top-right, the camera bottom-right, the toast along the bottom edge.
 * It also puts the button on the opposite side from the hand, which is where a
 * lens is usually lit from.
 *
 * **Present exactly while a lens is lit.** A control that is greyed out most of
 * the time is a permanent piece of furniture for an occasional state, and this
 * board's whole layout argument is that the board wants the screen.
 *
 * The button carries the lit colour's own mark, so it says WHICH lens is on
 * without a second word — the same four shapes the hand, the legend and the
 * manual draw for the same four grounds.
 */
export function LensOff({
  s,
  colour,
  name,
  onClear,
}: {
  readonly s: Strings;
  /** The colour being held up. The component is not rendered without one. */
  readonly colour: Colour;
  /** That colour's name in this direction and this language — for the label a
   *  screen reader hears, which has room for it. */
  readonly name: string;
  readonly onClear: () => void;
}) {
  return (
    <div className="lens-off">
      <button
        type="button"
        data-action="lens-off"
        data-lens={colour}
        aria-label={s.ui.lensClearLabel(name)}
        onClick={onClear}
      >
        <Icon name={COLOUR_ICON[colour]} />
        {s.ui.lensClear}
      </button>
    </div>
  );
}
