import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { TUNING } from '../../packages/core/src/content/tuning';
import { policyByName } from '../../packages/core/src/sim/policy';
import { playMany } from '../../packages/core/src/sim/run';
import { stringsFor } from '../../packages/core/src/text/index';
import { SETTLEMENT } from '../../packages/core/src/theme/themes/settlement';
import { grade, type Verdict } from './grader';
import { decode } from './play';
import { Stranger } from './player';
import { systemPrompt } from './prompts';
import { report, type Graded } from './report';
import { DEFAULT_OPTIONS, playStranger, scripted, type Player } from './run';
import { CONDITIONS, newTable, wholeManual, type Condition } from './shell';

/**
 * `pnpm stranger` — an LLM plays the first run as a stranger would, and the
 * report says what the words taught.
 *
 *   pnpm stranger                              5 seeds × 4 conditions, Haiku
 *   pnpm stranger --seeds 20 --conditions drip,ask
 *   pnpm stranger --model claude-sonnet-5-5    a smarter reader
 *   pnpm stranger --dry                        the scripted bank20 policy through the
 *                                              shell: proves the harness, costs nothing
 *   pnpm stranger --no-grade                   skip the grader (confusions, quiz marks)
 *   pnpm stranger --max-turns 400 --patience 8 the hard stop, and the stall threshold
 *   pnpm stranger --from scripts/stranger/runs/<dir>
 *                                              the report from runs played one turn at a
 *                                              time (`play.ts`), no key needed; a
 *                                              `<name>.verdict.json` beside a run is its
 *                                              grading
 *
 * The key comes from ANTHROPIC_API_KEY, or from `.env.local` at the repo root
 * (`*.local` is ignored by git). Never from anywhere else.
 */

const ROOT = join(import.meta.dirname, '..', '..');
const FLOOR_CEILING = ['random-legal', 'blind', 'bank20'] as const;

type Args = {
  seeds: number;
  conditions: Condition[];
  model: string;
  grader: string | null;
  window: number;
  maxTurns: number;
  patience: number;
  dry: boolean;
  from: string | null;
  out: string;
};

function parseArgs(argv: readonly string[]): Args {
  const args: Args = {
    seeds: 5,
    conditions: [...CONDITIONS],
    model: 'claude-haiku-5-5',
    grader: 'claude-opus-5-5',
    window: 6,
    maxTurns: DEFAULT_OPTIONS.maxTurns,
    patience: DEFAULT_OPTIONS.patience,
    dry: false,
    from: null,
    out: join(ROOT, 'STRANGER.md'),
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    const next = (): string => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${a} wants a value`);
      return v;
    };
    if (a === '--seeds') args.seeds = Number(next());
    else if (a === '--conditions') {
      args.conditions = next()
        .split(',')
        .map((c) => {
          if (!(CONDITIONS as readonly string[]).includes(c))
            throw new Error(`no such condition "${c}"`);
          return c as Condition;
        });
    } else if (a === '--model') args.model = next();
    else if (a === '--grader') args.grader = next();
    else if (a === '--no-grade') args.grader = null;
    else if (a === '--window') args.window = Number(next());
    else if (a === '--max-turns') args.maxTurns = Number(next());
    else if (a === '--patience') args.patience = Number(next());
    else if (a === '--dry') args.dry = true;
    else if (a === '--from') args.from = next();
    else if (a === '--out') args.out = next();
    else throw new Error(`unknown argument "${a}"`);
  }
  if (!Number.isInteger(args.seeds) || args.seeds < 1)
    throw new Error('--seeds wants a positive integer');
  return args;
}

/** ANTHROPIC_API_KEY from the environment, else from `.env.local`. */
function loadKey(): void {
  if (process.env['ANTHROPIC_API_KEY'] !== undefined) return;
  const file = join(ROOT, '.env.local');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*ANTHROPIC_API_KEY\s*=\s*"?([^"\s]+)"?\s*$/.exec(line);
    if (m !== null) process.env['ANTHROPIC_API_KEY'] = m[1];
  }
}

const stamp = (): string => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

/** The floor and the ceiling: scripted policies on the same seeds and economy. */
function floorAndCeiling(seeds: number) {
  const economy = newTable('drip', 1).state.tuning;
  return {
    same: JSON.stringify(economy) === JSON.stringify(TUNING),
    economy,
    rows: FLOOR_CEILING.map((name) => {
      const policy = policyByName(name);
      if (policy === undefined) throw new Error(`no policy "${name}"`);
      return { policy: name, runs: playMany(policy, seeds, { tuning: economy }) };
    }),
  };
}

/** Runs played one turn at a time, finished and quizzed, with their hand-written verdicts. */
function fromFolder(dir: string): Graded[] {
  const out: Graded[] = [];
  for (const name of readdirSync(dir).filter(
    (f) => f.endsWith('.json') && !f.endsWith('.verdict.json'),
  )) {
    const { run } = decode(readFileSync(join(dir, name), 'utf8'));
    if (run === undefined) {
      console.warn(`skipping ${name}: not finished`);
      continue;
    }
    const verdictFile = join(dir, name.replace(/\.json$/, '.verdict.json'));
    const verdict = existsSync(verdictFile)
      ? (JSON.parse(readFileSync(verdictFile, 'utf8')) as Verdict)
      : null;
    out.push({ ...run, verdict });
  }
  if (out.length === 0) throw new Error(`no finished runs in ${dir}`);
  return out;
}

function write(
  args: Args,
  graded: Graded[],
  seeds: number,
  model: string,
  grader: string | null,
  where: string,
): void {
  const { same, rows } = floorAndCeiling(seeds);
  const conditions = args.conditions.filter((c) => graded.some((g) => g.condition === c));
  const text = report({
    date: new Date().toISOString().slice(0, 10),
    model,
    grader,
    seeds,
    window: args.window,
    conditions,
    runs: graded.sort((a, b) => a.condition.localeCompare(b.condition) || a.seed - b.seed),
    floorCeiling: rows,
    dry: args.dry,
    byHand: args.from !== null,
  });
  writeFileSync(
    args.out,
    `${text}${same ? '' : '\n\n**Warning:** the first-run economy is not `TUNING`; the floor and ceiling rows were played under the first-run economy.\n'}`,
  );
  console.log(`\nwrote ${args.out} from ${graded.length} run(s) (${where})`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const s = stringsFor('fr-CA');
  const theme = SETTLEMENT;

  if (args.from !== null) {
    const graded = fromFolder(args.from);
    const seeds = Math.max(...graded.map((g) => g.seed));
    write(
      args,
      graded,
      seeds,
      'a Claude Code subagent (Haiku) on the subscription, one `pnpm stranger:play` per turn',
      graded.some((g) => g.verdict !== null) ? 'Claude Code, by hand, against the manual' : null,
      args.from,
    );
    return;
  }

  if (!args.dry) {
    loadKey();
    if (process.env['ANTHROPIC_API_KEY'] === undefined) {
      throw new Error(
        'No ANTHROPIC_API_KEY in the environment or in .env.local — pass --dry, or play with `pnpm stranger:play` and report with --from.',
      );
    }
  }

  const { economy } = floorAndCeiling(args.seeds);
  const runsDir = join(ROOT, 'scripts', 'stranger', 'runs', stamp());
  mkdirSync(runsDir, { recursive: true });
  const manual = wholeManual(economy, theme, s);

  const graded: Graded[] = [];
  const one = async (condition: Condition, seed: number): Promise<void> => {
    const player: Player = args.dry
      ? scripted(policyByName('bank20')!, seed, s)
      : new Stranger(
          args.model,
          systemPrompt(condition, condition === 'flood' ? manual : null),
          args.window,
          theme,
          s,
        );
    const run = await playStranger(condition, seed, player, s, theme, {
      maxTurns: args.maxTurns,
      patience: args.patience,
      onTurn: (t) => {
        if (!args.dry)
          process.stdout.write(
            `  ${condition} #${seed} t${t.turn}: ${t.belief.slice(0, 90)}${t.gesture === null ? ` [${t.trouble ?? '?'}]` : ` → ${t.gesture.name}`}\n`,
          );
      },
    });
    let verdict = null;
    if (!args.dry && args.grader !== null) {
      verdict = (await grade(args.grader, run.journal, run.quiz, theme, s)).verdict;
    }
    const g: Graded = { ...run, verdict };
    graded.push(g);
    writeFileSync(join(runsDir, `${condition}-${seed}.json`), JSON.stringify(g, null, 2));
    console.log(
      `${condition} #${seed}: ${run.result.outcome}, ${run.result.points} pts, ${run.result.placements} places, ${run.result.harvests} harvests, ${run.turns.length} turns`,
    );
  };

  // Conditions side by side, seeds one after another within each.
  await Promise.all(
    args.conditions.map(async (condition) => {
      for (let seed = 1; seed <= args.seeds; seed++) await one(condition, seed);
    }),
  );

  write(args, graded, args.seeds, args.model, args.grader, runsDir);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
