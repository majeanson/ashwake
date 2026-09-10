/**
 * The board, felt (2026-09-08).
 *
 * The one sense this game has never used, and the only one a phone has that a
 * desktop does not. Sound exists and ships off by default because Marc chose a
 * silent 1.0 and *"a phone game that surprises a quiet room is uninstalled"* —
 * the whole reason that argument holds is that sound leaves the phone. A buzz
 * does not. It is the feedback a silent player can still have.
 *
 * ## What it is allowed to be
 *
 * **Short, and rare.** Every pattern here is under 40ms, which is a tick
 * rather than a rumble, and only three moments fire at all: a tile landing, a
 * pocket popping, a destination claimed. Placement is the one that happens
 * often, and it is the shortest. A game that buzzes on every touch is a game
 * played with haptics off.
 *
 * **Never a substitute for a sentence.** Nothing here is the only report of
 * anything: every moment it marks already has a receipt, a toast or a card.
 * A buzz that carried information would be information a deaf-to-touch device
 * never receives, and the target device may well be one — see below.
 *
 * ## Where it does and does not exist
 *
 * `navigator.vibrate` is a live API on Android's browsers and **is not
 * implemented in Safari on iOS at all** — no prefix, no permission prompt, no
 * partial support. So this module is a no-op on an iPhone and always will be,
 * and that is stated here rather than discovered later. The ledgers put Marc
 * on Android (`LOG.md`: *"On Android, BACK with the manual open used to..."*),
 * which is why it is worth building; if that is wrong, this costs one flag
 * that does nothing and no player ever sees it.
 *
 * The capability check is the feature test rather than a user-agent sniff, so
 * a browser that gains or loses the API is right without an edit here.
 *
 * ## Why it is off by default
 *
 * `CLAUDE.md`: *every system ships behind a flag or a tuning dial that zeroes
 * it, defaulting off.* `ui.haptics` is that flag. It also happens to be the
 * right default on its own merits — a buzz nobody asked for is the same
 * intrusion an unexpected noise is, one room quieter.
 */

/** The three moments, and the pattern each one is. Milliseconds. */
const PATTERNS = {
  /** A tile landing: the lightest thing here, because it is the frequent one. */
  place: 12,
  /**
   * A pocket popping — the game's loudest moment, so the only one that is a
   * pattern rather than a tick. Two beats, not three: a pop is an event, and
   * a rhythm long enough to have a shape is long enough to be in the way.
   */
  pop: [18, 40, 26],
  /** A destination claimed. Between the two, because the moment is. */
  claim: 22,
} as const satisfies Record<string, number | readonly number[]>;

type Buzz = keyof typeof PATTERNS;

/**
 * Whether this device can do anything at all.
 *
 * Exported so SETTINGS can decline to offer a switch that could never do
 * anything — the registry's own rule about `wired`, applied one level down to
 * the DEVICE rather than to the build. A toggle that lies is worse than no
 * toggle, and on an iPhone this toggle would lie.
 */
export const canBuzz = (): boolean =>
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

/**
 * Buzz, if the device can and the caller says so.
 *
 * `on` is passed in rather than read from a module-level global for the same
 * reason `voice` takes its theme: this file decides what a moment FEELS like
 * and never decides whether the player wanted it.
 *
 * Wrapped, because `vibrate` throws on a page that has never been interacted
 * with in some browsers, and a thrown haptic must never take a placement with
 * it. Failing silently is right here in a way it usually is not: there is no
 * degraded mode to fall back to and nothing a player could do about it.
 */
export function buzz(on: boolean, which: Buzz): void {
  if (!on || !canBuzz()) return;
  try {
    navigator.vibrate(PATTERNS[which] as number | number[]);
  } catch {
    // A device that declines is a device without haptics. Nothing else changes.
  }
}

/** Stop any pattern in flight — the switch being turned OFF, mid-buzz. */
export function stopBuzz(): void {
  if (!canBuzz()) return;
  try {
    navigator.vibrate(0);
  } catch {
    // See `buzz`.
  }
}
