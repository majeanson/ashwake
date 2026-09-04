import { useCallback, useMemo, useState } from 'react';
import type { Strings } from '@text/Strings';
import type { BoardHandle } from '../board/Board';
import { MIN_RENDER_SCALE } from '../board/quality';
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
 * ## And it is ONE button again (2026-08-30)
 *
 * It had grown a ♪, a `?`, a MENU and a LUCK button over the course of a day,
 * which is four things to read in the corner of a board that wants the screen —
 * the exact fault the FIT/HERE/LEVEL note above was written about, arrived at
 * from the other direction. Marc: _"the accented button should be with the luck
 * buttons... this, but menu move top right."_
 *
 * The rule that settled it, and the reason this file is short again: **chrome
 * floats over the board, actions sit in the footer.** LUCK is an action, so it
 * went down to the row where the things that spend something live, beside POP
 * and SACRIFICE, where a thumb already is. MENU is the way OUT of the game
 * rather than a move in it, so it went to the opposite corner (`screens/Menu`)
 * — a door pressed twice a run should not sit in the arc a hand sweeps fifty
 * times. What is left here steers the camera, which is what `.camera` has
 * always meant.
 *
 * ## And then a second button, on purpose (2026-09-04)
 *
 * SHARPNESS breaks the "one button" rule above, deliberately: every other
 * addition this file has stripped back out was a duplicate door onto
 * something with a door elsewhere (MENU, LUCK, the manual's `?`). This one is
 * not: nothing else on screen sets `board/quality.ts`'s render scale, and it
 * answers "bad quality pixels" (Marc, on a phone, same day), a look complaint
 * with no other home. It stays a popover rather than a permanent third
 * control: closed, the corner still reads as one button at rest.
 *
 * ## And LUCK comes back (2026-09-04)
 *
 * Round-tripped once already (see "ONE button again" above: out of this
 * corner, onto the action bar, because *"the accented button should be with
 * the luck buttons"*), and asked back out: *"make it live outside the hand
 * next to camera button."* The bar is where SPENDING a pocket lives — POP,
 * TAKE, SACRIFICE — and the purse spends a different currency entirely, the
 * one that follows a run rather than a pocket, which is closer to VIEW and
 * SHARPNESS than to the hand it used to sit beside. `onPurse` and
 * `purseOpen` still live in `App`, unchanged — only where the button that
 * calls them is drawn moved.
 */

export type View = 'fit' | 'here' | 'flat' | 'home';

export type CameraProps = {
  readonly s: Strings;
  /** Where the button will go NEXT — its own label, and the whole rule above. */
  readonly next: View;
  readonly onCycle: () => void;
  /** The SHARPNESS slider's current value and its ceiling — `1` and
   *  `board/quality.ts`'s `MAX_RENDER_SCALE`, this phone's own. */
  readonly renderScale: number;
  readonly maxRenderScale: number;
  readonly onRenderScale: (scale: number) => void;
  /** Luck in hand, and the drawer it opens — see the LUCK note above.
   *  Absent (`0`, gated by `canSpend`) where nothing spends it yet. */
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
  renderScale,
  maxRenderScale,
  onRenderScale,
  luck,
  canSpend,
  onPurse,
  purseOpen,
}: CameraProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="camera">
      {canSpend && (
        <button
          type="button"
          className="purse-toggle"
          data-action="purse"
          // The drawer opens ABOVE the hand, at the other end of the screen
          // from this button, so it is nowhere near it in the document —
          // which is exactly the case `aria-controls` exists for.
          aria-expanded={purseOpen}
          aria-controls="spends"
          // A mark and a number reads as "12" to a screen reader and says
          // nothing about what it opens.
          aria-label={s.ui.luckPurse(luck)}
          onClick={onPurse}
        >
          <Icon name="luck" /> {luck}
        </button>
      )}
      <button type="button" data-action="camera" data-view={next} onClick={onCycle}>
        {s.ui.camera[next]}
      </button>
      {/* Only worth showing where there is a real choice — a phone whose own
          pixel ratio is already 1 has nothing a slider could raise. */}
      {maxRenderScale > MIN_RENDER_SCALE && (
        <>
          <button
            type="button"
            data-action="sharpness"
            aria-expanded={open}
            aria-controls="sharpness-popover"
            onClick={() => setOpen((was) => !was)}
          >
            {s.ui.sharpness.label}
          </button>
          {open && (
            <div
              className="sharpness-popover"
              id="sharpness-popover"
              role="group"
              aria-label={s.ui.sharpness.label}
            >
              <input
                type="range"
                data-action="sharpness-slider"
                aria-label={s.ui.sharpness.label}
                min={MIN_RENDER_SCALE}
                max={maxRenderScale}
                step={0.25}
                value={renderScale}
                onChange={(e) => onRenderScale(Number(e.target.value))}
              />
              <span className="sharpness-value">{renderScale.toFixed(2)}×</span>
              <p className="note">{s.ui.sharpness.note}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
