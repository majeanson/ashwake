import { useState } from 'react';
import type { Strings } from '@text/Strings';
import type { BoardHandle } from '../board/Board';

/**
 * The camera cluster (Stage 3, 2026-08-29).
 *
 * Bottom-right, floating over the board, and deliberately **two controls
 * rather than four**. Ashwake 1 shipped `+` and `−` and then took them away:
 * a phone already has a zoom gesture, and two buttons that duplicate a pinch
 * are two buttons in the way of the board. What a thumb cannot do is *frame*,
 * so what is left is the one thing worth a control —
 *
 * **FIT ⇄ HERE.** FIT shows the whole structure; HERE leans in on the last
 * tile placed. One button, and its label says which way it will go, so it is
 * never a question of which state you are in.
 *
 * **LEVEL is the third, and it is not always there** (2026-08-29). Two fingers
 * now turn and lean the board as well as pinch it, so there has to be a way
 * back to the angle the direction opens at — an angle a player wandered into
 * by accident is one they cannot undo by feel. It appears only once the board
 * IS off that angle, which keeps the cluster at two controls for everybody who
 * never leans it, and is the same rule HERE already follows.
 */

export type CameraProps = {
  readonly board: React.RefObject<BoardHandle | null>;
  readonly s: Strings;
  /** Where the last tile went, so HERE has somewhere to go. */
  readonly here: string | null;
  /** Whether the board is off its default angle — see LEVEL above. */
  readonly leaned: boolean;
  readonly onHelp: () => void;
};

/** Ashwake 1's number: close enough to read a hex, far enough to see a pocket. */
const HERE_ZOOM = 2.4;

export function Camera({ board, s, here, leaned, onHelp }: CameraProps) {
  const [fitted, setFitted] = useState(true);

  return (
    <div className="camera">
      <button type="button" className="help" aria-label={s.ui.howToPlay} onClick={onHelp}>
        ?
      </button>
      {leaned && (
        <button type="button" data-action="level" onClick={() => board.current?.resetLean()}>
          {s.ui.levelView}
        </button>
      )}
      <button
        type="button"
        data-action="camera"
        onClick={() => {
          if (fitted && here !== null) board.current?.flyToHex(here, HERE_ZOOM);
          else board.current?.flyToFit();
          setFitted((was) => !was);
        }}
      >
        {/* The label is the DESTINATION, not the state: a button that says
            where it goes never needs to be read twice. */}
        {fitted && here !== null ? 'HERE' : 'FIT'}
      </button>
    </div>
  );
}
