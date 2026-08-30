import { useCallback, useMemo, useState } from 'react';
import type { Strings } from '@text/Strings';
import type { BoardHandle } from '../board/Board';

/**
 * The camera cluster (Stage 3, 2026-08-29; one button since 2026-08-29).
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
 */

export type View = 'fit' | 'here' | 'flat' | 'home';

export type CameraProps = {
  readonly s: Strings;
  /** Where the button will go NEXT — its own label, and the whole rule above. */
  readonly next: View;
  readonly onCycle: () => void;
  readonly onHelp: () => void;
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

export function Camera({ s, next, onCycle, onHelp }: CameraProps) {
  return (
    <div className="camera">
      <button type="button" className="help" aria-label={s.ui.howToPlay} onClick={onHelp}>
        ?
      </button>
      <button type="button" data-action="camera" data-view={next} onClick={onCycle}>
        {s.ui.camera[next]}
      </button>
    </div>
  );
}
