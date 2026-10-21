import { describe, expect, it } from 'vitest';
import { BARE_TUNING, COLOURS, TUNING, type Tuning } from '@content/tuning';
import { COLOUR_ICON, CONCEPT_ICON, LANDMARK_ICON, TILE_ICON, type IconName } from '@theme/icons';
import { DAYLIGHT } from '@theme/themes/daylight';
import { SETTLEMENT } from '@theme/themes/settlement';
import { namesOf, type Theme } from '@theme/tokens';
import { STRINGS_EN } from '@text/en';
import { STRINGS_FR } from '@text/fr-CA';
import type { Strings } from '@text/Strings';
import { FIGURES } from './figure';
import {
  LESSONS,
  cardDraws,
  lessonCardDefine,
  lessonCore,
  lessonDefine,
  lessonDetail,
  lessonLines,
  lessonName,
  lessonOf,
  lessonTerms,
  type RowKey,
} from './lessons';
import { conceptLookup } from './tips';

/** Every term, longest first: the lookup's own order. */
const termsOf = (s: Strings) => [...conceptLookup(s).byWord.values()];
import { colourLesson } from './view';

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
  ['TUNING · settlement', TUNING, SETTLEMENT],
  ['TUNING · daylight', TUNING, DAYLIGHT],
  ['BARE_TUNING · settlement', BARE_TUNING, SETTLEMENT],
  ['BARE_TUNING · daylight', BARE_TUNING, DAYLIGHT],
];

/** Every mark any lesson is allowed to wear. A mark invented here would be a
 *  symbol the board never draws — the thing `tips.ts` forbids for rows and the
 *  figures forbid for cells. The CHROME's marks are deliberately absent: they
 *  say something about the screen rather than about the plane. */
const KNOWN_ICONS = new Set<IconName>([
  ...Object.values(LANDMARK_ICON),
  ...Object.values(CONCEPT_ICON),
  ...Object.values(COLOUR_ICON),
  TILE_ICON,
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
      // A row's words are claimed the same way (2026-10-13): CACHE opens THE
      // MAP at the cache row, so no other lesson or row may also answer to it.
      for (const head of lesson.rowHeads?.(s) ?? []) {
        for (const term of head.terms) {
          expect(term, `${lesson.id}/${head.key}: "${term}" is not uppercase`).toBe(
            term.toLocaleUpperCase(s.locale),
          );
          expect(seen.has(term), `"${term}" is claimed by a lesson and a row`).toBe(false);
          seen.add(term);
        }
        const rowLengths = head.terms.map((term) => term.length);
        expect(
          [...rowLengths].sort((a, b) => b - a),
          `${lesson.id}/${head.key}'s terms are not longest-first`,
        ).toEqual(rowLengths);
      }
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
    const pattern = conceptLookup(s).pattern;
    for (const { term } of termsOf(s)) {
      const found = [...`x ${term} x`.matchAll(pattern)].map((m) => m[1]);
      expect(found, `"${term}" is not matched as a word`).toEqual([term]);
      expect([...`x ${term}z x`.matchAll(pattern)], `"${term}" matched inside a word`).toEqual([]);
    }
  });

  /**
   * Every paragraph of every card, row and section asks for the lookup, so it is
   * built once per locale — and resolves a matched word, in any case, to the
   * term the pattern found.
   */
  it('builds its lookup once per locale, and resolves every term by its word', () => {
    expect(conceptLookup(s)).toBe(conceptLookup(s));
    const { byWord } = conceptLookup(s);
    for (const entry of termsOf(s)) {
      expect(byWord.get(entry.term.toLocaleUpperCase()), entry.term).toBe(entry);
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

describe('the territory row answers for the board it is read on', () => {
  /**
   * A card explaining the mark under the thumb must not describe a territory
   * the player cannot have (2026-09-09).
   *
   * `core` quotes `territoryTiles`/`territoryTilesCap` — the bonus a HELD
   * territory pays into every later run's purse — and says "for good". Both
   * are dead on a daily or a shared board, where `territoryPays` is the only
   * thing a territory hands over, and it went unmentioned.
   */
  for (const s of [STRINGS_EN, STRINGS_FR]) {
    it(`quotes the dial that is live, in ${s.locale}`, () => {
      const lesson = LESSONS.find((l) => l.id === 'map');
      if (lesson === undefined) throw new Error('THE MAP is gone');
      const territory = (t: Tuning): string =>
        lesson.rows?.(t, SETTLEMENT, s).find((row) => row.key === 'territory')?.text ?? '';
      const world = territory(TUNING);
      const noLedger: Tuning = { ...TUNING, territoryPays: TUNING.cachePays };
      const board = territory(noLedger);

      expect(world, 'a world stopped naming its later-run bonus').toContain(
        String(TUNING.territoryTiles),
      );
      expect(board, 'a board with no ledger did not name what it pays').toContain(
        String(TUNING.cachePays),
      );
      expect(board, 'a board with no ledger promised a later run a bonus').not.toContain(
        String(TUNING.territoryTilesCap),
      );
      expect(board, 'the two boards read the same sentence').not.toBe(world);
    });
  }
});

describe('the lesson registry, whatever the language', () => {
  /**
   * A CARD draws a figure OR rows, never both — the portrait-card rule, stated
   * where the data is so a future lesson cannot quietly break it. A teaching
   * card already runs glyph, lead, body and button; a hex figure AND four
   * marked rows overflow an 844px screen.
   *
   * Until 2026-10-13 the rule was on the LESSON: no lesson had both. POP does
   * now (the fired card draws the `pop` figure; the manual draws the rows and
   * the `ripen` figure), so the rule moved to what the card draws
   * (`cardDraws`), and the lessons allowed to hold both are listed, so a
   * third is a decision rather than an accident.
   */
  it('never asks a card to carry a figure and rows at once', () => {
    const both: string[] = [];
    for (const lesson of LESSONS) {
      for (const row of [undefined, ...(lesson.rowHeads?.(STRINGS_EN) ?? []).map((h) => h.key)]) {
        const draws = cardDraws(lesson, row);
        if (lesson.figure === undefined && lesson.rows === undefined) {
          expect(draws, `${lesson.id} draws something it does not have`).toBeNull();
        } else {
          expect(draws, `${lesson.id} draws nothing`).not.toBeNull();
          expect(draws === 'figure' ? lesson.figure : lesson.rows).toBeDefined();
        }
      }
      if (lesson.figure !== undefined && lesson.rows !== undefined) both.push(lesson.id);
    }
    expect(both, 'a lesson holds both a card figure and rows').toEqual(['ripe', 'pop']);
    // A fired POP card is the picture; a card opened at STONE is the row.
    const pop = LESSONS.find((l) => l.id === 'pop')!;
    expect(cardDraws(pop, undefined)).toBe('figure');
    expect(cardDraws(pop, 'stone')).toBe('rows');
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

  it('borrows every mark from a registry, never inventing one', () => {
    for (const lesson of LESSONS) {
      if (lesson.icon === undefined) continue;
      expect(KNOWN_ICONS, `${lesson.id} invented the mark ${lesson.icon}`).toContain(lesson.icon);
    }
  });
});

/**
 * THE FOUR GROUNDS holds every ground sentence (2026-10-13). The manual's
 * COLOURS tab used to be `groundGuide`, a second builder restating the rule's
 * numbers; its invariants moved here with the content.
 */
describe.each(LANGUAGES.map((s) => [s.locale, s] as const))(
  'the four grounds lesson · %s',
  (_l, s) => {
    const grounds = LESSONS.find((l) => l.id === 'grounds');
    if (grounds === undefined) throw new Error('THE FOUR GROUNDS is gone');
    const rowsOf = (t: Tuning, theme: Theme) => grounds.rows?.(t, theme, s) ?? [];

    for (const theme of [SETTLEMENT, DAYLIGHT]) {
      it(`gives every ground its card's rule, a reason to take it and a warning (${theme.id})`, () => {
        const rows = rowsOf(TUNING, theme);
        expect(rows.map((r) => r.colour)).toEqual([...COLOURS]);
        for (const row of rows) {
          // The rule is `colourLesson` verbatim, so the tab and the card cannot
          // describe a ground two ways.
          expect(row.text).toBe(colourLesson(row.colour!, TUNING, theme, s));
          expect(row.lines?.map((l) => l.head)).toEqual([
            s.lesson.grounds.pickWhen,
            s.lesson.grounds.watchFor,
          ]);
          for (const text of [row.text, ...(row.lines ?? []).map((l) => l.text)]) {
            expect(text.length, `${row.colour}`).toBeGreaterThan(15);
            expect(text, `${row.colour}: ${text}`).toMatch(s.typography.sentenceEnd);
          }
        }
      });

      it(`teaches nothing about a ground whose power is off, and still leads (${theme.id})`, () => {
        expect(rowsOf(BARE_TUNING, theme)).toEqual([]);
        expect(lessonCore(grounds, BARE_TUNING, theme, s)).not.toBe('');
        // The advice for every ground is not about one power.
        expect(lessonDetail(grounds, BARE_TUNING, theme, s).length).toBeGreaterThan(0);
      });
    }

    it('keeps the advice for every ground in the DETAILS fold, never on the card', () => {
      const detail = lessonDetail(grounds, TUNING, SETTLEMENT, s);
      expect(detail).toHaveLength(5);
      const card = lessonCardDefine(grounds, TUNING, SETTLEMENT, s);
      for (const line of detail) expect(card).not.toContain(line);
    });

    it('quotes the live tuning, not a copy of it', () => {
      const tweaked: Tuning = { ...TUNING, greenCrowdBonus: 1, blueTideCap: 2 };
      const pick = (t: Tuning, colour: string) =>
        rowsOf(t, SETTLEMENT).find((r) => r.colour === colour)!.lines![0]!.text;
      // A full green ring: six matches, five crowd bonuses on top.
      expect(pick(TUNING, 'green')).toContain(s.locale === 'en' ? '9.5' : '9,5');
      expect(pick(tweaked, 'green')).toContain('11');
      expect(pick(tweaked, 'blue')).toContain('+2');
    });

    it('does not quote a full-ring figure for yellow where it counts distinct colours', () => {
      const distinct: Tuning = { ...TUNING, yellowCompanyAll: false };
      const yellow = (t: Tuning) =>
        rowsOf(t, SETTLEMENT).find((r) => r.colour === 'yellow')!.lines![0]!.text;
      expect(yellow(TUNING)).toMatch(/\d/);
      expect(yellow(distinct)).not.toMatch(/\d/);
    });
  },
);

/**
 * THE MAP (2026-10-13): one concept, six rows. The invariants the eight
 * lessons it replaced each kept, stated once over its rows.
 */
const ROWS: readonly RowKey[] = ['cache', 'site', 'shrine', 'territory', 'find', 'lens'];

describe.each(LANGUAGES.map((s) => [s.locale, s] as const))('the map lesson · %s', (_l, s) => {
  const map = LESSONS.find((l) => l.id === 'map');
  if (map === undefined) throw new Error('THE MAP is gone');
  const rowsOf = (t: Tuning, theme: Theme) => map.rows?.(t, theme, s) ?? [];

  it('lists its six rows in order, each with a name, a sentence and a mark, under every tuning', () => {
    for (const [name, t, theme] of CASES) {
      const rows = rowsOf(t, theme);
      expect(
        rows.map((r) => r.key),
        name,
      ).toEqual([...ROWS]);
      for (const row of rows) {
        expect(row.name, `${row.key} · ${name}`).toBeTruthy();
        expect(row.text, `${row.key} · ${name}`).toMatch(s.typography.sentenceEnd);
        expect(
          row.destination !== undefined || row.icon !== undefined,
          `${row.key} has no mark`,
        ).toBe(true);
        for (const line of row.lines ?? [])
          expect(line.text, `${row.key} · ${name}`).toMatch(s.typography.sentenceEnd);
      }
    }
  });

  it('names every row the way its row head says, so a chip and its row cannot differ', () => {
    const heads = map.rowHeads?.(s) ?? [];
    expect(heads.map((h) => h.key)).toEqual([...ROWS]);
    for (const row of rowsOf(TUNING, SETTLEMENT)) {
      expect(heads.find((h) => h.key === row.key)?.name).toBe(row.name);
    }
  });

  it('keeps the bounty under the site, native ground under the territory and two lens lines', () => {
    const rows = rowsOf(TUNING, SETTLEMENT);
    expect(rows.find((r) => r.key === 'site')?.lines).toHaveLength(1);
    expect(rows.find((r) => r.key === 'territory')?.lines).toHaveLength(1);
    expect(rows.find((r) => r.key === 'lens')?.lines).toHaveLength(2);
    expect(rows.find((r) => r.key === 'cache')?.lines).toBeUndefined();
  });

  it('opens with the world’s memory and keeps what every destination shares for the card', () => {
    expect(lessonCore(map, TUNING, SETTLEMENT, s)).toBe(s.lesson.map.core);
    expect(lessonCardDefine(map, TUNING, SETTLEMENT, s)).toContain(s.lesson.map.pays);
    expect(lessonDefine(map, TUNING, SETTLEMENT, s)).not.toContain(s.lesson.map.pays);
    // The invitation is the toast's own sentence.
    expect(lessonDefine(map, TUNING, SETTLEMENT, s)).toContain(s.lensHint);
  });

  it('answers to each row’s words, with the row they open', () => {
    const byTerm = new Map(termsOf(s).map((c) => [c.term, c]));
    for (const head of map.rowHeads?.(s) ?? []) {
      for (const term of head.terms) {
        expect(byTerm.get(term), term).toMatchObject({ id: 'map', row: head.key });
      }
    }
  });

  it('names every row term in its own row, in some economy', () => {
    for (const head of map.rowHeads?.(s) ?? []) {
      for (const term of head.terms) {
        const spoken = CASES.some(([, t, theme]) =>
          rowsOf(t, theme)
            .filter((r) => r.key === head.key)
            .flatMap((r) => [r.name ?? '', r.text, ...(r.lines ?? []).map((l) => l.text)])
            .join(' ')
            .toLocaleUpperCase(s.locale)
            .includes(term),
        );
        expect(spoken, `${head.key}: "${term}" never appears in its own row`).toBe(true);
      }
    }
  });
});

/**
 * MAGIC, LUCK and THE RUN'S END (2026-10-13): three concepts folded from seven
 * lessons, a purse card and a shop sentence. The invariants each kept, stated
 * once over its rows.
 */
describe.each(LANGUAGES.map((s) => [s.locale, s] as const))(
  'the magic, luck and run’s-end lessons · %s',
  (_l, s) => {
    const lesson = (id: string) => {
      const found = LESSONS.find((l) => l.id === id);
      if (found === undefined) throw new Error(`${id} is gone`);
      return found;
    };

    it('says the two rarity rules one way: the lesson, its row and the tap-a-tile line', () => {
      const magic = lesson('magic');
      expect(lessonCore(magic, TUNING, SETTLEMENT, s)).toBe(s.view.rarity.magic);
      expect(s.lesson.magic.row.unique.core).toBe(s.view.rarity.unique);
      const rows = magic.rows?.(TUNING, SETTLEMENT, s) ?? [];
      expect(rows.map((r) => r.key)).toEqual(['unique']);
      expect(rows[0]?.ring).toBe('unique');
      // The first-contact sentence is the card's alone.
      expect(lessonCardDefine(magic, TUNING, SETTLEMENT, s)).toContain(s.lesson.magic.card);
      expect(lessonDefine(magic, TUNING, SETTLEMENT, s)).not.toContain(s.lesson.magic.card);
    });

    it('answers to MAGIC and UNIQUE as rows of one lesson, each in its own ink', () => {
      const byTerm = new Map(termsOf(s).map((c) => [c.term, c]));
      expect(byTerm.get(s.lesson.magic.row.magic.name)).toMatchObject({
        id: 'magic',
        row: 'magic',
        ink: 'ink-magic',
      });
      expect(byTerm.get(s.lesson.magic.row.unique.name)).toMatchObject({
        id: 'magic',
        row: 'unique',
        ink: 'ink-unique',
      });
      // Each word is spoken by the lesson it opens.
      const spoken =
        lessonDefine(lesson('magic'), TUNING, SETTLEMENT, s) +
        (lesson('magic').rows?.(TUNING, SETTLEMENT, s) ?? []).map((r) => r.text).join(' ');
      expect(spoken).toContain(s.lesson.magic.row.magic.name);
      expect(spoken).toContain(s.lesson.magic.row.unique.name);
    });

    it('lists the purse’s buttons as LUCK’s rows, in the words the purse sheet uses', () => {
      const luck = lesson('luck');
      const rows = luck.rows?.(TUNING, SETTLEMENT, s) ?? [];
      const p = s.view.purse;
      expect(rows.map((r) => r.key)).toEqual([
        'redraw',
        'steer',
        'steer',
        'steer',
        'steer',
        'forge',
      ]);
      expect(rows[0]?.text).toBe(p.redraw(TUNING.luckRerollCost));
      expect(rows.at(-1)?.text).toBe(p.forge(TUNING.luckForgeCost));
      expect(rows.filter((r) => r.key === 'steer').map((r) => r.colour)).toEqual([...COLOURS]);
      // A world with no buttons teaches none, and still leads.
      expect(luck.rows?.(BARE_TUNING, SETTLEMENT, s)).toEqual([]);
      expect(lessonCore(luck, BARE_TUNING, SETTLEMENT, s)).not.toBe('');
    });

    it('keeps “you CAN lose it all” on the first-contact card, naming what the end pays', () => {
      const luck = lesson('luck');
      const card = lessonCardDefine(luck, TUNING, SETTLEMENT, s);
      expect(card).toContain(s.view.purse.lostPartly(Math.round(TUNING.luckToRelics * 100)));
      expect(lessonCardDefine(luck, BARE_TUNING, SETTLEMENT, s)).toContain(s.view.purse.lostAll);
      expect(lessonDefine(luck, TUNING, SETTLEMENT, s)).not.toContain('CAN');
    });

    it('speaks THE RUN’S END from the stat note’s own clock and the toast’s own rule', () => {
      const end = lesson('end');
      const lines = lessonLines(end, TUNING, SETTLEMENT, s);
      expect(lines).toContain(s.lesson.end.rises);
      expect(lines).toContain(s.lastGaspRule);
      // The clock reads the same inside the stat note.
      const clock = s.lesson.end.rises.slice(s.lesson.end.rises.indexOf(';') + 2);
      expect(s.view.stat.cost(1, 'It rises').includes(clock)).toBe(true);
      // A flattened curve is not told it rises, but still says what a placement costs.
      const flat: Tuning = { ...TUNING, costRisesEvery: 0 };
      expect(lessonLines(end, flat, SETTLEMENT, s)).not.toContain(s.lesson.end.rises);
      expect(lessonCore(end, flat, SETTLEMENT, s)).toBe(s.lesson.end.core);
      expect(lessonDetail(end, flat, SETTLEMENT, s)).toEqual([]);
    });

    it('opens RELICS at its row, which carries the shop sentence', () => {
      const end = lesson('end');
      const byTerm = new Map(termsOf(s).map((c) => [c.term, c]));
      for (const term of s.lesson.end.row.relic.terms) {
        expect(byTerm.get(term), term).toMatchObject({ id: 'end', row: 'relic' });
      }
      const row = end.rows?.(TUNING, SETTLEMENT, s)[0];
      expect(row).toMatchObject({ key: 'relic', name: s.lesson.end.row.relic.name });
      expect(row?.text).toBe(s.lesson.end.row.relic.core);
      expect(end.rowHeads?.(s)[0]?.name).toBe(row?.name);
    });
  },
);

/**
 * POP and THE EXPEDITION (2026-10-13): seven lessons became POP, and the
 * manual's hand-written opening plus the Legend's last four rows became THE
 * EXPEDITION. The invariants each kept, stated once over beats and rows.
 */
describe.each(LANGUAGES.map((s) => [s.locale, s] as const))(
  'the pop and expedition lessons · %s',
  (_l, s) => {
    const lesson = (id: string) => {
      const found = LESSONS.find((l) => l.id === id);
      if (found === undefined) throw new Error(`${id} is gone`);
      return found;
    };
    const pop = lesson('pop');
    const ripe = lesson('ripe');
    const expedition = lesson('expedition');

    it('reads START as the expedition, the pop, then the run’s end', () => {
      expect(LESSONS.filter((l) => l.tab === 'start').map((l) => l.id)).toEqual([
        'expedition',
        'ripe',
        'pop',
        'end',
      ]);
      for (const gone of ['pocket', 'worth', 'sizeBonus', 'stone', 'reach', 'sacrifice'])
        expect(
          LESSONS.find((l) => l.id === gone),
          `${gone} is its own lesson again`,
        ).toBeUndefined();
    });

    it('opens RIPE with ripening and the pocket as its core, and POP with the pop', () => {
      const r = s.lesson.ripe;
      const p = s.lesson.pop;
      expect(lessonCore(ripe, TUNING, SETTLEMENT, s)).toBe(`${r.ripens} ${r.pocket}`);
      expect(lessonCore(pop, TUNING, SETTLEMENT, s)).toBe(p.core);
      // The card is the idea and the next move; the depth is the DETAILS fold.
      expect(lessonLines(ripe, TUNING, SETTLEMENT, s)).not.toContain(r.worth);
      expect(lessonDetail(ripe, TUNING, SETTLEMENT, s)).toContain(r.worth);
      const lines = lessonLines(pop, TUNING, SETTLEMENT, s);
      for (const line of [p.wait, p.when]) expect(lines).toContain(line);
      expect(lessonDetail(pop, TUNING, SETTLEMENT, s)).toContain(p.paid);
      // The RIPE card says the idea only: the `pop` coach line says what to tap.
      expect(lessonCardDefine(ripe, TUNING, SETTLEMENT, s)).toBe(`${r.ripens} ${r.pocket}`);
    });

    it('keeps the draw lean and the surrounds fork under the dials that speak them', () => {
      const p = s.lesson.pop;
      const r = s.lesson.ripe;
      const lean = (t: Tuning) => lessonDetail(pop, t, SETTLEMENT, s).includes(p.lean);
      expect(lean(TUNING)).toBe(TUNING.luckPerPop > 0 && TUNING.colourBiasDraws > 0);
      expect(lean({ ...TUNING, luckPerPop: 0 })).toBe(false);
      const ash = lessonDetail(ripe, { ...TUNING, redAshMatches: true }, SETTLEMENT, s);
      const plain = lessonDetail(ripe, { ...TUNING, redAshMatches: false }, SETTLEMENT, s);
      expect(ash.some((l) => l.startsWith(r.surroundsAsh('').slice(0, 10)))).toBe(true);
      expect(plain).toContain(r.surrounds);
      expect(ash).not.toContain(r.surrounds);
    });

    it('answers to POCKET and WORTH as RIPE, the verb as POP, and to its rows’ words at their rows', () => {
      const byTerm = new Map(termsOf(s).map((c) => [c.term, c]));
      for (const term of s.lesson.pop.terms)
        expect(byTerm.get(term), term).toMatchObject({ id: 'pop' });
      for (const term of s.lesson.ripe.terms)
        expect(byTerm.get(term), term).toMatchObject({ id: 'ripe' });
      expect(byTerm.get(s.lesson.pop.row.stone.terms[0]!)).toMatchObject({
        id: 'pop',
        row: 'stone',
      });
      expect(byTerm.get(s.lesson.pop.row.sizeBonus.terms[0]!)).toMatchObject({
        id: 'pop',
        row: 'sizeBonus',
      });
      // The verb is a subset of the terms: it is what wears the button’s mark.
      for (const word of s.lesson.pop.verb) expect(s.lesson.pop.terms).toContain(word);
    });

    it('lists the ripe edge under RIPE, and stone, the size bonus and reach under POP', () => {
      const r = s.lesson.pop.row;
      const ripeRows = ripe.rows?.(TUNING, SETTLEMENT, s) ?? [];
      expect(ripeRows.map((x) => x.key)).toEqual(['ripeEdge']);
      expect(ripeRows[0]).toMatchObject({ ring: 'ripe', text: s.lesson.ripe.row.ripeEdge.core });
      // The row whose sentence leads with its own name does not repeat it.
      expect(ripeRows[0]?.name).toBeUndefined();
      const rows = pop.rows?.(TUNING, SETTLEMENT, s) ?? [];
      expect(rows.map((x) => x.key)).toEqual(['stone', 'sizeBonus', 'reach']);
      expect(rows[0]).toMatchObject({ ground: 'stone', name: r.stone.name });
      expect(rows[0]?.text).toBe(
        TUNING.redAshMatches ? r.stone.coreAsh(namesOf(SETTLEMENT, s.locale).red) : r.stone.core,
      );
      expect(rows[1]?.text).toBe(
        TUNING.harvestSizeCap > 0
          ? r.sizeBonus.coreCapped(TUNING.harvestSizeCap)
          : r.sizeBonus.core,
      );
      // Reach states its multiplier only while the dial is on.
      expect(rows[2]?.text).toBe(`${r.reach.core} ${r.reach.multiplier(TUNING.distanceStep)}`);
      expect(pop.rows?.({ ...TUNING, distanceStep: 0 }, SETTLEMENT, s)[2]?.text).toBe(r.reach.core);
      // A row that prints a name prints the head’s.
      const heads = pop.rowHeads?.(s) ?? [];
      for (const row of rows)
        if (row.name !== undefined)
          expect(heads.find((h) => h.key === row.key)?.name).toBe(row.name);
    });

    it('names every row term in its own row', () => {
      for (const head of pop.rowHeads?.(s) ?? []) {
        for (const term of head.terms) {
          const row = pop.rows?.(TUNING, SETTLEMENT, s).find((x) => x.key === head.key);
          expect(
            `${row?.name ?? ''} ${row?.text ?? ''}`.toLocaleUpperCase(s.locale),
            `${head.key}: "${term}"`,
          ).toContain(term);
        }
      }
    });

    it('opens THE EXPEDITION on the shared clause, then its three lines, for everyone', () => {
      expect(lessonCore(expedition, TUNING, SETTLEMENT, s)).toBe(s.howItWorks);
      expect(lessonLines(expedition, TUNING, SETTLEMENT, s)).toEqual([
        s.howItWorks,
        ...s.lesson.expedition.lines,
      ]);
      expect(s.lesson.expedition.lines).toHaveLength(3);
      expect(expedition.manualFigure).toBe('place');
      expect(lessonTerms(expedition, s)).toEqual([]);
    });

    it('lists the wall and the legal edge as THE EXPEDITION’s rows, in the sentences they were', () => {
      const rows = expedition.rows?.(TUNING, SETTLEMENT, s) ?? [];
      expect(rows).toEqual([
        {
          key: 'wall',
          ground: 'wall',
          icon: CONCEPT_ICON.wall,
          text: s.lesson.expedition.row.wall.core,
        },
        { key: 'legal', ring: 'legal', text: s.lesson.expedition.row.legal.core },
      ]);
      expect(expedition.rowHeads?.(s).map((h) => h.key)).toEqual(['wall', 'legal']);
    });

    it('gives CARAVAN a tappable word, and a card opened at one of its words says the caravan', () => {
      const caravan = lesson('caravan');
      expect(lessonTerms(caravan, s)).toHaveLength(1);
      const byTerm = new Map(termsOf(s).map((c) => [c.term, c]));
      expect(byTerm.get(lessonTerms(caravan, s)[0]!)).toMatchObject({ id: 'caravan' });
    });
  },
);

/**
 * THE TUTORIAL IS SIMPLE AND DIRECT (2026-10-15, Marc). A first-contact card is
 * the idea and the next move; the depth is the manual's DETAILS fold, which the
 * book prints for everyone. The merged MÛR + RÉCOLTER card was about 170 words
 * and was re-split once already, so the ceiling is a test, not a hope. THE
 * EXPEDITION is exempt: it never fires as a card, it is the manual's opening
 * section (the story and goal cards carry its two sentences).
 */
const CARD_WORDS = 75;
describe.each(LANGUAGES.map((s) => [s.locale, s] as const))(
  'a first-contact card stays short · %s',
  (_l, s) => {
    for (const lesson of LESSONS) {
      if (lesson.id === 'expedition') continue;
      for (const [tName, t] of [
        ['TUNING', TUNING],
        ['BARE_TUNING', BARE_TUNING],
      ] as const) {
        it(`${lesson.id} · ${tName}`, () => {
          const words = lessonCardDefine(lesson, t, SETTLEMENT, s).split(/s+/).length;
          expect(words, `${lesson.id} is ${words} words`).toBeLessThanOrEqual(CARD_WORDS);
        });
      }
    }
  },
);

/**
 * THE KINDS (2026-10-21, Marc: _"should the tutorial be different for daily vs
 * world?"_). One tutorial; the dials pick the sentence. A daily, a shared board
 * and LEARN FIRST have every relic faucet at 0 and pay territories in tiles
 * (`shell/economy.ts`), and three sentences promised them relics and a world
 * that remembers.
 */
describe.each(LANGUAGES.map((s) => [s.locale, s] as const))(
  'the dials pick the kind · %s',
  (_l, s) => {
    const relicless: Tuning = { ...TUNING, claimRelics: 0, luckToRelics: 0, burnRelics: 0 };
    const kept: Tuning = { ...relicless, territoryPays: 5 };
    const relicWord = /relic|relique/i;

    it('THE EXPEDITION promises relics only where one can be banked', () => {
      expect(
        lessonLines(lessonOf('expedition')!, TUNING, SETTLEMENT, s).some((l) => relicWord.test(l)),
      ).toBe(true);
      expect(
        lessonLines(lessonOf('expedition')!, relicless, SETTLEMENT, s).some((l) =>
          relicWord.test(l),
        ),
      ).toBe(false);
    });

    it('THE RUN’S END prints its relic row only where one can be banked', () => {
      const end = lessonOf('end')!;
      expect(end.rows?.(TUNING, SETTLEMENT, s).map((r) => r.key)).toEqual(['relic']);
      expect(end.rows?.(relicless, SETTLEMENT, s)).toEqual([]);
    });

    it('THE MAP says the world remembers only where there is a world to', () => {
      expect(lessonCore(lessonOf('map')!, TUNING, SETTLEMENT, s)).toBe(s.lesson.map.core);
      expect(lessonCore(lessonOf('map')!, kept, SETTLEMENT, s)).toBe(s.lesson.map.coreKept);
    });
  },
);
