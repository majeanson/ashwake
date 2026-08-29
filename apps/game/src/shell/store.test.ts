import { describe, expect, it } from 'vitest';
import { pickLocale } from '@content/locale';
import { stringsFor } from '@text/index';
import { resolveTheme } from '@theme/index';
import { createSession } from './store';
import { walk } from './walk';

/**
 * Stepping into a run — the crossing the worlds panel makes (Stage 4,
 * 2026-08-29).
 *
 * `restart` is one door for two things, a fresh run and one picked up, and what
 * has to be true of both is that nothing of the run being LEFT survives the
 * crossing. A pop still drawing, or a pocket still priced, would be the old
 * world's board painted over the new one's — which is exactly the class of bug
 * a page reload used to hide.
 */

const session = () =>
  createSession({
    seed: 3,
    theme: resolveTheme(null),
    strings: stringsFor(pickLocale(['en'])),
  });

describe('entering a run', () => {
  it('picks up a saved run as the very object it was, not a replay', () => {
    const played = session();
    walk(played, 6);
    const saved = played.get().state;

    const fresh = session();
    fresh.restart(999, saved);
    expect(fresh.get().state).toBe(saved);
  });

  it('starts a fresh run when the slot kept nothing', () => {
    const s = session();
    walk(s, 4);
    s.restart(42, null);
    expect(s.get().state.placements).toBe(0);
    expect(s.get().state.rootSeed).toBe(42);
  });

  it('leaves no pop and no priced pocket behind', () => {
    const s = session();
    walk(s, 8);
    const ripe = s.get().board.cells.find((c) => c.ripe);
    if (ripe !== undefined) s.target(ripe.key);
    s.dispatch({ type: 'HARVEST', choice: 'points' });

    s.restart(11);
    expect(s.get().popped).toBeNull();
    expect(s.get().board.targetHex).toBeNull();
  });

  it('tells every listener exactly once, whichever kind of run is entered', () => {
    const s = session();
    let told = 0;
    s.subscribe(() => {
      told++;
    });
    s.restart(5);
    expect(told).toBe(1);
    s.restart(6, s.get().state);
    expect(told).toBe(2);
  });
});

/**
 * The colour lens — a way of looking, not part of the run.
 *
 * The core has computed `dimmed` and `lensed` since the rules were lifted and
 * the shell passed `null` for the spotlight until 2026-08-29, which made a
 * whole feature dead code that every core test still covered. These are the
 * assertions that would have caught that: the lens must reach the board, and
 * it must never reach the state.
 */
describe('the colour lens', () => {
  it('dims every tile that is not the colour held up', () => {
    const s = session();
    walk(s, 10);
    const colour = s.get().board.cells.find((c) => c.kind === 'tile')?.colour;
    expect(colour).toBeDefined();

    s.spotlight(colour ?? null);
    const tiles = s.get().board.cells.filter((c) => c.kind === 'tile');
    expect(tiles.filter((c) => c.lensed).every((c) => c.colour === colour)).toBe(true);
    expect(tiles.filter((c) => c.dimmed).every((c) => c.colour !== colour)).toBe(true);
    expect(tiles.some((c) => c.lensed)).toBe(true);
  });

  it('puts every tile back when it is let go', () => {
    const s = session();
    walk(s, 10);
    s.spotlight('green');
    s.spotlight(null);
    expect(s.get().board.cells.some((c) => c.dimmed || c.lensed)).toBe(false);
  });

  it('never touches the run', () => {
    const s = session();
    walk(s, 6);
    const before = s.get().state;
    s.spotlight('red');
    expect(s.get().state).toBe(before);
  });
});
