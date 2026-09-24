import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pickLocale } from '@content/locale';
import { stringsFor } from '@text/index';
import { resolveTheme } from '@theme/index';
import { replayTo, type Replay } from '@meta/replay';
import { createSession } from './store';
import { walk } from './walk';
import { useFilm } from './watching';

/**
 * THE PROJECTOR (2026-09-23).
 *
 * `meta/replay.test.ts` proves a film is the same run; `store.test.ts` proves
 * the session records the right moves. What is left — and what this asks — is
 * whether the thing that PLAYS a film arrives at the end of it, whether a tap
 * can cut it short without lying about where the run finished, and whether the
 * moves nobody can see cost the film any time.
 *
 * Fake timers throughout, because the whole subject is a clock.
 */

const opts = {
  theme: resolveTheme(null),
  strings: stringsFor(pickLocale(['en'])),
};

/**
 * A real run, filmed, because a hand-built move list is a test of a fixture.
 *
 * With a card CHOSEN partway through, which `walk` never does — the scripted
 * walker places and harvests and nothing else, so a film taken from it has no
 * invisible moves in it at all and the folding below would be tested against a
 * run that cannot exercise it. A finger taps cards constantly.
 */
function filmed(turns = 10): Replay {
  const s = createSession({ seed: 5, ...opts });
  walk(s, Math.max(1, Math.floor(turns / 2)));
  s.dispatch({ type: 'SELECT', index: 1 });
  walk(s, Math.ceil(turns / 2));
  return s.replay();
}

describe('watching a run', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('plays nothing when there is no film', () => {
    const { result } = renderHook(() => useFilm(null, opts));
    expect(result.current).toBeNull();
  });

  it('opens on the board the run opened on', () => {
    const replay = filmed();
    const { result } = renderHook(() => useFilm(replay, opts));
    expect(result.current?.step).toBe(0);
    expect(result.current?.snap.state).toEqual(replay.from);
  });

  it('reaches the run it is a film of, and says it is done', () => {
    const replay = filmed();
    const ended = replayTo(replay, replay.moves.length);
    const { result } = renderHook(() => useFilm(replay, opts));

    // Longer than any film of ten turns: the point is the ending, not the
    // pacing, and the pacing has a test of its own below.
    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current?.snap.state, 'the film ended on a different board').toEqual(ended);
    expect(result.current?.done, 'the film never reported itself finished').toBe(true);
    expect(result.current?.step).toBe(result.current?.of);
  });

  /*
   * The SELECT that chooses a card changes nothing on the board, so it rides
   * along with the placement that follows it rather than costing a beat. This
   * is what keeps a 150-move run from being a minute of watching a hand.
   */
  it('counts only the moves there is something to watch', () => {
    const replay = filmed();
    const visible = replay.moves.filter((m) => m.type === 'PLACE' || m.type === 'HARVEST').length;
    const { result } = renderHook(() => useFilm(replay, opts));
    expect(result.current?.of).toBe(visible);
    expect(visible, 'every move was visible, so this test proves nothing').toBeLessThan(
      replay.moves.length,
    );
  });

  it('a second film starts from its own beginning', () => {
    const first = filmed(10);
    const second = filmed(4);
    const { result, rerender } = renderHook(({ film }: { film: Replay }) => useFilm(film, opts), {
      initialProps: { film: first },
    });
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current?.done).toBe(true);

    rerender({ film: second });
    expect(result.current?.step, 'the new film inherited the old one’s progress').toBe(0);
    expect(result.current?.snap.state).toEqual(second.from);
  });
});

/**
 * AND THE CAMERA FOLLOWS IT (2026-09-24, Marc: _"more fluid, less step-y"_).
 *
 * `onMove` is a hook, and `CLAUDE.md` is plain about hooks: a hook a test can
 * inject is a hook a test cannot prove is connected. These prove the clock's
 * half — every visible move handed over once, in order, at its own hex, BEFORE
 * the board is told it happened — and `e2e/board.spec.ts`'s REPLAY test proves
 * `App` passes the real one (`data-follow` on the board host).
 */
describe('a film hands the camera every move', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('names every placement and every pop, once each, in order', () => {
    const replay = filmed(120);
    const visible = replay.moves.filter((m) => m.type === 'PLACE' || m.type === 'HARVEST');
    expect(
      visible.some((m) => m.type === 'HARVEST'),
      'no pops, so this proves half',
    ).toBe(true);

    const seen: string[] = [];
    const { result } = renderHook(() =>
      useFilm(replay, { ...opts, onMove: (at) => seen.push(at) }),
    );
    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    expect(seen).toEqual(
      visible.map((m) => (m.type === 'PLACE' ? m.hex : m.type === 'HARVEST' ? m.at : '')),
    );
    expect(result.current?.done).toBe(true);
  });

  it('tells the camera before the board, so it is already moving when the tile lands', () => {
    const replay = filmed(120);
    const placedWhenTold: number[] = [];
    let read: () => number = () => 0;
    const { result } = renderHook(() =>
      useFilm(replay, { ...opts, onMove: () => placedWhenTold.push(read()) }),
    );
    read = () => result.current?.snap.state.placements ?? 0;
    act(() => {
      vi.advanceTimersByTime(BEAT_PROBE_MS);
    });
    // The first move is announced on a board that has not placed it yet.
    expect(placedWhenTold[0]).toBe(replay.from.placements);
  });

  it('still reaches the end of the run it is a film of', () => {
    const replay = filmed();
    const ended = replayTo(replay, replay.moves.length);
    const { result } = renderHook(() => useFilm(replay, { ...opts, onMove: () => {} }));
    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    expect(result.current?.snap.state).toEqual(ended);
  });
});

/** Long enough for the first beat and no more (a beat is at most 180 ms). */
const BEAT_PROBE_MS = 200;
