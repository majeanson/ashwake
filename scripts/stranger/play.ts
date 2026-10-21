import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { stringsFor } from '../../packages/core/src/text/index';
import { SETTLEMENT } from '../../packages/core/src/theme/themes/settlement';
import { LESSONS, lessonName } from '../../packages/core/src/view/lessons';
import { toGesture } from './gestures';
import type { Quiz } from './player';
import { DEFAULT_OPTIONS, finish, open, seen, step, type Session, type StrangerRun } from './run';
import type { OnceId } from '../../apps/game/src/shell/onceARun';
import { CONDITIONS, type Condition, type GestureName, type Table } from './shell';

/**
 * `pnpm stranger:play` — the harness one turn at a time, from a file.
 *
 * A subscription has no API key, so the player cannot be an SDK call; it is a
 * Claude Code subagent that has never read this repository, running these
 * commands and nothing else. The session lives in a JSON file between turns.
 *
 *   pnpm stranger:play new  <file> --condition drip --seed 1
 *   pnpm stranger:play show <file>
 *   pnpm stranger:play turn <file> --belief "…" --gesture "poser 0 1,0"
 *   pnpm stranger:play quiz <file> --answer ripe "…" --answer pop "…" …
 *
 * The gesture grammar is the GESTES line's, one word per argument:
 *   poser <index> <hex> · recolter <tuiles|points> [hex] · toucher <hex> ·
 *   garder · annuler · bourse · depenser <repiocher|orienter|forger|sacrifier>
 *   [couleur] · caravane <n> · stat <tuiles|points|cout|chance|portee|reste> ·
 *   manuel [sujet]
 *
 * `pnpm stranger --from <dir>` turns a folder of finished files into
 * `STRANGER.md`.
 */

const s = stringsFor('fr-CA');
const theme = SETTLEMENT;

/** The file: the session (sets as arrays), and the run once it is finished. */
type Saved = {
  readonly session: Omit<Session, 'table'> & {
    readonly table: Omit<Table, 'saidOnce' | 'used'> & {
      readonly saidOnce: readonly string[];
      readonly used: readonly string[];
    };
  };
  readonly run?: StrangerRun;
};

export const encode = (session: Session, run?: StrangerRun): string =>
  JSON.stringify(
    {
      session: {
        ...session,
        table: {
          ...session.table,
          saidOnce: [...session.table.saidOnce],
          used: [...session.table.used],
        },
      },
      ...(run === undefined ? {} : { run }),
    } satisfies Saved,
    null,
    2,
  );

export function decode(raw: string): { session: Session; run: StrangerRun | undefined } {
  const saved = JSON.parse(raw) as Saved;
  const table = saved.session.table;
  return {
    session: {
      ...saved.session,
      table: {
        ...table,
        saidOnce: new Set(table.saidOnce as OnceId[]),
        used: new Set(table.used as GestureName[]),
      },
    },
    run: saved.run,
  };
}

/** The GESTES line's grammar, as a tool call. */
export function parseGesture(text: string): { name: string; input: Record<string, unknown> } {
  const [name = '', ...rest] = text.trim().split(/\s+/);
  switch (name) {
    case 'poser':
      return { name, input: { index: Number(rest[0]), hex: rest[1] ?? '' } };
    case 'recolter':
      // One button under the single payout: `recolter [hex]`. The fork's
      // words still parse (`recolter points 1,0`) for an economy that has it.
      return /^-?\d+,-?\d+$/.test(rest[0] ?? '')
        ? { name, input: { choix: 'tuiles', hex: rest[0] } }
        : { name, input: { choix: rest[0] ?? 'tuiles', hex: rest[1] ?? '' } };
    case 'toucher':
      return { name, input: { hex: rest[0] ?? '' } };
    case 'depenser':
      return { name, input: { quoi: rest[0] ?? '', couleur: rest.slice(1).join(' ') } };
    case 'caravane':
      return { name, input: { choix: Number(rest[0]) } };
    case 'stat':
      return { name, input: { quoi: rest[0] ?? '' } };
    case 'manuel':
      return { name, input: { sujet: rest.join(' ') } };
    default:
      return { name, input: {} };
  }
}

function flag(argv: readonly string[], name: string): string | null {
  const i = argv.indexOf(name);
  const v = argv[i + 1];
  return i < 0 || v === undefined ? null : v;
}

function flags(argv: readonly string[], name: string): [string, string][] {
  const out: [string, string][] = [];
  argv.forEach((a, i) => {
    const k = argv[i + 1];
    const v = argv[i + 2];
    if (a === name && k !== undefined && v !== undefined) out.push([k, v]);
  });
  return out;
}

const load = (file: string): { session: Session; run: StrangerRun | undefined } => {
  if (!existsSync(file)) throw new Error(`no such file: ${file}`);
  return decode(readFileSync(file, 'utf8'));
};

const save = (file: string, session: Session, run?: StrangerRun): void => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, encode(session, run));
};

const QUIZ_IDS = LESSONS.map((l) => l.id);

/** What the player reads after a turn: the screen, or the end and the quiz to answer. */
function show(session: Session): string {
  const shown = seen(session, s, theme).screen;
  if (session.outcome === null) return shown;
  const names = LESSONS.map((l) => `${l.id} (${lessonName(l, s)})`).join(', ');
  return `${shown}\n\nLA PARTIE EST FINIE (${session.outcome}). Réponds maintenant au quiz, une phrase par concept, avec :\n  pnpm stranger:play quiz <fichier> --answer <id> "…" (répété pour chaque id)\nLes ids : ${names}.`;
}

function main(argv: readonly string[]): string {
  const [command, file] = argv;
  if (command === undefined || file === undefined) {
    throw new Error('usage: pnpm stranger:play <new|show|turn|quiz|note> <file> [flags]');
  }
  switch (command) {
    case 'note': {
      // The stranger's closing report, kept with its run so the report can
      // print it (Marc, 2026-10-21: "if your agents have any comments or
      // improvements or suggestions list them and note them too").
      const { session, run } = load(file);
      if (run === undefined) throw new Error('the run is not finished and quizzed yet');
      const from = flag(argv, '--from');
      const text = from === null ? flag(argv, '--text') : readFileSync(from, 'utf8');
      if (text === null) throw new Error('note wants --from <textfile> or --text "…"');
      save(file, session, { ...run, note: text.trim() });
      return 'Note enregistrée.';
    }
    case 'new': {
      const condition = flag(argv, '--condition') ?? 'drip';
      const seed = Number(flag(argv, '--seed') ?? '1');
      if (!(CONDITIONS as readonly string[]).includes(condition))
        throw new Error(`no such condition "${condition}"`);
      if (!Number.isInteger(seed) || seed < 1) throw new Error('--seed wants a positive integer');
      if (existsSync(file)) throw new Error(`${file} exists already`);
      const session = open(condition as Condition, seed, s, theme);
      save(file, session);
      return show(session);
    }
    case 'show':
      return show(load(file).session);
    case 'turn': {
      const { session, run } = load(file);
      if (run !== undefined) throw new Error('this run is finished and quizzed');
      const belief = flag(argv, '--belief') ?? '';
      const gesture = flag(argv, '--gesture');
      if (gesture === null) throw new Error('turn wants --gesture "…"');
      const parsed = parseGesture(gesture);
      const read = toGesture(parsed.name, parsed.input, theme, s);
      const decision =
        'error' in read
          ? {
              belief,
              gesture: null,
              trouble: read.error,
              usage: { input: 0, cached: 0, output: 0 },
            }
          : { belief, gesture: read, trouble: null, usage: { input: 0, cached: 0, output: 0 } };
      const next = step(session, decision, DEFAULT_OPTIONS, s, theme);
      save(file, next);
      return show(next);
    }
    case 'quiz': {
      const { session, run } = load(file);
      if (run !== undefined) throw new Error('this run is finished and quizzed');
      if (session.outcome === null) throw new Error('the run is not over yet');
      const answers: Record<string, string> = Object.fromEntries(QUIZ_IDS.map((id) => [id, '']));
      for (const [id, text] of flags(argv, '--answer')) {
        if (!(id in answers))
          throw new Error(`no such concept "${id}"; the ids are ${QUIZ_IDS.join(', ')}`);
        answers[id] = text;
      }
      const quiz: Quiz = answers;
      const finished = finish(session, quiz, { input: 0, cached: 0, output: 0 });
      save(file, session, finished);
      return `Merci. La partie est enregistrée : ${finished.result.outcome}, ${finished.result.points} pts, ${finished.result.placements} poses, ${finished.result.harvests} récoltes, ${finished.turns.length} tours.`;
    }
    default:
      throw new Error(`no such command "${command}"`);
  }
}

if (process.argv[1] !== undefined && /play\.ts$/.test(process.argv[1])) {
  try {
    console.log(main(process.argv.slice(2)));
  } catch (e: unknown) {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  }
}
