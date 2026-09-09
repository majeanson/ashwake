import { describe, expect, it } from 'vitest';
import { LOCALES, pickLocale } from '@content/locale';
import { STRINGS_EN } from './en';
import { STRINGS_FR } from './fr-CA';
import { fmtInt, fmtPct, NNBSP, ordinal } from './format';
import { stringsFor } from './index';
import type { Strings } from './Strings';
import { SETTLEMENT } from '@theme/themes/settlement';
import { DAYLIGHT } from '@theme/themes/daylight';
import { THEMES } from '@theme/index';
import { namesOf, powersOf } from '@theme/tokens';

/**
 * The rules of each language, held where a test can hold them (2026-08-28).
 *
 * The catalogue is a typed object, so a MISSING sentence is already a type
 * error; what a type cannot say is whether a sentence is written the way its
 * language writes. Québec French puts a narrow no-break space before a colon
 * and never uses a typewriter apostrophe; English does neither. A catalogue
 * that got those wrong would read as translated rather than written, on the
 * one screen a stranger meets first.
 */

/** Every string a catalogue can produce, with its functions called on sample
 *  facts — enough to see each sentence at least once. */
function everyString(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (typeof value === 'function') {
    const fn = value as (...args: unknown[]) => unknown;
    // Two calls, so both branches of a `n === 1` fork are seen.
    for (const n of [1, 3]) {
      const args = Array.from({ length: fn.length }, (_, i) =>
        i === 0 && fn.length > 1 && fn.name === '' ? n : n,
      );
      try {
        everyString(fn(...args.map((a, i) => (i % 2 === 1 ? 'X' : a))), out);
        everyString(fn(...args), out);
      } catch {
        // A function wanting a string where we passed a number: the other
        // call shape above will have covered it.
      }
    }
  } else if (Array.isArray(value)) for (const v of value) everyString(v, out);
  else if (typeof value === 'object' && value !== null && !(value instanceof RegExp)) {
    for (const v of Object.values(value)) everyString(v, out);
  }
  return out;
}

const CATALOGUES: readonly Strings[] = [STRINGS_EN, STRINGS_FR];
/** The ordinary no-break space, the one French puts inside « ». */
const NBSP = String.fromCharCode(0xa0);

describe('the catalogues', () => {
  it('exist for every locale, and each says which one it is', () => {
    for (const locale of LOCALES) expect(stringsFor(locale).locale).toBe(locale);
  });

  it('never leave a sentence empty', () => {
    for (const s of CATALOGUES) {
      for (const text of everyString(s)) expect(text.trim(), `${s.locale}: empty`).not.toBe('');
    }
  });

  /**
   * The house style, in the one form a test can hold (2026-08-30).
   *
   * Marc: *"review help and text content so it's not AI-like (no em dashes,
   * etc.), be concise and simple in all content."* The em dash was doing the
   * work of a colon, a full stop, a comma and a separator in 249 sentences
   * across the two catalogues, and which one it meant was never on the page.
   * Both languages, because the French had it in exactly the same places: it
   * was written beside the English, sentence for sentence.
   *
   * The EN DASH goes with it. It is the same shape at a glance on a phone, and
   * nothing in this game is a range. A minus sign (U+2212) is spelled out in
   * the keyboard list and is not a dash; a hyphen inside a word is a word.
   */
  it('writes no em dash and no en dash, in either language', () => {
    for (const s of CATALOGUES) {
      for (const text of everyString(s)) {
        expect(text, `${s.locale}: "${text}" carries an em dash`).not.toContain('—');
        expect(text, `${s.locale}: "${text}" carries an en dash`).not.toContain('–');
      }
    }
  });

  /**
   * The same rule, over a DIRECTION's own words.
   *
   * The first pass wrote the rule against `everyString(CATALOGUE)` and shipped
   * it, and a direction's name and note walked straight past it (found
   * 2026-08-30 by grepping the LIVE bundle rather than the source). They are
   * per-language prose, the APPEARANCE picker prints them in full, and they
   * are deliberately not in `text/` because a direction carries its own
   * fiction. **A test written against one source is a rule that holds in one
   * source.**
   *
   * The other surface that escaped — a sentence ASSEMBLED outside `text/` —
   * is checked in `view/view.test.ts`, because the layering lint says `text/`
   * may not look at `view/` and it is right.
   */
  /**
   * A mark is never spelled into a sentence (2026-08-30).
   *
   * Marc: *"no emojis only phosphor icons or assets."* Every symbol in this
   * game used to be a Unicode character, and eighteen of them were composed
   * INTO catalogue strings — `${LANDMARK_GLYPH.cache} CACHE: build a tile…` —
   * which meant a receipt had to be split back apart by whitespace to get the
   * mark out again, and the split was wrong for every sentence that did not
   * have one.
   *
   * The marks are icons now (`@theme/icons`) and ride BESIDE the words, so
   * this is the rule that keeps them there: a catalogue holds sentences, and a
   * sentence that carries a picture is a sentence some host will have to take
   * apart. The block-drawing characters are exempt and named: the arc
   * sparkline is pasted into a chat, where an icon cannot go.
   */
  it('never spells a mark into a sentence', () => {
    // The whole retired vocabulary, plus the two chrome marks.
    const RETIRED = [...'▲◆■●✚★◈❖✦⬢◉✤▦▨❋✓◇←✕▾♪♦'];
    for (const s of CATALOGUES) {
      for (const text of everyString(s)) {
        for (const mark of RETIRED) {
          expect(text, `${s.locale}: "${text}" spells the mark ${mark}`).not.toContain(mark);
        }
      }
    }
  });

  it('writes no em dash in a direction’s own name or note', () => {
    for (const s of CATALOGUES) {
      for (const theme of THEMES) {
        for (const text of [theme.name[s.locale], theme.note[s.locale]]) {
          expect(text, `${theme.id} · ${s.locale}: "${text}" carries an em dash`).not.toContain(
            '—',
          );
          expect(text, `${theme.id} · ${s.locale}: "${text}" carries an en dash`).not.toContain(
            '–',
          );
        }
      }
    }
  });
});

/**
 * A SENTENCE THAT IS THE SAME IN BOTH LANGUAGES IS A SENTENCE NOBODY WROTE
 * TWICE (2026-09-09, Marc: *"make sure all translations are done correctly. no
 * hardcoded fr or en"*).
 *
 * The catalogue being a typed object makes a MISSING sentence a type error, and
 * the rules above make a badly TYPESET one a test failure. What neither can see
 * is a French entry holding the English words: it is present, it is correct
 * French typography, and it is not French. This walks the two catalogues in
 * parallel, calls every function on the same sample facts, and reports any
 * value that came out identical.
 *
 * The allowed list is the exception and it is short on purpose. Every entry is
 * a word Québec French genuinely writes the same way, or the name of a language
 * said in its own language. A new name on this list is a decision somebody has
 * to defend in review; a new name NOT on it is an untranslated string.
 */
const SAME_IN_BOTH: readonly string[] = [
  // Québec French writes these words exactly as English does.
  'AUTO',
  'CACHE',
  'DESTINATIONS',
  'DISTANCE',
  'MENU',
  'PTS',
  'SITE',
  'TOTAL',
  'UNIQUE',
  // A language picker says each language in that language.
  'ENGLISH',
  'FRANÇAIS',
  // "3 pts" is the abbreviation in both.
  '3 pts',
];

/**
 * ONE MECHANIC, ONE WORD (2026-09-09).
 *
 * The stash had two names in front of the player at once. The CONTROL on the
 * hand said HOLD / GARDER; the CONCEPT — the tappable glossary term, the
 * lesson's own title, Marc's accented spelling pinned two tests down — was
 * STASH / RÉSERVE. The lesson prose used both in one sentence: *"Les cartes
 * pointillées GARDER ... pour la reprendre en RÉSERVE"*. And the catalogue held
 * a third and a fourth word for it (`figure.hold`, `figure.held`) that no path
 * could reach.
 *
 * In French it was worse than untidy. `garder` was also the verb for keeping a
 * BOARD as a world (the ending's whole offer) and the root of `SAUVEGARDER`
 * (back up your worlds) — so one verb meant three different things on screens
 * that can be one tap apart, and a player who learned GARDER on the board read
 * it again about their worlds.
 *
 * `CLAUDE.md`: *"Plain words. No invented vocabulary until a concept has
 * earned a name."* A concept that has earned one has earned exactly one. This
 * is that rule as a test, because it is the kind of drift that arrives one
 * innocent sentence at a time.
 */
describe('one mechanic, one word', () => {
  for (const s of CATALOGUES) {
    it(`labels the stash control with the stash's own name, in ${s.locale}`, () => {
      expect(s.ui.hold, 'the control and the concept have drifted apart').toBe(s.lesson.stash.name);
    });

    /*
     * The retired control words, which must not come back anywhere a player
     * reads. HOLD/GARDER as a standalone token — not `gardées` inside a
     * sentence, and not `SAUVEGARDER`, which is a different mechanic with a
     * different word and is allowed to keep it.
     */
    it(`never calls the stash by its retired name, in ${s.locale}`, () => {
      const retired = s.locale === 'fr-CA' ? /\bGARDER\b/ : /\bHOLD\b/;
      for (const text of everyString(s)) {
        // SAUVEGARDER contains GARDER; the word boundary above already spares
        // it, and this states why rather than leaving the reader to work it out.
        if (/SAUVEGARDER/.test(text)) continue;
        expect(text, `${s.locale}: "${text}" still calls the stash by its old name`).not.toMatch(
          retired,
        );
      }
    });
  }

  /*
   * And the words for the three different KEEPS stay three different words.
   * They can co-occur: the end screen can carry the install note, the back-up
   * note and KEEP THIS BOARD, and a fresh-eyes pass on 2026-09-09 found all
   * three saying "keep" about three different objects.
   */
  it('does not use one verb for the board, the worlds and the app', () => {
    const fr = STRINGS_FR;
    expect(fr.ui.handInstall, 'the install note competes with KEEP THIS BOARD').not.toMatch(
      /\bGarde\b|\bgarder\b/,
    );
    expect(fr.ui.backUpNote, 'the back-up note competes with KEEP THIS BOARD').not.toMatch(
      /\bgarde\b|\bgarder\b/,
    );
  });
});

describe('the two languages say different things', () => {
  /** Both catalogues walked in step, so each pair of values can be compared. */
  function pairs(a: unknown, b: unknown, path: string, out: [string, string][]): void {
    if (typeof a === 'string' && typeof b === 'string') {
      out.push([path, a === b ? a : '']);
      return;
    }
    if (typeof a === 'function' && typeof b === 'function') {
      const fa = a as (...x: unknown[]) => unknown;
      const fb = b as (...x: unknown[]) => unknown;
      const shapes = [
        Array.from({ length: fa.length }, () => 3),
        Array.from({ length: fa.length }, () => 'X'),
        Array.from({ length: fa.length }, (_, i) => (i === 0 ? 3 : 'X') as unknown),
      ];
      for (const args of shapes) {
        try {
          pairs(fa(...args), fb(...args), `${path}(${args.join(',')})`, out);
        } catch {
          // A function wanting a string where we passed a number: another
          // shape above covers it.
        }
      }
      return;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      a.forEach((v, i) => pairs(v, b[i], `${path}[${i}]`, out));
      return;
    }
    if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
      for (const k of Object.keys(a)) {
        const rec = a as Record<string, unknown>;
        pairs(rec[k], (b as Record<string, unknown>)[k], `${path}.${k}`, out);
      }
    }
  }

  it('never gives the English words as the French ones', () => {
    const out: [string, string][] = [];
    pairs(STRINGS_EN, STRINGS_FR, '', out);
    // Three letters, because a bare number or a one-letter mark is the same in
    // both languages by arithmetic rather than by translation.
    const identical = out
      .filter(([, text]) => text !== '' && /[A-Za-zÀ-ÿ]{3}/.test(text))
      .filter(([, text]) => !SAME_IN_BOTH.includes(text));
    expect(
      [...new Set(identical.map(([at, text]) => `${at} = ${JSON.stringify(text)}`))].sort(),
    ).toEqual([]);
  });

  it('still walks enough of the catalogue to mean something', () => {
    const out: [string, string][] = [];
    pairs(STRINGS_EN, STRINGS_FR, '', out);
    // A guard on the walker, not on the words: a `pairs` that stopped
    // descending would pass the test above by seeing nothing at all.
    expect(out.length).toBeGreaterThan(500);
  });
});

describe('Québec French', () => {
  const strings = everyString(STRINGS_FR);

  it('uses the typographic apostrophe, never the typewriter one', () => {
    for (const text of strings) expect(text, text).not.toContain("'");
  });

  /**
   * OQLF, Québec usage: a narrow no-break space before `:` and `%` — and,
   * unlike the French of France, NONE before `;` `!` `?`. Checked on the two
   * signs the English never carries a space before, so a sentence that was
   * translated by ear rather than written gets caught either way.
   */
  it('puts the fine space before a colon and a percent sign, and nowhere else', () => {
    for (const text of strings) {
      expect(text, `"${text}" — a colon without its fine space`).not.toMatch(/[\p{L}\p{N})]:/u);
      expect(text, `"${text}" — a plain space before a colon`).not.toMatch(/ :/);
      expect(text, `"${text}" — a percent without its fine space`).not.toMatch(/\d%/);
      expect(text, `"${text}" — a space before ; ! or ?, which Québec does not write`).not.toMatch(
        new RegExp(`[\\s${NNBSP}${NBSP}][;!?]`, 'u'),
      );
    }
  });

  it('keeps its accents on capitals', () => {
    // The glossary Marc set; spelled without the accent these would be the
    // words a term matcher never finds.
    expect(STRINGS_FR.lesson.stash.name).toBe('RÉSERVE');
    expect(STRINGS_FR.lesson.ripe.terms).toContain('MÛRIT');
    expect(STRINGS_FR.lesson.pop.name).toBe('RÉCOLTER');
  });

  /*
   * Moved 2026-08-29, not deleted: these four words are per DIRECTION now
   * (`Theme.powerNames`), because one shared set could not be right for two
   * fictions. That was `torchlit`'s reason to exist as a second table — it
   * named its ground for what it was MADE of, so its power word was a second
   * word.
   *
   * Retired 2026-09-03 (D12): `torchlit` is gone and `daylight` was reskinned
   * onto settlement's own names, so both shipped directions now say a power
   * with the SAME word as the ground — settlement's whole argument (D7) is
   * true of the entire registry, not one entry in it. Nothing here still
   * demonstrates the split; what stays worth pinning is that `powersOf` reads
   * Marc's accented Québec spelling for every direction, not just one.
   */
  it('names the four powers by Marc’s words, accents kept, in every shipped direction', () => {
    for (const theme of [SETTLEMENT, DAYLIGHT]) {
      // Each direction says its powers with its own ground names now, which is
      // the whole argument for the reskin (D7, D12) — so the two tables agree.
      expect(powersOf(theme, 'fr-CA')).toEqual(namesOf(theme, 'fr-CA'));
      expect(powersOf(theme, 'en')).toEqual(namesOf(theme, 'en'));
    }
    expect(powersOf(SETTLEMENT, 'fr-CA')).toEqual({
      green: 'FERME',
      yellow: 'MARCHÉ',
      red: 'CARRIÈRE',
      blue: 'CHEMINS',
    });
  });
});

describe('English', () => {
  it('carries no fine space — it never did', () => {
    for (const text of everyString(STRINGS_EN)) expect(text).not.toContain(NNBSP);
  });
});

describe('the formats', () => {
  it('groups French thousands with the fine space from five digits, English never', () => {
    expect(fmtInt(1204, 'fr-CA')).toBe('1204');
    expect(fmtInt(12345, 'fr-CA')).toBe(`12${NNBSP}345`);
    expect(fmtInt(1234567, 'fr-CA')).toBe(`1${NNBSP}234${NNBSP}567`);
    expect(fmtInt(-12345, 'fr-CA')).toBe(`-12${NNBSP}345`);
    expect(fmtInt(12345, 'en')).toBe('12345');
  });

  it('writes a percent each language’s way', () => {
    expect(fmtPct(12, 'en')).toBe('12%');
    expect(fmtPct(1.2, 'en')).toBe('1.2%');
    expect(fmtPct(12, 'fr-CA')).toBe(`12${NNBSP}%`);
    expect(fmtPct(1.2, 'fr-CA')).toBe(`1,2${NNBSP}%`);
  });

  it('counts retries each language’s way', () => {
    expect([1, 2, 3, 4, 11, 21].map((n) => ordinal(n, 'en'))).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '21st',
    ]);
    expect([1, 2, 3, 21].map((n) => ordinal(n, 'fr-CA'))).toEqual(['1er', '2e', '3e', '21e']);
  });
});

describe('which language a device opens in', () => {
  it('follows the device, any French to Québec French, any English to English', () => {
    expect(pickLocale(['fr-FR', 'en-US'])).toBe('fr-CA');
    expect(pickLocale(['fr'])).toBe('fr-CA');
    expect(pickLocale(['en-GB'])).toBe('en');
    expect(pickLocale(['EN'])).toBe('en');
    expect(pickLocale(['de-DE', 'en-US'])).toBe('en');
  });

  it('falls back to French — Marc’s ruling — when the device speaks neither', () => {
    expect(pickLocale(['de-DE'])).toBe('fr-CA');
    expect(pickLocale([])).toBe('fr-CA');
  });
});
