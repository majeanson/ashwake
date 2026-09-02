/**
 * RUNNING DRY — the third sound this game has, and the one nothing played
 * (2026-09-02).
 *
 * Every direction has declared a `voice.dry` block since the rules were lifted,
 * `shell/voice.ts` exports `dry()`, and **no caller ever existed** — so the
 * theme carried a tuned note per direction that could not sound. Found by the
 * same consumer-grep that found the signpost and `?ff=`.
 *
 * It is not a death sting: death stays silent, because the dread is the sound.
 * This is the low fade the moment the purse first sinks toward what the next
 * placement costs, which is the moment a run stops being comfortable and starts
 * being a decision.
 *
 * **The hysteresis is the whole file, and it is Ashwake 1's numbers.** A bare
 * threshold chatters: one pop lifts you a tile over the line and the next
 * placement drops you back under it, and a warning that fires every other tap
 * is noise that teaches a player to stop hearing it. So it arms LOW and
 * re-arms HIGH, and the gap between them is wide enough that only a real
 * recovery clears it.
 *
 * Pure, and shaped like `onceARun` and `signpost` for their reason: what the
 * game says is a decision, and a decision belongs somewhere it can be tested
 * without a browser or a speaker.
 */

/** How close to the next placement's cost counts as running dry. */
const WARN_WITHIN = 3;

/** How far clear of it a run must climb before the warning re-arms. */
const CLEAR_BY = 6;

export type Dryness = {
  /** Tiles in the purse right now. */
  readonly tiles: number;
  /** What the next placement costs. */
  readonly cost: number;
  /** Whether the warning is currently standing. */
  readonly warned: boolean;
};

/**
 * Whether the warning should be standing after this action.
 *
 * The caller plays the note on the edge — `false` to `true` — and holds the
 * answer for the next call. Returning the STATE rather than "should I play"
 * keeps the latch outside this function, which is what makes it pure.
 *
 * At zero tiles the warning does not arm: a purse that is already empty is a
 * run that is already over, and the ending has its own voice.
 */
export function runningDry(now: Dryness): boolean {
  if (now.warned) return now.tiles < now.cost + CLEAR_BY;
  return now.tiles > 0 && now.tiles < now.cost + WARN_WITHIN;
}
