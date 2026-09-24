import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { HexKey } from '@engine/hex';
import type { Replay } from '@meta/replay';
import { FLIGHT_MS } from '../board/flight';
import type { Strings } from '@text/Strings';
import type { Theme } from '@theme/tokens';
import { createSession, useSession, type Session, type Snapshot } from './store';
import type { RunMemory } from './storage';

/**
 * WATCHING A RUN AGAIN (2026-09-23, Marc: _"i'd like to be able to replay the
 * pops and tile placements too"_).
 *
 * The whole driver, and it is small for one reason: **the board already knows
 * how to put on the show.** A placement makes a tile rise, a harvest makes the
 * pocket leap and the cascade run, a claim lights a ring — and every one of
 * those is drawn from a change in the SESSION'S SNAPSHOT, not from the gesture
 * that caused it. So a film is a second session, fed the run's own moves on a
 * clock, handed to the same `<Board>`. Nothing about the replay is a second
 * implementation of anything: not the rules, not the animations, not the
 * camera.
 *
 * `meta/replay.ts` is what a film IS and why it carries the opening state.
 * This file is only the projector.
 *
 * ## What it does NOT do, on purpose
 *
 * It does not speak, and the MECHANISM matters more than the claim — this
 * paragraph asserted a gate that does not exist until the 2026-09-23 audit
 * pass went looking for it, which is the exact fault `CLAUDE.md` warns about
 * two paragraphs from the top: *a comment that asserts an invariant is not the
 * invariant, and it is the sentence that stops a reader checking.*
 *
 * What is actually true, checked rather than asserted:
 *
 *   - **The film's own utterances are never read.** Its session computes
 *     receipts and epitaphs exactly as the live one does — `whatToSay` runs on
 *     every dispatch — and `App` reads `film.snap.board` and
 *     `film.snap.popped` and nothing else. A toast reading "+14 POINTS" over a
 *     run that finished ten minutes ago would be the game lying about the
 *     present, and it cannot happen because nothing is listening.
 *   - **The live session is quiet because nothing dispatches into it.** The
 *     teaching drip, the buzz and the sound all hang off a player's action
 *     through `act`, and while a film is up the board's taps end the film
 *     (`App`'s `onTap`, first rung) instead of reaching the game. There is no
 *     timer anywhere that speaks on its own.
 *
 * So a future change that made anything speak on a CLOCK would need this
 * paragraph re-checked rather than trusted.
 *
 * It also never touches the disk: no keeper is made for it, `App` holds the
 * one there is, and a projector that could write is a projector that can
 * overwrite the run you are about to play. It IS given the world's remembered
 * ground, which is a read and not a write — see `ground` below for why a film
 * drawn on bare plain is a film of a different board.
 */

/**
 * How long the whole film should take, and the beats it is made of.
 *
 * A run is about 150 moves (`meta/replay.ts` measured it), of which roughly
 * half are the SELECT that chooses a card — a move with nothing to watch. At a
 * fixed beat a long run would run for a minute, so the beat is fitted to the
 * run: the film aims at `TARGET_MS` and clamps, which means a short opening
 * plays at a human pace and a three-hundred-move marathon is brisk rather than
 * interminable. Either way a tap ends it.
 */
const TARGET_MS = 14_000;
const BEAT_MIN = 60;
const BEAT_MAX = 180;

/**
 * What a POP is given, whatever the beat works out to.
 *
 * The cascade is the thing Marc asked to see, and it takes what it takes:
 * `leap.ts` puts a five-tile pocket at about 740 ms with the authored motion.
 * A beat shorter than the cascade would start the next placement over a board
 * still throwing tiles in the air, which is the one moment of a run where the
 * board is saying something.
 */
const POP_MS = 760;

/*
 * AND THE CAMERA GOES TO LOOK AT IT (2026-09-24, Marc: _"replay pops don't
 * animate"_). The leap always played; from a frame holding a whole world it
 * was sixteen pixels a hex and nobody could see it. So a pop is announced
 * before it is played — `onPop` dives the camera in (`BoardHandle.dive`),
 * the pop lands once the camera has arrived, and the next move waits for the
 * camera to come back. `POP_MS` is the hold at the pocket; the two flights
 * are the board's own `FLIGHT_MS`, read from where it is declared rather
 * than restated.
 */

/** A move with nothing to watch rides along with the next one that has. */
const isVisible = (type: string): boolean => type === 'PLACE' || type === 'HARVEST';

type Film = {
  /** What the board should draw right now. */
  readonly snap: Snapshot;
  /** Which move it is on, and how many there are to watch. */
  readonly step: number;
  readonly of: number;
  /** The film has reached the end of the run. */
  readonly done: boolean;
  /*
   * There is no `skip` here, and there was until the sweep asked who called
   * it (2026-09-23). A film is left rather than fast-forwarded: SKIP and a tap
   * on the board both END it and put the player back where they were — which
   * is what Marc asked a tap to do, *"skips to the score"* — so a method that
   * ran the remaining moves into the projector and stayed on the last frame
   * was a second way out that nothing offered.
   */
};

/**
 * Play a film, or nothing when there is none.
 *
 * The session is built once per replay and never rebuilt: `useMemo` on the
 * replay object, which `App` holds in state, so choosing a different run to
 * watch is a new object and a new projector, and a re-render for any other
 * reason is neither.
 */
export function useFilm(
  replay: Replay | null,
  opts: {
    readonly theme: Theme;
    readonly strings: Strings;
    /**
     * THE GROUND THE FILM IS DRAWN OVER (2026-09-23).
     *
     * A run is played on a world that remembers — fog, territories, spent
     * finds — and `toBoardView` draws that remembered ground around the run's
     * own cells. A projector given no memory draws the run on bare plain,
     * which is not what the player saw and reads as a different board.
     *
     * The caller hands over the world as it stands TODAY, which is later than
     * the run and therefore shows a little more ground than it had. That is
     * the honest choice of the two available: the alternative is storing a
     * copy of the world's fog with every film, which is the one thing here big
     * enough to matter (a world three hundred runs deep is 24 KB against a
     * film's 7). `memoryFor` also refuses a world whose seed is not the
     * film's, so a run played on a board this device no longer has is drawn on
     * plain rather than on somebody else's ground.
     */
    readonly ground?: RunMemory | undefined;
    /**
     * A pop is about to be played at `at`: go and look at it, and hold for
     * `holdMs`. `App` passes the board's `dive` — and it is the caller the
     * film is judged by, because a projector that pops where nobody is
     * looking is the bug this option was written for (see `POP_MS`). Absent,
     * the film still plays; it simply does not move the camera.
     */
    readonly onPop?: ((at: HexKey, holdMs: number) => void) | undefined;
  },
): Film | null {
  /*
   * A projector exists on every render, with or without a film in it.
   *
   * `useSession` is `useSyncExternalStore` and hooks cannot be called
   * conditionally, so the alternative was a stand-in session built from a fake
   * theme and fake strings — an object whose views would be computed from a
   * catalogue with no sentences in it, one field access away from throwing on
   * a screen nobody is even looking at. A real session on seed 1 that is never
   * dispatched into and never drawn costs one `newRun` and cannot lie.
   */
  const session = useMemo<Session>(
    () =>
      createSession({
        seed: replay?.from.rootSeed ?? 1,
        ...(replay === null ? {} : { resume: replay.from }),
        ...(opts.ground === undefined ? {} : { memory: opts.ground }),
        theme: opts.theme,
        strings: opts.strings,
      }),
    // The look and the language are re-supplied below rather than rebuilding
    // the projector when a player changes either mid-film.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [replay],
  );

  const of = useMemo(() => (replay?.moves ?? []).filter((m) => isVisible(m.type)).length, [replay]);

  /*
   * WHICH FILM THE COUNT BELONGS TO, kept in the same state as the count.
   *
   * The chrome shows how far through the run the film is, so the number has to
   * be React state — and the two obvious ways to reset it for a NEW film are
   * both refused here, correctly. A `setState` in an effect body cascades
   * renders (`react-hooks`), and a ref read during render is a value React
   * cannot see change (`react-hooks/refs`, which `App` already records losing
   * an argument to).
   *
   * So the state says WHOSE count it is. A film that is not the one on screen
   * reads as zero without anything having to be reset, and the only writer is
   * the projector's own timer — which is a callback, not a render and not an
   * effect body.
   */
  const [progress, setProgress] = useState<{ readonly film: Replay | null; readonly step: number }>(
    { film: null, step: 0 },
  );
  const step = progress.film === replay ? progress.step : 0;
  const advance = useCallback(
    (to?: number): void =>
      setProgress((was) => ({
        film: replay,
        step: to ?? (was.film === replay ? was.step : 0) + 1,
      })),
    [replay],
  );

  useEffect(() => {
    session.resupply(opts.theme, opts.strings);
  }, [session, opts.theme, opts.strings]);

  /**
   * The projector itself: one timer, re-armed after each visible move.
   *
   * A timer rather than a frame loop, because what is being paced is the
   * GAME's clock and not the screen's — the board's own animations run on
   * `requestAnimationFrame` inside the canvas and are not this file's business.
   * The cursor lives in a ref so re-arming does not re-render, and the step
   * COUNT is state because the chrome shows it.
   */
  const cursor = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Read through a ref so a new callback on a re-render does not restart the
  // projector: the clock belongs to the film, not to the render.
  const onPop = useRef(opts.onPop);
  useEffect(() => {
    onPop.current = opts.onPop;
  }, [opts.onPop]);

  useEffect(() => {
    if (replay === null) return;
    cursor.current = 0;

    const beat = Math.min(BEAT_MAX, Math.max(BEAT_MIN, Math.round(TARGET_MS / Math.max(1, of))));

    // The pop whose dive has been flown, so the next tick plays it rather
    // than announcing it a second time.
    let announced = -1;

    const next = (): void => {
      // Every move up to and including the next VISIBLE one, in one go: the
      // card being chosen and the tile being placed are one decision, and a
      // beat spent on a selection nobody can see is a beat of the film wasted.
      let played = false;
      while (cursor.current < replay.moves.length && !played) {
        const move = replay.moves[cursor.current]!;
        // A pop is looked at before it is played: the camera flies in, and the
        // same move is dispatched on the tick after, once it has arrived.
        if (
          move.type === 'HARVEST' &&
          announced !== cursor.current &&
          onPop.current !== undefined
        ) {
          const at = move.at ?? session.get().hud.harvestAt;
          if (at !== null) {
            announced = cursor.current;
            onPop.current(at, POP_MS);
            timer.current = setTimeout(next, FLIGHT_MS);
            return;
          }
        }
        session.dispatch(move);
        cursor.current += 1;
        played = isVisible(move.type);
      }
      /*
       * The run is out of moves, so the clock simply stops being re-armed.
       * Nothing here decides what happens next: `step` has reached `of`, which
       * is what `done` means, and `App` is what acts on it — a beat on the last
       * board, then the screen the film was opened from. A projector that put
       * the player somewhere would be a projector with an opinion about the
       * app it is embedded in.
       */
      if (!played) return;
      advance();
      const popped = replay.moves[cursor.current - 1]?.type === 'HARVEST';
      // After a pop the camera is still on its way back when the hold ends;
      // the next placement waits for it, or it lands under a moving board.
      const wait = popped ? POP_MS + (announced === cursor.current - 1 ? FLIGHT_MS : 0) : beat;
      timer.current = setTimeout(next, wait);
    };

    timer.current = setTimeout(next, beat);
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [session, replay, of, advance]);

  const snap = useSession(session);
  if (replay === null) return null;

  const done = step >= of;
  return { snap, step, of, done };
}
