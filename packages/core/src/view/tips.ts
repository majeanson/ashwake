import type { PerkId } from '@meta/progress';
import type { Strings } from '@text/Strings';
import { LESSONS, lessonTerms, type LessonId } from './lessons';
import type { TipRow } from './view';

/**
 * The marked list, and the words that go in one.
 *
 * Extracted from `Game` on 2026-08-27 for the same reason `shop.ts` was
 * extracted the day before: a second host needed it. The shelf in THE SHOP
 * and the find card both explain a perk the SAME way (Marc: "we could have
 * the same card pop in the shop"). One builder, two hosts, so the two doors
 * onto one perk cannot drift apart.
 *
 * **Pure since 2026-08-28.** The element builders (`tipRows`, `conceptInked`,
 * `rarityInked`) left with the DOM when the core became a package — a React
 * `TipRows` draws the rows now — and what stays is the part that was always
 * the rule: which words are tappable, which term opens which lesson, and the
 * three lines a perk takes to use.
 */

/** A term made tappable: the spelling, and the lesson it opens. */
export type ConceptTerm = {
  readonly term: string;
  readonly id: LessonId;
  readonly ink?: 'ink-magic' | 'ink-unique';
};

const TERMS_BY_LOCALE = new Map<string, readonly ConceptTerm[]>();

/**
 * Every term the lessons answer to, longest first — so RELICS is never cut
 * short into RELIC and SIZE BONUS is never split at its own space — with the
 * entry each one opens. Built from LESSONS itself, which is where MAGIC and
 * UNIQUE already live as its `rare`/`rareUnique` entries, so this needs no
 * second list to keep in sync with the ink they wear. `lessons.test.ts`
 * guarantees no two entries share a term, in either language.
 */
export function conceptTerms(s: Strings): readonly ConceptTerm[] {
  const cached = TERMS_BY_LOCALE.get(s.locale);
  if (cached !== undefined) return cached;
  const out: ConceptTerm[] = [];
  for (const entry of LESSONS) {
    for (const term of lessonTerms(entry, s)) {
      out.push(
        entry.ink === undefined ? { term, id: entry.id } : { term, id: entry.id, ink: entry.ink },
      );
    }
  }
  out.sort((a, b) => b.term.length - a.term.length);
  TERMS_BY_LOCALE.set(s.locale, out);
  return out;
}

const escape = (term: string): string => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The pattern a host splits prose on to find the tappable words.
 *
 * Unicode-aware since the second language (2026-08-28): `\b` is an ASCII
 * word boundary in JavaScript, so `\bRÉSERVE\b` never matched at all and
 * `\bRELIQUES\b` matched inside `RELIQUES.` only by luck of the period. The
 * boundary is now "not touching a letter or a digit", which is what a word
 * boundary means in French as well as English.
 */
export function conceptPattern(s: Strings): RegExp {
  const alternation = conceptTerms(s)
    .map((c) => escape(c.term))
    .join('|');
  return new RegExp(`(?<![\\p{L}\\p{N}])(${alternation})(?![\\p{L}\\p{N}])`, 'gu');
}

/** MAGIC and UNIQUE, wherever the WORDS appear, so prose and palette agree
 *  (Marc, 2026-08-20: "as well as documentation and anywhere it speaks about
 *  it"). Uppercase only: the capitals are the vocabulary. */
export function rarityPattern(s: Strings): RegExp {
  const magic = escape(s.lesson.rare.name);
  const unique = escape(s.lesson.rareUnique.name);
  return new RegExp(`(?<![\\p{L}\\p{N}])(${magic}|${unique})(?![\\p{L}\\p{N}])`, 'gu');
}

/**
 * A perk, in the three lines it actually takes to use (Marc, 2026-08-27:
 * "a quick help card of how to use it properly, what you gain what you lose
 * style").
 *
 * A perk is the only thing in this game that can make you WORSE at it if you
 * keep playing the way you were — ROOTBOUND starves every pocket that strays
 * off its own ground, and starves it harder the luckier you get; OPEN HAND
 * takes the stash away — and until now the one sentence each of them got said
 * what the dial did without ever saying that. The find card named the gain;
 * nothing named the cost as a cost, and nothing at all said what to do
 * differently.
 *
 * So: what it hands you, what it takes, and how to play it. `lose` is never
 * omitted, even for the two that take nothing — "Nothing" is the answer a
 * player is entitled to read rather than infer from a missing line, and a
 * three-row card that is sometimes two rows reads as a card with a bug.
 *
 * No row invents a symbol (`theme/tokens.ts` states the rule: `COLOUR_MARK`
 * and `LANDMARK_GLYPH` are the whole vocabulary), so all three go markless
 * and the leading words carry the structure instead.
 */
export function perkRows(id: PerkId, s: Strings): TipRow[] {
  const perk = s.perk[id];
  return [
    { text: s.perkRow.gain(perk.gain) },
    { text: s.perkRow.lose(perk.lose) },
    { text: s.perkRow.play(perk.play) },
  ];
}
