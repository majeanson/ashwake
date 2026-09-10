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

export const ALLOW: readonly Ruling[] = [
  {
    id: 'apps/game/src/board/rings.ts#Ring.width',
    on: '2026-09-09',
    why:
      'Marc, asked whether the board reads better at the three authored ring ' +
      'widths: "fine as is, ill correct in the future if ever." So the hard-coded ' +
      '0.16 band is the ruling and the authored numbers stay dead ON PURPOSE. ' +
      'Honouring them makes every outline thinner than the one drawn today and ' +
      'the legal edge — the most-used affordance on the board — loses 45% of its ' +
      'weight. `board/rings.ts` carries the argument. Do not wire without asking.',
  },
  {
    id: 'apps/game/src/shell/keeper.ts#Keeper.alive',
    on: '2026-09-02',
    why:
      'It has no production consumer and must not have one: a caller that ' +
      'branched on it would be a second place deciding whether a session is ' +
      'over, which is what `drop` exists to prevent. It is the only thing that ' +
      'can check the promise the file is built on. `IMPROVEMENTS.md` B9.4.',
  },
  {
    id: 'apps/game/src/shell/store.ts#Said.brief',
    on: '2026-09-08',
    why:
      'Offered the three readings — cut the path, wire one caller, leave it — ' +
      'Marc chose to leave it. Built and unreachable until Session A or the ' +
      'stranger names a moment that wants a receipt nobody has to put down. ' +
      '`NEXT.md` §5c, and DEFERRED rather than settled.',
  },
  {
    id: 'apps/game/src/shell/storage.ts#isFreeSlot',
    on: '2026-09-09',
    why:
      'Kept when KEEP THE SEED was removed and took `settleSlot` with it: it is ' +
      "the VIRGIN-world question, and `meta/world.ts`'s `hasBeenPlayed` under it " +
      "is read by the KEEP THIS BOARD picker. Stated at `App.tsx`'s removal note.",
  },
  {
    id: 'packages/core/src/meta/route.ts#HOME',
    on: '2026-08-30',
    why:
      'It is what "no query at all" IS, and the parser reads as intent ' +
      'with it. `searchFor`, its neighbour, WAS the deletion D9 implied and is ' +
      'gone. `INTERACTIONS.md`.',
  },
  {
    id: 'apps/game/src/ui/Confirming.tsx#ConfirmingProps.holdMs',
    on: '2026-09-10',
    why:
      'A test timer control, not a missing caller — and the distinction is ' +
      'the one `CLAUDE.md` draws about `perkAt`. `perkAt` was a hook the GAME ' +
      'should have passed and did not, so a real find said the wrong sentence. ' +
      'Nothing in this game wants a two-tap control to wait a different length, ' +
      'so there is no caller to be missing. Its neighbour `className` was cut ' +
      'for having no caller AND no reason; this one has the reason.',
  },
];

/** Index, so a pass can ask in one call. */
const BY_ID = new Map(ALLOW.map((r) => [r.id, r]));

export const ruledOn = (id: string): Ruling | undefined => BY_ID.get(id);

/** A ruling whose reason has run out is a finding of its own. */
export function expired(today: string): readonly Ruling[] {
  return ALLOW.filter((r) => r.until !== undefined && r.until < today);
}
