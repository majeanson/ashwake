import { summarise, table } from '../../packages/core/src/sim/report';
import type { RunResult } from '../../packages/core/src/sim/run';
import type { Verdict } from './grader';
import type { Condition, GestureName } from './shell';
import type { StrangerRun } from './run';

/**
 * STRANGER.md — one report, in the sim's own table so the stranger's row
 * reads beside the policies'. Like `SWEEP.md`, the header says what it walked
 * and what it could not see, so a partial run cannot pass as the record.
 */

export type Graded = StrangerRun & { readonly verdict: Verdict | null };

type ReportInput = {
  readonly date: string;
  readonly model: string;
  readonly grader: string | null;
  readonly seeds: number;
  readonly window: number;
  readonly conditions: readonly Condition[];
  readonly runs: readonly Graded[];
  readonly floorCeiling: readonly {
    readonly policy: string;
    readonly runs: readonly RunResult[];
  }[];
  readonly dry: boolean;
  /** Played one turn at a time from a file (`play.ts`): no window, no API, a subagent. */
  readonly byHand: boolean;
};

const CONDITION_NOTE: Readonly<Record<Condition, string>> = {
  drip: 'the cards, lines and coach at their moments, as the phone delivers them',
  ask: 'the drip, plus the manual on demand (`manuel`)',
  flood: 'the story, the goal and the whole manual before the first tile; nothing after',
  silent: 'the board, the receipts and the taps’ answers; the game never speaks first',
};

const by = <T>(xs: readonly T[], key: (x: T) => string): Map<string, T[]> => {
  const out = new Map<string, T[]>();
  for (const x of xs) out.set(key(x), [...(out.get(key(x)) ?? []), x]);
  return out;
};

export function report(input: ReportInput): string {
  const lines: string[] = [];
  const runsBy = by(input.runs, (r) => r.condition);
  lines.push(
    `# STRANGER.md — a reader who meets the lessons as the game delivers them`,
    ``,
    `Written by \`pnpm stranger\`. **Do not edit by hand** — regenerate it.`,
    ``,
    `${input.date}. ${input.dry ? '**A dry run**: the scripted `bank20` policy wearing gestures, no model, no cost — this proves the harness, not the teaching.' : `The stranger is ${input.model}${input.grader === null ? '' : `, graded by ${input.grader}`}.`} ${input.conditions.length} condition(s) × ${input.seeds} seed(s), seeds 1–${input.seeds}, the first-run economy (\`shell/economy.ts\`, \`home\`, nothing earned). ${
      input.byHand
        ? 'Played one turn at a time with `pnpm stranger:play`: the player is a Claude Code subagent that was told never to read this repository and whose transcript shows only those commands; its memory is its own context, every screen and every line the game said, whole.'
        : `The stranger keeps the last ${input.window} turns verbatim, every card and line the game has said as a journal, and its own last five sentences.`
    }`,
    ``,
    `**What it cannot see:** the pictures on the cards (their captions are given), the glow on a legal edge (given as a list), the ripe ring (an asterisk), a lit cue (nothing), and the camera. It reads perfectly and never gets bored; it never mis-taps, so it has nothing to undo, and it rarely explores — \`annuler\` and \`toucher\` going unused says little about the game (2026-10-21, Marc’s ruling). This measures the words and their timing, not the screen — the screen is Session C’s (\`PLAYTEST.md\`).`,
    ``,
    `## The table`,
    ``,
    `The sim’s own columns (\`sim/report.ts\`), the stranger’s rows beside the scripted floor and ceiling on the same seeds and economy.`,
    ``,
    '```',
    table([
      ...input.floorCeiling.map((f) => summarise(f.policy, f.runs)),
      ...input.conditions
        .filter((c) => runsBy.has(c))
        .map((c) =>
          summarise(
            `stranger:${c}`,
            (runsBy.get(c) ?? []).map((r) => r.result),
          ),
        ),
    ]),
    '```',
    ``,
    `stalled/capped on a stranger row is the player, not a rule: a stall is ${'eight'} turns in a row that changed nothing.`,
    ``,
  );

  for (const condition of input.conditions) {
    const runs = runsBy.get(condition) ?? [];
    if (runs.length === 0) continue;
    lines.push(`## ${condition} — ${CONDITION_NOTE[condition]}`, ``);

    // Untaught: offered and never used, across the condition's runs.
    const everOffered = new Set<GestureName>();
    const everUsed = new Set<GestureName>();
    for (const r of runs) {
      for (const g of r.offeredEver) everOffered.add(g);
      for (const g of r.offeredEver) if (!r.untaught.includes(g)) everUsed.add(g);
    }
    const untaught = [...everOffered].filter((g) => !everUsed.has(g));
    const perRun = runs.map(
      (r) => `seed ${r.seed}: ${r.untaught.length === 0 ? '—' : r.untaught.join(', ')}`,
    );
    lines.push(
      `### Untaught — offered, never made`,
      ``,
      `In every run: ${untaught.length === 0 ? '_nothing_' : `**${untaught.join(', ')}**`}. Per run: ${perRun.join(' · ')}.`,
      ``,
    );

    const confusions = runs.flatMap((r) =>
      (r.verdict?.confusions ?? []).map((c) => ({ seed: r.seed, ...c })),
    );
    lines.push(`### Confusions — a belief that contradicts a lesson already told`, ``);
    if (input.dry) lines.push(`_Not graded on a dry run._`, ``);
    else if (confusions.length === 0) lines.push(`_None found._`, ``);
    else {
      for (const c of confusions) {
        lines.push(`- seed ${c.seed}, turn ${c.turn}, **${c.lesson}**: « ${c.belief} » — ${c.why}`);
      }
      lines.push(``);
    }

    lines.push(`### Quiz — one sentence per concept, after the run`, ``);
    for (const r of runs) {
      const marks = new Map((r.verdict?.quiz ?? []).map((q) => [q.lesson, q]));
      const entries = Object.entries(r.quiz);
      if (entries.length === 0) continue;
      lines.push(
        `seed ${r.seed} (${r.result.outcome}, ${r.result.points} pts, ${r.result.placements} places, ${r.result.harvests} harvests):`,
        ``,
      );
      for (const [id, answer] of entries) {
        const mark =
          [...marks.values()].find((m) => m.lesson.toUpperCase() === id.toUpperCase()) ??
          marks.get(id);
        lines.push(
          `- ${id}: « ${answer} »${mark === undefined ? '' : ` — **${mark.verdict}**${mark.why === '' ? '' : ` (${mark.why})`}`}`,
        );
      }
      lines.push(``);
    }

    lines.push(`### The journal — the first sentences, and the last`, ``);
    for (const r of runs) {
      const rows = r.journal;
      if (rows.length === 0) continue;
      const head = rows.slice(0, 12);
      const tail = rows.length > 15 ? rows.slice(-3) : rows.slice(12);
      lines.push(`seed ${r.seed}:`, ``);
      for (const row of head) lines.push(`- t${row.turn} (${row.placements} poses): ${row.belief}`);
      if (rows.length > 15) lines.push(`- …`);
      for (const row of tail) lines.push(`- t${row.turn} (${row.placements} poses): ${row.belief}`);
      lines.push(``);
    }

    // The closing reports, verbatim: what each stranger said it understood,
    // and where it was most lost — its suggestions, in its own words.
    const noted = runs.filter((r) => r.note !== undefined && r.note !== '');
    if (noted.length > 0) {
      lines.push(`### What the stranger said afterwards — verbatim`, ``);
      for (const r of noted) {
        lines.push(`seed ${r.seed}:`, ``);
        for (const line of (r.note ?? '').split('\n')) lines.push(`> ${line}`);
        lines.push(``);
      }
    }
  }

  const tokens = input.runs.reduce(
    (n, r) => ({
      input: n.input + r.usage.input,
      cached: n.cached + r.usage.cached,
      output: n.output + r.usage.output,
    }),
    { input: 0, cached: 0, output: 0 },
  );
  lines.push(
    `## Cost`,
    ``,
    `Stranger tokens: ${tokens.input} in (${tokens.cached} read from cache), ${tokens.output} out. Transcripts in \`scripts/stranger/runs/\` (not committed).`,
    ``,
  );
  return lines.join('\n');
}
