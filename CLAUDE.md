# CLAUDE.md

This is **Ashwake 2**: the same game as `../tiles` (Ashwake 1, frozen at
v1.0.0, live at tiles.marcportal.com) in a new body. The rules are lifted
verbatim into `packages/core`; the screen is rebuilt in `apps/game` on a 3D
board (Three.js + React Three Fiber) with React chrome. The decision record for
that is `DECISIONS.md` D1 and the plan is `ROADMAP.md`.

Read `STATUS.md` first — what is done **and verified**. `NEXT.md` is the short
answer to "what now", sorted by whether it needs Marc, and holds open items
only; `NEXT-HISTORY.md` is its closed half, kept whole because the code cites
its section numbers — a `NEXT.md §N` in a docblock means that file. `ROADMAP.md` is the stages and v2.0's definition of done. `LOG.md` is the
per-session record, one written question per session. `DESIGN.md` is Ashwake 1's design record, carried
over whole because the rules did not move; `PLAYTEST.md` is the phone script,
carried over for the day this body is playable.

**Check a ledger against the code before acting on it.** Ashwake 1 lost a
session to a stale open-list once; it is cheaper to grep than to trust.

**Before calling a screen done, grep for a consumer of every action it can
produce.** Four whole mechanics shipped inert in this body — the colour lens,
the stash, the board's tap-to-describe, and unselecting a card — each a rule
the core implements and tested, reachable from nothing. A rendered control is
not a wired one. `INTERACTIONS.md` is the gesture-by-gesture matrix against
Ashwake 1, and it is the answer to "did we get back what we had";
`MODES.md` is the same kind of matrix for the three KINDS of run and the doors
between them.

**And before calling a MODULE done, grep for a consumer of every export it
has.** The matrix above was right about every gesture and twelve surfaces were
still missing (2026-09-02): `HudView.hint` — the plane's own signpost —
computed every render and read by nothing, `?ff=` tested with no caller so
`debug.overlay` had no door, `settle` computing NEW BEST and throwing it away.
A gesture matrix cannot see a sentence the core writes that no screen prints.
Run the check over `packages/core`, not only over a screen.

**And keep that sweep's signal clean: do not export what one file uses.** The
sweep was run again on 2026-09-08 and found one genuinely dead export
(`STAT_ICON` — the table saying which stats are marks, while the render
hard-coded `id === 'luck'`) sitting in a list of sixteen that were merely
file-internal. Each of those is a false positive the NEXT sweep has to
re-adjudicate from scratch, which is how a ritual stops being run. The twelve
in `apps/game/src` are `const` and `function` now; the four in
`packages/core/src/engine` and `content` were left exported on purpose,
because that code is Ashwake 1's lift and its surface is Ashwake 1's.

**But a demotion is not free, and it is the ritual that blinds the others.**
`pnpm sweep` exists now (`SWEEP.md`, `scripts/sweep/`), and the first batch of
this instruction — 141 symbols on 2026-09-10 — took `Ring.width` and
`ConfirmingProps.holdMs` off the FIELD and OPTIONAL passes along with their
types, because all four of the other passes walked only exported declarations.
Both had a ruling written that same morning. **A field's readers, an optional
input's suppliers, a call site and a comparison are the whole program whatever
their type's visibility**; `export` was never the question, and the passes ask
it no more. What caught it was the report's own "Rulings that match nothing"
section. **A symbol a test imports is also not demotable** — the tool said so
on 74 rows and it was wrong on every one: a unit test importing its unit is
unit testing, not a finding.

**And once more over the FIELDS.** A module sweep cannot see a property:
`CellView` has twenty-two, the board is the only thing that could read one, and
"nothing imports it" is never true of a field. Walking them found five more the
same day — `voice.dry` never played, `previewColour` unread so every legal edge
drew in one ink, and `band` unread so a world with five contour bands was drawn
flat by the body that has a Z axis.

**A hook a test can inject is a hook a test cannot prove is connected.**
`receipts.ts` takes a `perkAt` so a find's claim can name the perk it gave;
`receipts.test.ts` supplies one and is green; `App` supplied none, so every
find in the real game said "Nothing new inside" while a perk was being handed
over. Three passes of grepping exports and fields walked past it, because the
gap was an OPTION. Sweep the optional inputs too, and ask who passes them.

**And where a docblock claims there is no second rule, grep for the second
rule.** The daily's shrine rewrite sat in `destinationAt` under a comment
saying it was placed there "so the reveal, the beacons, the fog and the tap
answers all agree without a second rule anywhere" — while
`destinationsWithin`, the function that draws the beacons, reached the
generator directly and never came through it. A daily advertised shrines it
would hand over as caches, for four stages, and Ashwake 1 has the same hole.
**A comment that asserts an invariant is not the invariant, and it is the
sentence that stops a reader checking.**

**And a MODE is a set of flags, set by DOORS — sweep the doors.** Three
sessions in a row landed on the same shape: `Session.detour` was fixed for the
life of the PAGE, so a `?seed=` visitor who kept the board as one of their
worlds went on playing it with fourteen readers still answering for the shared
one (a find paid nothing, a perk was lost on reload, the manual said "nothing
about buying applies here" over their own shop). RESET ALL cleared the world,
the ending and the purse, and not `daily` — so the next run was played on a
private board and banked as today's shared score. And the end screen gated an
offer on `daily` when the shell had already decided. None of it is visible from
inside one file: **list the doors, list the flags, and check the matrix.**
`MODES.md` is that matrix, and the doors state their whole `Door` so the
compiler asks every one of them when a flag is added.

**And where a world is MINTED holding facts it did not earn, seal the survey.**
There are four places a world comes from and three of them hand it a history:
a crossing carries the perk shelf, a kept board carries the ground and the
territories, the audit fixture carries three hundred runs. `goalsMet` starts
empty and the survey pays at the END of the next run, so one placement
collected 40 relics a lap after a crossing and 90 on a kept board. Each of the
three sites learned this separately — the fixture wrote the seal inline before
`sealGoals` existed. A rule discovered three times is a rule that wants one
name.

**But the grep finds gaps, not answers.** A third pass over the theme found
five more unread channels and **none of them was fixed**, because what a
vignette's strength or a hex's gutter should look like is a screen and an eye,
not a derivation. The two look changes guessed at from a session that could not
see the phone were both wrong within the hour. So: where the answer lives in
the core — a sentence, a number, a record — wiring it is the whole fix. Where
the answer lives on a screen, **the finding is the deliverable**; state it at
the declaration and in `NEXT.md`, and leave the decision to Marc.

**And all six rituals are a program now — so audit the INSTRUMENT, not only
the code.** `pnpm sweep` writes `SWEEP.md`; `scripts/sweep/allow.ts` is where a
ruling goes so the next run does not re-litigate it. Adjudicating its first
report (2026-09-10, `LOG.md` Session 78) took 330 findings to 2 and corrected
**five separate faults in the tool**, every one of them invisible until
somebody acted on it: advice that did not compile, three passes blinded by
their own remedy, a category that shipped 74 rows of noise, `as const
satisfies` hiding twenty real readers, and the report dropping the
prescriptions its own passes wrote. **A finding you cannot act on wastes a
minute; a finding whose fix does not compile wastes it after you trusted the
tool.** So: when a report and the code disagree, the code is a witness — read
it before editing anything, and when a ruling in the allowlist stops matching,
suspect the pass before you suspect the subject.

- **The core is pure.** `packages/core` has no DOM, no `Math.random`, no
  `Date`, no async, no React, no three. ESLint enforces every one of those
  (`eslint.config.js`); the layering `content <- engine <- meta <- view`,
  `content <- theme <- render`, is a lint error, not a convention.
- **The rules did not move, and CI proves it every push.** `pnpm sim` must
  print exactly `packages/core/sim.golden.txt`, captured from
  `tiles@42d4da3`. A diff there is a rule that moved. If a rule is ever meant
  to move, the golden file moves in the same commit with the reason in
  `LOG.md`.
- **Every balance number lives in `packages/core/src/content/`.**
- **Every system ships behind a flag or a tuning dial that zeroes it**,
  defaulting off. Run one is the smallest game there is.
- **Plain words.** No invented vocabulary until a concept has earned a name.
- **One question per prototype.** Write it down before building, answer it
  after playing, in `LOG.md`.
- **Testing happens on the deployed site, on a phone, in portrait.** Not
  localhost, not a resized desktop window.
- **One page, many sessions.** A scene change is a state change, never a
  reload; the only reloads allowed are the service-worker update and the
  boot-failure panel.
- **The palette answers to tests.** The contrast budget (4.5:1 text, 3:1
  marks) and the greyscale ladder in `packages/core/src/theme/*.test.ts` run
  over every direction, and — once the board is lit — over the materials a
  hex actually renders in. Do not relax a threshold to pass; darken something.
- **Two languages, and the catalogue never decides** (D4). Every sentence a
  player reads lives in `packages/core/src/text/` — `fr-CA.ts` first, `en.ts`
  second — as a typed object, so a missing sentence is a type error. Facts
  are computed in `view/` and `meta/`; a catalogue function takes numbers and
  names and returns words, never reads state, never decides whether to speak.
  Québec typography is a test (`text.test.ts`). The English snapshots are
  never re-recorded silently; the French ones are Marc's review surface.
- **The board host never remounts.** The R3F `<Canvas>` lives once, above
  every scene; losing it loses the WebGL context.
- **No PR gate.** Land on `main`; CI gates the deploy — the `ci` job, which
  is every exact check there is. **`e2e` is a job beside it and gates
  nothing** (2026-09-11, Marc: _"separate e2e and deploy jobs"_): it holds the
  only real browsers in the repository, so it is also the only check that can
  fail on a stopwatch, and five such failures in one evening kept six finished
  commits off the phone they were written for. It still runs on every push and
  still keeps its screenshots. The cost, stated rather than hidden, was that a
  renderer crashing on boot could reach production with a red tick beside it —
  so since 2026-09-16 a `smoke` job gates the deploy too: ONE browser test,
  the boot test on Chromium, with retries. Small enough not to fail on a
  stopwatch, and the one failure the full job existed to catch.

The stranger test (`PLAYTEST.md` Session C) is v2.0's gate and has never been
run on either body. A stranger is a one-shot resource: nothing that changes the
first minute ships between Session A's last clean pass and their run.
