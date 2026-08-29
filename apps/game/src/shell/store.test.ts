import { describe, expect, it } from 'vitest';
import { pickLocale } from '@content/locale';
import { TUNING } from '@content/tuning';
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

/**
 * The stash — a whole mechanic that shipped inert (2026-08-29).
 *
 * The rule has been in the core since the rules were lifted: `hold(state, slot)`
 * puts the selected card into a free slot, and TRADES with a named one. The
 * shell dispatched `HOLD` from nowhere, so the empty slot was a `disabled`
 * button and the held card had no tap at all — you could neither put a tile
 * away nor take one back. The same class of miss as the colour lens, and these
 * are the assertions that would have caught it.
 */
describe('the stash', () => {
  const stashing = () =>
    createSession({
      seed: 3,
      theme: resolveTheme(null),
      strings: stringsFor(pickLocale(['en'])),
      // Two slots rather than the shipped one, so the TRADE case has a
      // second slot to be distinct from. The shipped width is pinned below.
      tuning: { ...TUNING, holdSlots: 2 },
    });

  it('puts the selected card away, and takes it out of the hand', () => {
    const s = stashing();
    const dealt = s.get().hud.draft.length;
    const saved = s.get().state.draft[0];
    expect(saved).toBeDefined();

    s.dispatch({ type: 'SELECT', index: 0 });
    s.dispatch({ type: 'HOLD', slot: 0 });

    expect(s.get().state.held[0]?.id).toBe(saved?.id);
    expect(s.get().hud.draft).toHaveLength(dealt - 1);
  });

  it('trades with a full slot rather than dealing from it', () => {
    const s = stashing();
    s.dispatch({ type: 'SELECT', index: 0 });
    const first = s.get().state.draft[0]?.id;
    s.dispatch({ type: 'HOLD', slot: 0 });

    const dealt = s.get().hud.draft.length;
    const next = s.get().state.draft[0]?.id;
    s.dispatch({ type: 'SELECT', index: 0 });
    s.dispatch({ type: 'HOLD', slot: 0 });

    // The stashed tile came back and the selected one took its place — the
    // hand is the same size, because a trade is a trade.
    expect(s.get().hud.draft).toHaveLength(dealt);
    expect(s.get().state.draft.map((c) => c.id)).toContain(first);
    expect(s.get().state.held[0]?.id).toBe(next);
  });

  it('says the stash exists, and how wide it is', () => {
    expect(stashing().get().hud.canHold).toBe(true);
    expect(stashing().get().hud.holdSlots).toBe(2);
  });

  /**
   * The shipped width, pinned — because it is what makes the dead button a
   * bug every player met rather than one behind an unlock.
   *
   * `TUNING` spreads `PLANE`, which sets `holdSlots: 1`. So a dashed HOLD
   * card has been sitting in the hand of every run since Stage 3, disabled,
   * doing nothing. If this ever goes back to 0 the change is a balance
   * decision and belongs in `LOG.md`, not in a diff nobody noticed.
   */
  it('ships with a stash from run one', () => {
    expect(session().get().hud.canHold).toBe(true);
    expect(session().get().hud.holdSlots).toBe(1);
  });
});
