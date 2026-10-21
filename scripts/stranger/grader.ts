import Anthropic from '@anthropic-ai/sdk';
import { TUNING } from '../../packages/core/src/content/tuning';
import type { Strings } from '../../packages/core/src/text/Strings';
import type { Theme } from '../../packages/core/src/theme/tokens';
import {
  LESSONS,
  lessonDefine,
  lessonDetail,
  lessonName,
} from '../../packages/core/src/view/lessons';
import type { Quiz } from './player';
import { GRADER } from './prompts';

/** One turn of the journal as the grader reads it. */
export type JournalRow = {
  readonly turn: number;
  readonly placements: number;
  /** The concepts the game had told by this turn, by printed name. */
  readonly told: readonly string[];
  readonly belief: string;
};

type Confusion = {
  readonly turn: number;
  readonly lesson: string;
  readonly belief: string;
  readonly why: string;
};
type QuizMark = {
  readonly lesson: string;
  readonly verdict: 'juste' | 'faux' | 'ne sait pas';
  readonly why: string;
};
export type Verdict = {
  readonly confusions: readonly Confusion[];
  readonly quiz: readonly QuizMark[];
};

/** The official definitions, one per concept, as the manual prints them. */
const definitions = (
  theme: Theme,
  s: Strings,
): readonly { readonly id: string; readonly name: string; readonly text: string }[] =>
  LESSONS.map((l) => ({
    id: l.id,
    name: lessonName(l, s),
    text: [lessonDefine(l, TUNING, theme, s), ...lessonDetail(l, TUNING, theme, s)].join(' '),
  }));

export async function grade(
  model: string,
  journal: readonly JournalRow[],
  quiz: Quiz,
  theme: Theme,
  s: Strings,
  client: Anthropic = new Anthropic(),
): Promise<{ readonly verdict: Verdict; readonly usage: { input: number; output: number } }> {
  const defs = definitions(theme, s);
  const tool: Anthropic.Tool = {
    name: 'verdict',
    description: 'Les confusions relevées et la correction du quiz.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        confusions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              turn: { type: 'integer' },
              lesson: { type: 'string', description: 'Le nom du concept contredit.' },
              belief: { type: 'string', description: 'La phrase du joueur, telle quelle.' },
              why: {
                type: 'string',
                description: 'En quoi elle contredit la définition, en une ligne.',
              },
            },
            required: ['turn', 'lesson', 'belief', 'why'],
            additionalProperties: false,
          },
        },
        quiz: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              lesson: { type: 'string' },
              verdict: { type: 'string', enum: ['juste', 'faux', 'ne sait pas'] },
              why: { type: 'string' },
            },
            required: ['lesson', 'verdict', 'why'],
            additionalProperties: false,
          },
        },
      },
      required: ['confusions', 'quiz'],
      additionalProperties: false,
    },
  };
  const text = [
    `DÉFINITIONS OFFICIELLES :`,
    ...defs.map((d) => `- ${d.name} : ${d.text}`),
    ``,
    `JOURNAL :`,
    ...journal.map(
      (r) =>
        `- tour ${r.turn} (${r.placements} poses; déjà enseigné : ${r.told.length === 0 ? 'rien' : r.told.join(', ')}) : « ${r.belief} »`,
    ),
    ``,
    `QUIZ :`,
    ...defs.map((d) => `- ${d.name} : « ${quiz[d.id] ?? ''} »`),
  ].join('\n');
  const response = await client.messages.create({
    model,
    max_tokens: 8000,
    system: GRADER,
    tools: [tool],
    output_config: { effort: 'low' },
    messages: [{ role: 'user', content: text }],
  });
  const call = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
  const verdict = (call?.input ?? { confusions: [], quiz: [] }) as Verdict;
  return {
    verdict: { confusions: verdict.confusions ?? [], quiz: verdict.quiz ?? [] },
    usage: { input: response.usage.input_tokens, output: response.usage.output_tokens },
  };
}
