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
 * THE TIMELINE'S PER-WORLD FILTER, DEFERRED AT THE CALL SITE (`PASS.md` P10.4).
 *
 * `runsOf(t, slot)`, `streamOf(t, slot)` and `worldEventsOf(t, slot)` take a
 * slot and every caller passes `null`. It is not dead generality and it is not
 * a missing caller: `screens/Fame.tsx` says at the line why, and says it as a
 * decision — *"`null` slot: every world. The diary is the DEVICE's story, and
 * the per-world filter chips arrive with the crossing that makes them mean
 * something."* The chips are unbuilt UI; the readers are ready for them.
 *
 * **These were the last two findings in the first report, and they are here
 * rather than in `MODES.md` because P10.4 is the row that says so**: one home
 * for the ruled-dead, cited by the matrices instead of restated in each. The
 * cost of the other arrangement is on the record twice in one day —
 * `INTERACTIONS.md` carried its own copy of the `previewColour` ruling and
 * had it backwards, because `HexField` started reading the field on 2026-09-08
 * and the prose did not hear about it.
 *
 * `streamOf` is the one to read before deleting the parameter: its shared-run
 * branch (a shared board belongs to no slot, so it shows in the device stream
 * and in no per-world one) is a RULE about the unbuilt screen, and deleting the
 * slot would delete the rule with it.
 */
const TIMELINE_SLOT_FILTER: readonly Ruling[] = (
  [
    'packages/core/src/meta/timeline.ts#runsOf(slot)',
    'packages/core/src/meta/timeline.ts#streamOf(slot)',
  ] as const
).map((id) => ({
  id,
  on: '2026-09-10',
  why:
    'The per-world filter chips are unbuilt and `screens/Fame.tsx` says so at ' +
    'the call site \u2014 see `TIMELINE_SLOT_FILTER`, and read `streamOf`\u2019s ' +
    'shared-run branch before deleting the parameter.',
}));

/**
 * A DECISION RECORD IN CODE — written for whoever reads the source, never for
 * a program (ruled 2026-09-10).
 *
 * Three tables in this repository are design documents that happen to compile.
 * `theme/assets.ts` says so in its first line: "the local copy of the design
 * document's asset sheet", where each slot's `label` and `note` tell whoever
 * fills it what the art has to DO. `sim/policy.ts` gives every policy "the
 * strategy, in one sentence. If it needs two, it is two policies" — a rule
 * about the code, enforced by a reader. `Theme.source` names where a value
 * came from "so a value can be argued with rather than guessed at".
 *
 * These are not the `HudView.hint` shape and the distinction is the whole
 * ruling: that was a SENTENCE THE GAME COMPUTED FOR A PLAYER and no screen
 * printed. These are addressed to a developer, and the source file IS the
 * screen they are printed on. Neither has a reader to be missing.
 *
 * `AssetSlot.tiling` joins them on a checked fact rather than a guess: both
 * slots that claim it are `wired: false`, so it describes only art the
 * renderer does not sample yet — a note to whoever wires them. Its neighbour
 * `wired` was in this list for one draft and is NOT any more, because its
 * claim ("a slot that says false will not appear on screen no matter what you
 * put in it") is checkable and is now a test in `theme.test.ts`. Where a
 * design record makes a claim about BEHAVIOUR, the claim is the test.
 */
const DESIGN_RECORD: readonly Ruling[] = (
  [
    'packages/core/src/theme/assets.ts#AssetSlot.label',
    'packages/core/src/theme/assets.ts#AssetSlot.note',
    'packages/core/src/theme/assets.ts#AssetSlot.tiling',
    'packages/core/src/sim/policy.ts#Policy.note',
    'packages/core/src/theme/tokens.ts#Theme.source',
  ] as const
).map((id) => ({
  id,
  on: '2026-09-10',
  why:
    'A decision record in code, addressed to a developer rather than to a ' +
    'player — see `DESIGN_RECORD` for the argument, and for why this is not ' +
    'the `HudView.hint` shape.',
}));

/**
 * THE HARNESS'S PER-RUN RECORD (ruled 2026-09-10).
 *
 * `RunResult` is one simulated run, and `sim/report.ts` aggregates the columns
 * a table can show — medians over four hundred runs. Three fields are not
 * among them: `policy` and `seed`, which identify a run rather than measure
 * it, and `bestHarvest`, whose POSITION (`bestHarvestAt`) is aggregated while
 * its magnitude is not.
 *
 * Identity is read the moment a single run is inspected instead of counted —
 * `sim.test.ts`'s cap test does exactly that. `bestHarvest` is the one with a
 * real answer available: a median of it would be a column. **That is a golden
 * moved**, and `CLAUDE.md` allows a golden to move only in the commit that
 * gives the reason, so it is a decision rather than hygiene. Written here so
 * the next reader knows the number is already there.
 */
const HARNESS_RECORD: readonly Ruling[] = (
  [
    'packages/core/src/sim/run.ts#RunResult.policy',
    'packages/core/src/sim/run.ts#RunResult.seed',
    'packages/core/src/sim/run.ts#RunResult.bestHarvest',
  ] as const
).map((id) => ({
  id,
  on: '2026-09-10',
  why:
    'The harness’s per-run record — see `HARNESS_RECORD`. Aggregating ' +
    '`bestHarvest` would add a column to `sim.golden.txt`, which is a golden ' +
    'moved and therefore a decision, not a sweep’s to take.',
}));

/**
 * FIELDS IN A SAVED BLOB, WHICH IS `PASS.md` P7'S SUBJECT (ruled 2026-09-10).
 *
 * Both are written into what a device stores and read by nothing. `GameState
 * .version` is the discriminator a migration would switch on, with no
 * migration yet; `HarvestRecord.tiles` is what a pop paid in tiles, kept per
 * harvest for a whole run's log while the end screen counts harvests BY CHOICE
 * instead.
 *
 * Not cut here, and the reason is a hard rule rather than caution: these sit
 * in `packages/core/src/engine`, whose shape `pnpm sim` pins byte for byte,
 * and they are part of a blob already on players' phones. **P7 is the item
 * that is allowed to change what a save looks like**, and it inherited
 * `RunDetail`'s six unread numbers for the same reason.
 *
 * ## P7 RAN, AND RULED THAT BOTH STAY (2026-09-10)
 *
 * It measured before it built, which is what its first row asked for, and the
 * measurement said stop: a world three hundred runs deep is 24 KB, and three
 * worlds with three runs is 2.3% of a 5 MB store. So there is no compaction to
 * ride along with, and each of these is judged on its own twelve bytes.
 *
 *   - **`GameState.version`** stays. It is the one field whose entire purpose
 *     is to be read by code that does not exist yet, it costs about twelve
 *     bytes a saved run, and removing it means the first migration has to add
 *     it back before it can switch on anything. `storage.ts`'s per-key
 *     versioning is the braces; this is the belt.
 *   - **`HarvestRecord.tiles`** stays. It is what one pop paid in TILES, and
 *     the end screen counts harvests by CHOICE instead — but it is a fact
 *     about a harvest that a reader of the log would reasonably expect to
 *     find, in the one record that describes a pop.
 *
 * And `RunDetail`'s six turned out not to be dead at all: they are the run's
 * SHAPE, the hall of fame prints four of nine, and `RunDetail`'s docblock
 * quotes Marc asking for "a 'full detail' of the run". That is a screen
 * decision and it is in `NEXT.md` §1 with both costs measured — see
 * `TIMELINE_SPINE`'s note, and P7.7.
 */
const SAVED_BLOB: readonly Ruling[] = (
  [
    'packages/core/src/engine/state.ts#GameState.version',
    'packages/core/src/engine/state.ts#HarvestRecord.tiles',
  ] as const
).map((id) => ({
  id,
  on: '2026-09-10',
  why:
    'Dead weight in a saved blob, and changing a save is `PASS.md` P7’s job ' +
    'rather than a sweep’s — see `SAVED_BLOB`.',
}));

/**
 * THE TIMELINE'S SPINE, DEFERRED BY RULING (`NEXT.md` §4).
 *
 * A run's HIGHLIGHTS — what was remarkable about it, and how much — are
 * detected, written for every run and every world event, and shown nowhere,
 * because the screen that would show them is the timeline, and the timeline's
 * spine is one of the things `NEXT.md` §4 defers. `DailyEntry.best` is the
 * same shape one row down: today's standing best, stored per daily, printed by
 * no screen that exists.
 *
 * Reported honestly rather than silenced quietly: these are exactly the
 * "sentence the core writes that no screen prints" class, and the only reason
 * they are not findings is that the screen was deliberately not built. If §4
 * ever reopens, this entry is the list of what is already computed and waiting.
 */
const TIMELINE_SPINE: readonly Ruling[] = (
  [
    'packages/core/src/meta/timeline.ts#Highlight.kind',
    'packages/core/src/meta/timeline.ts#Highlight.n',
    'packages/core/src/meta/timeline.ts#RunEntry.highlights',
    'packages/core/src/meta/timeline.ts#DailyEntry.best',
    // The three READERS of that spine, added 2026-09-10: functions that select
    // a run, a world event or a shared board out of the timeline, each with a
    // spec and no screen to call it. `PASS.md` P10 owns the reader table.
    'packages/core/src/meta/timeline.ts#worldEventsOf',
    'packages/core/src/meta/timeline.ts#sharedOf',
    'packages/core/src/meta/timeline.ts#prehistory',
  ] as const
).map((id) => ({
  id,
  on: '2026-09-10',
  why:
    'Computed and waiting for the timeline, whose spine `NEXT.md` §4 defers — ' +
    'see `TIMELINE_SPINE`. Not a gap; a screen nobody has agreed to build.',
}));

/*
 * FIVE THINGS THE HUD WORKED OUT AND NEVER SAID — a list that emptied itself
 * (ruled 2026-09-10, closed 2026-09-16).
 *
 * `pnpm sweep`'s first report found five facts computed on every HUD build and
 * printed by nothing: the colour tally, the bounty, the pockets ready, the
 * spare purse, the guide. `HUD_UNSAID` held them here so the report stopped
 * re-asking a screen question, and `NEXT.md` §1 asked Marc. He answered on
 * 2026-09-16 — print them — and by that evening every one had a reader
 * (`ActionBar`, `shell/onceARun.ts`, `screens/LensPanel`) or was cut
 * (`guide`). Two docblocks that ASSERTED their own consumer were corrected on
 * the way: `questPays` said "the points button wears it" and `pocketsReady`
 * named a label nothing drew — the exact failure `CLAUDE.md` describes. The
 * list is gone because a ruling with no subject is the thing the "match
 * nothing" section exists to catch.
 */

/**
 * A FIELD WHOSE ONLY READER IS THE TEST THAT PROVES IT (ruled 2026-09-10).
 *
 * `CLAUDE.md` already has the founding case and it is deliberate:
 * `keeper.alive` "exists so a test can check a promise no caller may branch
 * on, and says so at its declaration". These are the same shape, and the pass
 * reports them honestly — every row says "though N test read(s) exist" rather
 * than claiming nothing reads them.
 *
 * They divide into three, all legitimate:
 *
 *   - **A ref a test inspects.** `Wiring.saidOnce`, `startedFrom` and
 *     `banked` are React refs the shell mutates; `beginning.test.ts` is what
 *     can see that a door set them. A production reader would be a second
 *     authority, which is `keeper.alive`'s argument exactly.
 *   - **A record the harness writes and a spec reads.** `e2e/audit`'s six
 *     `Finding` fields, `SurfaceSamples.label` and `.face`,
 *     `RunResult.death` and `.steps`, `RngStreams.region`, `Route.seed`.
 *     The instrument's output IS its assertion surface; `fixture.test.ts`
 *     exists because an instrument needs tests of its own.
 *   - **A claim a test now enforces.** `AssetSlot.wired` — "a slot that
 *     says false will not appear on screen no matter what you put in it" —
 *     was in this file for one draft as a design record, and is not any more:
 *     `theme.test.ts` asserts it. **Where a design record makes a claim about
 *     behaviour, the claim is the test**, and this is the one entry here that
 *     earned its place by gaining a reader rather than by argument.
 *
 * `WorldEventEntry.n` is the exception that is really `TIMELINE_SPINE`'s: it
 * is a highlight's magnitude, waiting on the same screen.
 *
 * **AND ONE ENTRY LEFT THIS LIST BY GAINING A CALLER (2026-09-10), which is
 * the outcome this file's docblock says to hope for.** `meta/route#Route.seed`
 * was here for a day. Extracting the boot ladder into `shell/boot.ts` put a
 * validated seed parser and a hand-rolled one in the same function, and the
 * hand-rolled one — `Number(params.get('seed')) || null` — both passed a
 * FRACTIONAL seed through and could not tell 0 from absent. The ladder reads
 * `route.seed` now, so the field has a production reader and this ruling had
 * no subject. **The gate refused to pass until it was removed**, which is
 * exactly what "Rulings that match nothing" is for.
 */
const TEST_IS_THE_READER: readonly Ruling[] = (
  [
    'apps/game/src/shell/beginning.ts#Wiring.saidOnce.current',
    'apps/game/src/shell/beginning.ts#Wiring.startedFrom.current',
    'apps/game/src/shell/beginning.ts#Wiring.banked.current',
    'apps/game/src/shell/cross.ts#Crossed.carried',
    'e2e/audit/audit.ts#Finding.kind',
    'e2e/audit/audit.ts#Finding.where',
    'e2e/audit/audit.ts#Finding.text',
    'e2e/audit/audit.ts#Finding.detail',
    'e2e/audit/audit.ts#Finding.value',
    'e2e/audit/audit.ts#Finding.bar',
    'packages/core/src/engine/rng.ts#RngStreams.region',
    'packages/core/src/meta/timeline.ts#WorldEventEntry.n',
    'packages/core/src/render/paint.ts#SurfaceSamples.label',
    'packages/core/src/render/paint.ts#SurfaceSamples.face',
    'packages/core/src/sim/run.ts#RunResult.death',
    'packages/core/src/sim/run.ts#RunResult.steps',
    'packages/core/src/theme/assets.ts#AssetSlot.wired',
  ] as const
).map((id) => ({
  id,
  on: '2026-09-10',
  why:
    'Its only reader is the test that proves it — the `keeper.alive` shape, ' +
    'and `TEST_IS_THE_READER` divides the eighteen into the three kinds and ' +
    'says why each is right.',
}));

/**
 * A BUDGET, A PROBE OR A GATE — THE EXPORT EXISTS FOR THE TEST THAT ENFORCES
 * A RULE (ruled 2026-09-10).
 *
 * `CLAUDE.md` makes this legitimate in as many words: **"the palette answers
 * to tests"**, and the contrast budget and the greyscale ladder are named as
 * hard rules. A threshold with no runtime reader is not dead — it is the
 * NUMBER the rule is stated in, and the test is where a rule of that kind
 * lives. Same for a gate: Gate C is `sim.test.ts` and nothing else.
 *
 * Three kinds, all reported honestly by the pass as "read only by tests":
 *
 *   - **A budget.** `MIN_LIT_FIELD_LIFT` and `edgeCasing` are numbers the
 *     theme tests hold every direction to. A production reader would be a
 *     second authority on a threshold that has one.
 *   - **A probe.** `surfaceSamples`, `sideNormals`, `renders`, `planKey`,
 *     `hexAt` and `zoomLayout` measure what a material or a layout ACTUALLY
 *     does, so a claim about it can be checked without a screen. That is the
 *     whole method the palette rule depends on.
 *   - **A decision, pinned.** `slotsOf` returns 1 and says at its declaration
 *     that the SECOND SLOT upgrade was deleted and refunded on 2026-08-18;
 *     `gateD` evaluates a design gate whose retired sibling `gateB` is a
 *     comment in the same file. Both are records with a test holding them
 *     still, which is more than a comment can do.
 *
 * **What would make one of these a real finding**: a production reader
 * appearing that spells the number out again instead of importing it. That is
 * what happened to `CHROME_ICON` and to `dailyRunFor` on this same run — both
 * sat in a draft of this list, and both left it by GAINING the caller that
 * was going round them. This list is for the ones where no caller is missing.
 */
const RULE_LIVES_IN_A_TEST: readonly Ruling[] = (
  [
    'packages/core/src/meta/progress.ts#slotsOf',
    'packages/core/src/meta/records.ts#gateD',
    'packages/core/src/render/layout.ts#hexAt',
    'packages/core/src/render/layout.ts#zoomLayout',
    'packages/core/src/render/paint.ts#planKey',
    'packages/core/src/render/paint.ts#surfaceSamples',
    'packages/core/src/theme/rig.ts#sideNormals',
    'packages/core/src/theme/rig.ts#renders',
    'packages/core/src/theme/tokens.ts#edgeCasing',
    'packages/core/src/theme/tokens.ts#MIN_LIT_FIELD_LIFT',
    'packages/core/src/view/lessons.ts#lessonCore',
  ] as const
).map((id) => ({
  id,
  on: '2026-09-10',
  why:
    'A budget, a probe or a gate: the export exists for the test that enforces ' +
    'a rule, which `CLAUDE.md` states as a hard rule for the palette — see ' +
    '`RULE_LIVES_IN_A_TEST`, and what would turn one of these into a finding.',
}));

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
    // Read only by their own specs, added 2026-09-10. Same ruling, and the
    // hex helpers are the clearest case in the repository: `disc` carries
    // seventy-two test references and no caller in this body at all.
    'packages/core/src/engine/hex.ts#keyOf',
    'packages/core/src/engine/hex.ts#neighbours',
    'packages/core/src/engine/hex.ts#disc',
    'packages/core/src/engine/hex.ts#toPixel',
    'packages/core/src/engine/rng.ts#rngChance',
    'packages/core/src/engine/rules.ts#blankMap',
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
  ...DESIGN_RECORD,
  ...HARNESS_RECORD,
  ...SAVED_BLOB,
  ...TIMELINE_SPINE,
  ...TEST_IS_THE_READER,
  ...RULE_LIVES_IN_A_TEST,
  ...TIMELINE_SLOT_FILTER,
];

/** Index, so a pass can ask in one call. */
const BY_ID = new Map(ALLOW.map((r) => [r.id, r]));

export const ruledOn = (id: string): Ruling | undefined => BY_ID.get(id);

/** A ruling whose reason has run out is a finding of its own. */
export function expired(today: string): readonly Ruling[] {
  return ALLOW.filter((r) => r.until !== undefined && r.until < today);
}
