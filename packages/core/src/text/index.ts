import type { Locale } from '@content/locale';
import { STRINGS_EN } from './en';
import { STRINGS_FR } from './fr-CA';
import type { Strings } from './Strings';

export type { Strings } from './Strings';
export { STRINGS_EN } from './en';
export { STRINGS_FR } from './fr-CA';
export { fmt1, fmtInt, fmtPct, ordinal, NNBSP } from './format';

/** The words for one language. The only way in; the shell calls it once per
 *  session with `pickLocale(navigator.languages)` or the saved choice. */
export function stringsFor(locale: Locale): Strings {
  return locale === 'fr-CA' ? STRINGS_FR : STRINGS_EN;
}
