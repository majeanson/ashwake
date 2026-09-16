/**
 * WHEN THE INSTALL OFFER IS DUE (Marc, 2026-09-16).
 *
 * Asked when the offer should come, he took the loudest door and the gentlest
 * repeat: **right away, on the front door**, and **again after a week** on a
 * device that stayed in the browser — then never. Until then it came once
 * ever, on the end screen of a run, which is a moment a friend who closes the
 * tab mid-run never reaches; and the iPhone sentence was marked "said" when
 * the app mounted rather than when the ending showed it, so most phones spent
 * their one showing on a screen they never saw.
 *
 * Pure, with the clock handed in, for the reason every rule in this
 * repository is: `shell/platform.ts` samples `Date.now()` and the storage,
 * this decides, and `installDue.test.ts` walks the calendar without a browser.
 *
 * `shownAt` is every moment this device has been shown the offer, oldest
 * first. A device that saw the old once-ever offer is recorded as shown at 0
 * (`storage.ts`), which is "long ago": it gets its second and last showing on
 * its next visit, and the rule needs no special case for it.
 */

/** How long after the first showing the second and last one comes. */
export const INSTALL_AGAIN_MS = 7 * 24 * 60 * 60 * 1000;

/** How many times a device is shown the offer, ever. */
const INSTALL_SHOWINGS = 2;

export function installOfferDue(shownAt: readonly number[], now: number): boolean {
  if (shownAt.length === 0) return true;
  if (shownAt.length >= INSTALL_SHOWINGS) return false;
  const last = shownAt[shownAt.length - 1] ?? 0;
  return now - last >= INSTALL_AGAIN_MS;
}
