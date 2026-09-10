import { describe, expect, it } from 'vitest';
import { TUNING } from '@content/tuning';
import { newRun, reduce } from '@engine/reduce';
import { stream } from '@engine/rng';
import { farm } from '@sim/policy';
import type { Action, GameState } from '@engine/state';
import { feelOf, whatHappened } from './happened';

/**
 * WHAT AN ACTION DID (`PASS.md` P2.2).
 *
 * `act` is the seam every receipt, sound, buzz, lesson, merge and diary row
 * hangs off. Three facts were re-derived at nine sites inside it, and the
 * pocket's size at three — so this asks the question all nine were asking, once.
 *
 * **Every case here runs the real reducer.** The whole point of these facts is
 * that they are about the STATE and not about the action: a `PLACE` the rules
 * refuse must confirm nothing, and `?playtest=1` records three of Session C's
 * four facts off this seam, so a test of `action.type` alone would credit a
 * placement that never landed — which on a stranger's sheet would be a lie.
 * Hand-built before/after pairs would test the arithmetic and miss that.
 */

const fresh = (): GameState => newRun(7, TUNING, [], [], null);

/** Dispatch for real, and ask what it turned out to be. */
const act = (state: GameState, action: Action) => {
  const after = reduce(state, action);
  return { after, did: whatHappened(action, state, after) };
};

/** The first legal hex on a fresh board, so a PLACE actually lands. */
const aLegalHex = (state: GameState): string => {
  const key = Object.entries(state.cells).find(([, c]) => c.kind === 'empty')?.[0];
  if (key === undefined) throw new Error('no empty cell on a fresh board');
  return key;
};

describe('a placement', () => {
  it('counts when the rules accept it', () => {
    const state = fresh();
    const { did } = act(state, { type: 'PLACE', hex: aLegalHex(state) });
    expect(did.placed, 'a legal placement did not count').toBe(true);
    expect(did.popped).toBe(false);
    expect(did.claimed).toBe(false);
  });

  /*
   * THE CASE THE WHOLE MODULE IS FOR. A `PLACE` the rules refuse leaves the
   * state alone, so nothing may confirm it — not a buzz, and not the playtest
   * sheet, where it would be a lie about a stranger's first minute.
   */
  it('counts for nothing when the rules refuse it', () => {
    const state = fresh();
    // Far off the frontier: nothing is legal out here.
    const { after, did } = act(state, { type: 'PLACE', hex: '40,40' });
    expect(after.placements, 'the reducer accepted a hex it should refuse').toBe(state.placements);
    expect(did.placed, 'a refused placement was credited').toBe(false);
    expect(feelOf(did), 'a refused placement buzzed').toBeNull();
  });

  it('counts for nothing when the action is not a placement', () => {
    const state = fresh();
    const { did } = act(state, { type: 'SELECT', index: 0 });
    expect(did.placed).toBe(false);
    expect(feelOf(did)).toBeNull();
  });
});

describe('a harvest', () => {
  /**
   * A board with a poppable pocket, played by the RULES and by a policy that
   * knows how to ripen one.
   *
   * The first version of this walked "the first empty legal hex" and reached
   * **twenty-two placements with zero ripe tiles** — ripening needs a tile
   * touched on all six sides, and placing outward never closes a
   * neighbourhood. So the pop case took its own escape hatch and asserted
   * nothing about a pop, which is a hollow test that passes.
   *
   * `sim/policy#farm` is the harness's own "near-perfect ripening" strategy
   * and exists for exactly this. Driving it is also the honest fixture for
   * this file's whole argument: the facts are about the state MOVING, so the
   * state moves the way the game moves it.
   */
  const aboutToPop = (): { state: GameState; harvest: Action } => {
    let state = fresh();
    let dice = stream(0x5eed);
    for (let i = 0; i < 400 && state.phase === 'placing'; i++) {
      const [move, next] = farm.decide(state, dice);
      dice = next;
      if (move.length === 0) break;
      // The policy's OWN harvest, and the state it chose to make it from. A
      // second draft of this looked for a ripe TILE and found none for the
      // opposite reason to the first: `farm` pops a pocket the moment it
      // ripens, so a ripe tile never survives to be looked at.
      const harvest = move.find((m) => m.type === 'HARVEST');
      if (harvest !== undefined) return { state, harvest };
      for (const step of move) state = reduce(state, step);
    }
    throw new Error('the farm policy never chose to harvest');
  };

  it('counts a pop, and reports the pocket it popped', () => {
    const { state, harvest } = aboutToPop();
    const { after, did } = act(state, harvest);
    expect(after.log.popped, 'the harvest did not pop').toBeGreaterThan(state.log.popped);
    expect(did.popped).toBe(true);
    expect(did.pocket, 'the pocket size did not reach the voice').toBeGreaterThan(0);
    expect(feelOf(did)).toBe('pop');
  });

  it('counts for nothing on a pocket that cannot pop', () => {
    const state = fresh();
    const { did } = act(state, { type: 'HARVEST', choice: 'tiles', at: '40,40' });
    expect(did.popped, 'a harvest that popped nothing was sounded').toBe(false);
  });

  /*
   * One is the floor rather than zero. Both readers multiply by it — the voice
   * pitches a note and `cascadeMs` sizes the animation — and a silent note of
   * no length is not the same as a small one.
   */
  it('reports a pocket of one when nothing has been harvested', () => {
    const state = fresh();
    const { did } = act(state, { type: 'SELECT', index: 0 });
    expect(did.pocket).toBe(1);
  });
});

describe('what the board should feel like', () => {
  /*
   * THE PRIORITY IS THE RULE. A claim rides ON a placement, so both are true
   * on one dispatch and two buzzes would read as one long one. The claim wins:
   * it is the rarer event and the one worth telling apart.
   */
  it('lets a claim outrank the placement it rode in on', () => {
    expect(
      feelOf({ placed: true, popped: false, claimed: true, claimedAt: '1,0', pocket: 1 }),
    ).toBe('claim');
  });

  it('lets a claim outrank a pop', () => {
    expect(
      feelOf({ placed: false, popped: true, claimed: true, claimedAt: '1,0', pocket: 3 }),
    ).toBe('claim');
  });

  it('feels a pop where there was no claim', () => {
    expect(
      feelOf({ placed: false, popped: true, claimed: false, claimedAt: null, pocket: 3 }),
    ).toBe('pop');
  });

  it('feels a placement where there was neither', () => {
    expect(
      feelOf({ placed: true, popped: false, claimed: false, claimedAt: null, pocket: 1 }),
    ).toBe('place');
  });

  it('feels nothing where nothing happened', () => {
    expect(
      feelOf({ placed: false, popped: false, claimed: false, claimedAt: null, pocket: 1 }),
    ).toBeNull();
  });
});

describe('where a claim landed', () => {
  /* The camera goes and shows it, so the hex has to come back with the fact —
     it used to be read separately at the visit. */
  it('is null unless something was claimed', () => {
    const state = fresh();
    const { did } = act(state, { type: 'SELECT', index: 0 });
    expect(did.claimed).toBe(false);
    expect(did.claimedAt).toBeNull();
  });
});
