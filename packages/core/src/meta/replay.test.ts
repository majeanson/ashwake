import { describe, expect, it } from 'vitest';
import { TUNING } from '@content/tuning';
import { newRun, reduce } from '@engine/reduce';
import { stream, type RngStream } from '@engine/rng';
import type { Action, GameState } from '@engine/state';
import { greedy, chooser, tourist, type Policy } from '../sim/policy';
import { decodeReplay, encodeReplay, replayTo, type Replay } from './replay';

/**
 * THE ONE QUESTION A REPLAY HAS TO ANSWER: is it the same run?
 *
 * Everything else here — the tokens, the validator, the clamp — is plumbing
 * around that. So the suite plays real runs with the simulator's own policies,
 * writes them down, reads them back off a string, and asks whether the run
 * that comes out is the run that went in, state for state. A replay that
 * merely LOOKS plausible is the failure mode this exists to make impossible:
 * a film that plays half a run and then shows something that never happened is
 * a lie about a game.
 */

/** Play a whole run, keeping every action that actually moved it. */
function played(seed: number, policy: Policy = greedy): { replay: Replay; ended: GameState } {
  let state = newRun(seed, TUNING, [], [], null);
  const from = state;
  const moves: Action[] = [];
  let dice: RngStream = stream((seed ^ 0x51ed270b) | 0);
  for (let steps = 0; state.phase === 'placing' && steps < 20_000; steps++) {
    const [move, next] = policy.decide(state, dice);
    dice = next;
    if (move.length === 0) break;
    for (const action of move) {
      const after = reduce(state, action);
      if (after !== state) moves.push(action);
      state = after;
    }
  }
  return { replay: { from, moves }, ended: state };
}

describe('a replay is the same run', () => {
  /*
   * Three policies, because they press different buttons: `greedy` places and
   * harvests, `chooser` selects across the draft, `tourist` walks. A codec
   * tested against one policy is a codec tested against the actions that
   * policy happens to use, and the token nobody exercises is the token that is
   * wrong.
   */
  for (const policy of [greedy, chooser, tourist]) {
    it(`reaches the same ending it recorded (${policy.name})`, () => {
      for (let seed = 1; seed <= 5; seed++) {
        const { replay, ended } = played(seed, policy);
        const again = replayTo(replay, replay.moves.length);
        expect(again, `seed ${seed} replayed into a different run`).toEqual(ended);
      }
    });

    it(`survives the disk unchanged (${policy.name})`, () => {
      for (let seed = 1; seed <= 5; seed++) {
        const { replay, ended } = played(seed, policy);
        const back = decodeReplay(encodeReplay(replay));
        expect(back, `seed ${seed} would not decode`).not.toBeNull();
        expect(back!.moves, `seed ${seed} lost or changed a move`).toEqual(replay.moves);
        expect(replayTo(back!, back!.moves.length), `seed ${seed} replayed differently`).toEqual(
          ended,
        );
      }
    });
  }

  /*
   * Every step, not only the last one. The end screen's button watches the
   * whole run, so a replay that agrees about the ending and disagrees about
   * the middle would be a film with a wrong board in it — which is what the
   * player is actually looking at.
   */
  it('agrees at every step, not only at the end', () => {
    const { replay } = played(7);
    let state = replay.from;
    for (let i = 0; i <= replay.moves.length; i++) {
      expect(replayTo(replay, i), `step ${i} differs`).toEqual(state);
      const action = replay.moves[i];
      if (action !== undefined) state = reduce(state, action);
    }
  });

  it('clamps rather than throwing, at both ends', () => {
    const { replay, ended } = played(3);
    expect(replayTo(replay, -5)).toEqual(replay.from);
    expect(replayTo(replay, replay.moves.length + 99)).toEqual(ended);
  });
});

describe('what a replay refuses', () => {
  const sound = (): string => encodeReplay(played(2).replay);

  it('refuses a token it cannot read, rather than playing part of a run', () => {
    const bag = JSON.parse(sound()) as { m: string };
    const half = Math.floor(bag.m.split(';').length / 2);
    const tokens = bag.m.split(';');
    tokens[half] = 'z9';
    expect(decodeReplay(JSON.stringify({ ...bag, m: tokens.join(';') }))).toBeNull();
  });

  /* A hex is two integers and a comma. Anything looser writes a key into the
     cell map that the rules never put there. */
  for (const bad of ['p', 'p1', 'p1,', 'pnope', 'p1,2,3', 's', 'sx', 's-1', 'h', 'hz', 'x', 'xz']) {
    it(`refuses the token "${bad}"`, () => {
      const bag = JSON.parse(sound()) as { m: string };
      expect(decodeReplay(JSON.stringify({ ...bag, m: bad }))).toBeNull();
    });
  }

  it('refuses an opening state a resumed run would also refuse', () => {
    const bag = JSON.parse(sound()) as Record<string, unknown>;
    expect(decodeReplay(JSON.stringify({ ...bag, from: { version: 2 } }))).toBeNull();
    expect(decodeReplay(JSON.stringify({ ...bag, from: null }))).toBeNull();
  });

  it('refuses a version it does not know, and junk', () => {
    const bag = JSON.parse(sound()) as Record<string, unknown>;
    expect(decodeReplay(JSON.stringify({ ...bag, v: 2 }))).toBeNull();
    expect(decodeReplay('not json')).toBeNull();
    expect(decodeReplay(null)).toBeNull();
    expect(decodeReplay('[]')).toBeNull();
  });

  it('reads back a run with no moves at all — an opening nobody played', () => {
    const from = newRun(11, TUNING, [], [], null);
    const back = decodeReplay(encodeReplay({ from, moves: [] }));
    expect(back?.moves).toEqual([]);
    expect(replayTo(back!, 3)).toEqual(from);
  });
});

describe('what a replay costs', () => {
  /*
   * The number Marc was given when he ruled that every hall-of-fame run stays
   * watchable, pinned so it cannot quietly grow. Twenty runs measured at 148
   * moves on average; the tokens are what keep a row's replay smaller than the
   * thumbnail already stored beside it (`SHOT_CHAR_MAX`, 24,000 characters).
   */
  it('stays well under a diary thumbnail, per run', () => {
    let worst = 0;
    for (let seed = 1; seed <= 10; seed++) {
      worst = Math.max(worst, encodeReplay(played(seed).replay).length);
    }
    expect(worst, `a replay grew to ${worst} characters`).toBeLessThan(12_000);
  });
});
