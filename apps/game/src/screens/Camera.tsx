import { useCallback, useMemo, useState } from 'react';
import type { Strings } from '@text/Strings';
import type { BoardHandle } from '../board/Board';
import { Icon } from '../ui/Icon';

/**
 * The board's own corner (Stage 3, 2026-08-29).
 *
 * Bottom-right, floating over the board, and deliberately **as few controls as
 * the board can be steered with**. Ashwake 1 shipped `+` and `−` and then took
 * them away: a phone already has a zoom gesture, and two buttons that duplicate
 * a pinch are two buttons in the way of the board.
 *
 * **One VIEW button, and it cycles** (Marc, 2026-08-29: "make them a toggle
 * view like fit, a plat, default but only 1 button"). It had grown to two and
 * then three — FIT⇄HERE, and a LEVEL that appeared once the board was leaned —
 * which is three things to read in the corner of a board that wants the screen.
 * The four views are one list now and the button walks it.
 *
 * **The label is the DESTINATION, not the state.** A button that says where it
 * will go never needs to be read twice, and it is the rule the FIT⇄HERE toggle
 * already followed. HERE drops out of the cycle when nothing has been placed
 * yet, so the button never offers a journey to nowhere.
 *
 * Every word is the catalogue's. They were `'FIT'` and `'HERE'`, typed into
 * this file in English, which D4 does not allow and which a French phone read
 * in English for two stages.
 *
 * ## What the corner holds, and why (2026-08-30)
 *
 * Marc: *"make sure sound on or off and how to play stays in the menu, add a
 * menu button instead"*, and *"put the luck button next to the FIT button, as a
 * new button ... luck button is another colour more like an action one, but not
 * in hand."* So the cluster is **MENU · LUCK · VIEW**, and each of the three is
 * a different kind of thing:
 *
 * - **MENU** is the one door out, and it opens a SHORT LIST before it opens a
 *   room. It replaced a ♪ and a `?` standing here — two buttons for two rooms
 *   MORE already lists, in the corner of a board that wants the screen — and
 *   the honest cost of that was mute going three taps deep, which Ashwake 1
 *   never allowed: it has carried a board-level ♪ since 2026-08-20, on Marc's
 *   own launch call, *"a way to toggle on/off easily"*. Marc, 2026-08-30:
 *   *"menu could add a submenu for quick actions like sound in off etc and then
 *   an option that goes to menu."* So SOUND is one tap again and costs no
 *   button — it is a row in a list that is not there until you ask for it,
 *   which is the difference between a control and a control in the way.
 *   `feature['ui.sound']`'s own note said "the speaker button on the board is
 *   this switch": a sentence that names a control has to be re-read when the
 *   control moves, and it no longer names one.
 * - **LUCK** is an ACTION, and it is the only one here: it opens the purse,
 *   which spends. It came out of the action bar, where it sat beside POP and
 *   SACRIFICE competing with them for a hand's width, and it wears `--accent`
 *   — the direction's one signature colour, the same one `.door-begin` uses for
 *   the loud way in — so it reads as a thing that does something rather than as
 *   another camera control. Rationed, per `theme/tokens.ts`: it is the single
 *   accent on the board.
 * - **VIEW** steers the camera, and that is all it has ever done.
 *
 * The purse is only offered where there is something to spend it on, which is
 * what `spends` answers: a LUCK button that opens an empty drawer is a promise
 * that breaks on the tap.
 */

export type View = 'fit' | 'here' | 'flat' | 'home';

export type CameraProps = {
  readonly s: Strings;
  /** Where the button will go NEXT — its own label, and the whole rule above. */
  readonly next: View;
  readonly onCycle: () => void;
  /** Open or close the quick list — see `QuickMenu`, which `App` renders
   *  OUTSIDE the board host for the reason given there. */
  readonly onMenu: () => void;
  readonly quickOpen: boolean;
  /** Luck in hand, and the drawer it opens. Absent where nothing spends it. */
  readonly luck: number;
  readonly canSpend: boolean;
  readonly onPurse: () => void;
  readonly purseOpen: boolean;
};

/** Ashwake 1's number: close enough to read a hex, far enough to see a pocket. */
const HERE_ZOOM = 2.4;

/**
 * The cycle itself, as a hook (2026-08-29).
 *
 * Lifted out of the component because the button is no longer the only thing
 * that presses it: `0` on a keyboard walks the same list, and two copies of a
 * four-state cycle is how the key and the button come to disagree about which
 * view is next. The hook owns the state and the doing; the component owns the
 * label — which, since the label IS the next state, is all it needs.
 */
export function useCameraCycle(
  board: React.RefObject<BoardHandle | null>,
  here: string | null,
): { readonly next: View; readonly step: () => void } {
  /*
   * The cycle, and what is in it.
   *
   * FIT and HERE move the camera over the board; FLAT and DEFAULT change the
   * ANGLE it watches from — the flat map straight down, and the direction's
   * own lean. Keeping all four on one button is what lets the angle be
   * undone by somebody who leaned the board by accident with two fingers and
   * cannot put it back by feel.
   */
  const views = useMemo<readonly View[]>(
    () => (here === null ? ['fit', 'flat', 'home'] : ['fit', 'here', 'flat', 'home']),
    [here],
  );
  const [at, setAt] = useState(0);
  // Clamped rather than reset: the list shortens the moment a run restarts and
  // an index left pointing past its end would blank the button's label.
  const next = views[(at + 1) % views.length] ?? 'fit';

  const step = useCallback(() => {
    const b = board.current;
    if (b !== null) {
      if (next === 'fit') b.flyToFit();
      else if (next === 'here' && here !== null) b.flyToHex(here, HERE_ZOOM);
      else if (next === 'flat') b.flatten();
      else if (next === 'home') b.resetLean();
    }
    setAt((was) => (was + 1) % views.length);
  }, [board, here, next, views.length]);

  return { next, step };
}

export function Camera({
  s,
  next,
  onCycle,
  onMenu,
  quickOpen,
  luck,
  canSpend,
  onPurse,
  purseOpen,
}: CameraProps) {
  return (
    <div className="camera">
      <button
        type="button"
        className="menu"
        data-go="quick"
        aria-label={s.ui.menu}
        aria-haspopup="menu"
        aria-expanded={quickOpen}
        onClick={onMenu}
      >
        <Icon name="menu" />
      </button>
      {canSpend && (
        <button
          type="button"
          className="purse-toggle"
          data-action="purse"
          // The drawer opens above the hand, at the other end of the screen
          // from this button, so it is nowhere near it in the document —
          // which is exactly the case `aria-controls` exists for.
          aria-expanded={purseOpen}
          aria-controls="spends"
          aria-label={s.ui.luckPurse(luck)}
          onClick={onPurse}
        >
          {/*
            The REGISTRY's mark, not a lookalike (2026-08-30).

            Luck is one of the two currencies that follow a player between the
            board, the purse, the shop and the end screen, so the concept
            registry names it and every one of those surfaces draws the same
            thing. This button — the door to the purse, and the most-seen luck
            on the screen — was drawing `♦`, a second symbol for the idea the
            registry already had.
          */}
          <Icon name="luck" /> {luck}
        </button>
      )}
      <button type="button" data-action="camera" data-view={next} onClick={onCycle}>
        {s.ui.camera[next]}
      </button>
    </div>
  );
}

/**
 * The short list behind MENU (2026-08-30).
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
 * **And `App` renders it, not `Camera`, even though it belongs to `Camera`'s
 * button.** It was a sibling of the cluster for one build, which put it inside
 * the board host — and the board host goes `inert` the moment anything is on
 * the stack, which now includes this. Every row was drawn, visible, and
 * untappable: a menu that opens and does nothing, which is the same shape as
 * the MORE bug this session opened with. Anything that survives its own opening
 * has to be outside the thing that opening makes inert.
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
  return (
    <>
      <div className="quick-scrim" onClick={onDismiss} />
      <div className="quick" data-hud="quick" role="menu" aria-label={s.ui.menu}>
        {/* The label is what a tap would DO, not what the state is — the rule
            the board's own ♪ followed, kept whole. `aria-pressed` carries the
            state, the icon carries it too, and the row goes quiet when the
            board does. */}
        <button
          type="button"
          role="menuitem"
          className="quick-row"
          data-quick="sound"
          aria-pressed={sound}
          aria-label={sound ? s.ui.soundOn : s.ui.soundOff}
          onClick={onSound}
        >
          <Icon name={sound ? 'soundOn' : 'soundOff'} />
          <span>{s.ui.sound}</span>
        </button>
        <button
          type="button"
          role="menuitem"
          className="quick-row"
          data-quick="manual"
          onClick={onHowToPlay}
        >
          <Icon name="help" />
          <span>{s.ui.howToPlay}</span>
        </button>
        <button
          type="button"
          role="menuitem"
          className="quick-row"
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
