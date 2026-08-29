import { isLocale, pickLocale } from '@content/locale';
import { stringsFor } from '@text/index';
import type { Strings } from '@text/Strings';
import { readLocale } from './storage';

/**
 * The catalogue to speak in before React has an opinion.
 *
 * Two things need words outside the tree: the boot-failure panel, which exists
 * for the moments React is what broke, and the error boundary that hands it a
 * render error. Both are edges, and both resolve the language exactly the way
 * `useDevice` does — a device that has been asked answers for itself, one that
 * has not lets the phone answer, with French as the fallback for a device that
 * speaks neither (D4).
 *
 * One function rather than two copies, because the two copies would be a
 * failure panel and a running game disagreeing about what language a player
 * reads — on the one screen where being wrong is least forgivable.
 */
export function bootStrings(): Strings {
  const kept = readLocale();
  return stringsFor(kept !== null && isLocale(kept) ? kept : pickLocale(navigator.languages));
}
