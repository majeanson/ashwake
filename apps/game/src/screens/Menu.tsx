import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { Strings } from '@text/Strings';
import { Icon } from '../ui/Icon';

/**
 * The drawer's id, so the button that opens it can NAME it.
 *
 * `aria-haspopup` says a popup exists and `aria-expanded` says it is up;
 * neither says WHICH element it is, so a screen reader had no way to move
 * from the button to the list it just opened.
 */
const QUICK_ID = 'quick-menu';

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
 */

export function MenuButton({
  s,
  open,
  onToggle,
}: {
  readonly s: Strings;
  /** Whether the list is up — the button's own state, and its `aria-expanded`. */
  readonly open: boolean;
  readonly onToggle: () => void;
}) {
  return (
    <div className="board-menu">
      <button
        type="button"
        className="menu"
        data-go="quick"
        aria-label={s.ui.menu}
        aria-haspopup="menu"
        aria-expanded={open}
        {...(open ? { 'aria-controls': QUICK_ID } : {})}
        onClick={onToggle}
      >
        <Icon name="menu" />
      </button>
    </div>
  );
}

/**
 * The short list behind MENU.
 *
 * Marc: *"menu could add a submenu for quick actions like sound in off etc and
 * then an option that goes to menu."* Three rows, and the third is the door —
 * the first two are the two things that used to be their own buttons over the
 * board, back within one tap of a thumb but costing nothing while nobody is
 * asking for them.
 *
 * **SOUND switches in place and the list stays open.** It is the one row here
 * that is a setting rather than a journey, and a menu that closes on a toggle
 * is a menu you have to reopen to see whether the toggle took. The same wire
 * SETTINGS writes — one flag, read by both — because two surfaces for one
 * setting is how they come to disagree, and a muted game that says it is
 * unmuted is worse than either state.
 *
 * **The other two go somewhere and do not close this.** `App` pushes the panel
 * onto the dialog stack and the stack raises it over this list; BACK from the
 * manual lands back here, which is where the player was. Closing this first
 * would mean a `history.back()` and a `pushState` in one handler — the
 * traversal is asynchronous and the push is not, so the panel's own entry gets
 * consumed by the pending `go(-1)` and BACK leaves the site. `ui/dialog.tsx`'s
 * three rules say every history call happens in an event handler; they do not
 * say two of them may happen in the SAME one.
 *
 * **The scrim is why this is not just a floating box.** The board goes `inert`
 * while anything is on the stack, but `.controls` does not — the hand is a
 * footer and a full-screen panel simply covers it. This is not full-screen, so
 * without a scrim the tap that dismisses the list would place a tile on the way
 * past. It is transparent on purpose: this hides nothing worth dimming, and a
 * darkened board would read as a modal for a thing that is one tap of nothing.
 *
 * **And `App` renders it, not `MenuButton`, even though it belongs to that
 * button.** It was a sibling of the cluster for one build, which put it inside
 * the board host — and the board host goes `inert` the moment anything is on
 * the stack, which now includes this. Every row was drawn, visible, and
 * untappable: a menu that opens and does nothing, which is the same shape as
 * the MORE bug the same session opened with. Anything that survives its own
 * opening has to be outside the thing that opening makes inert.
 *
 * It opens as a DRAWER under the stat row rather than as a box hanging off its
 * button, and that is the same trick the purse has always used: a flex child of
 * the shell is the only thing that knows where the board's edge actually is,
 * because the board's height is the hand's height and the hand's height is a
 * run's. A `position: fixed` box guessing at it half-covered the cluster that
 * opened it.
 */
export function QuickMenu({
  s,
  sound,
  onSound,
  onHowToPlay,
  onFullMenu,
  onDismiss,
}: {
  readonly s: Strings;
  readonly sound: boolean;
  readonly onSound: () => void;
  readonly onHowToPlay: () => void;
  readonly onFullMenu: () => void;
  readonly onDismiss: () => void;
}) {
  /*
   * THE DRAWER TAKES FOCUS (2026-09-02).
   *
   * MENU lives inside `.board-host`, and `.board-host` goes `inert` the moment
   * anything is on the stack — including this. So opening the drawer made the
   * button that opened it unreachable, the browser dropped focus to `<body>`,
   * and a keyboard player's next Tab started at the top of the document rather
   * than in the menu they had just asked for.
   *
   * The board staying inert under it is right: a scrim is over it and nothing
   * behind it is meant to be actable. What was missing is the other half — a
   * menu that covers something has to hold the focus it took.
   *
   * The FIRST ITEM rather than the container, which is where this differs from
   * `Panel`: a panel is a page and landing on BACK reads as "you are about to
   * leave", but a menu is a list of choices and the first choice is where a
   * menu is entered everywhere else.
   */
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    first.current?.focus();
  }, []);

  /**
   * ↑ and ↓ walk the list; Home and End jump it (2026-09-02).
   *
   * A `role="menu"` is not a group of buttons — it is a widget with one tab
   * stop and its own keys, and this had neither. Tab walked across all three
   * rows and then out of the drawer entirely, which on a board whose every
   * other control is `inert` meant walking into nothing.
   *
   * Focus IS the selection in a menu — there is no `aria-activedescendant`
   * here and no selected state to carry — so moving is moving the focus.
   */
  const onKey = (event: KeyboardEvent<HTMLButtonElement>): void => {
    // The rows are read off the DOM rather than out of a ref, and that is not
    // a workaround: the list IS the three buttons this menu renders, so asking
    // the menu is asking the only authority there is. It also keeps every
    // index out of render, which is what `react-hooks/refs` is there to
    // enforce — a ref read while rendering is a value React cannot see change.
    const list = [
      ...(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
        '[role^="menuitem"]',
      ) ?? []),
    ];
    const at = list.indexOf(event.currentTarget);
    const last = list.length - 1;
    if (at < 0 || last < 0) return;
    const to =
      event.key === 'ArrowDown'
        ? (at + 1) % list.length
        : event.key === 'ArrowUp'
          ? (at + last) % list.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (to === null) return;
    event.preventDefault();
    list[to]?.focus();
  };

  // One stop for the whole list, entered at the top — see `onKey`.
  const row = { type: 'button' as const, className: 'quick-row', onKeyDown: onKey };

  return (
    <>
      {/*
        The backdrop, and the one non-button clickable in the chrome.

        It stays a `<div>` and is now honest about it (2026-09-02): a scrim is
        not a control, it is the absence of one — a modal's dismissal belongs to
        Escape and to BACK, and this drawer has both through `useDoor`. Making
        it focusable would put a nameless tab stop between the board and the
        menu; `aria-hidden` says what it is, which is nothing.
      */}
      <div className="quick-scrim" aria-hidden="true" onClick={onDismiss} />
      <div className="quick" id={QUICK_ID} data-hud="quick" role="menu" aria-label={s.ui.menu}>
        {/*
          The label is what a tap would DO, not what the state is — the rule the
          board's own ♪ followed, kept whole. The icon carries the state too,
          and the row goes quiet when the board does.

          **`menuitemcheckbox`, not `menuitem` with `aria-pressed`**
          (2026-09-02). `aria-pressed` belongs to `role="button"`; on a
          `menuitem` it is not in the role's allowed set, so it is dropped
          rather than misread — the sound toggle announced no state at all, on
          the one row in this menu that HAS one. The role that carries a state
          in a menu is `menuitemcheckbox`, and the attribute it carries it in is
          `aria-checked`.
        */}
        <button
          {...row}
          ref={first}
          tabIndex={0}
          role="menuitemcheckbox"
          data-quick="sound"
          aria-checked={sound}
          aria-label={sound ? s.ui.soundOn : s.ui.soundOff}
          onClick={onSound}
        >
          <Icon name={sound ? 'soundOn' : 'soundOff'} />
          <span>{s.ui.sound}</span>
        </button>
        <button {...row} tabIndex={-1} role="menuitem" data-quick="manual" onClick={onHowToPlay}>
          <Icon name="help" />
          <span>{s.ui.howToPlay}</span>
        </button>
        <button
          {...row}
          tabIndex={-1}
          role="menuitem"
          data-quick="more"
          data-go="more"
          onClick={onFullMenu}
        >
          <Icon name="more" />
          <span>{s.ui.more}</span>
        </button>
      </div>
    </>
  );
}
