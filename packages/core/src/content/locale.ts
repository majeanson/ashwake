/**
 * The languages the game speaks (2026-08-28, Marc: "introduce i18n for
 * fr(qc) first, then en").
 *
 * Two, and the order is the ruling: Québec French is the language a device
 * gets when it has not said otherwise, English is the one every string was
 * first written in. A third would be one more entry here and one more
 * catalogue in `text/` — the `Strings` type is what makes a missing sentence
 * a type error rather than a blank card.
 */
export type Locale = 'fr-CA' | 'en';

export const LOCALES: readonly Locale[] = ['fr-CA', 'en'];

/** Marc's ruling: a device that speaks neither gets French. */
export const DEFAULT_LOCALE: Locale = 'fr-CA';

export const isLocale = (value: unknown): value is Locale => value === 'fr-CA' || value === 'en';

/**
 * Which language a device should open in, from the tags it prefers in order
 * (`navigator.languages`, or one saved choice). Pure: the shell reads the
 * browser, this only decides. Any French — `fr`, `fr-CA`, `fr-FR` — is
 * Québec French here, because there is one French catalogue and it is that
 * one; any English is English; anything else is the default.
 */
export function pickLocale(candidates: readonly string[]): Locale {
  for (const candidate of candidates) {
    const tag = candidate.trim().toLowerCase();
    if (tag === 'fr' || tag.startsWith('fr-')) return 'fr-CA';
    if (tag === 'en' || tag.startsWith('en-')) return 'en';
  }
  return DEFAULT_LOCALE;
}
