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

/**
 * What the session SAYS about what it just did.
 *
 * The whole reward loop ran silent until 2026-08-29: claims landed, pockets
 * popped and the purse spent, and the screen said nothing about any of it.
 * These pin the shape that fixed it — a receipt is a property of the
 * TRANSITION, computed once where it happens, and gone by the next one.
 */
describe('the session narrates', () => {
  it('says nothing about an action with nothing to report', () => {
    const s = session();
    s.dispatch({ type: 'SELECT', index: 0 });
    expect(s.get().said).toBeNull();
  });

  it('says something about every pop that actually lands', () => {
    // The invariant, rather than one lucky pocket: whenever a HARVEST changes
    // the state, it must have produced a receipt — and a receipt about a
    // pocket that no longer exists can only have been written from what was
    // there before the reducer spent it.
    const s = session();
    let pops = 0;

    for (let step = 0; step < 80 && !s.get().hud.ended; step++) {
      // `canHarvest` is the HUD's own answer, and the same gate `walk` uses —
      // a ripe cell existing is not the same as a pocket the reducer will
      // cash, which is what made the first version of this test never pop.
      if (s.get().hud.canHarvest) {
        const at = s.get().hud.harvestAt;
        const before = s.get().state;
        s.dispatch({ type: 'HARVEST', choice: 'tiles', ...(at === null ? {} : { at }) });
        if (s.get().state !== before) {
          pops++;
          expect(s.get().said, 'a pop that landed said nothing').not.toBeNull();
          expect(s.get().said?.text.length).toBeGreaterThan(10);
          continue;
        }
      }
      walk(s, 1);
    }

    expect(pops, 'the walk never managed a single pop').toBeGreaterThan(0);
  });

  it('gives every utterance its own identity, so "said again" is tellable', () => {
    const s = session();
    walk(s, 14);
    const first = s.get().said;
    walk(s, 4);
    const later = s.get().said;
    if (first !== null && later !== null) expect(later.id).toBeGreaterThan(first.id);
  });

  it('forgets what it said when a new run is entered', () => {
    const s = session();
    walk(s, 20);
    s.restart(11);
    expect(s.get().said).toBeNull();
  });
});

/**
 * STEPPING BETWEEN A WORLD AND THE DAILY, ABRUPTLY (2026-09-02).
 *
 * The two modes differ in the two things a player sees FIRST: the fog — ground
 * this world remembers from earlier runs — and what the plane has out there to
 * walk to. A daily has no world, so it must have neither: no remembered
 * ground, and no shrine, because a shrine unlocks a ledger a daily does not
 * keep.
 *
 * Every piece of that was tested apart (`economy.test.ts` the dials,
 * `keeper.test.ts` the writes, `settle.test.ts` the banking) and **the switch
 * itself was not tested at all** — which is where a mode leak would actually
 * live, because it is one call carrying five things across.
 *
 * "Abrupt" is the point: this is the door the player takes, straight from a
 * board mid-run into another, with no reload between. Ashwake 2 has no reload
 * to hide a leak behind.
 */
describe('a world and the daily, switched between', () => {
  const DAILY_LIKE = { ...TUNING, shrinesReborn: true, findEvery: 0, findSense: 0 };

  const look = (s: ReturnType<typeof createSession>) => {
    const cells = s.get().board.cells;
    return {
      fog: cells.filter((c) => c.remembered).length,
      shrines: cells.filter((c) => c.kind === 'landmark' && c.landmark === 'shrine').length,
      beaconShrines: cells.filter((c) => c.beacon && c.landmark === 'shrine').length,
    };
  };

  /** A world with ground behind it, so there is fog to lose. */
  const remembered = (n: number) => {
    const warm = createSession({
      seed: 7,
      theme: resolveTheme(null),
      strings: stringsFor(pickLocale(['en'])),
    });
    walk(warm, n);
    return Object.keys(warm.get().state.cells);
  };

  it('drops the fog on the way in and gives it back on the way out', () => {
    const revealed = remembered(40);
    const memory = { claimed: [], finds: [], rearmed: {}, revealed };

    const s = createSession({
      seed: 7,
      theme: resolveTheme(null),
      strings: stringsFor(pickLocale(['en'])),
      memory,
    });
    expect(look(s).fog, 'a played world opens with fog').toBeGreaterThan(0);

    // Into the daily, exactly as `enterDaily` does it: no memory at all.
    s.restart(20260902, null, undefined, DAILY_LIKE);
    expect(look(s).fog, 'a daily wore another world’s fog').toBe(0);

    // And back out, exactly as `startRun` does it.
    s.restart(7, null, memory, TUNING);
    expect(look(s).fog, 'the world did not get its fog back').toBeGreaterThan(0);
  });

  /**
   * The same seed, the same walk, and only the economy different — so the
   * shrines the world shows and the daily does not are the rewrite and nothing
   * else. Seed 11 walks into beacon range of one; a seed that never meets a
   * shrine would let both halves pass by saying nothing.
   */
  it('shows a world its shrines and a daily none, on the board or glowing off it', () => {
    const played = (tuning?: typeof TUNING) => {
      const s = createSession({
        seed: 11,
        theme: resolveTheme(null),
        strings: stringsFor(pickLocale(['en'])),
        ...(tuning === undefined ? {} : { tuning }),
      });
      walk(s, 80);
      return look(s);
    };

    const world = played();
    expect(
      world.shrines + world.beaconShrines,
      'the fixture never reached a shrine, so this proves nothing',
    ).toBeGreaterThan(0);

    const daily = played(DAILY_LIKE);
    expect(daily.shrines, 'a daily grew a shrine').toBe(0);
    // The half that was broken until 2026-09-02: a BEACON is drawn from
    // `destinationsWithin`, which skipped the rewrite, so a daily advertised
    // shrines it would never hand over — and the signpost and the ending's
    // what-still-glows named them too. See `engine/world.ts`'s `reborn`.
    expect(daily.beaconShrines, 'a daily advertised a shrine it cannot give').toBe(0);
  });
});
