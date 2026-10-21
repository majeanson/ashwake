import type { Action } from '../../packages/core/src/engine/state';
import { stream, type RngStream } from '../../packages/core/src/engine/rng';
import { hasMet, TEACH_IDS } from '../../packages/core/src/meta/progress';
import { summarise, type RunResult } from '../../packages/core/src/sim/run';
import type { Policy } from '../../packages/core/src/sim/policy';
import type { Strings } from '../../packages/core/src/text/Strings';
import type { Theme } from '../../packages/core/src/theme/tokens';
import { lessonName, lessonOf } from '../../packages/core/src/view/lessons';
import { mustPop, opensAt } from '../../apps/game/src/shell/teaching';
import type { JournalRow } from './grader';
import type { Decision, Quiz, Seen } from './player';
import { renderScreen, saidLines } from './screen';
import {
  apply,
  begin,
  GESTURES,
  newTable,
  offered,
  snapshot,
  type Condition,
  type Gesture,
  type GestureName,
  type Said,
  type Table,
} from './shell';

/**
 * Playing a whole run without a screen, with a player who reads.
 *
 * The shape is `sim/run.ts`'s `playRun` with one difference: `decide` is
 * asynchronous, because the player is a model. The outcomes are the sim's own
 * (`died`, `stalled`, `capped`) so the row lands in the sim's table; what a
 * stranger adds is the journal — one sentence per turn — the gestures it
 * never made of those it was offered, and the quiz at the end.
 *
 * A run is a `Session`, and one turn is `step`: plain data in, plain data
 * out, so the same loop can be driven by an SDK player in-process
 * (`playStranger`) or one command at a time from a file (`play.ts`), which is
 * how a subscription plays it — a Claude Code subagent that has never read
 * this repository, one `pnpm stranger:play turn` per gesture.
 */

/** Something that plays: a model, or a scripted policy wearing gestures. */
export type Player = {
  decide(seen: Seen, table: Table): Promise<Decision>;
  remember(said: readonly string[]): void;
  quiz(finalScreen: string): Promise<{ readonly answers: Quiz; readonly usage: Decision['usage'] }>;
};

type TurnRecord = {
  readonly turn: number;
  readonly placements: number;
  readonly said: readonly Said[];
  /** What the player read — kept for the transcript on disk, which a person reads. */
  readonly screen: string;
  readonly belief: string;
  readonly gesture: Gesture | null;
  readonly trouble: string | null;
  readonly told: readonly string[];
};

export type StrangerRun = {
  readonly condition: Condition;
  readonly seed: number;
  readonly result: RunResult;
  readonly turns: readonly TurnRecord[];
  readonly journal: readonly JournalRow[];
  /** Gestures offered at least once and never made. */
  readonly untaught: readonly GestureName[];
  readonly offeredEver: readonly GestureName[];
  readonly quiz: Quiz;
  /** What the stranger said afterwards, in its own words — the closing report a subagent hands back (`play.ts note`). */
  readonly note?: string;
  readonly usage: Decision['usage'];
};

/** A run in progress: the table, what the game last said, and the record so far. */
export type Session = {
  readonly condition: Condition;
  readonly seed: number;
  readonly table: Table;
  /** What the game said after the last gesture — the next turn's "LE JEU DIT". */
  readonly said: readonly Said[];
  readonly turns: readonly TurnRecord[];
  readonly offeredEver: readonly GestureName[];
  /** Turns in a row that changed nothing. */
  readonly idle: number;
  readonly outcome: RunResult['outcome'] | null;
  readonly usage: Decision['usage'];
};

type Options = {
  /** Hard stop, like the sim's `maxSteps`: generous enough that hitting it is a finding. */
  readonly maxTurns?: number;
  /** Turns in a row that change nothing before the run is called a stall. */
  readonly patience?: number;
  readonly onTurn?: (record: TurnRecord) => void;
};
export const DEFAULT_OPTIONS = { maxTurns: 400, patience: 8 } as const;

const NO_USAGE: Decision['usage'] = { input: 0, cached: 0, output: 0 };
const add = (a: Decision['usage'], b: Decision['usage']): Decision['usage'] => ({
  input: a.input + b.input,
  cached: a.cached + b.cached,
  output: a.output + b.output,
});

/** The concepts told so far, by the name the player read. */
const toldNames = (table: Table, s: Strings): string[] => {
  const names = new Set<string>();
  for (const id of TEACH_IDS) {
    if (!hasMet(table.progress, id)) continue;
    const lesson = lessonOf(opensAt(id).lesson);
    if (lesson !== undefined) names.add(lessonName(lesson, s));
  }
  return [...names];
};

const progressOf = (t: Table): string =>
  `${t.state.placements}/${t.state.log.harvests.length}/${t.state.points}/${t.state.tiles}/${t.state.luck}/${t.state.caravan.taken.length}`;

/** The teaching a human would carry in their head: cards and lines, not receipts. */
const remembered = (said: readonly Said[]): string[] =>
  said
    .filter(
      (x) => x.kind === 'card' || x.kind === 'toast' || x.kind === 'coach' || x.kind === 'once',
    )
    .map((x) => x.text);

export function open(condition: Condition, seed: number, s: Strings, theme: Theme): Session {
  const first = begin(newTable(condition, seed), s, theme);
  return {
    condition,
    seed,
    table: first.table,
    said: first.said,
    turns: [],
    offeredEver: [],
    idle: 0,
    outcome: null,
    usage: NO_USAGE,
  };
}

/** What the player is shown this turn: the last gesture's result, and the screen. */
export function seen(session: Session, s: Strings, theme: Theme): Seen {
  const screen = renderScreen(session.table, snapshot(session.table, s), s, theme);
  const spoken =
    session.said.length === 0 ? screen : `LE JEU DIT :\n${saidLines(session.said)}\n\n${screen}`;
  return {
    turn: session.turns.length + 1,
    result:
      session.turns.length === 0 || session.said.length === 0 ? null : saidLines(session.said),
    screen: spoken,
  };
}

/** One turn: the decision is recorded, the gesture applied, the stall and the end checked. */
export function step(
  session: Session,
  decision: Decision,
  options: Options,
  s: Strings,
  theme: Theme,
): Session {
  if (session.outcome !== null) return session;
  const turn = session.turns.length + 1;
  if (turn > (options.maxTurns ?? DEFAULT_OPTIONS.maxTurns))
    return { ...session, outcome: 'capped' };

  const snap = snapshot(session.table, s);
  const offeredNow = offered(session.table, snap);
  const record: TurnRecord = {
    turn,
    placements: session.table.state.placements,
    said: session.said,
    screen: renderScreen(session.table, snap, s, theme),
    belief: decision.belief,
    gesture: decision.gesture,
    trouble: decision.trouble,
    told: toldNames(session.table, s),
  };

  const before = progressOf(session.table);
  let table = session.table;
  let said: readonly Said[];
  if (decision.gesture === null) {
    said = [{ kind: 'refused', text: decision.trouble ?? '⟂ Aucun geste.' }];
  } else {
    const next = apply(table, decision.gesture, s, theme);
    table = next.table;
    said = next.said;
  }
  const idle = progressOf(table) === before ? session.idle + 1 : 0;
  const outcome =
    table.state.phase !== 'placing'
      ? 'died'
      : idle >= (options.patience ?? DEFAULT_OPTIONS.patience)
        ? 'stalled'
        : null;
  return {
    ...session,
    table,
    said,
    turns: [...session.turns, record],
    offeredEver: GESTURES.filter((g) => session.offeredEver.includes(g) || offeredNow.includes(g)),
    idle,
    outcome,
    usage: add(session.usage, decision.usage),
  };
}

/** The run's record, once it has an outcome and the quiz is in. */
export function finish(session: Session, quiz: Quiz, quizUsage: Decision['usage']): StrangerRun {
  const outcome = session.outcome ?? 'capped';
  return {
    condition: session.condition,
    seed: session.seed,
    result: summarise(
      session.table.state,
      `stranger:${session.condition}`,
      session.seed,
      outcome,
      session.table.steps,
    ),
    turns: session.turns,
    journal: session.turns
      .filter((t) => t.belief !== '')
      .map((t) => ({ turn: t.turn, placements: t.placements, told: t.told, belief: t.belief })),
    untaught: session.offeredEver.filter((g) => !session.table.used.has(g)),
    offeredEver: session.offeredEver,
    quiz,
    usage: add(session.usage, quizUsage),
  };
}

export async function playStranger(
  condition: Condition,
  seed: number,
  player: Player,
  s: Strings,
  theme: Theme,
  options: Options = {},
): Promise<StrangerRun> {
  let session = open(condition, seed, s, theme);
  while (session.outcome === null) {
    const decision = await player.decide(seen(session, s, theme), session.table);
    session = step(session, decision, options, s, theme);
    const last = session.turns[session.turns.length - 1];
    if (last !== undefined) options.onTurn?.(last);
    player.remember(remembered(session.said));
  }
  const quizzed = await player.quiz(seen(session, s, theme).screen);
  return finish(session, quizzed.answers, quizzed.usage);
}

/**
 * A scripted policy wearing gestures — the sim's players, put through the
 * shell's door. Proves the harness with no model and no cost: a policy that
 * plays to the end through `apply` is a shell that refuses nothing legal.
 *
 * One thing a policy does not know is the walk's gate: while the first pocket
 * waits, the shell refuses a placement (`mustPop`), and a policy that keeps
 * placing would stall where a thumb cannot. So it pops when the phone would
 * let it do nothing else — which also means its run is NOT the sim's run of
 * the same policy, and the test does not claim it is.
 */
export function scripted(policy: Policy, seed: number, s: Strings): Player {
  let dice: RngStream = stream((seed ^ 0x51ed270b) | 0);
  return {
    decide(_seen, table): Promise<Decision> {
      const snap = snapshot(table, s);
      const gated = mustPop(
        { board: snap.board, hud: snap.hud, placed: snap.hud.placements > 0 },
        table.progress,
      );
      if (gated) {
        return Promise.resolve({
          belief: '',
          gesture: { name: 'recolter', choice: 'tiles', hex: null },
          trouble: null,
          usage: NO_USAGE,
        });
      }
      const [move, next] = policy.decide(table.state, dice);
      dice = next;
      const gesture = gestureOf(move);
      return Promise.resolve({
        belief: '',
        gesture,
        trouble:
          gesture === null
            ? move.length === 0
              ? 'policy had no move'
              : `no gesture for ${move.map((a) => a.type).join('+')}`
            : null,
        usage: NO_USAGE,
      });
    },
    remember() {},
    quiz: () => Promise.resolve({ answers: {}, usage: NO_USAGE }),
  };
}

/** A policy's move as one gesture, where one gesture is what it is. */
function gestureOf(move: readonly Action[]): Gesture | null {
  const [a, b] = move;
  if (a === undefined) return null;
  if (a.type === 'SELECT' && b?.type === 'PLACE')
    return { name: 'poser', index: a.index, hex: b.hex };
  if (a.type === 'HARVEST') return { name: 'recolter', choice: a.choice, hex: a.at ?? null };
  if (a.type === 'HOLD') return { name: 'garder' };
  if (a.type === 'SPEND') return { name: 'depenser', on: a.on, colour: a.colour ?? null };
  if (a.type === 'CARAVAN') return { name: 'caravane', pick: a.pick };
  return null;
}
