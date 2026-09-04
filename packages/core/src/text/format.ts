import type { Locale } from '@content/locale';

/**
 * Numbers, the way each language writes them.
 *
 * Hand-rolled rather than `Intl.NumberFormat`, deliberately: the pins in
 * `view/*.pin.test.ts` are byte-exact, and the one thing a catalogue must
 * never do is print a score one way on the phone and another way under
 * Node's ICU. Two locales, two rules, written out.
 *
 * English prints exactly what it printed before this file existed — a bare
 * `${n}` — which is what keeps the English snapshots unchanged.
 */

/** The narrow no-break space Québec typography puts before `:` `;` `!` `?`
 *  `%` and between digit groups (OQLF). One constant, so a French sentence
 *  never has to spell `U+202F` itself. */
export const NNBSP = String.fromCharCode(0x202f);

/** An integer. French groups thousands from five digits up (`12 345`), the
 *  way the OQLF writes them; four-digit numbers stay closed (`1204`). */
export function fmtInt(n: number, locale: Locale): string {
  const plain = String(Math.trunc(n));
  if (locale === 'en') return plain;
  const negative = plain.startsWith('-');
  const digits = negative ? plain.slice(1) : plain;
  if (digits.length < 5) return plain;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
  return negative ? `-${grouped}` : grouped;
}

/**
 * A quantity that can carry one decimal — a pocket's worth, a harvest's size
 * bonus. Rounded to the nearest tenth so float drift (`9.100000000000001`,
 * the sum of many tiles' worth) never reaches the screen, and trimmed to a
 * bare integer wherever the tenth is exactly zero — which is most of the
 * time, since most worths land on a whole number.
 */
export function fmt1(n: number, locale: Locale): string {
  const rounded = Math.round(n * 10) / 10;
  const whole = Math.trunc(rounded);
  const tenths = Math.round(Math.abs(rounded - whole) * 10);
  return tenths === 0 ? fmtInt(whole, locale) : `${fmtInt(whole, locale)}.${tenths}`;
}

/**
 * A percentage from a fraction. `decimals` is how many places to keep once
 * the number is under ten — the rarity odds print `1.2%` and `6%`, and the
 * rule for that rounding belongs to the caller, so it is passed in as the
 * already-rounded number.
 */
export function fmtPct(pct: number, locale: Locale): string {
  if (locale === 'en') return `${pct}%`;
  return `${String(pct).replace('.', ',')}${NNBSP}%`;
}

/**
 * The confessed retry: "2nd try" / "2e essai". English keeps the four
 * suffixes it always had; French has `1er` and then `e` for everything —
 * the masculine forms, because the noun they count (essai) is masculine.
 */
export function ordinal(n: number, locale: Locale): string {
  if (locale === 'fr-CA') return n === 1 ? '1er' : `${n}e`;
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  const ones = n % 10;
  return `${n}${ones === 1 ? 'st' : ones === 2 ? 'nd' : ones === 3 ? 'rd' : 'th'}`;
}

/** English's one plural rule, kept as a helper so the catalogue reads as
 *  prose. French's is different (0 and 1 are singular) and lives in its own
 *  catalogue as `pluriel`. */
export const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);
