import { describe, expect, it } from 'vitest';
import { LOCALES, pickLocale } from '@content/locale';
import { STRINGS_EN } from './en';
import { STRINGS_FR } from './fr-CA';
import { fmtInt, fmtPct, NNBSP, ordinal } from './format';
import { stringsFor } from './index';
import type { Strings } from './Strings';
import { SETTLEMENT } from '@theme/themes/settlement';
import { TORCHLIT } from '@theme/themes/torchlit';
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
   * fictions — and two of them, CENDRES and COURANT, are torchlit's own ground
   * names in French. They are still Marc's words and still asserted, one layer
   * down, where a direction that wants its own can have them.
   */
  it('names the four powers by Marc’s words, in the direction that uses them', () => {
    expect(powersOf(TORCHLIT, 'fr-CA')).toEqual({
      green: 'FOULE',
      yellow: 'COMPAGNIE',
      red: 'CENDRES',
      blue: 'COURANT',
    });
    // The direction that ships says its powers with its ground names, which is
    // the whole argument for it (D7) — so the two tables are the same table.
    expect(powersOf(SETTLEMENT, 'fr-CA')).toEqual(namesOf(SETTLEMENT, 'fr-CA'));
    expect(powersOf(SETTLEMENT, 'en')).toEqual(namesOf(SETTLEMENT, 'en'));
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
