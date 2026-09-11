import { useEffect, useRef, useState } from 'react';

/**
 * THE BOARD RESTS WHEN NOBODY IS PLAYING (2026-09-11, `PASS.md` P5.4).
 *
 * Measured before it was built (`perf/report.md`): five seconds of a board
 * nobody is touching costs **3.9 to 4.5 seconds of main-thread time**, and the
 * same five seconds with reduced motion on costs **44 to 207 milliseconds** —
 * between 28× and 138× less. The ember pool and the beacon breath are not part
 * of what an idle board costs, they ARE it, and the breath is the one that runs
 * for the whole run: thirty repaints a second, every instanced mesh and every
 * label, on a board where nothing has happened.
 *
 * On a phone that is battery, and it is heat, and heat is the throttle that
 * makes everything else slower.
 *
 * **Marc's ruling, asked with the numbers (2026-09-11): sleep after a pause.**
 * Not "slow the cadence", which reads as a stutter rather than as calm, and not
 * "leave it" — the case this saves is the phone left sitting on the board for
 * minutes, which is the case that costs real battery, and the wake is instant.
 *
 * ## What counts as playing
 *
 * A pointer going down, a key going down, a wheel turning, a finger landing,
 * and the tab coming back into view. Deliberately NOT pointer MOVEMENT: a
 * cursor crossing a desktop board is not a player, and on the device this game
 * is for there is no such event until a finger lands. Every gesture that
 * changes the board begins with one of the five.
 *
 * ## The dial that zeroes it
 *
 * `?rest=0` never sleeps, which is exactly the behaviour of every build before
 * this one — `CLAUDE.md` asks that every system ship with a dial that turns it
 * off, and this is that dial. `?rest=2` is what `perf.audit.ts` uses to measure
 * a sleeping board inside a five-second phase.
 */

/** How long the board goes untouched before it stops breathing. */
export const REST_MS = 15_000;

/** What wakes it. See the docblock: movement is deliberately not on the list. */
const STIRRING = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

/**
 * `true` once nothing has happened for `restMs`, `false` the instant it does.
 *
 * The timer lives in a ref rather than in state so that a wake is one render
 * rather than two, and so the listeners are installed once for the life of the
 * board — which is the life of the page (`CLAUDE.md`: the host never remounts).
 */
export function useResting(restMs: number = REST_MS): boolean {
  const [resting, setResting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Zero is the off switch. Nothing is scheduled and no state is touched —
    // the `return` below is what makes the dial answer, so turning it off
    // mid-run WAKES the board rather than freezing it at whatever it was.
    if (restMs <= 0) return;

    const rest = (): void => setResting(true);
    const stir = (): void => {
      setResting(false);
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = setTimeout(rest, restMs);
    };

    /*
     * The clock starts without a render. `stir()` here would be a `setState`
     * inside an effect — `react-hooks/set-state-in-effect`, and the rule is
     * right: the state is already `false`, so saying so again is a cascading
     * render for nothing. Only the timer needs starting.
     */
    timer.current = setTimeout(rest, restMs);
    for (const event of STIRRING) window.addEventListener(event, stir, { passive: true });
    // A tab coming back is a player arriving, and a tab going away is the one
    // moment a sleeping board is most obviously right.
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') stir();
      else rest();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = null;
      for (const event of STIRRING) window.removeEventListener(event, stir);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [restMs]);

  // The dial is DERIVED rather than stored, so `?rest=0` answers false without
  // an effect having to undo a rest it had already begun.
  return restMs > 0 && resting;
}
