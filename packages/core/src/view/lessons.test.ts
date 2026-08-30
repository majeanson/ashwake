import { describe, expect, it } from 'vitest';
import { BARE_TUNING, TUNING, type Tuning } from '@content/tuning';
import { CONCEPT_MARK, COLOUR_MARK, LANDMARK_GLYPH, TILE_GLYPH } from '@theme/tokens';
import { DAYLIGHT } from '@theme/themes/daylight';
import { TORCHLIT } from '@theme/themes/torchlit';
import type { Theme } from '@theme/tokens';
import { STRINGS_EN } from '@text/en';
import { STRINGS_FR } from '@text/fr-CA';
import type { Strings } from '@text/Strings';
import { FIGURES } from './figure';
import {
  LESSONS,
  lessonCardDefine,
  lessonCore,
  lessonDefine,
  lessonDetail,
  lessonLines,
  lessonName,
  lessonOf,
  lessonTerms,
} from './lessons';
import { conceptPattern, conceptTerms } from './tips';

/**
 * The registry's own rules — the ones that keep it a single source rather than
 * a fifth place to write a sentence.
 *
 * These are invariants, not pins. `teaching.pin.test.ts` and `prose.pin.test.ts`
 * say what the words ARE today; this says what shape any lesson must have, in
 * every language the game speaks — the same loop runs over French and English,
 * so a rule the English registry earned cannot be quietly lost in translation.
 */

const LANGUAGES: readonly Strings[] = [STRINGS_EN, STRINGS_FR];

const CASES: readonly (readonly [string, Tuning, Theme])[] = [
  ['TUNING · torchlit', TUNING, TORCHLIT],
  ['TUNING · daylight', TUNING, DAYLIGHT],
  ['BARE_TUNING · torchlit', BARE_TUNING, TORCHLIT],
  ['BARE_TUNING · daylight', BARE_TUNING, DAYLIGHT],
];

/** Every mark any lesson is allowed to wear. A glyph invented here would be a
 *  symbol the board never draws — the thing `tips.ts` forbids for rows and the
 *  figures forbid for cells. */
const KNOWN_GLYPHS = new Set<string>([
  ...Object.values(LANDMARK_GLYPH),
  ...Object.values(CONCEPT_MARK),
  ...Object.values(COLOUR_MARK),
  TILE_GLYPH,
]);

describe.each(LANGUAGES.map((s) => [s.locale, s] as const))('the lesson registry · %s', (_l, s) => {
  it('gives every lesson a unique id and a name', () => {
    const ids = LESSONS.map((l) => l.id);
    expect(new Set(ids).size, 'two lessons share an id').toBe(ids.length);
    for (const lesson of LESSONS) {
      expect(lessonName(lesson, s), `${lesson.id} has no name`).not.toBe('');
    }
  });

  it('finds every lesson by its own id', () => {
    for (const lesson of LESSONS) expect(lessonOf(lesson.id)).toBe(lesson);
  });

  /**
   * The one that keeps a beat a BEAT.
   *
   * The manual prints one `<p>` per beat and a card joins them with a space,
   * so a beat that is a clause rather than a sentence renders as an orphan
   * fragment in one host and a run-on in the other. Terminal punctuation is
   * the cheapest possible statement of "this is a whole thought" — and what
   * counts as terminal is the language's to say (`s.typography.sentenceEnd`).
   */
  it('speaks in whole sentences, under every tuning and every direction', () => {
    for (const [name, t, theme] of CASES) {
      for (const lesson of LESSONS) {
        for (const line of [
          ...lessonLines(lesson, t, theme, s),
          ...lessonDetail(lesson, t, theme, s),
        ]) {
          expect(line, `${lesson.id} · ${name}: an empty sentence`).not.toBe('');
          expect(line.trim(), `${lesson.id} · ${name}: "${line}" does not end a sentence`).toMatch(
            s.typography.sentenceEnd,
          );
        }
      }
    }
  });

  /**
   * Every lesson says SOMETHING in every economy. A lesson whose only beat is
   * conditional would go silent when its dial is off — and a manual section or
   * a teach card rendering nothing at all is worse than one that never fired.
   */
  it('never goes silent, whatever the dials say', () => {
    for (const [name, t, theme] of CASES) {
      for (const lesson of LESSONS) {
        expect(
          lessonLines(lesson, t, theme, s).length,
          `${lesson.id} says nothing at all under ${name}`,
        ).toBeGreaterThan(0);
        expect(lessonCore(lesson, t, theme, s), `${lesson.id} has no core under ${name}`).not.toBe(
          '',
        );
      }
    }
  });

  /**
   * Terms are what `tips.ts` alternates over to find a tappable word, and it
   * matches on the literal string — so a lowercase term would never fire, and
   * a short term listed before a longer one containing it would swallow it.
   * Uppercased the locale's way: `É` is the capital of `é` in French, and a
   * term that dropped its accent would never be found in the prose that
   * keeps it.
   */
  it('keeps every term uppercase and longest-first', () => {
    const seen = new Set<string>();
    for (const lesson of LESSONS) {
      const terms = lessonTerms(lesson, s);
      for (const term of terms) {
        expect(term, `${lesson.id}: "${term}" is not uppercase`).toBe(
          term.toLocaleUpperCase(s.locale),
        );
        expect(seen.has(term), `"${term}" is claimed by two lessons`).toBe(false);
        seen.add(term);
      }
      const lengths = terms.map((term) => term.length);
      expect(
        [...lengths].sort((a, b) => b - a),
        `${lesson.id}'s terms are not longest-first`,
      ).toEqual(lengths);
    }
  });

  /**
   * The `card` weight reaches a card (2026-08-30).
   *
   * It did not. Every door in this body printed `lessonDefine` — `core` plus
   * `more` — so the sentences a lesson keeps for FIRST CONTACT were written in
   * two languages, given a weight, pinned by `teaching.pin.test.ts` and shown
   * to nobody. `lessonCardText`, the only function that read them, had no
   * caller.
   *
   * This is the invariant that makes the weight mean something: a card beat
   * must be IN the card's body and OUT of every other door's, in every
   * language and at every dial setting that speaks it. A fourth prose field
   * with no reader would fail it, and so would a `card` beat quietly promoted
   * to `more`.
   */
  it('prints every first-contact sentence on the card, and nowhere else', () => {
    let seen = 0;
    for (const lesson of LESSONS) {
      for (const [label, t, theme] of CASES) {
        const card = lessonCardDefine(lesson, t, theme, s);
        const plain = lessonDefine(lesson, t, theme, s);
        // The card is the visible lesson with more on the end, never less.
        expect(card.startsWith(plain), `${lesson.id} · ${label}: the card lost the lesson`).toBe(
          true,
        );
        const extra = card.slice(plain.length).trim();
        if (extra === '') continue;
        seen += 1;
        expect(
          plain,
          `${lesson.id} · ${label}: a card sentence leaked into every door`,
        ).not.toContain(extra);
      }
    }
    // If no lesson keeps one any more, the weight is dead and should go with
    // its plumbing rather than sit here passing vacuously.
    expect(seen, 'no lesson keeps a first-contact sentence').toBeGreaterThan(0);
  });

  /**
   * Every term actually OCCURS in its own lesson (2026-08-28), in at least one
   * economy and direction. The French catalogue is where this earned its
   * place: a term spelled `RESERVE` beside prose that says `RÉSERVE` is a
   * button that never appears, and nothing else would have noticed.
   */
  it('names every term somewhere in its own lesson', () => {
    for (const lesson of LESSONS) {
      for (const term of lessonTerms(lesson, s)) {
        const spoken = CASES.some(([, t, theme]) =>
          [lessonName(lesson, s), ...lessonLines(lesson, t, theme, s)]
            .join(' ')
            .toLocaleUpperCase(s.locale)
            .includes(term),
        );
        expect(spoken, `${lesson.id}: "${term}" never appears in its own lesson`).toBe(true);
      }
    }
  });

  /**
   * The matcher finds every term as a whole word — including ones with
   * accents, which `\b` could never see — and never inside a longer word.
   */
  it('matches every term as a whole word, and never inside another', () => {
    const pattern = conceptPattern(s);
    for (const { term } of conceptTerms(s)) {
      const found = [...`x ${term} x`.matchAll(pattern)].map((m) => m[1]);
      expect(found, `"${term}" is not matched as a word`).toEqual([term]);
      expect([...`x ${term}z x`.matchAll(pattern)], `"${term}" matched inside a word`).toEqual([]);
    }
  });

  /**
   * The definition and the card body are the same words, by construction —
   * this asserts the construction rather than the words, so it keeps holding
   * as the prose stages rewrite them.
   */
  it('builds its definition out of exactly the lines it shows', () => {
    for (const [name, t, theme] of CASES) {
      for (const lesson of LESSONS) {
        expect(lessonDefine(lesson, t, theme, s), `${lesson.id} · ${name}`).toBe(
          lessonLines(lesson, t, theme, s).join(' '),
        );
      }
    }
  });

  /** The core is the opening of the visible lesson, never a separate sentence
   *  written beside it — the property that makes "shorter" a filter. */
  it('opens the visible lesson with its own core', () => {
    for (const [name, t, theme] of CASES) {
      for (const lesson of LESSONS) {
        const core = lessonCore(lesson, t, theme, s);
        if (core === '') continue;
        expect(lessonDefine(lesson, t, theme, s).startsWith(core), `${lesson.id} · ${name}`).toBe(
          true,
        );
      }
    }
  });
});

describe('the lesson registry, whatever the language', () => {
  /**
   * A figure OR rows, never both — the portrait-card rule, stated where the
   * data is so a future lesson cannot quietly break it. A teaching card
   * already runs glyph, lead, body and button; a hex figure AND four marked
   * rows overflow an 844px screen.
   */
  it('never asks a card to carry a figure and rows at once', () => {
    for (const lesson of LESSONS) {
      expect(
        lesson.figure !== undefined && lesson.rows !== undefined,
        `${lesson.id} has both a figure and rows`,
      ).toBe(false);
    }
  });

  it('points every figure at one the table actually holds', () => {
    for (const lesson of LESSONS) {
      if (lesson.figure === undefined) continue;
      expect(
        FIGURES[lesson.figure],
        `${lesson.id} names a figure that does not exist`,
      ).toBeDefined();
    }
  });

  it('borrows every glyph from a mark registry, never inventing one', () => {
    for (const lesson of LESSONS) {
      if (lesson.glyph === undefined) continue;
      expect(KNOWN_GLYPHS, `${lesson.id} invented the glyph ${lesson.glyph}`).toContain(
        lesson.glyph,
      );
    }
  });
});
