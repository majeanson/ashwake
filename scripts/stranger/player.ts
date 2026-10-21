import Anthropic from '@anthropic-ai/sdk';
import type { Strings } from '../../packages/core/src/text/Strings';
import type { Theme } from '../../packages/core/src/theme/tokens';
import { LESSONS, lessonName } from '../../packages/core/src/view/lessons';
import { toGesture, toolsFor } from './gestures';
import { NUDGE, QUIZ } from './prompts';
import type { Gesture } from './shell';

/**
 * A turn as the player sees it: what it got back for its last gesture, what
 * the game said, and the screen.
 */
export type Seen = {
  readonly turn: number;
  /** The result of the previous gesture, as the tool's own result. */
  readonly result: string | null;
  readonly screen: string;
};

export type Decision = {
  readonly belief: string;
  readonly gesture: Gesture | null;
  /** Why there is no gesture: the model said nothing, or its call did not parse. */
  readonly trouble: string | null;
  readonly usage: { readonly input: number; readonly cached: number; readonly output: number };
};

export type Quiz = Readonly<Record<string, string>>;

/**
 * One stranger: a model, the one prompt it was given, and what it remembers.
 *
 * A phone shows the player one screen; a human keeps the rest in their head.
 * This player keeps a WINDOW of recent turns verbatim, every sentence the game
 * has said so far as a journal (the teaching a human would remember roughly —
 * this one remembers it exactly, which the report states), and its own last
 * few sentences, so a belief can build on the one before. The window bounds
 * each request; the system prompt and the tools sit in front and are cached.
 */
export class Stranger {
  private readonly client: Anthropic;
  private readonly tools: Anthropic.Tool[];
  private readonly history: {
    readonly user: Anthropic.ContentBlockParam[];
    readonly assistant: Anthropic.ContentBlock[];
  }[] = [];
  private readonly journal: string[] = [];
  private readonly beliefs: string[] = [];

  constructor(
    private readonly model: string,
    private readonly system: string,
    private readonly window: number,
    private readonly theme: Theme,
    private readonly s: Strings,
    client?: Anthropic,
  ) {
    this.client = client ?? new Anthropic();
    this.tools = toolsFor(theme, s);
  }

  /** What the game has said, kept for the next request's journal. */
  remember(saidToPlayer: readonly string[]): void {
    this.journal.push(...saidToPlayer);
  }

  private userContent(seen: Seen): Anthropic.ContentBlockParam[] {
    const last = this.history[this.history.length - 1];
    const toolUse = last?.assistant.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    const blocks: Anthropic.ContentBlockParam[] = [];
    if (toolUse !== undefined) {
      blocks.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: seen.result ?? '(fait)',
      });
    }
    const memory: string[] = [];
    if (this.journal.length > 0) {
      memory.push(
        `CE QUE LE JEU T’A DIT JUSQU’ICI, DANS L’ORDRE :\n- ${this.journal.join('\n- ')}`,
      );
    }
    if (this.beliefs.length > 0) {
      memory.push(`TES DERNIÈRES PHRASES :\n- ${this.beliefs.slice(-5).join('\n- ')}`);
    }
    blocks.push({
      type: 'text',
      text: `${memory.length === 0 ? '' : `${memory.join('\n\n')}\n\n`}TOUR ${seen.turn}\n${seen.screen}`,
    });
    return blocks;
  }

  private messages(current: Anthropic.ContentBlockParam[]): Anthropic.MessageParam[] {
    const kept = this.history.slice(-this.window);
    const out: Anthropic.MessageParam[] = [];
    kept.forEach((pair, i) => {
      // The oldest kept turn's result answers a call that is no longer in the
      // window, so it goes in as plain text.
      const user =
        i === 0
          ? pair.user.map((b): Anthropic.ContentBlockParam =>
              b.type === 'tool_result'
                ? {
                    type: 'text',
                    text: `(résultat du geste précédent) ${typeof b.content === 'string' ? b.content : ''}`,
                  }
                : b,
            )
          : pair.user;
      out.push({ role: 'user', content: user });
      out.push({ role: 'assistant', content: pair.assistant });
    });
    out.push({ role: 'user', content: current });
    return out;
  }

  private async ask(messages: Anthropic.MessageParam[]): Promise<Anthropic.Message> {
    return this.client.messages.create({
      model: this.model,
      max_tokens: 600,
      system: [{ type: 'text', text: this.system, cache_control: { type: 'ephemeral' } }],
      tools: this.tools,
      output_config: { effort: 'low' },
      messages,
    });
  }

  async decide(seen: Seen): Promise<Decision> {
    const current = this.userContent(seen);
    let response = await this.ask(this.messages(current));
    let usage = usageOf(response);
    let content = response.content;
    // No gesture: one nudge, then it is the player's stall, not the harness's.
    if (response.stop_reason !== 'refusal' && !content.some((b) => b.type === 'tool_use')) {
      const nudged = [
        ...this.messages(current),
        { role: 'assistant' as const, content: content.length === 0 ? '…' : content },
        { role: 'user' as const, content: NUDGE },
      ];
      response = await this.ask(nudged);
      usage = add(usage, usageOf(response));
      content = [...content.filter((b) => b.type === 'text'), ...response.content];
    }
    const belief = content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text.trim())
      .filter((t) => t !== '')
      .join(' ');
    const call = content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    this.history.push({ user: current, assistant: content });
    if (belief !== '') this.beliefs.push(belief);
    if (response.stop_reason === 'refusal') {
      return {
        belief,
        gesture: null,
        trouble: `refusal: ${response.stop_details?.category ?? '?'}`,
        usage,
      };
    }
    if (call === undefined) return { belief, gesture: null, trouble: 'no gesture', usage };
    const gesture = toGesture(call.name, call.input, this.theme, this.s);
    return 'error' in gesture
      ? { belief, gesture: null, trouble: gesture.error, usage }
      : { belief, gesture, trouble: null, usage };
  }

  /** The end-of-run quiz: one sentence per concept the manual names. */
  async quiz(
    finalScreen: string,
  ): Promise<{ readonly answers: Quiz; readonly usage: Decision['usage'] }> {
    const concepts = LESSONS.map((l) => ({ id: l.id, name: lessonName(l, this.s) }));
    const tool: Anthropic.Tool = {
      name: 'reponses',
      description: 'Tes réponses au quiz, une phrase par concept.',
      strict: true,
      input_schema: {
        type: 'object',
        properties: Object.fromEntries(
          concepts.map((c) => [c.id, { type: 'string', description: c.name }]),
        ),
        required: concepts.map((c) => c.id),
        additionalProperties: false,
      },
    };
    const current: Anthropic.ContentBlockParam[] = [
      ...this.userContent({ turn: this.history.length + 1, result: null, screen: finalScreen }),
      {
        type: 'text',
        text: `${QUIZ}\n${concepts.map((c) => `- ${c.name}`).join('\n')}\nRéponds avec l’outil reponses.`,
      },
    ];
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2000,
      system: [{ type: 'text', text: this.system, cache_control: { type: 'ephemeral' } }],
      tools: [tool],
      output_config: { effort: 'low' },
      messages: this.messages(current),
    });
    const call = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    const raw =
      typeof call?.input === 'object' && call?.input !== null
        ? (call.input as Record<string, unknown>)
        : {};
    const answers = Object.fromEntries(
      concepts.map((c) => [c.id, typeof raw[c.id] === 'string' ? (raw[c.id] as string) : '']),
    );
    return { answers, usage: usageOf(response) };
  }
}

const usageOf = (r: Anthropic.Message): Decision['usage'] => ({
  input: r.usage.input_tokens,
  cached: r.usage.cache_read_input_tokens ?? 0,
  output: r.usage.output_tokens,
});
const add = (a: Decision['usage'], b: Decision['usage']): Decision['usage'] => ({
  input: a.input + b.input,
  cached: a.cached + b.cached,
  output: a.output + b.output,
});
