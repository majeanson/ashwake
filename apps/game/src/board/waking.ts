import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * THE PLAIN LIGHTS UP — a run's opening beat (2026-09-23, Marc's pick from
 * three drawings: _"the plain lights up"_, and the JIT warm-up is wanted
 * "as part of a welcome and death sequence rather than as four milliseconds").
 *
 * The board arrives under a scrim at the rest screen's own depth with the
 * lockup centred on it, and the scrim lifts over `WAKE_MS` while the camera
 * holds the whole world. Then the opening's second leg glides to the frontier
 * as it already did. The beat costs the run nothing: the board is live under
 * it, `pointer-events: none`, and a finger that lands during it reaches the
 * hex it was aimed at.
 *
 * ## It is the SCRIM that lifts, and not the rig
 *
 * The drawing says "the light rig comes up", and this does not ramp a light.
 * `theme/rig.ts` is what `render/materials.test.ts` grades the whole palette
 * against — every contrast number in this project is a statement about a board
 * lit by exactly that rig — so a rig eased up from nothing would make the
 * budget "a description of a board that does not exist", which is the sentence
 * this codebase already uses about tone mapping and means just as literally
 * here. A scrim of the ground colour lifting off a fully lit board looks like
 * a plain lighting up and IS a board the tests have measured, at every frame
 * of it.
 *
 * It is `.board-rest` backwards, on purpose and in both directions: the same
 * 72% wash and the same lockup, so the screen a run opens on and the screen it
 * falls asleep behind are one thing wearing two clocks. A player meets it
 * twice and it means the same thing both times — the plain, with the world not
 * yet in your hands.
 *
 * ## The clock, the dial, and the cut
 *
 * `wake()` is called by `BoardHandle.open`, which is the one door a run opens
 * through, so nothing else can raise this by accident. `?wake=0` removes it —
 * `CLAUDE.md` asks that every system ship with a dial that zeroes it, and this
 * is that dial; `?wake=3000` is how the look was judged from a phone without a
 * build. Under reduced motion there is no beat at all, which is the same cut
 * the opening's own second leg already takes: a preference against animation
 * is not a preference for a slower start.
 */

/** How long the scrim takes to lift. A FEEL number, and Marc's drawing put the
 *  light coming up at 0.4 s and the world held at 0.7 — this is the whole of
 *  it, ending as the second leg begins. */
export const WAKE_MS = 900;

type Waking = {
  /** True while the opening beat is on screen. */
  readonly waking: boolean;
  /** Raise it. Called once per run opening, by `open`. */
  readonly wake: () => void;
};

/**
 * The opening beat's state, and the timer that ends it.
 *
 * The timer is a ref so a second `open` inside one beat — a world switch, a
 * NEW RUN taken from the end screen — restarts the clock rather than stacking
 * two, and so the beat cannot outlive the board that raised it.
 */
export function useWaking(wakeMs: number = WAKE_MS): Waking {
  const [waking, setWaking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wake = useCallback((): void => {
    if (wakeMs <= 0) return;
    if (timer.current !== null) clearTimeout(timer.current);
    setWaking(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setWaking(false);
    }, wakeMs);
  }, [wakeMs]);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = null;
    },
    [],
  );

  // Derived rather than stored, for `useResting`'s reason: turning the dial to
  // zero mid-beat must LIFT the scrim rather than leave one hanging.
  return { waking: wakeMs > 0 && waking, wake };
}
