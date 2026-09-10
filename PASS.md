# PASS.md — the ten, row by row

Opened 2026-09-09, on Marc's ask for _"10 ideas of 2-3 days work"_ and then
_"plan to do all 10 thoroughly no rush no cut corners"_.

This is a **living checklist**, not a record, and it carries exactly the
contract `IMPROVEMENTS.md` opened with. `STATUS.md` is what is done and
verified; `LOG.md` is the reasoning; this file exists only so a pass this wide
is resumable across sessions. When every row is `done`, fold the lessons into
`LOG.md` and `STATUS.md` and delete the rest.

**Check a row against the code before acting on it** — the standing rule, and
this file is exactly the kind of open-list `NEXT.md` warns about. It has
already paid: **four of the ten were re-scoped by checking and one was retired
outright**, before a line of the plan was written. That section is next,
because it is the most useful thing in this file.

**One list, not two.** `IMPROVEMENTS.md` B6.5 — the only `open` row that pass
left behind — is **adopted here as P2** and struck there. Two lists of the same
work is how one of them goes stale.

## Scale, stated plainly

Ten items at two to three days each is **twenty to thirty working days**. The
file is written so that stopping after any one of them leaves the repository
better and every ledger honest: each item lands on `main` as its own commit,
with its ledgers updated in that commit, and is deployed and verified where it
touches what ships.

## Two rulings from Marc, 2026-09-09

1. **Session A runs NOW, in parallel.** It needs his evening and not a session
   of mine, so it does not sit in the queue at all. Whatever it names becomes
   **P0**, a floating batch that re-ranks everything below it. Asked where it
   should sit, Marc took the parallel option: the ten get aimed at real
   complaints instead of my guesses.
2. **The French review surface is a published artifact he annotates** (P3), not
   a repo page and not an in-app screen. He reads it on the phone, leaves
   comment threads on the lines he wants changed, and they come back to the
   session directly. The cost is named in P3: the surface lives outside the
   repo, so the corrections — not the page — are the deliverable.

## What checking the code corrected, before a line was planned

The ten were proposed off the ledgers. Four of them were partly wrong about
what already ships, and that is worth more than the plan itself.

- **P4 — "the board on a keyboard and to a screen reader."** I proposed
  building a keyboard path and a live region. **Both exist and have since
  2026-08-29.** `board/cursor.ts` is the marker's arithmetic, `board/keys.ts`
  is the map, arrows LOOK and Enter ACTS, `onLook` says the hex into the toast,
  and the toast is `role="status" aria-live="polite"` (`App.tsx:3216`).
  `Board.tsx:595` declares `role="application"` with `aria-describedby`. So the
  work is not building it. **It is proving it, over the whole game, which
  nothing has ever done** — and `INTERACTIONS.md`'s own closing lesson is that
  a role is a promise about behaviour and declaring one without keeping it is
  worse than declaring neither.
- **P7 — "version the save format."** I proposed a schema stamp and a
  migration table. `storage.ts:44` already answers it, differently and better:
  **keys carry a version, so a shape change is a new key rather than a corrupt
  read**, and every decoder is a trust boundary that returns a default rather
  than throwing. Building a second mechanism over that would be the mistake
  `IMPROVEMENTS.md` B6.3 declined. What is genuinely unbuilt is the parking
  lot's own item — **compaction**: `encodeWorld` is `JSON.stringify`
  (`meta/world.ts:328`) over an unbounded `revealed: readonly HexKey[]`.
- **P8 — "the failure paths."** I proposed an error boundary and a report path.
  Both shipped 2026-08-29: `ui/Boundary.tsx`, `shell/failure.ts` as plain DOM
  built out of neither React nor three, a hand-rolled Sentry envelope, and a
  CSP `connect-src` that makes the privacy claim enforceable rather than
  prose. What is left is narrower and sharper, and one piece of it is a real
  loop with no exit — see P8.1.
- **P9 — "the atlas earns its place or goes."** Reading `screens/Atlas.tsx`,
  the delete branch is not live: it is argued, tested, bilingual, already
  photographed at thirty and three hundred runs, and it answers a question the
  worlds list cannot. **Retired from this pass** and demoted to one row on
  Marc's Session A sheet — _does he open it twice?_ Its slot is taken by the
  payload budget (P9 below), which is a real instrument this repository is
  missing and has already been burned by once.

Two of the ten survived contact unchanged (P1, P2), and three were confirmed
live but under-specified (P3, P5, P6), which is what the rows are for.

## How to read a row

- **id** — item and row. Items land in the order at the bottom; each row is a
  commit or part of one.
- **status** — `open`, `done`, or `ruled` (a decision taken and stated).
- **where** — the file, and the line it was found at. Lines drift; the symbol
  named beside them does not.

Every item carries **one written question**, put in `LOG.md` before the work
starts and answered after it, per `CLAUDE.md`. Where an item's answer lives on
a screen rather than in the core, **the finding is the deliverable** — it goes
to Marc at the declaration and in `NEXT.md`, and is not guessed at.

---

## P0 — whatever Session A names (floating)

Not planned, because planning it is the thing Session A exists to prevent. It
is here so the pass has a place to put it: a bug Marc finds on his own phone
outranks every row below, and a first-minute complaint outranks all of them
together. `?playtest=1` records three of the four facts off the `act` seam
already (`LOG.md` Session 61), so the sheet arrives as a transcript.

**The one rule this pass owes the stranger.** `CLAUDE.md`: nothing that changes
the first minute ships between Session A's LAST clean pass and Session C. That
binds at the end, not now — so first-minute work is allowed all through this
pass and freezes once Marc declares a clean pass. P4, P5 and P0 are the three
items most likely to touch it; each says so in its own section.

---

## P1 — the sweep becomes a tool (`pnpm sweep`)

`CLAUDE.md` now carries **six** hand-run rituals: exports with no consumer,
fields nothing reads, optional inputs nobody passes, branches of a consumed
value, catalogue sentences no screen prints, and doors that forget a flag. Each
was invented after a miss, each found real bugs, and each leaves false
positives the next sweep re-adjudicates from scratch — which is, in that file's
own words, **how a ritual stops being run**. The 2026-09-08 sweep is the
evidence: one genuinely dead export in a list of sixteen that were merely
file-internal.

**The surface it must walk:** 472 exports in `packages/core`, 388 in
`apps/game`, 1,163 `readonly` fields, 90 test files.

**No new dependency.** `typescript` is already a devDependency and `tsx` is
already the script runner, so the compiler API is the whole toolkit. A
ts-morph or a knip would be a second opinion about a graph this repository can
read for itself, and every one of the six rituals is a query the type checker
already has the answer to.

| id   | status | statement                                                                                                                                            | where                   |
| ---- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| P1.1 | done   | **the module sweep** — every `export` with no importer outside its own file, which is the ritual as written                                          | `scripts/sweep/`        |
| P1.2 | done   | **the field sweep** — every `readonly` property of an exported type, and whether any file reads it. The `cell.band` class                            | `render/Renderer.ts`    |
| P1.3 | done   | **the optional-input sweep** — every optional parameter and field, and whether a caller passes it. The `perkAt` class                                | `view/receipts.ts`      |
| P1.4 | done   | **the branch sweep** — union members of a consumed value no consumer compares against. The `teach.as === 'toast'` class                              | `shell/teaching.ts:119` |
| P1.5 | done   | **the catalogue sweep** — keys in `text/Strings.ts` no `view/`, `meta/` or screen reads. The `figure.hold` class                                     | `text/Strings.ts`       |
| P1.6 | done   | **the argument sweep** — arguments a view takes, flagged where the call site passes a literal `[]`, `null` or `0`. The FOG class                     | `shell/store.ts`        |
| P1.7 | done   | **the allowlist** — `scripts/sweep/allow.ts`: id, date, reason, ruling. The report's signal is only as good as this file                             | —                       |
| P1.8 | done   | `pnpm sweep` writes `SWEEP.md`, header first: what it walked, what it skipped, how many entries the allowlist absorbed                               | `package.json`          |
| P1.9 | done   | run it, and adjudicate every finding — the point of the tool is the first report, not the tool. **330 findings → 2, and P10 took the last two to 0** | `SWEEP.md`              |

### What the first report found, and what adjudicating it found (2026-09-10)

**345 findings on the first run, 330 on the second, and 2 left.** `LOG.md`
Session 78 is the account; this is the ledger. The one written question was
whether the mechanical half of six hand rituals finds anything four hand passes
walked past, and it does — but **the biggest thing it found was itself.**

**Two things validated it before anything else.** It reproduced four findings
made by hand and recorded in the ledgers (`Ring.width`, `Said.brief`,
`Keeper.alive`, `Confirming.holdMs`), and it was RIGHT where a grep would have
been wrong: `engine/hex.ts#disc` reports as read only by tests, and a text
search says `meta/world.ts` uses it. Both are true and they are different
symbols — `world.ts:440` declares a local `const disc`.

**THE TOOL'S OWN ADVICE DID NOT COMPILE.** The module pass's file-internal
branch fired on `own > 0` whatever `tests` was, so any symbol with one in-file
reader was reported as read ONLY inside its own file however many specs
imported it — and the prescribed fix is to demote. Acting on it broke
twenty-five at once (`sim/policy#farm`, `theme/rig#FLAT_RIG`,
`view/view#epitaphFor`, `theme/tokens#fieldDots`). The precision note that used
to sit here was written about the OPPOSITE failure; this is its worse half,
because a reader ACTS on a finding they trust. There is a fourth category now,
and it was retired the same day it shipped: seventy-four rows of a unit test
importing its unit, counted in the header instead of listed.

**THEN THE FIX BLINDED THREE PASSES.** 141 demotions, and `field`, `optional`,
`argument` and `branch` all walked only EXPORTED declarations — so `Ring.width`
and `ConfirmingProps.holdMs`, both ruled that same morning, went dark with
their types. **The report's own "Rulings that match nothing" section is what
said so**, on the first run after the batch, which is exactly the job it was
added to do. `export` was never the right question for a field, an optional
input, a call site or a comparison.

**AND THE FIELD PASS COULD NOT SEE THROUGH `as const satisfies`.** Twenty rows
of it — all four of `FeatureDef`'s fields while SETTINGS is built on three of
them, all four of `AssetSlot`'s on thirteen writes — because a table's element
type is the LITERAL, so `findReferences` cannot connect
`FEATURES.filter((f) => f.player)` to `FeatureDef.player`. `keys.ts` grew a
`readIndex` for it: the mirror of the write index the optional pass already
had, with a filter on the owner type's name so that `count` and `label` cannot
mute a true finding. **Its cost is stated at the declaration**: a decoder that
destructures, validates and re-writes counts as a consumer, which is why
`RunDetail`'s six unread numbers live in P7 below rather than in a report that
can no longer see them.

**What was fixed in the code, every one of it found by the report:**

- **`CHROME_ICON` was `STAT_ICON` again** — the table saying which marks are
  chrome, with a test, while MENU, MORE, the panel's BACK and CLOSE and MORE's
  speaker each wrote the string as a literal. Five call sites read the table
  now, so a renamed icon cannot leave the test passing about a table nobody
  uses.
- **The daily's resume rule had two implementations.** `meta/daily#dailyRunFor`
  IS that rule, pure and tested and called by nothing; `storage.ts` spelled
  `kept.date !== date` out a second time. `storage.ts`'s own key comment said
  "`dailyRunFor` is where that guard lives", which was false until the fix.
- **`AssetSlot.wired`'s promise is a test.** "A slot that says `false` will not
  appear on screen no matter what you put in it" was enforced by nothing;
  `theme.test.ts` asserts it per direction now.
- **`toneColour` was `ringColour`'s unreachable fork** — found by deleting
  `FigCell.tone`, which the field pass had flagged as an optional input nothing
  supplies and which turned out to HAVE a reader. It resolved to plain ink on
  every figure render; both are gone and nothing on any figure moved.
- **`'capped'` was a cause of death nothing had ever produced.**
  `RunOptions.maxSteps` had no supplier at all, so the hard stop was untested;
  `sim.test.ts` plays one run against a cap of ten.
- **`Finding.detail` was the sweep printing none of its own prescriptions** —
  eight sentences written across five passes, dropped by the table writer.
- **Four cuts**: `ui.dismiss` and `payout.heading` (dead sentences, both with
  the reason left at the line), `Snapshot.harvestAt` (a third name for the
  priced pocket, the `Session.strings` shape without the bug), and
  `FigureLayout.halfW`/`halfH`.
- **One simplification**: `{ cx, cz }` had four spellings in `camera.ts`, which
  is why `Frame.centre.cx` reported as unread while `Board.tsx` reads the pair
  on every frame. It is `Centre` now, and the finding was true of the SYMBOL
  and false of the code.

**And where the code corrected the QUEUE.** `luckCore` was the report asking
for a string the code already shares (`LUCK_CORE`, module-level in both
languages, because the two sites sit inside the literal that DEFINES
`Strings`). `nameRecord(wanted)` is an OpenType nameID and `0` is the copyright
record — P1.6's predicted noise, arriving exactly as predicted.

**89 rulings, and seven of them are CLASSES rather than entries**, because
twelve or eighteen paragraphs saying one thing is how an argument stops being
read: `LIFT_SURFACE` (Ashwake 1's surface, per `CLAUDE.md`, enumerated rather
than matched by directory so a nineteenth is a finding somebody looks at),
`DESIGN_RECORD` (a table addressed to a developer, where the source file IS the
screen it is printed on), `TEST_IS_THE_READER` and `RULE_LIVES_IN_A_TEST` (the
`keeper.alive` shape, and `CLAUDE.md`'s "the palette answers to tests"),
`SAVED_BLOB`, `TIMELINE_SPINE` and `HUD_UNSAID`.

**WHAT IS LEFT IS MARC'S, AND IT IS THE BEST THING IN THE REPORT.** `NEXT.md`
§1 now carries **five facts the HUD computes and no screen says**: the colour
lens's whole report (Ashwake 1 printed five clauses on a long-press; this body
says the ground's name and throws the numbers away, having tallied the board
twice to get them), a standing bounty with no mark on either POP button, a
"POP · N READY" that has never existed, `tilesSpare` whose sentence went out
with the guide line, and the guide line itself. Two of the five corrected a
docblock that asserted its own consumer, and **both had survived four hand
passes BECAUSE of that sentence.** Plus `screenOf(h)`: the board's fit measures
the ground plane while `relief.ts` lifts a hex by up to 0.55 radii.

**Two findings point at another item and are the only two rows left in the
report**: `runsOf(slot)` and `streamOf(slot)`, called with `null` everywhere,
which is a question about the reader table **P10** is going to assert.

**~~The CI bar is now reachable and is deliberately not claimed.~~ CLAIMED
2026-09-10, by P10.** P1's bar was one clean run with an empty allowlist delta.
P10 answered the last two findings (`runsOf(slot)` and `streamOf(slot)` — the
unbuilt per-world filter chips), and `pnpm sweep` is a CI gate: non-zero on a
finding, on a ruling that matches nothing, or on a ruling past its `until`,
with `ci.yml` diffing `SWEEP.md` afterwards the way it diffs the golden sim.
**330 findings → 0, 91 rulings, nothing orphaned.**

**P1.6 is the one that may not work, and it says so here rather than in a
retrospective.** The fog was a _tested, correct consumer_ handed a hard-coded
empty list at the call site, and `CLAUDE.md`'s own conclusion is that grepping
finds nothing and reading the consumer finds nothing either. A literal-argument
heuristic will be noisy — `{}` and `[]` are legitimate empties all over this
codebase. It ships **report-only and ranked**, or it ships as a documented
non-goal. It does not ship as a gate.

**The allowlist is seeded from what is already ruled**, so the first report is
not a re-litigation of settled decisions: `Ring.width` (`board/rings.ts:105`,
ruled 2026-09-09 — 0.16 stays), `keeper.alive` (a second authority IS the bug),
`cell.previewColour` (tried, reverted, D11's neighbour), `Said.brief`
(`NEXT.md` §5c, deferred by Marc), the `shrineDetour` trio (kept for the
upgrade path, delete after 2026-10-09), `meta/route#HOME`, and `meta/mark`'s
maskable exports (the baker is their consumer).

**Report, not a gate — at first.** The bar for making it CI-blocking is one
clean run with an empty allowlist delta, and that bar is written here so a
later session does not have to invent it.

> **Question:** the ritual that found fifteen inert mechanics — how much of it
> is mechanical, and does the mechanical half find anything the four hand
> passes walked past?

**Verify:** `pnpm sweep` twice (idempotent), plus the full gate. Every finding
fixed, allowlisted with a reason, or written into `NEXT.md` as Marc's.

---

## P2 — finish the `App.tsx` extraction (adopted: `IMPROVEMENTS.md` B6.5)

B6.5 was written against **3,208 lines**. `App.tsx` is **3,978** today, so the
row has been losing ground for a week. `shell/beginning.ts` (B6.4) is the proof
the shape works: it took the five run-doors, and closed four missing steps on
the way — `takeCrossing` skipping three refs and `newRun` never calling
`beginRun` among them.

The convention is `shell/signpost.ts`: **the pure decision leaves, the wiring
stays thin.** B6.7's ruling holds — a docblock travels WITH the code it is
about, it does not go to `LOG.md`.

| id   | status | statement                                                                                           | where               |
| ---- | ------ | --------------------------------------------------------------------------------------------------- | ------------------- |
| P2.1 | done   | the boot ladder — the only door that is not `enterRun`, and the only place `detour` can become true | `shell/boot.ts`     |
| P2.2 | open   | **`act` — 419 lines**, the seam every receipt, sound, lesson, merge and once-a-run moment hangs off | `App.tsx:1692–2111` |
| P2.3 | done   | the gestures — `INTERACTIONS.md`'s first table as a function, and the order is the rule             | `shell/tap.ts`      |
| P2.4 | done   | the voice — one speaker at a time: the receipts in the air, and the rule that was a JSX guard       | `shell/speaking.ts` |
| P2.5 | done   | the look — `theme`, `look`, `vignette`; the media queries stay, they are the sampling               | `shell/look.ts`     |
| P2.6 | open   | the doors — check `shell/beginning.ts` FIRST; B6.4 took five already, and `MODES.md` is the matrix  | `App.tsx:2531–2835` |
| P2.7 | done   | share — the fork, once, for the sentence AND the card. `importDaily` ruled: it is wiring, see below | `shell/handOver.ts` |
| P2.8 | ruled  | the purse — **not extracted**, and the reason is below. One docblock corrected                      | `App.tsx`           |
| P2.9 | done   | the world's live memory — `worldHeld`, `keepWorld`, `forgetWorld`, and the seed rule as `heldFor`   | `shell/held.ts`     |

### Four rows in, and the answer so far is yes (2026-09-10)

> **Question:** does extracting a region still find a bug, or only move lines?

**Four regions, four findings, none of them a live bug — and every one the
shape that becomes one.** `App.tsx` 4,005 → 3,842. `LOG.md` Session 80.

- **P2.5** — `dial`'s docblock was ORPHANED: it sat directly above
  `economyAt`'s own docblock while `dial` was declared thirty lines below, so a
  reader met the sentence attached to the wrong function. Only visible because
  the region was picked up.
- **P2.9** — `settle` spelled `keepWorld` out inline (`worldNow.current = …;
keeper.saveWorld(…)`), so the ref whose whole docblock claims ONE door had
  two. Harmless until somebody adds a third statement to `keepWorld`. Routing
  it through the door then surfaced a genuinely missing `useEffect`
  dependency, added rather than suppressed.
- **P2.7** — the share's fork was spelled out TWICE in one handler, once for
  the sentence and once for the card, and the two had to agree or the picture
  would print a number the text did not. One branch with two outputs now, and
  `ShareCardData` is exported so the card's six fields are declared once
  instead of twice.
- **P2.8** — the `shellSaid` docblock said its counter "only goes up" while its
  one caller decrements. True of the mechanism, backwards about the direction,
  and the next sentence explains why the direction is the point.

**And the sweep caught the extraction itself**, which is the pairing working as
intended: five new exports read only inside their own file (`HandOver`,
`ShareCardText`, `Held`, `Look`, `YAW`). Four demoted; `YAW` earned its export
by being asserted, because the test checked five of the six authored defaults
and five of six is the gap that becomes a question. **A region extracted
without the sweep run after it is a region that ships four new false
positives** — P2's "run P1 first" instruction has a second half.

**P2.8 IS RULED, NOT DONE, and the distinction matters.** `onPurse` is fifty
lines of which the code is one boolean (`opening && !hasMet(progress,
'purse')`) and four `setState` calls that cannot leave a component. Both inputs
are already named and `purseLesson` is already in the core. Extracting it would
produce a module whose entire content is a docblock and a conditional — and
this item's own target says hitting a line count by moving comments out **would
be a fraud**. The find is the docblock correction; the ruling is that the
region is where it belongs.

**P2.7's `importDaily` is ruled the same way and for a better reason.** Its one
rule — a minted world must `sealGoals` — is already the one name `MODES.md`
says it wants, called at all three mint sites (`cross.ts`, `fixture.ts`, and
here). Everything else is storage writes and a navigation. There was nothing to
find and nothing worth moving.

**P2.1 found the best one yet, and the GATE found it.** The boot door had no
test — calling it meant building a live session out of `location` and four
storage functions. The disk is injected now, with 22 tests: every rung of the
ladder and all four camp guards.

Then `pnpm sweep` refused to pass on a ruling that matched NOTHING:
`Route.seed`, ruled "read only by tests" the day before. **It was the gate
asking why a validated seed parser being called one line above had no reader.**
The ladder rolled its own — `Number(params.get('seed')) || null` — which passed
a FRACTIONAL seed through (`?seed=7.9` opened a board on 7.9, against
`route.test.ts`'s own words: _"a hand-typed 7.9 must open the same world as 7
rather than something no other phone can reproduce"_) and could not tell 0 from
absent, one import away from `dial`, whose entire reason for existing is that
zero is a real answer.

Two of my own tests were wrong before the code was: the ladder's second rung (a
saved run outranks home for the SEED, which is what lets a shared link survive
losing its query string) and a camp fixture with territories and no shrines — a
world with somewhere to camp and no permission to. Both are written out at the
assertion.

**P2.4 took the RULE, not the plumbing.** `say` is a `setState` wrapper and
`forgetEnding` clears eleven pieces of ending state — neither wants a module.
What did was **one speaker at a time**, which lived in two halves that could
not be asked a question: a timer registry with a count that is its size by
construction, and the rule itself as a five-part condition inside a JSX guard
with twenty-five lines of comment over it.

`mayTeach` is that condition as a function, with a test per clause — and every
clause is a bug that has happened, including the one Marc reported: a lesson
that came due on the same dispatch as a pop opened over the cascade and was
UNMOUNTED when the receipt landed. Shown, and withdrawn before it could be
read. `speaking > 0` is the clause `said` cannot cover, and the test says so.

**The old condition was doing two jobs** — stating the rule and narrowing
`card` away from null for four uses inside the block — so the narrowing got a
name (`teaching`) rather than an assertion at each use. Splitting those apart
is what the extraction was for.

**P2.3 took the TAP MATRIX.** `INTERACTIONS.md`'s first table is an
eight-branch decision, and it lived as an eight-branch cascade with each branch
doing its work between the `if` and the `return` — so **the ORDER, which is
the whole rule, could only be read by reading the effects.** `tapMeans` is that
order as a function, with 16 tests: one per row, plus four for the pairs where
a hex is two things at once and the rule has to say which wins (a ripe hex is
also legal; remembered ground can carry a landmark; touring outranks
everything).

That table is the file's answer to "did we get back what we had", and its own
summary of this region is that four of this body's inert mechanics were
controls rendered here and wired to nothing. **Its ✓ rows have a test to point
at now.**

**And the find: "put the tour down" was spelled twice** — the timeout that ends
a trip on its own and the tap that ends one early each cleared the flag and its
timer separately. A flag and its timer cleared in two places are two things
that come apart. One name (`putTourDown`), and the board's own return stays
only at the tap, because a trip that runs its course ends itself.

Every tap path is e2e-driven, which is what makes this row's green suite mean
something.

**Left open: P2.6 and P2.2.** One region and then the item. `act` is still last, still gets its own commit and its own test
file.

**P2.2 is the item.** `act` is where a placement becomes a receipt, a sound, a
lesson, a world merge and a diary row, and it is the seam `?playtest=1` records
off. Several of this body's inert mechanics lived inside it. It is extracted
**last** of the nine, after the cheap ones have proved the shape on this file,
and it gets its own commit and its own test file.

**Order inside the item:** P2.5, P2.9, P2.7, P2.8 (small, disjoint), then P2.1,
P2.4, P2.3, P2.6, then P2.2. **Target: `App.tsx` under 1,500 lines and wiring
only** — a target, not a bar, because a line count is not the point and hitting
it by moving comments out would be a fraud.

**Run P1 first.** Extracting a dead region is the one way to make dead code
harder to find, and the sweep's report is the list of what not to carry.

> **Question:** does extracting a region still find a bug, or only move lines?
> B6.4 found four. If P2's nine find none, that is an answer about a file that
> has already been swept, and worth recording as one.

**Verify:** the full gate per region, `pnpm sim` byte-identical (a pure
refactor cannot move a rule), and `pnpm test:e2e` green on both projects.

---

## P3 — the French answers to rules, not to a reading — DONE 2026-09-10

`DEFAULT_LOCALE` is `fr-CA`. It is the language a player sees unless they go
and change it, it runs about 20% longer than English, D4 makes it Marc’s
review surface, and `ROADMAP.md` S1b has said since the day it shipped that he
has not read it. 866 lines, 505 sentences, unread.

**The plan was a page and the page was wrong.** It was built as ruled — a
published artifact, phone-readable, every sentence by screen with the English
beneath and a photograph of the screen beside it. Marc looked at it and said
the true thing: _"i cant review this, its too much"_ — and then asked for the
better version: **_"can you do it automatically with some rules? then i check
when playing."_**

**Which is this repository’s own answer to every question of that shape.** The
contrast budget is not a document somebody reads, it is `theme/*.test.ts`. The
rules did not move is not a promise, it is `pnpm sim`. Six hundred sentences
are exactly what a person cannot hold and a test can — and the part a test
genuinely cannot judge, whether a sentence sounds like Marc, a phone answers
better than a page ever would.

| id   | status | statement                                                                                                  | where               |
| ---- | ------ | ---------------------------------------------------------------------------------------------------------- | ------------------- |
| P3.1 | done   | **a value that reaches one language and not the other** — asked by varying each argument and watching both | `text/text.test.ts` |
| P3.2 | done   | **a count pluralised in one language only** — the rule that found `1 relics`                               | `text/text.test.ts` |
| P3.3 | done   | doubled spaces, padded sentences, three periods for an ellipsis                                            | `text/text.test.ts` |
| P3.4 | done   | a double quote in a French sentence, where the catalogue quotes with « »                                   | `text/text.test.ts` |
| P3.5 | done   | a four-digit number typed into a sentence instead of going through `fmtInt`                                | `text/text.test.ts` |
| P3.6 | done   | both languages end a sentence, or neither — a label in one and prose in the other                          | `text/text.test.ts` |
| P3.7 | ruled  | **the review page is not built.** The generator was written, published once, and deleted                   | —                   |

**What the rules found on their first run: `ui.relicsHeld` said `1 relics`.**
It is the shop’s accessible name for the relic balance (`IMPROVEMENTS.md` B3.3
put it there, because the balance had been announcing as bare digits), so the
only player it was ever wrong for was the one listening to it rather than
looking. `format.ts` has carried `plural()` since the catalogue was split and
English simply did not reach for it in that sentence; French had `pl()` in the
same line. **A bug a reading would have had to notice among 504 correct
neighbours, and a rule found it in a second.**

**One exemption, with its reason at the line.** `ui.perksTally` pluralises in
French and not in English, and both are right: English agrees with the whole
("1 of 3 perks found" — the noun belongs to the 3), French agrees with the
count ("1 atout trouvé sur 3"). The two languages branch on different words.

**And the rest of the catalogue is clean**, which is worth recording because it
is the argument for having spent the session this way rather than on the page:
no dropped values across all 138 function pairs, no doubled spaces, no typed
thousands, no straight quotes, no punctuation disagreements. The existing rules
— the em dash, the typographic apostrophe, the fine space before a colon — were
already holding.

**P3.7, stated rather than quietly dropped.** `scripts/review/` was four files:
a runtime pair extractor, a reader-attribution walk that placed 503 of 505
sentences on the screen that prints them, a screen map, and a page builder that
inlined 20 screenshots. All of it worked. None of it is kept, because a
generator nobody runs is the dead weight every sweep in this repository exists
to find — and P1 had just spent a session proving how expensive that is. The
published page stays where it is as a record; `git log` is the archive.

**What is left for Marc is what he asked for**: he checks while playing. The
audit’s French pass (`IMPROVEMENTS.md` B2.3) already photographs every screen
in French at 320 and 390, and §5d’s six marks ended the clipping category, so
the thing a phone is uniquely good at — does this sentence sound like me — is
the only question left on it.

## P4 — the accessibility proof (RE-SCOPED: it is built, and unproven)

I proposed building this. It is built — see the corrections section. What has
never happened is anyone checking it, and `INTERACTIONS.md`'s own closing
lesson is the reason that matters: **a role is a promise about behaviour, and
declaring one without keeping it is worse than declaring neither.** The three
things a screen reader was told _wrongly_ in Batch 3 were all of that shape.

| id   | status | statement                                                                                                                | where           |
| ---- | ------ | ------------------------------------------------------------------------------------------------------------------------ | --------------- |
| P4.1 | open   | a FOURTH audit axis: `page.accessibility.snapshot()` per screen, graded — every interactive node named, every state told | `e2e/audit/`    |
| P4.2 | open   | the board's own tree: `role="application"` means the app owns the keys, so prove `board-keys` exists and says which      | `Board.tsx:595` |
| P4.3 | open   | a keyboard-only full run: door → BEGIN → place → pop → end → new run, with no pointer event dispatched at all            | `e2e/`          |
| P4.4 | open   | ONE speaker: `say()` drives the toast; prove nothing else announces over it, in either language                          | `App.tsx:3216`  |
| P4.5 | open   | what a reader is told during a POP — the camera flies, the board changes, and the toast is the only witness              | `App.tsx:1692`  |
| P4.6 | open   | both languages, at 320 and 390, because an accessible name is a STRING and French runs 20% longer                        | `e2e/audit/`    |
| P4.7 | open   | whatever the grade names                                                                                                 | —               |

**This one can touch the first minute**, so it lands before Marc's last clean
pass or not at all. A fix that changes what is announced on the front door is a
first-minute change even though no pixel moves.

> **Question:** the board says it can be read out — can a run be FINISHED
> without seeing it?

**Verify:** the new axis run in both languages; every finding fixed or written
down; `pnpm test:e2e` green including the keyboard-only run.

---

## P5 — the performance instrument, throttled

`IMPROVEMENTS.md` B4.16 shipped a low-end path — **cap dpr at 1.5 above
devicePixelRatio 2, drop MSAA at dpr ≥ 2** — as a _default nobody measured_,
picked in a session that could not see a phone. B4.2 turned the beacon breath
into a 30 Hz timer because "a `useFrame` cannot stop asking for frames without
stopping being called", also unmeasured on a device. `NEXT.md` §5b records what
happens when a number is guessed at from a session with no phone in it.

The instrument is the screen audit's sibling, and it follows B8.6's ruling
exactly: **a report somebody reads, not a gate.**

| id   | status | statement                                                                                                  | where                        |
| ---- | ------ | ---------------------------------------------------------------------------------------------------------- | ---------------------------- |
| P5.1 | open   | the trace — CDP over `?place=n`'s fixed opening, so eight runs are eight measurements of ONE board         | `shell/walk.ts`              |
| P5.2 | open   | the axes — 1× / 4× / 6× CPU throttle, at dpr 2 and 3, in the shipping direction                            | `playwright.audit.config.ts` |
| P5.3 | open   | grade B4.16's two defaults against what they cost and what they buy                                        | `Board.tsx:426`              |
| P5.4 | open   | the ambient load with nothing happening — the breath timer and the ember pool, which run for the whole run | `HexField.tsx:183`           |
| P5.5 | open   | the first frame after BEGIN, and the `Board` chunk's parse cost on a throttled CPU                         | `App.tsx:247`                |
| P5.6 | open   | `perf/report.md`, with the same staleness header the screen audit learned to write                         | —                            |
| P5.7 | open   | whatever it names                                                                                          | —                            |

**A software renderer is not a phone** — that is B8.6's own argument against
running the screen audit in CI, and it applies double here. So the numbers this
produces are **relative**: the same board, the same walk, one setting changed.
An absolute frame time off a desktop runner would be a number that reads like a
measurement and is not one, which is worse than no number.

**Where a finding is a LOOK finding it stops and goes to Marc.** Dropping MSAA
is not a performance decision alone.

> **Question:** what does this board cost on a phone that is not this laptop,
> and are the two low-end defaults the right ones?

**Verify:** the report regenerated; any change to the board's defaults carries
its measurement in `LOG.md`, and the palette and materials budgets stay green.

---

## P6 — the engine the phone actually runs

`playwright.config.ts` runs WebKit over **six of fourteen specs**. The hard
rule is that testing happens on a phone, in portrait — where the browser is
Safari. Seven specs have never run on it: `board`, `cards`, `links`, `return`,
`shots`, `steady`, `playtest`. (`csp` is chromium-only for a stated reason and
stays that way: WebKit's own troika refusal is swallowed by the noise filter,
so the exact console lines that test exists to catch would be invisible there.)

| id   | status | statement                                                                                                     | where               |
| ---- | ------ | ------------------------------------------------------------------------------------------------------------- | ------------------- |
| P6.1 | open   | **the blob-worker refusal, first** — WebKit refuses troika's glyph worker, so the board draws no labels there | `e2e/helpers.ts`    |
| P6.2 | open   | `board.spec.ts` on WebKit, once P6.1 says what it may assert                                                  | `e2e/board.spec.ts` |
| P6.3 | open   | `cards`, `links`, `return`, `steady`                                                                          | `e2e/`              |
| P6.4 | open   | `shots` and `playtest`                                                                                        | `e2e/`              |
| P6.5 | open   | the safe areas and the dynamic viewport — the URL bar that `steady.spec.ts` was written for                   | `ui.css`            |
| P6.6 | open   | the audio unlock: `ui.sound`'s tap is the gesture, and WebKit's rules are its own                             | `shell/voice.ts:31` |
| P6.7 | open   | install on iOS — there is no `beforeinstallprompt`, so `install.ts`'s offer must already know that            | `shell/install.ts`  |
| P6.8 | open   | whatever the seven fail at                                                                                    | —                   |

**P6.1 decides the size of this item.** If the blob refusal is a harness
artifact only (it is documented as one), the board specs assert around labels
and the item is small. If it is real on a device, it is a shipped bug on the
one engine that matters and it outranks everything else in this file.

> **Question:** which of the seven fail on the engine the phone actually runs —
> and is the label refusal a harness artifact or a bug with a phone in it?

**Verify:** `pnpm test:e2e` green on both projects with the widened matrix.

---

## P7 — a world's memory has no size (RE-SCOPED: compaction, not versioning)

The versioning half is already answered and answered better: **keys carry a
version, so a shape change is a new key rather than a corrupt read**
(`storage.ts:44`), and every decoder treats its input as hostile. What is
unbuilt is the parking lot's own item.

`encodeWorld` is `JSON.stringify(world)` (`meta/world.ts:328`) over
`revealed: readonly HexKey[]` (`:35`) — **one string key per hex ever
revealed, unbounded, three worlds at a time, in a 5 MB store.** The shed ladder
exists precisely because that store fills up, and `storage.ts:254` records the
day a version of it shed a WORLD and left its run behind.

| id   | status | statement                                                                                                    | where                |
| ---- | ------ | ------------------------------------------------------------------------------------------------------------ | -------------------- |
| P7.1 | open   | **measure first** — what a 5-, 30- and 300-run world actually weighs, off `shell/fixture.ts`                 | `shell/fixture.ts`   |
| P7.2 | open   | the codec: a compact `revealed` and `territories`, behind a NEW key so an old blob still reads               | `meta/world.ts:328`  |
| P7.3 | open   | the round trip — `decode(encode(w))` equal for every world the fixture builds, plus a hostile blob per field | `meta/world.test.ts` |
| P7.4 | open   | **eight numbers written into a save and read by nothing** — inherited from P1.9, see below                   | `meta/timeline.ts`   |

**P7.4 is P1.9's, and it is here because this is the only item allowed to
change what a save looks like** (2026-09-10). `pnpm sweep` found eight fields
written into stored blobs with no consumer: `RunDetail`'s `placements`,
`popped`, `bigPop`, `bigPopAt`, `claims` and `quests`, plus
`HarvestRecord.tiles` (what a pop paid in tiles, kept per harvest for a whole
run's log while the end screen counts harvests BY CHOICE) and
`GameState.version`, the discriminator a migration would switch on with no
migration yet.

Two notes for whoever does the measuring. **The six are invisible to the tool
now**, and deliberately: `keys.ts#readIndex` cannot tell a decoder that
destructures, validates and re-writes from a consumer, so `timeline.ts:211`
reads as six readers. This row is where they live instead. And **they are dead
weight in exactly the blob P7.1 is about to weigh** — measure with and without
them, because the answer may be that the compaction is mostly this.

`scripts/sweep/allow.ts#SAVED_BLOB` and `TIMELINE_SPINE` point here.
| P7.4 | open | a bound, or a written argument for none: what this game does at 10,000 revealed hexes | `meta/world.ts:441` |
| P7.5 | open | the ladder's new shape — compaction should make a rung RARER, and `shed.test.ts` is the pin | `shell/shed.test.ts` |
| P7.6 | open | quota exhaustion driven end to end in a browser, not only in a unit test | `e2e/` |

**A codec with no caller is how two codecs come to disagree** —
`storage.ts:787` says so about a case this repository has already had. So the
old decoder stays exactly as long as a device can still hold an old blob, and
the date it may be deleted is written at the declaration, the way the
`shrineDetour` trio's is.

**`knownFraction` must not move.** It is `revealed.length / disc` and it is
printed in the atlas; a compaction that changes what `revealed.length` means
changes a number on a screen, which makes it a rule change wearing a codec's
clothes.

> **Question:** does a world's memory have a size, and what does this game do
> when a device runs out of room mid-run?

**Verify:** the full gate, `shed.test.ts` and `storage.test.ts` green, plus a
measured before/after in `LOG.md`. `pnpm sim` untouched — no rule moves here.

---

## P8 — the three failure paths, and the header's own confession

The boundary, the panel, the report and the CSP all shipped. What is left is
three specific holes and one named weakness.

| id   | status | statement                                                                                                                      | where                  |
| ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| P8.1 | open   | **the stale-chunk loop.** `Board` is `lazy()`; an old `index.html` against new hashed names rejects, and CONTINUE re-enters it | `App.tsx:247`          |
| P8.2 | open   | quota exhaustion, in a browser, all the way to what the player is told (shares its harness with P7.6)                          | `shell/storage.ts:318` |
| P8.3 | open   | no WebGL, and a context lost that never restores — the panel has a no-WebGL split; nothing exercises it                        | `board/gl.ts`          |
| P8.4 | open   | **hash the two inline blocks at build time and drop `'unsafe-inline'`** — `_headers` names this exact missing build step       | `public/_headers`      |
| P8.5 | open   | an offline FIRST visit, and a second visit offline, against the narrowed precache                                              | `vite.config.ts:183`   |
| P8.6 | open   | the panel's repeat counting under each of the above, since a loop is what it counts                                            | `shell/failure.ts:156` |

**P8.1 is the one with no exit today.** The failure panel's CONTINUE is
`panel.remove()` plus a boundary reset, and the boundary remounts the tree —
straight back into an import that will reject again, forever, because the
rejected chunk name is baked into the served `index.html`. The fix is a
decision, not a patch: either a chunk-load rejection earns the **second allowed
reload** (`CLAUDE.md` permits exactly two, and this would be a third — so it
must be argued or folded into the service-worker update path), or the worker's
navigation handling is made to guarantee the mismatch cannot happen. **Both
options are written up before either is built.**

**P8.4 is hardening with a real cost.** `'unsafe-inline'` currently covers the
browser-floor guard and the pre-JS paint, both static. Hashing them means a
build step that writes `_headers`, which is a generated file the deploy must
not be able to skip — the same argument `scripts/notices.ts` made and won.

> **Question:** is there a state this game can reach where the only exit is
> clearing site data?

**Verify:** each hole reproduced BEFORE it is fixed, in a test that fails
without the fix; `csp.spec.ts` and `verify-deploy` green after P8.4.

---

## P9 — the payload budget (REPLACES the atlas item)

The atlas was retired — see the corrections section; it is argued, tested,
photographed and answers a question the worlds list cannot, so what is left of
it is one row on Marc's Session A sheet: _does he open it twice?_

Its slot goes to the instrument this repository is missing and has already been
burned by once. `IMPROVEMENTS.md` Batch 8 measured everything **once, in
prose**: app 114.9 KB gzipped, vendor 333.1 KB, the compiler's 16 KB, the
precache 2.7 MB → 1.8 MB. Nothing re-measures any of it. And B8's own chunking
ruling ends by saying the cost of `three` riding in the `Board` chunk "shows up
immediately as the entry chunk's byte count jumping on the next build" — which
requires a watcher, and there is none.

This repository already knows the shape: `pnpm sim` against a golden file, the
palette against a budget, the baked art against the theme. A number that may
not move without a reason in the same commit.

| id   | status | statement                                                                                                        | where                |
| ---- | ------ | ---------------------------------------------------------------------------------------------------------------- | -------------------- |
| P9.1 | open   | the measurer — per-chunk gzip and brotli off the build, plus fonts, art and the SW precache total                | `scripts/budget.ts`  |
| P9.2 | open   | the bars, each with an ARGUMENT beside it, committed the way `sim.golden.txt` is                                 | `budget.json`        |
| P9.3 | open   | CI gate; a bar moves only in a commit whose `LOG.md` line says why                                               | `.github/`           |
| P9.4 | open   | the entry chunk's static-import graph, so `three` leaking back into it is caught by name and not by a byte count | `vite.config.ts:315` |
| P9.5 | open   | the pre-JS paint and the two preloaded faces — B8.2's FOUT fix, with nothing watching it                         | `index.html`         |

**A gate, unlike P1 and P5** — and the difference is defensible: a byte count is
exact, reproducible on any machine, and does not depend on a renderer. That is
precisely what B8.6 said the screen audit was NOT, which is why that one stayed
a report and this one does not.

> **Question:** B8 measured once, in prose. What has moved since?

**Verify:** `pnpm budget` green on a clean tree; deliberately break it by
importing `three` into the entry and confirm CI goes red.

---

## P10 — the matrices answer to tests

`MODES.md` and `INTERACTIONS.md` are prose statements of things the compiler
and the tests could assert. `MODES.md` was written on 2026-09-09 precisely
because three sessions in a row landed on a door that forgot a flag, and it
opens by telling the reader to check it against the code.

**It is already stale, and that was found today rather than by a session that
trusted it.** Its last bullet says a shared run leaves no trace and calls it an
open question in `NEXT.md` §1 — while `SharedEntry` shipped the same day
(`meta/timeline.ts:136`) and `NEXT.md` §1 records it as built. Corrected on the
way into this item, and it is the whole argument for the item.

| id    | status | statement                                                                                                 | where                    |
| ----- | ------ | --------------------------------------------------------------------------------------------------------- | ------------------------ |
| P10.1 | done   | the door table checked against `Door` and the call sites — a flag added is a row added, or the test fails | `shell/modes.test.ts`    |
| P10.2 | done   | the two seed guards and the five-reader table asserted, not described                                     | `shell/modes.test.ts`    |
| P10.3 | done   | every name a matrix uses resolves, or is declared in the file's own exceptions block                      | `shell/modes.test.ts`    |
| P10.4 | done   | one home for the ruled-dead — P1.7's allowlist — cited by both files instead of restated in each          | `scripts/sweep/allow.ts` |
| P10.5 | done   | **the stale bullet**: `MODES.md`'s shared-run line, corrected 2026-09-09                                  | `MODES.md`               |

### The answer, and what it cost to get (2026-09-10)

> **Question:** can a matrix be generated without becoming a matrix nobody
> reads?

**No — and it should not be generated.** A generated door table prints what the
compiler already knows (`daily` is a `string | null` at all four doors) and
cannot print the only column anybody opens the file for, which is WHY. That is
documentation of the type system, and this item's own paragraph named the
failure before the work started. So it took the outcome this row
pre-authorised: **a test that fails when the doc and the code disagree, and no
generation at all** — eight assertions in `apps/game/src/shell/modes.test.ts`,
prose left hand-written.

**Where the check goes is the whole craft.** `MODES.md`'s door table has column
headers that ARE `Door`'s field names and rows that ARE call sites; that is
structure, and it is checked. `INTERACTIONS.md`'s third column is `✓`, `→ was
a silent no-op`, `—` — a narrative comparison against Ashwake 1 — and P10.3's
original wording (every ✓ names its handler) would have buried a hundred
handler names in it. **That buys a check at the cost of the readability that
makes anyone open the file, which is the failure and not the fix.** What is
checked there instead is the NAMES: every symbol either matrix spells in
backticks must be declared in `packages/core/src` or `apps/game/src`, or listed
in that file's own "names the code does not declare" section — split into GONE
and NOT OURS, which is the answer a reader wanted anyway.

**Verified by mutation, as this row asked.** Adding an eleventh `Door` field
fails with `` `Door.newFlagNobodyClassified` is neither a column in MODES.md's
door table nor under NOT MODE FLAGS ``; making a door spread a default fails
with `enterRun call 1 spreads a default instead of stating its whole Door`.
Both name the door and the flag.

**What the tests themselves found: almost nothing, and that is the result.**
Six names failed to resolve on the first run and every one was correct prose —
two deliberate history (`searchFor`, `isTappable`), four the platform's
(`contextmenu`, `change`, `visible`, `inert`). The first draft of the test's own
docblock claimed the file was stale about those two; it was not, and the claim
was corrected before it shipped. One real inaccuracy: `MODES.md` QUOTED
`state.rootSeed !== world.worldSeed` and `settle` compares against `before`.

**That inaccuracy changed the design.** Text-matching a guard's expression pins
a tidy-up rather than a rule, and passing it would have taught the matrix to
quote code — which is a doc that must be edited every time the code is tidied,
and therefore a doc that stops being edited. **A guard is protected by its
TEST**, so `MODES.md` now cites the suite that proves each half and the test
asserts the citation resolves: deleting the proof fails, which is strictly
stronger than noticing later that a sentence rotted.

**AND THE ITEM'S REAL FIND CAME FROM NEITHER FILE.** `INTERACTIONS.md` said
`previewColour` was _"unread ON PURPOSE now"_ — on the row written expressly to
stop a fourth pass re-opening it — while `HexField.tsx` has tinted every legal
hex with the held card's colour since 2026-09-08, as a preview FILL, which is
exactly what the reverted attempt's own post-mortem prescribed. Only the
OUTLINE still refuses the field, and `board/rings.ts` says so at the line, in
the one place that is true of.

**A stale ruling sends a session to re-open a question that was already
ANSWERED** — P10.5's failure pointing the other way, from the same cause. And
nothing in the new tests caught it: it was caught by asking why `pnpm sweep`
reported nothing about a field the matrix called dead. **Two instruments
disagreeing is the finding**, and P10.4 is the fix for the class: the
ruled-dead live in `allow.ts`, dated and argued once, and the matrices cite it.
`HOME` and the `previewColour` argument are citations now rather than copies.

### And the sweep is a CI gate, which P1 left to this item

`pnpm sweep` exits non-zero on a finding, on a ruling that matches nothing, or
on a ruling past its `until`; `ci.yml` runs it and then diffs `SWEEP.md`, the
same pairing the golden sim has, because a tool that grades its own output is
not a check.

P1 wrote the bar so a later session could not invent a softer one — **one clean
run with an empty allowlist delta** — and P1.9 cleared it. The last two
findings in the whole report were `runsOf(slot)` and `streamOf(slot)`, which
this item owned: the per-world filter chips are unbuilt and `screens/Fame.tsx`
says so at the call site, so they are ruled in `TIMELINE_SLOT_FILTER` with the
warning that `streamOf`'s shared-run branch is a RULE about the unbuilt screen
and would be deleted with the parameter. **330 findings → 0, 91 rulings,
nothing orphaned.**

**Verify:** the full gate; then delete a flag from one door and confirm the test
names the door and the flag. Both mutations run and recorded above.

---

## Order, and why

1. **~~P1 — the sweep.~~ DONE 2026-09-10.** First, because everything below is
   better aimed with its report in hand, and because P10 and P3 both reuse its
   machinery. Both of those are now true in the other direction as well: the
   only two findings left in the report are P10's, and P10 inherits the fixed
   passes rather than the blind ones. **P10 is next.**
2. **P3 — the French artifact.** Second, and early on purpose: it costs Marc's
   time, and his time is now running in parallel with Session A. Both of his
   inputs should be queued before I disappear into P2.
3. **~~P10 — the matrices.~~ DONE 2026-09-10.** Shares P1's machinery while it
   is fresh, and stops two ledgers going stale over a month-long pass. Proved
   necessary twice over: P10.5 before it started, and a stale `previewColour`
   ruling found while finishing it. **P2 is next.**
4. **P2 — the extraction.** The big one, done while the sweep's report is still
   the newest thing in the repository, and before P4 and P8 start editing the
   same file.
5. **P9 — the payload budget.** Before P4, P5 and P6, so anything they add to
   the bundle is measured on the way in rather than discovered later.
6. **P7 — compaction.** Disjoint from everything above it.
7. **P8 — the failure paths.** After P9, because P8.1 and P8.5 both touch the
   service worker and P9.1 measures its precache.
8. **P6 — WebKit.** The engine the phone runs, before the two items that will
   want to run on it.
9. **P5 — performance.** After P2, so the trace is of the shape that ships.
10. **P4 — the accessibility proof.** Last of the ten, because it is the one
    most likely to want changes on screens the other nine have been editing.

**P0 interrupts any of them.** Session A is running now.

**Two dependencies are hard, the rest are preferences:** P10 needs P1's
machinery, and P2 must not run before P1 (extracting dead code is how dead code
becomes invisible). Everything else can be reordered on the day.

## Verification, per item

Every item, without exception, before it lands:

```
pnpm typecheck && pnpm lint && pnpm test && pnpm sim && pnpm build && pnpm test:e2e
```

`pnpm sim` byte-identical to `packages/core/sim.golden.txt` is the one that
matters most in a pass with no rule changes in it: **a diff there is a rule
that moved**, and nothing in this file is allowed to move one. `pnpm bake` and
its `apps/game/public` diff run for any item that touches the theme, the fonts
or the icons. Items that change what ships are deployed and
`pnpm verify:deploy`'d in the same session.

And per `CLAUDE.md`: the item's written question goes into `LOG.md` **before**
the work, answered after; `STATUS.md` moves only at a checkpoint; and this
file's rows go to `done` in the same commit as the work, never after.

## What this pass deliberately does not do

- **No new mechanics, and no rule changes.** The golden sim stays
  byte-identical. Nothing here touches `packages/core/src/engine` or `content`
  except to read it.
- **No look decision taken without Marc.** `NEXT.md` §5b is the record of what
  guessing costs: two look changes guessed at from a session with no phone in
  it, both wrong within the hour. Where an item's answer lives on a screen, the
  finding is the deliverable — stated at the declaration and in `NEXT.md`.
- **No new dependency without an argument in the commit.** P1 and P9 are both
  buildable out of `typescript` and `tsx`, which are already here.
- **No reopening what is deferred by ruling.** `NEXT.md` §4: Tier-1 uniques,
  sound's written question, the leaderboard (D13, needs a backend), store
  wrappers, the waypoint-perk earn, world mood, ground-feeds-draft, the
  timeline's spine, and pop-vs-burn-vs-wait. `Said.brief` (§5c) and
  `Ring.width` stay dead until asked again.
- **No PR gate.** Land on `main`; CI gates the deploy.

## What is left for Marc, in one list

- **Session A**, on the deployed v2, on his phone, in portrait. Running now.
- **The French**, when P3's artifact reaches him. Roughly 630 entries; the
  threads come back here.
- **The atlas**, one row on the Session A sheet: does he open it twice?
- **Any look finding** P4, P5 or P6 turns up, each stated at its declaration
  and repeated in `NEXT.md`.
- **Five facts the HUD works out and never says**, and one about the board's
  fit — P1.9's whole remainder, all six in `NEXT.md` §1 (2026-09-10). The
  colour lens is the loudest and the one with a sequence attached: saying yes
  needs about five new sentences in both languages, so it wants to go INTO the
  next French pass rather than behind it.
