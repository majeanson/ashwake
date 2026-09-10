/**
 * What the sweep has already been told, and by whom (`PASS.md` P1.7).
 *
 * **The report's signal is only as good as this file.** The 2026-09-08 sweep
 * found one genuinely dead export in a list of sixteen; the other fifteen were
 * decisions somebody had already taken, re-derived from scratch because there
 * was nowhere to write them down. A ritual that re-adjudicates its own settled
 * cases every time is a ritual that stops being run — `CLAUDE.md` says so, and
 * this file is the answer to it.
 *
 * **A ruling is not a mute.** Every entry carries who ruled, when, and why, and
 * an entry with `until` is a ruling with an expiry — the sweep says so in the
 * report rather than dropping it silently, because a temporary exemption that
 * outlives its reason is how dead code becomes permanent.
 *
 * The `id` is `path#symbol`, from the finding itself. Line numbers are
 * deliberately not part of it: a ruling keyed on a line is re-adjudicated the
 * first time somebody adds an import above it.
 */
export type Ruling = {
  readonly id: string;
  /** The date it was ruled, and the ledger a reader can go and check. */
  readonly on: string;
  readonly why: string;
  /** `YYYY-MM-DD` after which this exemption is itself a finding. */
  readonly until?: string;
};

export const ALLOW: readonly Ruling[] = [];

/** Index, so a pass can ask in one call. */
const BY_ID = new Map(ALLOW.map((r) => [r.id, r]));

export const ruledOn = (id: string): Ruling | undefined => BY_ID.get(id);

/** A ruling whose reason has run out is a finding of its own. */
export function expired(today: string): readonly Ruling[] {
  return ALLOW.filter((r) => r.until !== undefined && r.until < today);
}
