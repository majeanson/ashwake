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
type Ruling = {
  readonly id: string;
  /** The date it was ruled, and the ledger a reader can go and check. */
  readonly on: string;
  readonly why: string;
  /** `YYYY-MM-DD` after which this exemption is itself a finding. */
  readonly until?: string;
};

/**
 * ASHWAKE 1'S SURFACE, kept on purpose (`CLAUDE.md`, ruled 2026-09-08).
 *
 * "The four in `packages/core/src/engine` and `content` were left exported on
 * purpose, because that code is Ashwake 1's lift and its surface is Ashwake
 * 1's." The first machine run of the module pass found twelve of them rather
 * than four, and the ruling is the same ruling: `pnpm sim` proves byte for
 * byte that these rules did not move, and a rule that did not move should not
 * have its shape edited to quiet a report. Demoting `Cells` or `Destination`
 * would also make the next diff against `../tiles` read as a change.
 *
 * **It is declared ABOVE `ALLOW` and not below it**, because `ALLOW` spreads
 * it: a `const` read before its own declaration is a TDZ throw at import, and
 * this repository paid for that lesson once already (`LOG.md` Session 77).
 *
 * **This is also the one place in this file where the reason is shared**, because
 * twelve paragraphs saying one thing is how the argument stops being read —
 * and the entries are enumerated rather than matched by directory so that a
 * THIRTEENTH export appearing in the lift is a finding somebody looks at.
 */
const LIFT_SURFACE: readonly Ruling[] = (
  [
    'packages/core/src/content/goals.ts#Goal',
    'packages/core/src/content/locale.ts#DEFAULT_LOCALE',
    'packages/core/src/engine/rules.ts#Cells',
    'packages/core/src/engine/rules.ts#isSolid',
    'packages/core/src/engine/rules.ts#questMet',
    'packages/core/src/engine/rules.ts#worthParts',
    'packages/core/src/engine/state.ts#Phase',
    'packages/core/src/engine/world.ts#Terrain',
    'packages/core/src/engine/world.ts#Destination',
    'packages/core/src/engine/world.ts#blockDestination',
    'packages/core/src/engine/world.ts#Find',
    'packages/core/src/engine/world.ts#blockFind',
  ] as const
).map((id) => ({
  id,
  on: '2026-09-08',
  why:
    'Ashwake 1’s lift keeps Ashwake 1’s surface — see `LIFT_SURFACE` below ' +
    'this list for the whole argument, and `CLAUDE.md` for the ruling.',
}));

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
  {
    id: 'packages/core/src/text/Strings.ts#Strings.luckCore',
    on: '2026-09-10',
    why:
      'The report asked for the twin clause to be shared as a string, and the ' +
      'code already shares it: `en.ts` and `fr-CA.ts` each hold a module-level ' +
      '`LUCK_CORE` that both the LUCK lesson and the stat note interpolate. The ' +
      'clause cannot be read off `Strings` at those two sites because they sit ' +
      'inside the literal that DEFINES it, which is why the const exists. What ' +
      'is left is `prose.pin.test.ts`’s handle on the clause itself, and ' +
      'deleting it would either unpin a sentence three doors share or export a ' +
      'const for a test to reach. Its siblings `rareStar`, `lastGaspRule` and ' +
      '`lensHint` are all read at runtime; this one is the odd shape, not a gap.',
  },
  {
    id: 'packages/core/src/text/Strings.ts#Strings.typography',
    on: '2026-09-10',
    why:
      'A language’s own terminal punctuation — French counts « » and …, ' +
      'English does not — declared per locale so `lessons.test.ts` can ask ' +
      'whether every lesson ends in a sentence without hard-coding one ' +
      'language’s three marks. DELIBERATELY unread at runtime: nothing appends ' +
      'punctuation any more (`shell/signpost.ts` records the day that stopped, ' +
      'and the strings end themselves), so a runtime reader would be a second ' +
      'authority on a rule that has one. The declaration says “where a test ' +
      'needs them” out loud. The field under it carries its own entry — a ruling ' +
      'here does not reach a subtree, and saying it did was the same mistake ' +
      '`CLAUDE.md` warns about two paragraphs from the end.',
  },
  {
    id: 'packages/core/src/text/Strings.ts#Strings.typography.sentenceEnd',
    on: '2026-09-10',
    why:
      'The rule itself, under the ruling directly above. Stated as its own id ' +
      'rather than left to that one: a ruling on `Strings.typography` does NOT ' +
      'cover the field inside it, and the entry above claimed it did until this ' +
      'one was written the same hour. `CLAUDE.md`: a comment that asserts an ' +
      'invariant is not the invariant. Prefix matching was the other fix and is ' +
      'the wrong one here — the catalogue is six levels deep and 600 sentences ' +
      'wide, and one ruling near its root would mute a wing of it.',
  },
  {
    id: 'scripts/sweep/finding.ts#Finding.grade',
    on: '2026-09-10',
    why:
      'A union used as a LABEL, not as a switch: every finding’s grade is ' +
      'PRINTED in the report’s first column, and `index.ts` never asks which ' +
      'one it is. The branch pass looks for comparisons, and printing is not ' +
      'comparing — which is its own noise class, worth naming once here so the ' +
      'next reader of a “never compared against” row asks whether the value ' +
      'is a decision or a word. Nothing should branch on it: the reader grades ' +
      'the finding, the tool only says how sure it is.',
  },
  {
    id: 'packages/core/src/sim/run.ts#RunOptions.maxSteps',
    on: '2026-09-10',
    why:
      'A hard stop, not a dial: `playRun` defaults it to 20000 and its own note ' +
      'calls hitting that a finding, so a GAME caller supplying one would be ' +
      'asking for a shorter run than the economy has. It had no supplier at all ' +
      'until this pass, which meant ‘capped’ was the one cause of death this ' +
      'repository had never produced; `sim.test.ts` plays one run against a cap ' +
      'of ten now, so the guard is proved and the row reads “supplied by 1 ' +
      'test” rather than “by nobody”. That is the shape it should keep.',
  },
  {
    id: 'scripts/sweep/allow.ts#Ruling.until',
    on: '2026-09-10',
    why:
      'This file’s own expiry, and the pass is right that nothing sets one: no ' +
      'ruling here is temporary yet. It is not dead surface — `expired()` reads ' +
      'it and the report prints what it finds, so the machinery for a ruling ' +
      'that outlives its reason is built and waiting for the first one. The ' +
      'docblock at the top of this file is where that promise is made.',
  },
  {
    id: 'scripts/notices.ts#nameRecord(wanted)',
    on: '2026-09-10',
    why:
      'An OpenType nameID, and `0` is the copyright record — the only one this ' +
      'script wants. The literal is what makes the call site readable: ' +
      '`nameRecord(sfntNameTable(b), 0)` says WHICH record out of a numbered ' +
      'table. This is the noise class `PASS.md` P1.6 predicted out loud when it ' +
      'shipped the argument pass report-only: `0`, `[]` and `null` are ' +
      'legitimate values all over this codebase, and the pass earns its place ' +
      'on the FOG class rather than on this one.',
  },
  {
    id: 'apps/game/src/board/camera.ts#screenOf(h)',
    on: '2026-09-10',
    why:
      'A FINDING for Marc rather than a fix, and it is in `NEXT.md` §1: every ' +
      'production call site maps the GROUND plane, so the board’s fit and its ' +
      'extents ignore how tall a tile stands — up to 0.55 hex radii of lift ' +
      'once `relief.ts` adds four contour bands and a rarity’s stand. Not dead ' +
      'generality: `camera.test.ts` passes a real height, and h=0 is CORRECT for ' +
      'the drag inverse. Whether the fit should include lift changes the framing ' +
      'of the first minute, which `CLAUDE.md` says is not guessed at from a ' +
      'session with no phone in it.',
  },
  ...LIFT_SURFACE,
];

/** Index, so a pass can ask in one call. */
const BY_ID = new Map(ALLOW.map((r) => [r.id, r]));

export const ruledOn = (id: string): Ruling | undefined => BY_ID.get(id);

/** A ruling whose reason has run out is a finding of its own. */
export function expired(today: string): readonly Ruling[] {
  return ALLOW.filter((r) => r.until !== undefined && r.until < today);
}
