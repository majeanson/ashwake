# CLAUDE.md

This is **Ashwake 2**: the same game as `../tiles` (Ashwake 1, frozen at
v1.0.0, live at tiles.marcportal.com) in a new body. The rules are lifted
verbatim into `packages/core`; the screen is rebuilt in `apps/game` on a 3D
board (Three.js + React Three Fiber) with React chrome. The decision record for
that is `DECISIONS.md` D1 and the plan is `ROADMAP.md`.

Read `STATUS.md` first — what is done **and verified**. `NEXT.md` is the short
answer to "what now", sorted by whether it needs Marc, and carries the standing
goal. `ROADMAP.md` is the stages and v2.0's definition of done. `LOG.md` is the
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
Ashwake 1, and it is the answer to "did we get back what we had".

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

**But the grep finds gaps, not answers.** A third pass over the theme found
five more unread channels and **none of them was fixed**, because what a
vignette's strength or a hex's gutter should look like is a screen and an eye,
not a derivation. The two look changes guessed at from a session that could not
see the phone were both wrong within the hour. So: where the answer lives in
the core — a sentence, a number, a record — wiring it is the whole fix. Where
the answer lives on a screen, **the finding is the deliverable**; state it at
the declaration and in `NEXT.md`, and leave the decision to Marc.

Hard rules — all inherited, all still enforced:

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
- **No PR gate.** Land on `main`; CI gates the deploy.

The stranger test (`PLAYTEST.md` Session C) is v2.0's gate and has never been
run on either body. A stranger is a one-shot resource: nothing that changes the
first minute ships between Session A's last clean pass and their run.
