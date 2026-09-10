import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * ONE SPEAKER AT A TIME (`PASS.md` P2.4).
 *
 * The rule the whole voice rests on: **a card is about something the player
 * just did, a lesson is about something they could do, and stacking both is
 * two modal dialogs over one board** — the "menus over menus" problem in card
 * form. The lesson is the one that can wait, because its moment stays true
 * until it is told.
 *
 * Two things lived in `App` for it and neither could be asked a question:
 *
 *  1. **The receipts still in the air** — a timer registry and a count that is
 *     the registry's size by construction. Marc, of his first pop: *"make sure
 *     no cards can pop while the first pop is happening (i think i had luck
 *     explained and coudnt see)."* A pop's receipt WAITS for the cascade so the
 *     accounting arrives after the thing it accounts for, and for the whole of
 *     that wait there is no card raised — so a lesson that came due on the same
 *     dispatch (and popping tiles is exactly what raises LUCK) opened over the
 *     animation and was UNMOUNTED the instant the receipt landed. The card was
 *     not covered. It was shown and withdrawn.
 *  2. **The rule itself**, which was a five-part condition inside a JSX guard
 *     with twenty-five lines of comment above it. It is a function of four
 *     facts and nothing else, so it is a function now, and `speaking.test.ts`
 *     asks it the questions the comment describes.
 */

/** The receipts in the air, and the two doors that change that. */
type Speaking = {
  /**
   * How many receipts are still waiting to land.
   *
   * STATE rather than the registry's size, because a ref cannot gate a render —
   * and they are written only by `speakAfter` and cleared only by `silence`,
   * which is what keeps two things that must agree from coming apart.
   */
  readonly speaking: number;
  /**
   * Say this once the board has finished doing the thing it is about.
   *
   * The one door for a receipt that waits. A `wait` of zero speaks now and
   * arms nothing, so a caller never has to branch.
   */
  readonly speakAfter: (wait: number, show: () => void) => void;
  /** Nothing owed: every timer dropped and the count with it. A door out of a
   *  run calls this — see `App`'s `forgetEnding`. */
  readonly silence: () => void;
};

export function useSpeaking(): Speaking {
  const saying = useRef<Set<number>>(new Set());
  const [speaking, setSpeaking] = useState(0);

  const speakAfter = useCallback((wait: number, show: () => void): void => {
    if (wait <= 0) {
      show();
      return;
    }
    setSpeaking((n) => n + 1);
    const id = window.setTimeout(() => {
      // Removed from the registry BEFORE the flag drops, so the two are never
      // briefly disagreeing about whether anything is owed.
      saying.current.delete(id);
      setSpeaking((n) => Math.max(0, n - 1));
      show();
    }, wait);
    saying.current.add(id);
  }, []);

  const silence = useCallback((): void => {
    for (const id of saying.current) window.clearTimeout(id);
    saying.current.clear();
    setSpeaking(0);
  }, []);

  /* And a page being taken down has nothing left to say. */
  useEffect(() => {
    const held = saying.current;
    return () => {
      for (const id of held) window.clearTimeout(id);
      held.clear();
    };
  }, []);

  return { speaking, speakAfter, silence };
}

/** What the shell knows at the moment a lesson wants the screen. */
export type Floor = {
  /** The lesson that has come due, or null when none has. */
  readonly card: string | null;
  /** True while a receipt is holding the screen. */
  readonly said: boolean;
  /** True while the board is away showing the last card's subject. */
  readonly touring: boolean;
  /** Receipts still in the air — see `Speaking.speaking`. */
  readonly speaking: number;
};

/**
 * May a lesson interrupt right now?
 *
 * Each clause is a bug that has happened, which is why they are enumerated
 * rather than collapsed:
 *
 *  - **`card`** — there has to be a lesson due at all.
 *  - **`'story'`** is not raised here. It has its own door on the front screen
 *    and would otherwise arrive twice.
 *  - **`said`** — a RECEIPT OUTRANKS A LESSON. One card at a time, and the
 *    receipt is about something that just happened.
 *  - **`touring`** — a card raised while the board is away showing the last
 *    card's subject would be a lesson read over a moving map, and the trip
 *    behind its scrim would be a camera move nobody sees. The moment stays
 *    true and stays armed; this only decides when it may interrupt.
 *  - **`speaking`** — the same rule for a receipt that has NOT LANDED YET, and
 *    the one Marc reported: held until the board has finished saying what it is
 *    already saying.
 */
export const mayTeach = (floor: Floor): boolean =>
  floor.card !== null &&
  floor.card !== 'story' &&
  !floor.said &&
  !floor.touring &&
  floor.speaking === 0;
