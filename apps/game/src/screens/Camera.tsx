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
 */

export type CameraProps = {
  readonly board: React.RefObject<BoardHandle | null>;
  readonly s: Strings;
  /** Where the last tile went, so HERE has somewhere to go. */
  readonly here: string | null;
  readonly onHelp: () => void;
};

/** Ashwake 1's number: close enough to read a hex, far enough to see a pocket. */
const HERE_ZOOM = 2.4;

export function Camera({ board, s, here, onHelp }: CameraProps) {
  const [fitted, setFitted] = useState(true);

  return (
    <div className="camera">
      <button type="button" className="help" aria-label={s.ui.howToPlay} onClick={onHelp}>
        ?
      </button>
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
