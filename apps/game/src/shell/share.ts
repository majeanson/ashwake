import { shareOf, type ShareSubject } from '@meta/share';
import type { Strings } from '@text/Strings';

/**
 * Handing a run to another person (Stage 4, 2026-08-29).
 *
 * **This is the game's entire distribution mechanism.** There is no backend, no
 * account and no store listing: a run reaches somebody because a player pasted
 * a sentence and a link into a chat. `meta/share.ts` has owned the words and
 * the query since the rules were lifted, and had no caller at all — the one
 * string the project's growth depends on was reachable from nothing.
 *
 * This file is only the edge the core refuses to be: `location`, the share
 * sheet and the clipboard.
 *
 * **The link is built from the ORIGIN, never from `location.href`.** A link
 * built from the current URL drags the sender's own overrides along —
 * `?tilt=`, `?theme=`, `?taught=`, `?end=` — and hands a stranger a board bent
 * to somebody else's debugging. `shareOf` returns only the params that belong
 * in it, which is what makes that mistake impossible to make here.
 */

export type ShareResult = 'shared' | 'copied' | 'failed';

/** The link a shared run travels as: this origin, and nothing of this session. */
export function shareUrl(params: Readonly<Record<string, string>>): string {
  const url = new URL(location.origin);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

/**
 * Say it, and hand it over.
 *
 * The share sheet first, because on a phone it is the thing that reaches the
 * chat the player is already in; the clipboard when there is no sheet, which
 * is every desktop browser. A cancelled sheet is not a failure — the player
 * changed their mind, and telling them something went wrong would be a lie —
 * so it comes back as `shared` and the screen says nothing.
 */
export async function share(subject: ShareSubject, s: Strings, name: string): Promise<ShareResult> {
  const { text, params } = shareOf(name, subject, s);
  const url = shareUrl(params);

  // `navigator.share` is undefined on desktop, and on some in-app browsers the
  // property exists while the call rejects. Both end at the clipboard.
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ text, url });
      return 'shared';
    } catch (error) {
      // AbortError is the player closing the sheet. Anything else is a sheet
      // that would not open, and falls through to the clipboard.
      if (error instanceof Error && error.name === 'AbortError') return 'shared';
    }
  }

  try {
    // The property ACCESS throws outside a secure context, not just the call —
    // Ashwake 1 learned that on a panel whose own error handler then ate the
    // report it was copying. The try has to wrap the reach, not the promise.
    if (navigator.clipboard === undefined) return 'failed';
    await navigator.clipboard.writeText(`${text} ${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
