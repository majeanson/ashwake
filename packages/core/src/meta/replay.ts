import type { Colour } from '@content/tuning';
import { reduce } from '@engine/reduce';
import type { HexKey } from '@engine/hex';
import type { Action, GameState, HarvestChoice, Spend } from '@engine/state';
import { decodeRun, encodeRun } from './save';

/**
 * A RUN, WATCHABLE AGAIN (2026-09-23, Marc, asked to choose between three
 * endings and choosing a fourth: _"i'd like to be able to replay the pops and
 * tile placements too"_).
 *
 * A replay is two things and nothing else: **the state the run opened on, and
 * every move that changed it**. That is enough because the engine is a pure
 * reducer with counter-based rng carried in state — the same two inputs have
 * always produced the same run, which is what `pnpm sim` proves on every push.
 * Nothing here re-describes the board, and nothing here is a recording of what
 * the board LOOKED like: the show is re-derived by replaying the moves through
 * the very same rules, so a replay cannot drift from the game the way a filmed
 * one could.
 *
 * ## Why the opening STATE and not the seed
 *
 * A run is `newRun(seed, tuning, territories, spentFinds, wakeAt)`, and every
 * rider after the seed is a fact about the world at that moment: the shop
 * levels bought, the perks worn, the territories held, the shrines already
 * spent. Those move. A replay keyed on the seed would re-run today's economy
 * over yesterday's moves and quietly produce a different run — the one bug
 * this whole design has to be incapable of. The opening state carries all of
 * it, is plain JSON by construction (`meta/save.ts` says why), and measures
 * about 2.4 KB.
 *
 * ## The moves are compact because there are about 150 of them
 *
 * Measured over twenty simulated runs: 148 moves on average, 197 at the
 * longest — 5.2 KB as a JSON array of action objects, and 1.4 KB as the
 * tokens below. The saving is not the point on its own; what it buys is that a
 * device can keep every run in the hall of fame watchable (Marc's ruling, the
 * same day) rather than the last few, and that the diary's own thumbnails
 * stay the biggest thing per row instead of this.
 *
 * One token per action, `;` between them:
 *
 *   - `s3`        SELECT the fourth draft card
 *   - `p2,-1`     PLACE on that hex
 *   - `ht`        HARVEST, choice by first letter
 *   - `ht@2,-1`   …that pocket
 *   - `d` / `d1`  HOLD, with a stash slot where one was named
 *   - `xr` / `xsgreen`  SPEND, on by first letter, with a colour for steer
 *
 * A token this file cannot read makes the WHOLE replay refuse rather than a
 * partial one, and the reason is `save.ts`'s: a half-decoded run handed to the
 * reducer is a haunting. Here the stakes are lower — a film nobody can watch
 * is an annoyance — but a film that plays half a run and then shows something
 * that never happened is a lie about a game, and that is worse than no film.
 */
export type Replay = {
  /*
   * There is no `version` field here, and the wire format has one (`v`).
   * They are not the same thing: the number on the disk is what decides
   * whether this build can read a blob at all, and it is checked in
   * `decodeReplay` before anything else. A copy of it on the decoded object
   * would be a field every writer sets and no reader reads — which is what
   * `pnpm sweep` said about it the day it was written.
   */
  /** The state the run opened on: seed, tuning, riders, wake hex and all. */
  readonly from: GameState;
  /** Every action that changed the run, in order. */
  readonly moves: readonly Action[];
};

/** The four harvest choices, keyed by the letter the token carries. */
const HARVEST: Readonly<Record<string, HarvestChoice>> = {
  t: 'tiles',
  p: 'points',
  r: 'treasure',
  b: 'burn',
};

/** The four spends, the same way. `t` is taken by `tithe`, so `treasure`
 *  above and `tithe` here never share a table. */
const SPEND: Readonly<Record<string, Spend>> = {
  r: 'reroll',
  s: 'steer',
  f: 'forge',
  t: 'tithe',
};

const COLOUR: readonly Colour[] = ['green', 'yellow', 'red', 'blue'];

const letterFor = <T extends string>(table: Readonly<Record<string, T>>, value: T): string => {
  for (const [letter, name] of Object.entries(table)) if (name === value) return letter;
  // Unreachable while the tables above cover their unions, and the unions are
  // the core's. A new choice added without a letter lands here rather than
  // writing a token nothing can read back.
  throw new Error(`replay: no token letter for ${value}`);
};

function tokenFor(action: Action): string {
  switch (action.type) {
    case 'SELECT':
      return `s${action.index}`;
    case 'PLACE':
      return `p${action.hex}`;
    case 'HARVEST':
      return `h${letterFor(HARVEST, action.choice)}${action.at === undefined ? '' : `@${action.at}`}`;
    case 'HOLD':
      return `d${action.slot === undefined ? '' : action.slot}`;
    case 'SPEND':
      return `x${letterFor(SPEND, action.on)}${action.colour ?? ''}`;
  }
}

/** A whole number, or null — the only kind of index or slot a token may carry. */
function countFrom(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : null;
}

/** `q,r`, and nothing else. A hex key is two integers and a comma, and
 *  anything looser would put `undefined` into the cell map as a key. */
function hexFrom(raw: string): HexKey | null {
  // No cast: `HexKey` is a plain string alias, so the type would take any
  // string at all and the regexp is the whole of what makes this one a key.
  return /^-?\d+,-?\d+$/.test(raw) ? raw : null;
}

function actionFrom(token: string): Action | null {
  const rest = token.slice(1);
  switch (token[0]) {
    case 's': {
      const index = countFrom(rest);
      return index === null ? null : { type: 'SELECT', index };
    }
    case 'p': {
      const hex = hexFrom(rest);
      return hex === null ? null : { type: 'PLACE', hex };
    }
    case 'h': {
      const choice = HARVEST[rest[0] ?? ''];
      if (choice === undefined) return null;
      const at = rest.slice(1);
      if (at === '') return { type: 'HARVEST', choice };
      if (at[0] !== '@') return null;
      const hex = hexFrom(at.slice(1));
      return hex === null ? null : { type: 'HARVEST', choice, at: hex };
    }
    case 'd': {
      if (rest === '') return { type: 'HOLD' };
      const slot = countFrom(rest);
      return slot === null ? null : { type: 'HOLD', slot };
    }
    case 'x': {
      const on = SPEND[rest[0] ?? ''];
      if (on === undefined) return null;
      const colour = rest.slice(1);
      if (colour === '') return { type: 'SPEND', on };
      return COLOUR.includes(colour as Colour)
        ? { type: 'SPEND', on, colour: colour as Colour }
        : null;
    }
    default:
      return null;
  }
}

export const encodeReplay = (replay: Replay): string =>
  JSON.stringify({
    v: 1,
    from: JSON.parse(encodeRun(replay.from)) as unknown,
    m: replay.moves.map(tokenFor).join(';'),
  });

/**
 * A replay off the disk, or null.
 *
 * The opening state goes back through `decodeRun` — the hardened validator a
 * resumed run already trusts — rather than through a second, thinner copy of
 * those checks written here. One decoder for one shape: a state good enough to
 * resume is exactly a state good enough to replay, and a state that is not
 * must never reach the reducer by either door.
 */
export function decodeReplay(raw: string | null): Replay | null {
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  const bag = parsed as Record<string, unknown>;
  if (bag['v'] !== 1) return null;
  if (typeof bag['m'] !== 'string') return null;

  const from = decodeRun(JSON.stringify(bag['from']));
  if (from === null) return null;

  const tokens = bag['m'] === '' ? [] : bag['m'].split(';');
  const moves: Action[] = [];
  for (const token of tokens) {
    const action = actionFrom(token);
    if (action === null) return null;
    moves.push(action);
  }
  return { from, moves };
}

/**
 * The run as it stood after `step` moves — 0 is the board it opened on.
 *
 * A fold rather than a cursor, because a player scrubbing backwards is a thing
 * a film does and a reducer cannot: there is no inverse of `reduce`. Stepping
 * forward from the opening is always correct and costs a few hundred
 * microseconds over a whole run, which is nothing next to the frame it is
 * about to be drawn into.
 *
 * Out-of-range steps clamp rather than throw: the one caller is a clock, and a
 * clock that overruns by a tick should show the last frame of the film.
 */
export function replayTo(replay: Replay, step: number): GameState {
  let state = replay.from;
  const upto = Math.max(0, Math.min(Math.trunc(step), replay.moves.length));
  for (let i = 0; i < upto; i++) {
    const action = replay.moves[i];
    if (action === undefined) break;
    state = reduce(state, action);
  }
  return state;
}
