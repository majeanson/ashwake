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
function shareUrl(params: Readonly<Record<string, string>>): string {
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
export async function share(
  subject: ShareSubject,
  s: Strings,
  name: string,
  /**
   * The run's own picture, where one could be drawn (2026-09-02).
   *
   * Optional, and every rung below survives its absence: a browser with no
   * canvas, an image that would not decode, a share sheet that refuses files —
   * each falls through to exactly the text-and-link share this function did
   * before the card existed. See `shell/shareCard.ts` for why the card matters
   * at all.
   */
  card?: Blob | null,
): Promise<ShareResult> {
  const { text, params } = shareOf(name, subject, s);
  const url = shareUrl(params);
  const file = card == null ? null : new File([card], 'ashwake-run.png', { type: 'image/png' });

  // `navigator.share` is undefined on desktop, and on some in-app browsers the
  // property exists while the call rejects. Both end at the clipboard.
  if (typeof navigator.share === 'function') {
    try {
      // The picture first, where the platform will take one. `canShare` is the
      // only honest test: a sheet handed files it will not accept rejects the
      // whole share, which would lose the link as well as the card.
      if (file !== null && navigator.canShare?.({ files: [file] }) === true) {
        await navigator.share({ text, url, files: [file] });
        return 'shared';
      }
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
    /*
     * DESKTOP IS DISCORD AND TWITTER (Ashwake 1's launch audit, 2026-08-20).
     *
     * There is no share sheet here to hand a picture to, and a downloaded file
     * rots in a folder — but one Ctrl+V posts the actual card where a link
     * alone would be scrolled past. Written as one clipboard item carrying both
     * the image and the text, so a target that takes only text still gets the
     * whole share rather than nothing.
     *
     * Its own try: image clipboard writes are refused by permission policy on
     * some browsers and by nothing at all on others, and that refusal must fall
     * through to the plain text copy rather than out of the function.
     */
    if (card != null && typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': card,
            'text/plain': new Blob([`${text} ${url}`], { type: 'text/plain' }),
          }),
        ]);
        return 'copied';
      } catch {
        // Images refused. The text below is the share that always works.
      }
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export type HandOffResult = 'shared' | 'downloaded' | 'copied' | 'failed';

/**
 * Get a BACKUP off the phone, by whatever door this platform has.
 *
 * The same ladder the run share climbs, one rung longer, and for the same
 * reasons: on iOS the share sheet is the only route to Files or to a message
 * to yourself, on a desktop the clipboard is what people actually use, and a
 * download is the floor everywhere else. A file rather than a link because a
 * backup is far past any URL length that survives a chat app.
 *
 * The rung ORDER is Ashwake 1's and was paid for: the download sits above the
 * clipboard because a file is a thing a player still has next month, and below
 * the sheet because a dismissed sheet must not fall through into downloading
 * the file behind their back — hence the AbortError branch, which reports
 * success and shows nothing.
 */
export async function handOff(name: string, text: string): Promise<HandOffResult> {
  try {
    const file = new File([text], name, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] }) === true) {
      await navigator.share({ files: [file], title: name });
      return 'shared';
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return 'shared';
  }

  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    // Revoked on a later turn: revoking synchronously can beat the download
    // starting on some browsers, which loses the file silently.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return 'downloaded';
  } catch {
    // Downloads blocked — an in-app WebView, most likely, which is exactly the
    // storage that evaporates. So the clipboard below matters most precisely
    // where the file route is least available.
  }

  try {
    if (navigator.clipboard === undefined) return 'failed';
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
