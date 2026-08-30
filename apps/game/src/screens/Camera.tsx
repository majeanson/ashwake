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
 * - **MENU** is the one door out. It replaces the ♪ and ? that stood here — two
 *   buttons for two rooms that MORE already lists, in the corner of a board
 *   that wants the screen. Sound lives in SETTINGS and HOW TO PLAY is MORE's
 *   first line, so neither was lost; they went back to being one tap further
 *   away and stopped costing board. `feature['ui.sound']`'s own note said "the
 *   speaker button on the board is this switch" and now says where the switch
 *   actually is — a sentence that names a control has to be re-read when the
 *   control moves.
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
  /** The one door out of the board: MORE, which lists every other room. */
  readonly onMenu: () => void;
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
  luck,
  canSpend,
  onPurse,
  purseOpen,
}: CameraProps) {
  return (
    <div className="camera">
      <button type="button" className="menu" data-go="more" aria-label={s.ui.menu} onClick={onMenu}>
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
