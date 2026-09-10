import type { Strings } from '@text/Strings';
import { CHROME_ICON } from '@theme/icons';
import { Icon } from '../ui/Icon';

/**
 * The board's own way out, and the short list behind it (2026-08-30).
 *
 * ## Where it is, and why that is not beside the camera
 *
 * The board's bottom-right corner has held, at various points in one day, a
 * `?`, a ♪, a MENU, a LUCK button and the camera cycle. Marc, looking at the
 * pile: _"the accented button should be with the luck buttons... this, but menu
 * move top right."_
 *
 * The rule that came out of it is worth stating once, because it decides where
 * every future control goes: **chrome floats over the board, actions sit in the
 * footer.** LUCK went down to the action row, where the things that SPEND
 * something live and where a thumb already is; the camera keeps the bottom
 * corner it was named for; and this — the way out of the game, which is not an
 * action in the game — goes to the opposite corner, out of the thumb's way
 * entirely. A door you press twice a run should not sit in the arc your hand
 * sweeps fifty times.
 *
 * Its own file rather than `Camera`'s, for the same reason: MENU stopped being
 * a camera control the moment it stopped being a `?`, and `Camera.tsx`'s
 * docblock had grown into an argument about three unrelated things.
 *
 * **Opens the MENU panel directly, not a drawer of its own** (2026-09-03).
 * This used to open `QuickMenu`, a lightweight drawer with its own row set
 * (Sound, How To Play, More) that overlapped almost entirely with the MORE
 * panel those same rows led into. Retired in favour of one panel every MENU
 * button in the game opens the same way — see `More.tsx`'s own doc comment.
 */

export function MenuButton({
  s,
  open,
  onToggle,
}: {
  readonly s: Strings;
  /** Whether the panel is up — the button's own state, and its `aria-expanded`. */
  readonly open: boolean;
  readonly onToggle: () => void;
}) {
  return (
    <div className="board-menu">
      <button
        type="button"
        data-go="quick"
        aria-label={s.ui.menu}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={onToggle}
      >
        <Icon name={CHROME_ICON.menu} />
      </button>
    </div>
  );
}
