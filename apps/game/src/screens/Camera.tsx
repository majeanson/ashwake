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
 * already followed.
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
 * ## And LUCK comes back (2026-09-04)
 *
 * Round-tripped once already (see "ONE button again" above: out of this
 * corner, onto the action bar, because *"the accented button should be with
 * the luck buttons"*), and asked back out: *"make it live outside the hand
 * next to camera button."* The bar is where SPENDING a pocket lives — POP,
 * TAKE, SACRIFICE — and the purse spends a different currency entirely, the
 * one that follows a run rather than a pocket, which is closer to VIEW than to
 * the hand it used to sit beside. `onPurse` and `purseOpen` still live in
 * `App`, unchanged — only where the button that calls them is drawn moved.
 *
 * ## And SHARPNESS goes to SETTINGS (2026-09-08)
 *
 * Marc: *"put netteté button into settings"*, in the same breath as *"overall
 * there is too much buttons"*. It was the third control in this corner and the
 * only one that is not a thing you do WHILE playing — a dial you set once for a
 * phone and never touch again, sitting on the board for the whole of every run.
 * `screens/Settings` is where the other set-once dials live (the language, the
 * direction), and it costs this corner a third of its width.
 *
 * Two buttons here now, which is what this file's own docblock has argued for
 * three times and drifted away from three times.
 */

type View = 'flat' | 'home' | 'mine';

type CameraProps = {
  readonly s: Strings;
  /** Where the button will go NEXT — its own label, and the whole rule above. */
  readonly next: View;
  readonly onCycle: () => void;
  /** Luck in hand, and the drawer it opens — see the LUCK note above.
   *  Absent (`0`, gated by `canSpend`) where nothing spends it yet. */
  readonly luck: number;
  readonly canSpend: boolean;
  readonly onPurse: () => void;
  readonly purseOpen: boolean;
};

/**
 * The cycle itself, as a hook (2026-08-29).
 *
 * Lifted out of the component because the button is no longer the only thing
 * that presses it: `0` on a keyboard walks the same list, and two copies of a
 * cycle is how the key and the button come to disagree about which view is
 * next. The hook owns the state and the doing; the component owns the label —
 * which, since the label IS the next state, is all it needs.
 *
 * ## Three stops, and one of them is the player's (2026-09-08)
 *
 * Marc: *"Revise all 3 camera modes so the third one is always 'my own custom
 * view' so that if we toggle with this button we never lose the camera. Other
 * two would be 2d of 'our own custom view' and our default one."*
 *
 * FIT and HERE are gone, and the reason is the ask: **every stop this button
 * offered was a view the button itself invented.** Arrange the board, press
 * VIEW once to check something, and the arrangement was gone with nothing that
 * could bring it back. So the list is DEFAULT (the direction's angle, the board
 * framed whole), FLAT (that same board straight down and squared up, at the pan
 * and zoom the player chose), and MY VIEW (the board exactly as their hands last
 * left it — see `BoardHandle.myView`).
 *
 * Nothing was lost with FIT: DEFAULT frames the board whole and is the stop
 * that brings a dragged-away one back. HERE — lean in on the last tile — was a
 * view of the button's own, and it is the kind of thing MY VIEW replaces: a
 * player who wants to stand over their last placement can, and now the button
 * remembers that they did.
 */
export function useCameraCycle(board: React.RefObject<BoardHandle | null>): {
  readonly next: View;
  readonly step: () => void;
} {
  const views = useMemo<readonly View[]>(() => ['home', 'flat', 'mine'], []);
  const [at, setAt] = useState(0);
  // Clamped rather than reset: the list shortens the moment a run restarts and
  // an index left pointing past its end would blank the button's label.
  const next = views[(at + 1) % views.length] ?? 'home';

  const step = useCallback(() => {
    const b = board.current;
    if (b !== null) {
      if (next === 'home') b.resetLean();
      else if (next === 'flat') b.flatten();
      else b.myView();
    }
    setAt((was) => (was + 1) % views.length);
  }, [board, next, views.length]);

  return { next, step };
}

export function Camera({ s, next, onCycle, luck, canSpend, onPurse, purseOpen }: CameraProps) {
  return (
    <div className="camera">
      <div className="camera-row">
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
      </div>
    </div>
  );
}
