# STATUS.md — checkpoint ledger

What is DONE and VERIFIED, so future work starts from trust instead of
re-checking. Updated at checkpoints only. The reasoning lives in `LOG.md`; the
rules in `CLAUDE.md`.

Last checkpoint: **2026-09-09 — one hex draws one cell, and the daily's coin
gets its second face.**

Marc sent a screenshot of one star drawn twice and asked, in the same breath,
whether the translations are honest and whether every landmark a daily proposes
can pay. `LOG.md` Session 63 is the reasoning.

**Verified:**

- **One hex draws one cell.** `toBoardView`'s memory pass never added its own
  keys to `onBoard` and `beaconsFor` filters against the LIVE board alone, so
  a remembered destination inside the beacon horizon came out TWICE — drawn
  flat by the memory cell and standing on a billboard by the beacon cell, which
  is the double glyph. **The beacon wins** (Marc's ruling): the horizon decides
  what glows, not whether an earlier run walked past. `shimmersFor` is a
  selector beside `beaconsFor` now, because the memory pass has to know what
  will be drawn over the map before it draws the map. `view.test.ts` asserts
  the surviving cell, not just the count.
- **A daily's reborn shrines are caches AND sites.** The flip was
  `hashAt(...) % 2 === 0` on a hash uniform in [0, 1), so it was 0 once in
  2^32: **585 reborn shrines over the first forty seeds, 585 sites, zero
  caches.** Marc asked for "tile cache or points" on Day 2 of launch week. The
  pin over it was `toContain(['cache', 'site'])`, which passes on a coin with
  one face; `world.test.ts` counts both faces now.
- **The rewrite's docblock in `tuning.ts` pointed at the wrong function** —
  still "applied inside destinationAt", the exact sentence that was wrong when
  the rewrite moved into `blockDestination` on 2026-09-02 because the beacons
  never came through `destinationAt`.
- **The translations are clean, and now pinned.** No JSX text node, no
  hardcoded label, no locale fork outside `text/`; the two single-language
  surfaces are deliberate (the stranger console, which no player reaches) or
  carry both languages (the `<noscript>` and browser-floor panels, which run
  before the catalogue exists). `text.test.ts` walks the two catalogues in
  step and fails on a French entry holding English words — sixteen matched,
  all sixteen real Québec cognates or a language named in its own language,
  kept as an allowlist a reviewer defends.

**Left for Marc:** a DETOUR keeps its shrines and its finds and neither pays
anything — the daily's own bug one step over, deliberate per
`economy.test.ts`, and a design call rather than a defect (`NEXT.md` §1).

**Counts:** 1086 tests / 86 files, `pnpm sim` byte-identical, typecheck and
lint clean.

Previous checkpoint: **2026-09-08 — the seven answers, and zero clipped.**

Session 61 handed Marc every look decision it had refused to guess at; he
answered all seven and this is them built. `LOG.md` Session 62 is the
reasoning.

**Verified:**

- **The stat row is six marks, and the audit proves what it bought**: 179
  findings → **164**, fifteen `clipped` → **zero**. The whole category was one
  element in French, the locale the game ships in. `statLabel` survives as
  every stat's accessible name, so a screen reader still hears TUILES, and a
  tap still prints the stat's own sentence. `STAT_ICON` lives in
  `theme/icons.ts` so `tokens.test.ts` walks it.
- **The vignette draws**, at 0.30 rather than the authored 0.55, in CSS rather
  than a post-processing pass — a vignette is screen-space by definition.
  `?vignette=` argues with the number.
- **The held colour draws**, as a FILL through the per-instance tint rather
  than as a ring — the 2026-09-02 revert diagnosed weight, not colour.
  `?ghost=0` is the undo.
- **`Surface.inset` is honoured as the DIFFERENCE it expresses**, not its
  absolute value, because the literal reading would have quietly undone the
  contour fix of 2026-09-04. The arithmetic is stated as mine and
  `ground.test.ts` pins it.
- **The action bar is reserved for the whole run** — the board no longer
  resizes under the canvas when POP appears. Third instance of the disease,
  first with a test: `e2e/steady.spec.ts`, checked to fail without the fix.
- **WALL and FIELD fly**, once per device each. The oldest camera ruling is
  about ambient drift on every placement, and the distinction is kept at
  `shell/tourTarget.ts`.

**Two of §5b's five were already closed when the section was read** —
`board.seam` (wired 2026-09-04) and `Ring.width` (ruled dead 2026-09-01) —
and were caught by checking the code before asking rather than after.

**A flake named, and it was not this session's**: `board.spec.ts`'s view
cycle failed two runs in three on unmodified `main`. The drag that arranges
the board is a flick, so the reference shot was of a board still gliding. It
polls for stillness now; three for three, and faster.

**Deferred by Marc:** `Said.brief` stays built and unreachable (`NEXT.md`
§5c). **Still his, and unchanged:** choosing the direction (S5), and Session A
against the deployed v2 before the stranger.

**Counts:** 1082 tests / 86 files, 101 e2e on Chromium + 41 on WebKit, `pnpm
sim` byte-identical, `pnpm artcheck` green, audit 164 findings over 113/113
visits.

Previous checkpoint: **2026-09-08 — the nine-domain review, and the bug under the
bug.**

Marc asked for a thorough review and picked nine of the ten domains it
produced. It opened GREEN — typecheck, lint, 1046 tests, `pnpm sim`
byte-identical, zero `TODO`, zero `as any` — and every real finding came out
of BUILDING a domain rather than out of reading one. `LOG.md` Session 61 is
the reasoning; this is what is now true and verified.

**Verified, and each of these was broken or missing before:**

- **The committed art is graded.** `ci.yml` had admitted since 2026-08-29 that
  "the art is current" was checked by nothing. `pnpm artcheck` is the portable
  closure it had already specified: `assets/ladder.json`, two columns, `token`
  compared exactly (pure theme arithmetic, no rasteriser) and `measured`
  re-decoded from the committed bytes. Both proven against a deliberately
  broken tree — a darkened token reports "the THEME moved and the art did
  not", a swapped PNG reports "the ART moved and its record did not". CI runs
  it BEFORE `pnpm bake`, because bake overwrites what it grades.
- **The audit builds what it photographs.** `playwright.audit.config.ts`
  served `dist` without building it — the identical fault the gate config was
  fixed for on 2026-09-02, still live next door, and worse: an audit cannot
  fail, so a stale run yields a plausible report and 320 pictures of a build
  nobody made.
- **WebKit runs the suite's DOM half.** 41 tests on the engine the game is
  actually played in, chosen by measurement (the whole suite ran there first;
  64/93 passed and all 29 failures were read and none was a bug in the game).
  One process per engine, because two engines back-to-back exhaust the
  driver's WebGL contexts — the same symptom `workers: 1` has recorded since
  2026-08-29, given the same treatment rather than a filtered assertion.
- **The `z-index: calc()` theory is dead.** Three sessions rested on it.
  WebKit computes `calc(var(--z-chrome) + 2)` as `12` and honours it. The
  three "latent" sites need nothing; `e2e/stacking.spec.ts` asks the engine
  with `elementFromPoint` rather than asking the stylesheet, on both engines.
- **The board's gestures were bound by a race.** `Rig`'s gesture effect and
  the ResizeObserver both read `wrapper.current` with the ref OBJECT as their
  dependency, so a null at first-effect time was permanent. Latent since it
  was written; lazy-mounting the board is what made it lose. **The board drew
  perfectly and answered nothing a finger did.** Both take the element as
  state now, proven by reverting only that fix and watching two specs fail.
- **The front door no longer waits on a renderer.** Blocking JS 451KB → 165KB
  gzipped. `Board` behind `lazy()`, fetched on the beat after first paint;
  `tourMs` moved to `board/flight.ts` because one arithmetic helper was
  holding three in the entry chunk. The `<Canvas>` still mounts exactly once
  and never remounts.
- **`STAT_ICON` has a consumer** — the seventh instance of this body's
  signature miss, and the sweep that found it returned fifteen more exports
  that were merely file-internal. Those are `const` and `function` now in
  `apps/game/src`, deliberately untouched in `packages/core/src/engine`.

**New, and both off by default:**

- **Haptics** (`ui.haptics`): a tick on place, a two-beat on pop, one on a
  claim, on the `act` seam. `ui.sound`'s class and its inverse argument — a
  buzz does not leave the phone, so it is the feedback a player in a quiet
  room can still have. A no-op on iOS, where SETTINGS hides the row rather
  than offering a switch that would lie.
- **S6 opens: the stranger console** behind `?playtest=1`. Three of Session
  C's four facts record themselves off `act` with the elapsed time the paper
  form has always left blank; the fourth is the gate and its "not the first
  run" rule lives in the model. COPY SHEET in `PLAYTEST.md`'s own layout.
  Rehearsed with 19 unit tests and four in a browser, one of which places a
  tile with a TAP because `?place=n` walks the reducer and never travels
  `act`.

**Two `NEXT.md` items came off by being READ**: the drip's toasts and the
Android BACK gesture were both fully landed and never struck. The file that
exists because _a stale open-list is worse than none_ was the stale one.

**What is left for Marc** is `NEXT.md` §1 and §5b–§5d — domain 7 of the
review, excluded by him and untouched: the five unread theme channels,
`Said.brief`, the POP row reserve, WALL/FIELD's camera trip, and now the
French stat row, where a mark instead of a word would end the clipping and is
a look decision rather than a fix.

**Counts:** 1077 tests / 86 files, 100 e2e on Chromium + 41 on WebKit, `pnpm
sim` byte-identical, `pnpm artcheck` green.

Previous checkpoint: **2026-09-03 — the wide pass, reviewed: three of its own fixes
were wrong.**

The review found four defects, three introduced BY the pass, and the worst of
them was its own headline lesson happening to it: `button:active` shipped a
colour the contrast budget had never seen, under a comment claiming the budget
held it. The accent read 4.21:1 in daylight on POP and BEGIN. Fixed, and
`contrast.test.ts` grades the pressed ground now, so the number cannot drift
again. The B4.7 material-cache fix had reintroduced the leak it removed, one
layer down, via StrictMode double-invoking the memo. The audit's partial-run
guard was too weak and destroyed the report once before being tightened. See
`LOG.md` Session 39b.

Also landed: a test for B1.8 (Tab, with a panel open, may not reach the hand)
and the third and last copy of the flaky manual-tab click.

Previous checkpoint: **2026-09-02 — the wide improvement pass: 121 items, 116
landed, five ruled.**

Marc asked for improvements to what already ships — UI/UX and beyond — with no
new features and no new rules. `IMPROVEMENTS.md` is the row-by-row record and
`LOG.md` Session 39 is the reasoning; this is what is now true and verified.

**It opened by finding CI red.** `pnpm typecheck` did not pass on `main` and
gates the deploy: `Payout` grew two props, its test kept passing the old four,
and `vitest` does not typecheck — so 1091 green tests sat on five type errors.
Everything else in the pass is verified by a command that could not run first.

**Verified, and each of these was broken before:**

- The `<Canvas>` could unmount on a transient zero-width measure, taking the
  WebGL context — a hard rule in `CLAUDE.md`. The measurement latches now.
- Focus fell to `<body>` every time ANY panel closed, because `focusOpener`
  called `.focus()` on an element that was still `inert`. And the hand was
  tabbable behind every panel, so a Tab out of the manual reached POP and
  SACRIFICE under an opaque page.
- The beacons' breath asked for 60fps for the whole of every run: `useFrame`
  only runs because something invalidated, so "animate while any beacon exists"
  meant invalidating forever. A 30 Hz timer now, which is the only shape that
  can stop.
- `paintPlan` ran once per CELL, not once per surface — 500 plan graphs per
  view change to find ~20 answers. Keying the batch by its surface also closed
  a hole where two surfaces differing only in alpha shared a batch.
- The crossing read three different copies of the world under a comment saying
  they were "the same number by construction".
- `useLedgers` took a hand-kept list of the ways the disk can change and had
  missed four writers. The disk says so itself now, from inside `write` and
  `drop` — and `storage.test.ts` caught that `drop` had been left out on its
  first run.
- The five run-doors are one `shell/beginning.ts`, which closed four steps the
  crossing and NEW RUN had drifted into missing.
- `createSession` minted a world seed and walked a whole scripted run inside a
  `useMemo`, which StrictMode double-invokes on purpose.
- **The rules of hooks were scoped to `*.tsx`**, so the four hooks with no JSX
  in them — including the 300-line `useDevice.ts` — were never linted. Widened;
  it found four more bugs immediately.
- The React Compiler is ON and verified in the built bundle: **63 components
  carry a cache holding 1,562 slots.** `react-compiler-healthcheck` compiles
  70 of 70.
- The vendor chunk is split: a returning player re-downloads 115 KB instead of 449. The service worker stopped precaching 872 KB of art for three directions
  the device will never render.
- Two literals said torchlit while the game ships settlement, including the one
  baked into the installed icon.

**The instrument is wider and now honest about itself.** 181 screen-visits: 35
screens × 4 directions, the same 35 in French — the shipping default, never
photographed before — and 6 at 320×568. The teaching drip has a picture for the
first time, which is the `PLAYTEST.md` Session C gate. `contrast-disabled` went
from 64 findings to **zero**; the 9 `clipped` are all French, all argued, and
seven of them are the evidence that decided the stat row's ellipsis.

**Five items ruled rather than done**, with the arguments at the declarations:
`memo()`/contexts (B6.3, B6.6) are what the compiler now does, measured;
moving the docblock history out of `App.tsx` (B6.7) would strip the code of
what makes this repository navigable; CI running the screen audit (B8.6) costs
fifteen minutes a push for pictures a runner draws differently from a phone.

**What is left for Marc** is in `NEXT.md` §5b (five unread theme channels, a
re-tune rather than a fix) and the new §5c (nothing sets `Said.brief`).

`pnpm sim` is byte-identical throughout; 1118 unit tests and 87 e2e pass.

---

Previous checkpoint: **2026-09-02 — the daily differs by more than shrines, and
the receipt denied the perk it had just handed over.**

Marc asked for a review of fog and shrine detection on a world versus a daily,
and across an abrupt switch between them. **The fog was clean. The shrines were
not, and the bug is live in Ashwake 1 too.**

A daily has no ledger, so `shrinesReborn` rewrites each shrine into a cache or
a site — and the rewrite lived in `destinationAt` alone, whose own comment
claimed it sat there _"so the reveal, the beacons, the fog and the tap answers
all agree without a second rule anywhere."_ But `destinationsWithin`, **the
function the view calls to draw the beacons**, reaches the generator directly
and never passed through it. So a daily glowed a SHRINE off-board, the signpost
named it a shrine, the ending's what-still-glows named it a shrine — and
walking there handed you a cache. The one surface the rewrite existed to keep
honest was the one it missed, and the comment asserting otherwise is what made
it invisible for four stages. `../tiles` has the identical hole and it is live
on the deployed Ashwake 1.

Fixed by moving the rewrite DOWN into `blockDestination`, where a destination is
made: both callers get it and a third cannot be written that does not. Pinned as
**agreement between the two doors** rather than as "no shrines on a daily",
because the bug was two paths to one fact — a third caller that skipped the
rewrite would pass a shrine-shaped test and fail this one. Invisible to the
golden: `shrinesReborn` is false everywhere but the daily economy.

Two smaller leaks across the switch, both in `enterDaily`: it never reset
`saidOnce`, so a UNIQUE on today's board stayed silent if the world run before
it had met one; and NEW GROUND — _"farther than THIS WORLD has ever reached"_ —
was measured against the HOME world's reach on a board that has no world.
**Wrong in two directions from one missing distinction:** a reach-20 world had
to be out-reached before the daily said anything, and a fresh device was told
the daily was new ground on its first placement. `reachAtStart` is
`number | null` now, and null is a mode saying it has nothing to measure
against; UNIQUE still fires, which a blanket guard would have thrown away.

The fog itself was already right and is now tested: `restart` takes the memory
as an argument, `enterDaily` passes `undefined`, and it goes 68 cells to 0 to
68 across the switch. `move()` flushes, drops, then builds the new keeper, in
that order.

**Then Marc asked whether the two modes differ by more than shrines. They do,
and the daily is device-independent as it must be:** `economyFor` reads no
progress at all, so a fully-upgraded device and a fresh one get a byte-identical
daily tuning — the invariant the whole ladder rests on. Against it, a world with
three woken shrines and a bought shelf runs 27 starting tiles to the daily's 22,
two stash slots to one, find-sense on, finds on, relics payable.

**Verifying that turned up a fourth bug next door.** `view/receipts.ts` takes a
`perkAt` so a find's claim can name the perk it gave, `store.ts` forwards it,
and **`App` passed none** — so every find claimed in the real game reported
_"Nothing new inside"_, including the ones that had just granted a perk, and
the shell's own `perkFound` toast was overwritten by that denial a few lines
later. The one moment the perk hunt pays out, the game denied it.
`receipts.test.ts` was green throughout because it supplies the hook itself.
Wired through `shell/finds.ts` — module scope rather than a ref, because the
React Compiler refuses a ref read from a closure built during render, and
because `install.ts` already makes that choice for the same reason.

**Two lessons, and they are the sharpest of five passes.** A comment that
asserts an invariant is not the invariant: **where a docblock claims "there is
no second rule anywhere", grep for the second rule.** And **a hook a test can
inject is a hook a test cannot prove is connected** — three passes of grepping
exports and fields walked past `perkAt`, because the gap was an OPTION.

Verified, on a real build: 1091 tests / 77 files, 87 Playwright, `pnpm sim`
byte-identical, typecheck/lint/build clean. **Still unseen on a phone:** the
signpost's cadence, the receipt's new line, the share card's composition, and
the contour lift.

Previous checkpoint: **2026-09-02 — the audit against Ashwake 1, and the twelve
things it found.**

Marc asked what was still missing compared to `../tiles`, then asked for it to
be fixed. A module-by-module diff plus a consumer-grep over every core export
found twelve surfaces. **No rule moved:** `pnpm sim` is byte-identical,
`content/tuning.ts` differs only by two registries that moved out of
`engine/state.ts`, and `TEACH_IDS` is unchanged. Every one of the twelve is a
fact the game had already computed and then declined to say.

**The method is the finding.** `INTERACTIONS.md` asks "what can a finger do
here" and was right about every gesture; all twelve misses sit one level below a
gesture — a tested export in `packages/core` with no importer in `apps/game`. So
`CLAUDE.md`'s standing check now has a second half: **before calling a MODULE
done, grep for a consumer of every export it has.**

**Two dead-code findings, the fifth and sixth of this body's signature miss.**
`HudView.hint` — the nearest destination, the endless plane's whole answer to
"where do I go?" — was computed every render and read by nothing; it is a toast
on change again (`shell/signpost.ts`), with Ashwake 1's three guards intact. And
`debug.overlay` shipped `wired: true` with **no reader and no door**:
`parseOverrides` (`?ff=`) had no caller either, so the only route to a
`player: false` flag did not exist. Both halves built.

**The pop receipt was right and silent.** `+8971 pts.` under nothing, beside a
`+113 tiles` line that named every term of its own much smaller sum. The number
checks out end to end (178 worth × 16 pocket × 3 distance × 3 bounty × 35% per
pop); the recipe was unreachable, because `h.points` lives in a branch
`singlePayout` never dispatches. It carries the whole equation now — including
`pointsPerPop`, a term **no surface in either body had ever named**, which is
why no product of the visible numbers had ever reached the visible total.

**The end screen had lost the most.** NEW BEST and the run number were computed
by `settle` and discarded; the two end-of-run bonuses had never been drawn, so
the breakdown summed to a fraction of the score with nothing explaining the gap;
relics banked was never printed, on the screen with the shop under it. An e2e
now reads the payout rows back and checks they sum to the score.

**And the share card is back**, with one change: every string is handed in
already worded. Ashwake 1 drew `${points} pts` into the canvas in English on a
card a French player was about to send — **D4 covers pictures.** With it: the
front door and the manual name which of the three games you are in, a shared
seed can be SETTLED as one of three worlds, the onward-share line returned, the
install prompt is caught rather than thrown away, and an in-app WebView is
warned that the world may not be kept there.

Two `prose.pin` snapshots were re-recorded deliberately, in the same commit,
for the receipt's new line — both languages, one line each. Marc's French
review surface should be read for it.

**A second pass, on FIELDS rather than exports, found five more.** The module
sweep cannot see a property: `CellView` has twenty-two, the board is the only
thing that could read any, and "nothing imports it" is never true of one. So
every field of `CellView` and `BoardView` was walked against the board.
`voice.dry` — the third sound this game has — had never been played by
anything. `cell.previewColour` was unread, so every legal edge drew in one ink,
which is the exact bug the field was created to fix. `cell.band` was unread, so
a world with five contour bands was drawn flat **by the body that has a Z
axis**, while Ashwake 1, which had none, at least tinted them. The manual
printed all thirteen lessons to everyone, rebuilding inside the drip's own
manual the wall the drip exists to take down. And `startingPerk`, whose
docblock says it is exported "so the UI can say WHY the starting number is not
30 — a perk nobody can see is indistinguishable from a bug", was said by
nothing.

Verified rather than fixed, so a third pass need not re-walk it: the keeper's
lifetime guards and hide-flush, `theme/tokens.ts` and `labelFor` (both
supersets of Ashwake 1's), every remaining core-module diff (D4 text
extraction; no rule moved), and **every key in the text catalogue has a
consumer** — the first time that hunt has come back empty.

**One of those five was wrong and Marc caught it on a phone within the hour**
(2026-09-02, `LOG.md` S37c): _"the first tile i put seems to refresh the whole
map display."_ Wiring `previewColour` into the legal ring meant that after a
placement — when the hand redraws and the auto-selected card is a different
colour — **every legal edge on the board changed colour at once.** Reverted.
The reason it worked in Ashwake 1 is WEIGHT, not colour: there it was a
hairline at `alpha: 0.75`, here a `0.16` ring band at full opacity, so the
colour source was ported and the weight was not. `rings.test.ts` pins the edge
against the hand, because the field is still there and a later audit will find
it unread again.

**And the process error under it is the more useful half.**
`playwright.config.ts` starts `vite preview`, which serves `dist` and never
builds it — so a bare `npx playwright test` ran the previous bundle, and an
eighty-six test suite came back green against code that had never been
compiled. The fault was that the safe command (`pnpm test:e2e`) and the obvious
one were different commands. They are the same command now: **the web server
builds before it serves.** A suite that cannot fail is not evidence.

**A third pass swept the theme, the tuning and the state shapes.** Four sweeps
that found something last time came back EMPTY, which is the first honest
signal the mechanical hunt is near its end: every one of the ~100 tuning dials
has a reader, so there is no dead balance; so does every field of `GameState`,
`WorldMemory`, `Progress`, `Records` and `HudView`; so does every key in the
text catalogue and every class in `ui.css`.

The theme did not. **Five authored channels reach no pixel** — `board.vignette`
(and **torchlit, the direction that ships, authors `strength: 0.72`**),
`theme.ghost` (a whole Surface per direction, never drawn), `Surface.inset`
(`empty` is authored looser than terrain and the board flattens it),
`board.seam`, and the already-known `Ring.width`. **None was fixed**, and that
is the finding: three passes of "wire the unread thing" met its limit, because
an unread number is a gap only when there is a right answer to what it should
draw. For `hud.hint` there was one; for a vignette's strength there is a screen
and an eye — and the two look changes guessed at from here were both wrong
within the hour. They are stated at their declarations and tabulated with
measured values in `NEXT.md` §5b, so the decision can be made from numbers.

Verified, on a real build: 1077 tests / 76 files, 87 Playwright, `pnpm sim`
byte-identical, typecheck/lint/build clean. **Still unseen on a phone:** the
signpost's cadence, the receipt's new line, the share card's composition, and
the contour lift, which changes the board's silhouette.

Previous checkpoint: **2026-09-01, last — the destinations become their marks.**

Marc, after three rounds on one phone photo and two wrong fixes: _"i want the
star symbol and just that for example"_. His own screenshot was the argument —
one clean STAR at the edge of the map and pale lumps everywhere else, because a
BEACON is the one destination that gets no prop and therefore the one whose mark
nothing covers.

**The props are deleted** (`DECISIONS.md` D11). `Props.tsx` stood an object on
the hex and `Labels.tsx` laid the mark flat underneath, so the object covered
the only thing that said which of the five it was — while `landmarks.ts` claimed
in its own docblock that "the mark stays the authority on MEANING". A
destination is now its mark: full ink while it pays, `inkDim` once spent, on the
destination ground, inside its ring. A revealed cache looks like the beacon that
announced it.

**The colour bug under it was real and was not the answer.** `Props.tsx` wrote
instance colours with `Color.setRGB`, which writes into the LINEAR working
space, so every prop rendered washed out with its own shading compressed. Fixing
it made them gold objects instead of cream ones and did not make them a cache or
a shrine. The rule it found outlives them and lives in `instances.test.ts`:
**`setRGB` for a torch tint, `setHex` for a colour** — `HexField` and `Pop` use
the first on purpose, because `torchShader.ts` wants raw display numbers.

**And the lesson, which cost three sessions.** Two of them diagnosed from a
compressed screenshot. What settled it was asking Marc, with the candidates
drawn out.

Verified: 1062 tests / 74 files, 86 Playwright, `pnpm sim` byte-identical,
typecheck/lint/format/build clean, audit at 132 findings with **no new rows and
none lost**. The count fell by 22 with the props' own test file.

Previous checkpoint: **2026-09-01 — a spent destination stops being spent
ground, and a parallel session lands with it.**

Marc, a third time in one class: _"symbols used on used shrines, sites, caches,
etc. are the same as when they are highlighted and active, just grey and look
deactivated instead."_ The glyph and the prop were fixed on 2026-08-29; the two
channels still being DELETED rather than dimmed were the hex itself. `ringOf`
read `!cell.claimed`, so reaching a cache removed its outline rather than
quietening it, and `surfaceFor` dropped a claimed landmark to `theme.stone` —
the surface a POPPED TILE wears — so the hex you walked all that way to reach
became the same hex as everything around it. Both speak `inkDim` now, which is
what the prop and the glyph already speak.

**The budget had never graded the spent voice.** `inkDim` is drawn four times on
a claimed destination and `materials.test.ts` graded `ink`, `halo`, `lit` and
`accent` and never it. Graded now, at the same bars, in all four directions —
which matters because this session put `inkDim` ink on `inkDim`-speckled ground.

**A ring's `width` is dead data, and is LEFT dead on purpose.** `HexField` draws
every ring from one geometry with a hard-coded 0.16 band, so six computed widths
all draw the same. Wiring it was built, measured and backed out: honouring the
authored numbers thins every outline on the board and costs the legal edge 45%
of its weight, which is a re-tune of the whole board's line weight rather than a
fix. `NEXT.md` holds it, needing Marc on a phone.

**A parallel session landed in the same commit** (`LOG.md` Session 33): THIS
DEVICE became a room off MORE, and a hand card became a picture with no words.
It was left mid-refactor and `main` would not have compiled — `TileProps` lost
its `held` flag while `ActionBar` still passed one — so that call site is fixed
here. The lesson is the general one: **verify the tree, not the diff.**

Verified over both: 1080 tests / 75 files, 86 Playwright, `pnpm sim`
byte-identical, typecheck/lint/format/build clean, audit at 132 findings with
**no new rows and none lost**. Still not seen on a phone.

Previous checkpoint: **2026-09-01 — the fog comes back, and the board starts
answering.** Marc, with two phone photos: the shrine unlock on the end screen,
a panel overflowing its top and wasting its bottom, _"i can click on any shrine
or point in the map that I can see to get information"_, _"discovered biomes
should be highlightable and a quick 'Lens off' button"_, and a daily with no
sacrifice and no long-term-run shrines.

**The fog had never been drawn in this body.** `createSession`'s `build()`
passed `toBoardView` a literal `[]` where the world's revealed ground goes, and
had since Stage 2 — so `Renderer`'s "the map you carry in your head, which is
the whole meta-progression" was absent for four stages. Every rule about it held
perfectly over an empty list. A world thirty runs deep opened as one tile in a
black void, and the audit shot of it had been in the repo for two days.
`RunMemory` carries `revealed` now. Compare `audit-shots/*/board-thirty.png`.

**Three more of the same shape, found on the way.** `HexField`'s raycast refused
beacons and remembered ground, so the fog would have been untappable even once
drawn — while `INTERACTIONS.md` listed both taps as working and the KEYBOARD
could reach the fog. And `describeHexOf`'s `unlockLabel`/`crossingDowry` were
never passed, so every shrine said "unlock a system" whatever its world held.

**The end screen was measured against the wrong world.** `gained` read the live
merge, whose effect is declared after the settle effect and bails once the run
has ended — so a shrine woken by the run's LAST placement was never reported. It
reads `after.world` now, and the atlas rides under the WOKE line: three of five,
and which three, on the screen where they were earned.

**Padding on a scroll container is what made the header look broken.** `.panel`
was the scrollport and carried the top safe-area inset; a scroll container clips
at its padding box and a sticky child sticks from its content box, and the band
between is exactly a notch tall. The head is a plain flex item now,
`.panel-body` is the scrollport, and the bottom inset lives inside it so the
last line scrolls through the band instead of stopping above it.

**A daily has no finds any more.** Shrines already came out; finds did not, and
a find grants a perk, and perks live on a world a daily does not have — so they
shimmered, cost a placement, and paid nothing at all.

Verified: 1071 tests / 74 files, 86 Playwright, `pnpm sim` byte-identical,
typecheck/lint/format/build clean, audit at 132 findings with **no new rows**.
Still not seen on a phone.

Previous checkpoint: **2026-08-30, last — POP and SACRIFICE become shapes.** Marc:
_"make sure tiles in hand have a lil bit more height, same for pop and
sacrifice. make em icons, associate in how to play and cards too."_

**Two marks, and the registry's own rule picked them.** A mark is for an idea
that RECURS across screens, so POP and SACRIFICE qualify — button, manual
section, receipt — and TAKE does not: one button, only when a pocket earns a
treasure. A hand taking and a flame, the two silhouettes furthest from the
twenty already in the set.

**SACRIFICE had no lesson, in either language.** The button has been on the
board since Stage 3 and nothing said what pressing it does; found only because a
mark cannot be associated with words that do not exist. It has a section on the
EXPEDITION tab now, under POP, because the two are what one ripe pocket can
become.

**The registry taught the new lesson two of its own rules.** A lesson may never
go silent whatever the dials say, so what the action IS is unconditional and
what it PAYS is a beat a dial can remove; and a term has to appear in its own
lesson, so the French terms say SACRIFIER, which is what the button says. Both
tests predate this session and both caught the first draft.

**One mark, three places, pinned by comparing the SVG path** rather than a class
name — two different icons under one class would pass a name check.

**The heights.** Hand 3.1rem → 3.4rem, and the action bar's 44px floor to the
same: the two rows read as one block and had a step in it. Sixteen pixels of
board, spent on purpose.

Verified: 1064 tests / 74 files, 83 Playwright, `pnpm sim` byte-identical,
typecheck/lint/format/build clean, audit at 156 findings with **no new rows**.
Pins re-recorded deliberately; the diff is only the new lesson plus `pop`
gaining its mark.

Previous checkpoint: **2026-08-30 — the corner splits in two.** Marc, on a
board whose accent was in two places: _"the accented button should be with the
luck buttons... this, but menu move top right."_

**Two assumptions checked first, and both were wrong.** `singlePayout` is TRUE
in the shipped tuning, so POP FOR POINTS never renders — the bar is two buttons,
not four, and `.act`'s comment about a crowded row was measured when the purse
was still in it. And `.action-bar` has no `min-height`, so it collapses to zero
with no live pocket: the row costs board only while it is earning it. Hiding POP
behind a popup would have bought height that mostly is not spent, at the price
of a tap on the game's most-repeated verb.

**The rule, worth more than the layout: chrome floats over the board, actions
sit in the footer.** LUCK came back down beside POP and SACRIFICE — every accent
in one row, in the thumb zone, the purse at the far end because it is priced in
a different currency. MENU went top-right, out of the arc a thumb sweeps fifty
times a run, and into its own file. The camera is alone in the corner it is
named for.

**The MENU list opened a screen away from its button** for one build — it hung
off the bottom of the shell, where it had been right one commit earlier. It
hangs off the stat row now: the purse's own trick, mirrored. Caught by a
geometry assertion; everything else about the list still passed.

Both e2e selectors for the button were `.camera .menu` and are `[data-go]` now:
a selector naming a POSITION breaks every time the layout is an opinion, and
this one has been an opinion four times in a day.

Verified: 1064 tests / 74 files, 82 Playwright, `pnpm sim` byte-identical,
typecheck/lint/format/build clean, audit at 156 findings with **no new rows**.
Measured at 320×568 with the row loaded: POP 55px, SACRIFICE 111px, LUCK 53px
in a 304px row, no horizontal scroll.

Previous checkpoint: **2026-08-30 — the bottom of the screen gets sorted out.** Marc: _"add pop and sacrifice as action buttons, tiles hand always footer
but in finger zone, accessible. menu could add a submenu for quick actions like
sound in off etc and then an option that goes to menu."_

**The hand is the footer.** It sat above the action bar, so the row touched most
— every placement starts with picking a card up — was furthest from the thumb.
Swapped in source order, not with `order`, so Tab walks the screen an eye does.

**POP, TAKE and SACRIFICE wear the accent.** They were the ink of the HOLD slot
beside them, which does nothing until a card is picked up. The board carries
three accented things now and they are the same kind: the harvest bar, LUCK, and
NEW RUN. The verb takes the colour; the payment stays `--ink-dim`.

**MENU opens a short list first**: SOUND, HOW TO PLAY, MORE. That is the
`NEXT.md` §1 note from the previous checkpoint answered — mute had gone three
taps deep, which Ashwake 1 never allowed. Sound switches in place and the list
stays open. It is a door on the dialog stack, so Escape and Android's BACK
close it.

**It shipped inside the board host for one build and was untappable** — the
host goes `inert` the moment anything is on the stack, which now includes the
list. Same shape as the bug the previous checkpoint opened with. And it is a
DRAWER rather than a popover: the cluster's height off the bottom is the hand's
height, which a fixed box cannot know, and the purse drawer had already solved
this by being a flex child of the shell.

Verified: 1064 tests / 74 files, 82 Playwright, `pnpm sim` byte-identical,
typecheck/lint/format/build clean, audit at 156 findings with **no new rows**.

Previous checkpoint: **2026-08-30 — the panels stop hiding each other, and
the board takes the corner back.** Seven asks, and the first one is the shape of
the rest: _"right now the more panel doesnt appear or is bugged when we navigate
further."_ The previous checkpoint had answered that and shipped a test that
walked the exact path and passed.

**The test was measuring the STACK; the bug was in the PAINT.** Every panel had
the same `z-index`, so the painter's order was `App`'s source order — and
MORE sits late in that list, so the manual and SETTINGS, the two rooms MORE's
own menu opens, arrived UNDER it. The room was open, focused and taking every
tap behind an opaque, inert MORE. Two things hid it from the suite, and both
look like features: `waitFor('visible')` passes on a buried panel, and
`elementFromPoint` **skips `inert` subtrees**, so the attribute that made the
bug invisible to a player made it invisible to the test. `.panel` is
`calc(20 + var(--layer))` now, with `--layer` from the stack, and both specs
read the stacking rule directly.

**The board's corner is MENU · LUCK · VIEW.** The ♪ and the `?` were two
buttons for two rooms MORE already lists; they are one door. LUCK came up out
of the action bar — the only control in that row that did not spend the current
pocket — and wears `--accent`, the rationed signature colour.

**A rare card was taller than a common one**, so the hand grew and the board
shrank every time a magic tile was dealt, stashed or spent. The rarity word and
HELD are badges out of flow now, and the card's height is fixed.

**A routine POP is a line, not a card.** A brief card is still a card — it
darkens the board, lands in the middle, and has to be waited out, several times
a minute. It is the receipt's own lead sentence over the board's bottom edge,
with the rest one tap behind it.

**THE GROUND YOU WALKED is a door onto the live board**, not a PNG of it. The
R3F host never remounts, so the real board is still mounted behind the ending
holding the cells the run ended on; the ending steps aside to a bar and hands
the screen back. (The board was also **not** `inert` under the end screen.)

**A new world opened wherever the last one was left**: the rig fits ONCE EVER,
and it is inside the host that never remounts. Every way into a run now flies
to its wake hex — the tile, not the frame, because `fitCamera` frames the
glowing landmarks too.

**The sticky panel head had no bottom edge**, so prose sliding under the
manual's tab row was guillotined against nothing. A border and a short fade.

One contrast finding, fixed rather than waived: the LUCK button's open state
filled with `--panel-edge` and dropped daylight's accent to 3.1:1. It is an
outline now — a mark, at the 3:1 bar.

Verified: 1064 tests / 74 files, 82 Playwright, `pnpm sim` byte-identical,
typecheck/lint/format/build clean, `pnpm audit:screens` back at 156 findings.
Both new e2e tests were run against the unfixed code first and each failed.

Previous checkpoint: **2026-08-30, last — the menus stop losing each other, and the
board gets its height back.** Two asks: _"make sure all menus and overlapped
menus on top are all navigable and backable and make sense"_, and _"be thorough
in ui/ux so we DON'T lose any height space and have maximum map."_

**The menus had two faults, both only reachable three panels deep.** A door
onto a panel already in the STACK did nothing — `push` returned early, so
board → `?` → MENU → MORE → HOW TO PLAY left MORE on top and the button
appeared dead; it raises now. And a scene change closed panels BY NAME, which
is Ashwake 1's `resetShell()` — the hand-maintained list `ui/dialog.tsx` holds
up as the thing React made unnecessary, "and the list had already missed
three". **This one had missed four**: stepping into another world from three
panels deep left the MANUAL over the new board. Every scene change calls
`closeAll` now, which also returns the history entries in one `go(-n)`.

**The board got 37px back on a four-card hand and 111px on a six-card one**,
measured at three viewport sizes. The hand is ONE ROW whatever the count: it
wrapped at six, and six is the ordinary hand of any world with two shrines
woken, so most of a device's life was played against a two-row hand. The wrap
was bought to protect the ground's NAME, and two of the three channels a card
speaks on have changed since — it is a baked hex with a Phosphor icon on it, so
the name scales with its column instead of deciding the layout. Six is the real
maximum (`hand.test.ts` pins the DIALS, not the layout, so a seventh card fails
before a phone shows it).

**The hand, the action bar and the purse share one centred 34rem measure**, so
a desktop stops drawing 312px letterbox cards and a full-width price column.
**The toast stopped paying rent**: a live region must be in the DOCUMENT before
its text changes, which had been read as "in the layout" — 22px of permanent
empty band. It floats over the board's bottom edge now. And the action bar
stopped growing a second line when crowded: 65px measured where an uncrowded
bar is 44.

Verified: 1064 tests / 74 files, 79 Playwright, `pnpm sim` byte-identical,
typecheck/lint/format/build clean, `pnpm audit:screens` across twenty-six
screens × four directions.

Before that: **2026-08-30 — a card stops being a box with a tile in it.** Marc: _"make sure unselected card tiles blend in with the game, no
border, only the selected one."_ Every card sat in a bordered, panel-coloured
rectangle with a hex inside it, so the hand read as a row of BOXES rather than
of tiles — three frames competing with the three pictures they held, on the
strip of screen the board is fighting for.

**The border was carrying RARITY**, so taking it away needed somewhere for that
to go, and the board already had one: `board/rings.ts` draws rarity as a ring
around the hex at `edgeWidth * 2.5` in hex radii. A card wears the same ring
now, at that width read off the DIRECTION rather than eyeballed. Which needed
ONE hex drawing, and there were three — a rounded square in the legend, a flat
polygon in the figures, an `<img>` in the hand, and an `<img>` cannot carry a
ring. `ui/Hex` is that drawing: the legend asks it for its swatches, the hand
for its cards, and the figures share its geometry and its art.

The box is transparent rather than absent, so choosing a card cannot reflow the
row under a reaching thumb, and the chosen one takes the INK — graded against
every terrain fill and the panel, and colourless, so it can never be mistaken
for a rarity.

**And one regression of my own, caught in a screenshot**: replacing the card's
inline `style` took its FLEX layout with it, so for one build the mark sat
beside the name and wrapped only on the narrow cards. Those rules are CSS now,
where they belonged. Pinned by the thing that was wrong: the computed border
colour of every card, polled past the crossfade, asserting exactly one is
inked.

Verified: 1066 tests / 74 files, 78 Playwright, `pnpm sim` byte-identical,
typecheck/lint/format/build clean, `pnpm audit:screens` across twenty-six
screens × four directions.

Previous checkpoint: **2026-08-30, last — the manual stops drawing its own
pictures.** Marc: _"in how to play we reuse the same visuals as in game for
all"_, and _"make sure all indentation is good."_

**All four of the manual's picture kinds were second-hand**, and this had been
written down: `Figure`'s own docblock has said since Stage 3 that Ashwake 1
drew its figures from the BAKED tile art and that this one would "when the
asset book reaches the chrome" — which happened for the hand's cards and never
came back here. A ground was a rounded square of the flat fill, an edge a
square with a border, a figure's hexes flat polygons, and the STASH figure's
cards hand-rolled spans beside a hand that draws a baked hex with its mark and
name on it. Every one of them is the game's own picture now: `useGroundArt`
covers all six grounds, `GroundSwatch` and `Figure` clip the board's PNG into a
hex from the same `corners()` the board uses, and `FigureCards` renders `Tile`
itself. **The pin is IDENTITY** — every file the hand points at must be a file
the legend points at — because anything weaker passes while the two drift.

**Three things fell out of looking.** A card with nothing to do stopped being a
button, on the one screen whose rule is that nothing in it is tappable.
`Tile`'s inline `flex: 1 1 0` did NOTHING in the hand (a grid item ignores
flex) and only ever took effect in the new figure, where it made two cards grow
and an inline style beat every rule that could have corrected it. And MAGIC and
UNIQUE drew the same figure twice a paragraph apart — they share it by design,
so a figure is claimed by the first lesson on a tab that carries it.

**Indentation was two faults, now one rule.** Half the lessons carry a mark, so
POCKET began at the margin and BOUNTY an icon's width in; and a marked heading
was indented past its own prose. A section reserves the mark column whether or
not it fills it, hangs the mark in it, and indents everything else behind — so
the marks make a column down the page and every word in a section shares one
left edge. Pinned by measuring every heading, paragraph and caption on a tab
and asserting one edge.

Verified: 1066 tests / 74 files, 78 Playwright, `pnpm sim` byte-identical,
typecheck/lint/format/build clean, `pnpm audit:screens` across twenty-six
screens × four directions — the manual's HAND tab is photographed now too,
which is how the duplicated figure was seen at all.

Previous checkpoint: **2026-08-30, last — the marks stop being a request and become
a shape.** Marc: _"no emojis only phosphor icons or assets."_ Every mark this
game drew was a Unicode character, and a character is a REQUEST for a shape:
what answers it is the font stack. **The board was asking `cinzel.ttf` — a face
self-hosted for a WORDMARK — to answer for `✚ ★ ◈ ❖ ✦ ▦`**, which it carries by
luck; a subset or a swap would have emptied the board's alphabet with nothing
failing. The chrome asked whatever the system serif resolved to, which is how
`♦` stood in for `✤` on two screens and looked plausible on both.

**The vocabulary did not move** (`DECISIONS.md` D10): same four registries, same
members, same no-collision rule, and `tokens.test.ts` did not have to change to
follow them. Only the currency did, from a codepoint to a NAME — `theme/icons.ts`
names, `scripts/phosphor.ts` vendors twenty-three Phosphor paths (MIT) into one
committed 8KB file, `ui/Icon.tsx` draws the chrome and `board/marks.ts` draws
the board, so the manual and the board draw ONE shape from one file.

**An icon cannot live in a string**, which forced the good change underneath:
a mark used to be composed into catalogue sentences and split back out of a
receipt by whitespace. It rides beside the words now, and the split is gone —
taking the "first word drawn as a mark" bug with it.

**And the swap found three more.** The manual, the figure and the legend all
promised a placed rare "wears a star"; **this board has never drawn one** — it
gives a ring in the rarity's colour and stands the tile taller, and the claim
had been wrong in both languages for five stages. `↗` and `$` were the last two
characters on the stat row, against a ruling `tokens.ts` had already written
down; they are REACH and COST now. And a `▾` lived in a CSS `content`, where no
test in this repository could see it.

Three tests at three levels, because one of these hid at each: the registries
(`tokens.test.ts`), the catalogues (`text.test.ts` — **no mark is ever spelled
into a sentence**), and the rendered screens (`e2e/menus.spec.ts` reads every
screen's text and `aria-label`s and fails on any retired character).

Verified: 1066 tests / 74 files, 77 Playwright, `pnpm sim` byte-identical,
typecheck/lint/format/build clean, `pnpm bake` end to end, `pnpm audit:screens`
regenerated — 156 findings, down from 162.

Previous checkpoint: **2026-08-30, later still — the game stops interrupting
itself, and the prose stops sounding written by a machine.** Marc named six
things after playing it, and one fault sits under all of them: **saying a thing
twice.** The pop card repeated the accounting at full modal weight on every
harvest; the manual named the five destinations and then explained four of them
one screen apart; the prose set a colon, a full stop, a comma and a separator
with one character; the header laid six numbers out and folded them onto a
second row when one grew a digit; FIT and FLAT each held their own idea of
where the board was.

**All six answered.** The first pop still holds the screen and every pop after
is the same card gone BRIEF — no focus taken, any tap sends it away, and it
leaves on its own over a scrim you can see the board through. A card in the
hand carries the BAKED HEX again (Ashwake 1's `tile-art`, the same PNG the
board composites), so what you hold and what it becomes are one picture. FIT
stops shrinking at `FIT_HEX_PX_MIN` and, once it is cropping rather than
shrinking, centres on the FRONTIER instead of on the stone in the middle; FLAT
and DEFAULT re-frame, which they never did, while a two-finger lean still does
not. The stat row is one grid track per stat, centred, and cannot wrap at
320px. The manual's PLAY tab says each destination ONCE: the legend row carries
the mark, the name and `lessonDefine` — the very function the deleted sections
were printing — and a FIND has a lesson of its own instead of pointing at
RELICS. **No em dash anywhere a player can read**, in either language, pinned
by `text.test.ts`; the two prose snapshots were re-recorded deliberately and
the facts did not move.

**The sweep found four more inert or crooked things.** The `card` WEIGHT had
no reader at all — four first-contact sentences, written, translated, weighted
and pinned, and every door printed `lessonDefine` instead, so `lessonCardText`
was the only function that read them and it had no caller. `SaidCard` parsed
the first word of a pop's heading as if it were a MARK, so "POPPED" was drawn
in the glyph face and the first pop of a device read "YOUR" over "FIRST POP".
The purse toggle drew ♦ for luck while every other surface drew ✤ — on the very
button the 2026-08-29 fix called "the one place that did not". And the screen
audit had eighty-odd pictures of this game and **none of the page that teaches
it**: `manual` opens on MENU, so the legend and every rule had never been
photographed. Three dead exports are gone rather than left to be found again.

**Two ledger items taken at their word, and a fourteenth inert mechanic.**
`purseLesson` — LUCK IS FOR SPENDING, one row per button, asked for twice in
Ashwake 1 — had **no caller**: `onPurse` marked the lesson told without ever
showing it, and the ledger entry is what hid it. `meta/route.ts`'s `searchFor`
is deleted (its only tests were round-trips against itself). And **BACK on an
open panel is built** rather than filed: one history entry per open dialog,
carrying no URL change, so the address bar never becomes a second authority on
what is on screen. On Android, BACK with the manual open used to leave the
site.

**And the catalogue promised a button that did not exist.** `ui.sound`'s note
says, in both languages, "the ♪ button on the board is this switch", and there
was none: sound lived only in SETTINGS, three taps and a panel away. The ♪ is
back by the camera, on the same wire as the switch. It survived a gesture
matrix that LISTS it because the manual's MENU tab — the only way from a live
board into SETTINGS — had the two doors in this game with no `data-go`, so
nothing had ever walked that path.

**And the em-dash rule caught itself, from the deployed bundle.** Verified
against the source, the pass still shipped five player-facing em dashes:
`text.test.ts` walks the two catalogues, and neither a DIRECTION's own name and
note (not in `text/` on purpose) nor a sentence ASSEMBLED in `view/`
(`groundHead`'s hard-coded separator, so every colour card read "MARKET —
company." while both catalogues were clean) is in them. Both fixed and both
pinned, in the file the layering allows. **A test written against one source is
a rule that holds in one source.**

Verified: 1063 tests / 74 files, 76 Playwright, `pnpm sim` byte-identical,
typecheck/lint/format/build clean, `pnpm audit:screens` regenerated across
twenty-five screens × four directions. **No rule moved**, and the first minute
is the same game told better.

Previous checkpoint: **2026-08-30, later — the long game runs, and an instrument
now exists that can see it.** The screen audit has a third axis: `?runs=n`
(`shell/fixture.ts`) seeds a DEVICE history — a world with shrines woken,
territories held, finds taken, relics banked, a shop part-built and a diary
with rows — wired in at three ages of one world seed, five runs in, thirty and
three hundred. It is honest by construction: every landmark it claims is read
off the seed with the same pure functions the reducer consults, the perks come
from folding `grantFind` over those hexes, the goals from `metGoalIds`, and the
purse and the shop are one arithmetic — earned per run, then spent through
`buy`. **Twenty-three screens × four directions**, and the middle age exists
because thirty runs is the only point at which the shop has rows on both sides
of the affordable line.

**It found eight more inert numbers, four of them by turning on itself, and two
of those in a SCREENSHOT rather than in the code.** The
SURVEY paid nothing — `Goal.reward`, 25 to 40 relics across five goals, had no
consumer anywhere, so a milestone was detected, written into `goalsMet`, listed
on the end screen and never banked. A found PERK never reached
`WorldMemory.perks`, so it died on the next reload and `economyFor` never saw
one, which means the dials a worn perk sets were never set. `mergeRun` had **no
caller**, so world memory was written only at `settle` and a closed tab lost the
territory just claimed. `?taught=1` handed
`useDevice` a whole `Progress` built on `EMPTY_PROGRESS`, so the
three-hundred-run shop photographed `0` relics — the exact picture the axis was
built to make impossible. And **the audit's own PLAYED device had stopped being
played that morning**: `?seed=` became a detour when the world seed was fixed,
so it banked nothing, stayed virgin, and three tests timed out and silently kept
the previous run's screenshots. And the ATLAS read `FINDS 6/5` on the
three-hundred-run world, counting find hexes against the size of the perk pool —
two different things wearing one slash, both expressions correct on their own,
and reachable in ordinary play. And the END SCREEN said BOTH halves of one bug:
its list of what a run unlocked was always empty, because it read a disk nothing
had updated — and on the FIRST run of a page it said the opposite, claiming a
returning player had just woken every shrine their world already held. All eight
fixed, each with a test that asks whether a NUMBER moves.

**CAMPS crossed** — the last piece of world memory that had not. BEGIN AT CAMP
lives in the WORLDS panel, `campFor` carries Ashwake 1's conditions verbatim,
`?camp=1` is read at boot, and a camp run's climb is measured from where it woke
so REACH 20 cannot be minted by waking at ring 20. **The router is DECIDED and
not ported** (`DECISIONS.md` D9): what it would buy is already delivered by
boot-time links and by SHARE, except BACK on an open panel, which is a
dialog-stack job rather than a URL→scene table and is filed for after Session A.
Two smaller findings on the way past: RESET TEACHING was resetting the whole
ledger including the relic purse, and a detour or daily could grant a perk with
nowhere to write it.

Verified: 1059 tests / 74 files, 68 Playwright, `pnpm sim` byte-identical,
typecheck/lint/format/build clean. **Nothing that changes the first minute
shipped** — the freeze before Session A holds.

Previous checkpoint: **2026-08-29, last — the game has a story, and the
settlement is the direction.** Marc: _"we need a little story, a small hook for this game
towards the settlement"_, and then the ruling S5 has been waiting on since it
was written: _"i want to go this way since its a strong theme and i feael like
names of eahc color reveal what they do too."_ **D7 is closed: SETTLEMENT is
the default.** The argument is mechanical rather than aesthetic — FARM · MARKET
· QUARRY · ROADS each name what their ground DOES, where MOSS and EMBER name
what theirs is made of and leave the rule to be taught separately. **The story
is three sentences on the front door and it belongs to the GAME, not to a
direction**, which is what makes the four directions one fiction instead of
four: somebody stayed here and the plain took it back, you go out into that
plain with a light, and the survey is what you draw when you get home. It
promises nothing the game cannot do and introduces **no new vocabulary at all**
— it is the one passage deliberately not run through the glossary matcher.
Written fr-CA first (D4) and pinned in both languages. **Three surfaces name a
direction by hand because they run before the app does** — the tab tint, the
install splash and the share card — and all three moved with the default; the
share card is baked from the shipping direction now rather than from `TORCHLIT`
by name. **The story broke a screen, which is the good kind of finding:** three
paragraphs pushed the door past a 375×844 phone, and `justify-content: center`
on a scrolling column clips its own top with no way back — measured at −24px
with `scrollTop` already 0. **`safe center` does not fix it** (this engine drops
the declaration); auto margins on the ends do, and `e2e/menus.spec.ts` pins it
at the smallest phone anybody still hands you. **Two snapshots re-recorded
deliberately**, both the tagline, whose frame moved with the direction — the
verbs did not. **Verified:** 998 tests / 67 files; lint and format clean; core
typechecks; the door measured and shot at 375×667 and 390×844. **Held for
Marc:** the rule lines still name two powers in the plane's words, so a player
reads QUARRY on the board and "· ash:" in the tip — put as an option set rather
than patched, because it is a ruling about whose vocabulary the rules speak in.
**And `pickForScheme` still answers a stated contrast or light preference with
the plane**, which is the one player who does not get the fiction the door just
told them; the honest fix is a bright settlement that passes the same budgets.

Previous checkpoint: **2026-08-29, later — the settlement is drawn in its own
hand.** Marc: _"add assets, graphics, etc. on the Settlement concept, review
concepts for this backstory."_ It HAD art, and the art was the plane's,
recoloured: `scripts/terrain.ts` drew moss tufts, dry grass, ember glints, ash
pits and tide ripples for every direction and changed only the colours — right
for three directions that are one place at three exposures, wrong for the one
that claims to be a different place. **Two slots were not even that.** Each
drawing picked its layers off the declared pattern KIND, and settlement is the
only direction that departs from the plane's kind layout — so **MARKET baked
with no texture at all** and **QUARRY silently lost the cut faces that carry
its meaning**, while the live procedural painter drew both correctly the whole
time. The art path was worse than the fallback it exists to supersede, on the
ground a player looks at first, and **the greyscale guardrail looked at it and
passed — correctly, because it grades value and a missing texture barely moves
a mean.** So: **a direction now states its MOTIF** (D8), a motif is a complete
set of figures, and **a layer a theme declares and the maker cannot draw is a
build failure** rather than a quiet flat tile. Settlement's own figures:
furrows with a lamplit crest and a crop planted in the rows, awning cloth with
its fold-shadow over stacked lit crates, benched cut faces and angular chips,
paving courses whose joints break course by course, and a pit cut in terraces
where the plane's spent ground cracks open — every highlight off the
direction's own `ink.lit` rather than the two hard-coded flame constants. Its
**destinations are built things** (strongbox · tower · boundary post); the
shrine's arch and the crystal are unchanged, which is what makes it a reading
rather than a redecoration. **`ui.runEnd` re-baked itself into the new ground
unasked**, because it composes from the direction's own terrain art. **Measured
a third thing:** the shrine prop is a ring lying LEVEL and floating, under a
comment claiming it stands on edge — three builds a torus upright, so the
`rotateX` laid it down; it stays level (every yaw reads the same) and
`landmarks.test.ts` now measures all ten props. **Verified:** 997 tests / 67
files; typecheck and lint clean; golden sim byte-identical; **the three plane
directions re-bake BYTE-IDENTICAL** — five changed files in `public/assets/`,
all settlement's — which is what makes the refactor provable rather than
argued. **Three concept questions are held for Marc in `NEXT.md` §1** (the
power words are still the plane's; one epitaph mentions a torch this direction
does not have; two launch surfaces are hard-wired to torchlit) **and one bug
that is not this session's**: with the tree as it stood, a production build
crashes the end screen on `ReferenceError: toMainMenu is not defined` — the
minifier drops the declaration, an unminified build keeps it. **None of the new
art has been on a phone.**

Previous checkpoint: **2026-08-29, last — the board answers a keyboard.** Marc:
_"do a pass for keyboard + desktop play (all cam movement, etc.) and easy tile
placements. same for mobile, do a accessibility / high level moment."_ The one
thing the board lacked was a way to SAY WHICH HEX YOU MEAN; every other key is
a shortcut to a control that already exists. So: **a marker the arrows walk and
Enter acts on**, plus Shift+arrows to pan, `+`/`−` to zoom, `Q`/`E` (or
Home/End) to turn, `R`/`F` (or PageUp/PageDown) to lean, `0` for the VIEW
button's own cycle, and `1`–`8` to pick up a card. **The step is SPATIAL, not
axial** — the board is sparse, it can be turned, and a pointy-top hex has no
neighbour straight up — so an arrow asks `screenOf` what the nearest cell that
way is, and a run of presses holds its column the way a text editor does.
**Arrows LOOK and Enter ACTS**, which is the accessibility half: walking the
marker prints the same sentence a tap prints, into the live region the toast
already is, so a board no screen reader could enter now reads itself out — with
no new prose written for it. The keys come off the WINDOW with a two-line focus
predicate (a focused control keeps Enter and Space; a text field keeps
everything; Ctrl/Alt/Cmd are never ours), so a player whose focus is on POP can
still walk the board. **Desktop got the two-finger gesture it never had**:
right-drag, or Shift-drag, turns and leans. The mobile sweep found less than
expected and that is recorded rather than padded — the two real gaps were both
on the board, an unnamed unfocusable canvas and a toast with no keyboard
dismissal, and both are closed. **Verified:** 974 tests / 66 files; 61
Playwright including six keyboard tests at the suite's only desktop viewport;
golden sim byte-identical; the screen audit unchanged at argued classes only.
**The step sizes are arithmetic and the map has not been felt on a desktop.**

Previous checkpoint: **2026-08-29 — the camera comes off its rail.** Marc:
_"anyway we could tilt, drag cameras as we want? 3d style"_. The expensive half
was already built — `camera.ts` has been angle-general since Stage 2b — so what
landed is the GESTURE: the maps vocabulary on the two pointers that were
already there, pinch to zoom, twist to turn, two-finger drag to lean, each
latching past its own deadzone so a pinch cannot wobble the board. The angle is
state rather than a ref, because three things read it and only one is the
camera. **LEVEL** is the cluster's third control and appears only once the board
is off its angle. The angle lives for the SESSION and is never stored, so a
fresh page always opens at the direction's own — the shot set, the audit and a
stranger arriving all get one known first minute — while within a session it
survives a new run, because the board never remounts and a run boundary is no
reason to take an angle off the hands that chose it. **Reviewing it found the pinch bug's shape again before it
shipped** — a third finger landing and the first lifting left the gesture
measuring between two different pairs of fingers — fixed by the general rule:
when the set of pointers changes, start over from where the fingers are.
**That path is reasoned, not tested, and it is written down where the code is:**
Chrome's touch driver identifies points by array index, so a palm landing and
leaving cannot be expressed to it. **Verified:** 946 tests / 64 files; 54
Playwright including the pinch-bug test; golden sim byte-identical. **The 55°
ceiling is arithmetic and the gesture has not been felt on a phone.**

Previous checkpoint: **2026-08-29 — the look comes back.** The chrome had no
`@font-face` at all: `ui.css` names Cinzel and EB Garamond twenty-one times and
the only font shipped was troika's `cinzel.ttf`, so **every DOM screen rendered
in fallback serif** while the board was correct. Three files, three rules, four
precached, and two guards — `e2e/type.spec.ts` and `verify:deploy` — because
nothing would ever have reported it. Then **the bakers came home**
(`scripts/{terrain,artslots,icons,social}.ts`), and the argument for them was
already sitting in the repo: Ashwake 1 darkened daylight's terrain ladder on
2026-08-28 to fix "ember has no contrast", never re-baked, and this body
inherited PNGs rendering the OLD ladder — re-baking moved exactly green, yellow
and blue, and left red, which is the one colour that release did not touch. CI
runs `pnpm bake` on every push, which keeps the pipeline from rotting unnoticed
and grades the palette through the renderer via terrain's own guardrail. It
does **not** diff the committed PNGs — `sharp` does not rasterise SVG
byte-identically across platforms, which the first version of that step
discovered by failing on the Linux runner — so **re-baking after a palette move
is a discipline, not a gate**, and closing that properly is written up in the
workflow. **Torchlit re-bakes byte-identical on one machine**, which is how the
port proved itself faithful. **SETTLEMENT has art for the first time** — it could
never have had any, because the maker lived in the other repo. `ui.logo` and
`ui.runEnd` are baked AND WIRED through `shell/art.ts`; `fx.pop` stays
deliberately unbaked, because this body's pop is one tinted disc and a
pre-coloured PNG cannot serve it. **Verified:** 938 tests / 64 files; 53
Playwright; golden sim byte-identical; `pnpm bake` idempotent; the audit back to
argued classes only. **Every direction's art has changed and none of it has
been seen on a phone.**

Previous checkpoint: **2026-08-29 — what the new body lost.** The rules were
proved identical by CI every push; **nothing proved the same about anything
that is not a rule**, and that is where everything below was hiding. `engine/`
and `sim/` are byte-identical to Ashwake 1 and every "missing" export turned
out to be relocated into the text catalogue — so the audit's finding is narrow
and sharp: **the launch surfaces and the hard-won fixes did not come across.**
**`DECISIONS.md` D3's v1 → v2 bridge did not exist** — an Ashwake 1 backup is
all `tiles.` keys and `decodeBackup` refused every one, failing SAFE (the
empty-backup guard is what stopped it wiping a device) but leaving a ruled
migration path with nothing behind it; `migrateLegacy` is a key TABLE, because
the version suffix belongs to the body and slot 1 kept the pre-slots names.
**`navigator.storage.persist()` was never called** (Safari evicts after seven
days; Ashwake 1's `POLISH.md` finding F). **The backup screen was below the bar
its own module sets** — a silent clipboard write, a `prompt()` asked to hold
tens of kilobytes, a refusal that said nothing, and `describeBackup` with no
caller; it rides the run share's ladder now and names what it is about to
overwrite. **A fourth inert mechanic, this one an accessibility one:**
`reducedMotion` is threaded through the whole board and **nothing ever passed
it** — `useMediaQuery` now follows it, and the colour scheme and contrast with
it, on a `change` listener rather than a boot sample. **A shared `?daily=` link
opened the recipient's own front door** — `@meta/route` had zero importers.
**The launch surfaces were gone wholesale** (no `og:*`, `twitter:*`, canonical,
description, `<noscript>` or browser floor guard) while `og-image.png` shipped
byte-identical and unreferenced. **The 44px CI gate came back and caught
something on its first run**, so the HUD stats' argued exemption is now
DECLARED on the control and the escape hatch is pinned shut. **CONTINUE now
continues into something** — there was no `ErrorBoundary`, so a render error
unmounted the tree before the panel that offers to carry on ever appeared.
**Three ledger claims were stale, all reassuring:** `goals`, `shedLadder` and
`shopLevels` are wired, and so are the NEW GROUND / UNIQUE toasts.
**Verified:** 938 tests / 64 files; 51 Playwright at 390×844; golden sim
byte-identical; the audit reports zero unhandled findings. **HELD for Marc:
there is no `@font-face` in this body at all** — every DOM screen renders in
fallback serif — and the art pipeline that would fix it is a first-minute
change, so it is his to sequence.

Previous checkpoint: **2026-08-29 — the gaps, closed.** Everything
`INTERACTIONS.md` listed as missing is built. The **pinch bug** first, because
Marc found it on a phone and it broke play: lifting one finger of a pinch made
the survivor's next move measure its delta from the OTHER finger, panning the
board by the gap between two fingers in one frame. Then the **reward loop's
voice** (`view/receipts.ts` — claims, pops and spends, ranked, rarest leading),
**TAKE and SACRIFICE**, **POP's camera glide**, the **first-pop card**, the
**crossing** (priced in one place, so the offer and the payment are the same
number by construction), the **world survey**, **sound** (synthesised per
direction, builds nothing until asked, gives the context back when switched
off), a **full-disk shed ladder**, and the manual's **legend** — every mark the
board can show, read from the registry that owns it. Menus gained ← and a ✕
that escapes the whole stack, one card at a time, and a head that sticks with
its tabs as one block rather than guessing its own height. **Verified:** 914
tests / 61 files; 46 Playwright at 390×844; golden sim byte-identical.

Previous checkpoint: **2026-08-29 — the taps that said nothing.**
`INTERACTIONS.md` is the full matrix of Ashwake 1's input against this body,
gesture by gesture. **The board tap had three branches and needed six**: a tap
that could not build was a silent no-op, so tapping a shrine, a cache, a wall,
spent stone, an unripe tile or native ground did nothing at all —
`describeHexOf`, `pocketNote` and `rememberedNativeAt` (Marc's fog-lens
biome tap) had **no caller**, and eleven view-layer describers had zero
between them. **Unselecting a card was wired to the wrong action**: the
reducer documents Marc's own `-1` rule and the UI sent `index`, so the gesture
did nothing. **`touch-action: none` was missing from the board**, which on a
phone means a drag scrolls the page and a pinch zooms the document — invisible
to Playwright, which synthesises events nothing competes for. All fixed; what
remains is listed in `INTERACTIONS.md` and is one shape: a rule the core
implements with no consumer in the shell. **Verified:** 876 tests / 57 files;
golden sim byte-identical.

Previous checkpoint: **2026-08-29 — the settlement exists.** Marc's own
reading of the colours (D4.4) is a direction now: **FARM · MARKET · QUARRY ·
ROADS**, the third thing that can happen to a place — torchlit is standing in
the dark with a torch, daylight is the survey drawn afterwards, this is
somebody having stayed. It passes all 152 palette assertions and **no threshold
moved**: the faint ink, the danger ink and the fog's veil did. The four L* stops
were chosen BEFORE any hue, because the test asks for separation by value and
not by hue — the first draft picked colours for their fiction and put two
terrains 0.004 apart. `paint.test` caught opaque bands putting a third colour
under a centred label. **It is a candidate, not the default** (D7): a fifth row
in SETTINGS, judged on a phone against `docs/shots/s5-settlement*.png`.
**Verified:** 876 tests / 57 files; golden sim byte-identical.

Previous checkpoint: **2026-08-29 — the game stops promising things it
cannot do.** The privacy sentence a player reads promised a share sheet and a
SEND REPORT that did not exist; both are real now. **SHARE** is the game's
entire distribution mechanism and had no button — the link is built from the
ORIGIN, so a shared run cannot drag the sender's own `?end=1&taught=1` along.
**The failure panel** is plain DOM because it exists for the moments React and
WebGL are what broke: an overlay rather than a body replacement, CONTINUE
beside RELOAD, repeats counted, the real error shown, and the honest no-WebGL
split. **The privacy contract is a test** — a recorded failure touches the
network zero times; the tap is the consent. `sendCrashReport` moved to the app,
which its own comment asked for: the envelope is arithmetic, `fetch` is an
edge, and it was the last network call in `packages/core`. **SETTINGS ▸ LAST
ERROR** keeps the door open after CONTINUE. And **the appearance picker shows
each direction** rather than naming it — four grounds and the ink, from that
theme's own tokens, so **adding a direction is still one file and one `THEMES`
entry and arrives with a swatch**. **Verified:** 847 tests / 57 files; golden
sim byte-identical.

Previous checkpoint: **2026-08-29 — the stash, wired.** Marc asked about the
hold mechanism and its hand ergonomics; both answers were bugs on the first
screen a stranger meets. **The stash was inert** — nothing dispatched `HOLD`,
the empty slot was a `disabled` button and the held card had no tap, so a
mechanic every run has from its first hand could not be used at all. **And the
hand was drawing `draft + stash` columns**, where Ashwake 1 computes the width
from the total: five or fewer is one row, six is 2×3, seven or eight fall back
to four across — because six across on a 390px phone is 56px a card, wide
enough for a thumb and too narrow for the ground's name. Ported with its
reasons (`screens/hand.ts`), spacers included, so the row cannot reflow under a
thumb between a stash and the next deal. Every sentence the empty hand needs is
in the catalogue rather than in English in a component. **Verified:** 842 tests
/ 56 files; golden sim byte-identical. **Live at ashwake.marcportal.com**
(`5cfee1d`, deployed by hand from Marc's own wrangler login — CI's deploy job
still fails on the empty token).

Previous checkpoint: **2026-08-29 — Stage 4 (most of it): a run counts, and
the game has rooms again.** `shell/settle.ts` is what makes a finished run
mean something: the ground walked folds into the world, the shelf of bests
takes it, and the diary gets a row — banked ONCE, with the state object as the
identity. On top of that: the SHOP (upgrades bought, perks worn) hosted both as
a panel and on the end screen where the relics were earned, the HALL OF FAME
(diary · daily · totals, every row a disclosure), MORE (places to go, and THIS
DEVICE with backup / restore / reset behind its own heading), the three WORLDS,
and the DAILY. The end screen finally answers "why was the number what it was":
a folded PAYOUT breakdown by colour, rarity and source — bars measured against
the largest row, not the total — over an ARC chart of every harvest in order.
**The daily is a place, not a fourth world:** `Place = Slot | { daily }`, and
the rule that it never touches a world's memory or the record book lives inside
the KEEPER, because the keeper is the only thing that writes. **Findings:**
`backup.ts` still filtered on `tiles.` and would have written an EMPTY backup,
then wiped a device on restore; the front door and the end screen sat ABOVE the
panels at `z-index: 40`, so HOW TO PLAY had been opening the manual underneath
the door since Stage 3 — scenes now sit below panels and go `inert` while one
is open; `.end`'s flex children shrank content out of their own boxes and a
paragraph swallowed the taps meant for a button; a crashed vitest worker
reported GREEN with its file silently missing (runner capped at eight); and the
colour lens was dead code the shell passed `null` to. `pnpm audit:screens` landed with it — fourteen screens × three directions,
photographed and measured, in its own config so it can never gate a deploy —
and its first run found the draft card's label at 1.66:1 on its own terrain
fill, now wearing the board's own halo. **Verified:** 829 tests / 55 files; 31
Playwright at 390×844; typecheck, lint, format, build clean; golden sim
byte-identical; the audit reports zero unhandled findings (39 argued compact
tap targets, 2 haloed labels, 75 disabled controls, no overflow, no clipped
text). **Still not played on a phone.**

Previous checkpoint: **2026-08-29 — Stage 3 + S2d: a first minute exists, and
the loop closes.** Front door, stat row, hand, action bar, purse drawer, camera
cluster (FIT⇄HERE), teaching cards, term cards, manual, settings and end
screen — over a board that mounts once and stays mounted. **A run can be
started, played, finished and started again**, and `e2e/board.spec.ts` walks
that loop, which is the shape of v2.0's gate. Not one sentence is written in a
component: the manual's sections ARE lessons, a teaching card and a term card
are one component over `lessonDefine`, and `Prose` runs the core's
`conceptPattern` over every string so a term is tappable everywhere rather than
only in the manual. Four missing words were added to the catalogue in both
languages. The shared system came first — Panel/Door, Card, Tabs, Fold,
FactGrid, Tile, TipRows, Figure, Confirming — because Ashwake 1's own
duplication was the spec; `resetShell()`'s 25-id list does not exist here.
`shell/teaching.ts` is the one thing the core could not give: the MOMENTS, as a
priority list. S2d finished alongside: drag momentum (integrated so frame rate
cannot change where the board lands), beacons breathing on a floored sine,
embers off spent ground, and **landmark PROPS** standing on each destination.
**Findings:** `eslint-plugin-react-hooks` caught a prop mirrored into state
through an effect (a frame of latency on the pop) and a stale callback behind
`useImperativeHandle` — its purity rules are scoped off for `board/` with an
argument and loud elsewhere; `index.html` hard-coded a colour over every
direction; the props were correct in memory and absent on screen because
on-demand rendering needs a frame asked for. **Verified:** 800 tests / 51
files; 25 Playwright at 390×844; typecheck, lint, format, build clean; golden
sim byte-identical; bundle 384KB gzip + 5KB CSS. **Look dials are ON by working
default** (`light=1 materials=1 art=1 relief=0.35`), changeable by query
string. **NOT played on a phone.**

Previous checkpoint: **2026-08-29 — Stage 2c: the board earns its third dimension.**
The lighting is DATA (`theme/rig.ts`), normalised so a face pointing up is
exposed at exactly 1 — so **a hex top at full torch renders exactly the colour
the direction authored**, and `contrast.test.ts` became literally true of a
rendered pixel. `render/paint.ts` carries every layer of Ashwake 1's `bake.ts`
as a closed union of ops with a key DERIVED from the plan; `bakeCanvas.ts`
walks them and decides nothing. Batches are a kind AND a surface (~20 meshes).
`theme/torch.ts` multiplies in DISPLAY space via one `onBeforeCompile` chunk,
because `light.floor` was tuned against Pixi's sRGB tint. **Three verified
findings:** R3F applied ACES tone mapping unless given `flat` (so the label ink
on screen was never `ink.ink`); `cylinderGeometry` shades a six-sided prism as
a rounded blob without `flatShading`; its cap UVs are transposed.
**`render/materials.test.ts` grades the colours a hex ACTUALLY contains** and
failed on first run — samples now split into `label` (where a centred label
sits) at 4.5:1 and `face` (wash ends, translucent inks) at 3:1, and a shaded
side is graded at the WALL floor with the margin recorded: **torchlit 0.070,
torchlit-bright 0.072** clearance, above 0.045 and below 0.1. Ashwake 1's seven
terrain PNGs ship for three directions behind `?art=1`.
**A bug a human found:** `InstancedMesh` caches its bounding sphere on the
first raycast forever, so the frontier went deaf as the board grew — eleven
green e2e tests missed it because none tapped a board that had grown.
**Verified:** 766 tests / 49 files; typecheck, lint, format, build clean;
golden sim byte-identical; 21 Playwright tests at 390×844; bundle 375KB gzip.
**Dials `?light= ?materials= ?art=` all default 0; NOT played on a phone since
the click fix.**

Previous checkpoint: **2026-08-28, last — Stage 2b: the board has depth, and no
rule can see it.** The camera's tilt is **settled at 35°** (Marc's pick) and is
the default; `?yaw=` turns the board under it and `?relief=` gives the ground
height, both defaulting to the flat map. The lean is arithmetic, not rig code:
`camera.ts` gained `Lean`, a fit that reserves `tallest · sin(tilt)` of sky so
a leaned board is not cropped by its own walls, a pan inverted through the same
screen mapping (turned 90°, a drag right moves the centre along z; at 60°, one
hex of pixels covers two hexes of board), and `eyeOf` — **one expression for
every angle, which retired the top-down special case the rig carried twice.**
`board/relief.ts` STRETCHES a hex's prism rather than lifting it, so a raised
hex is a column on the same floor as its neighbours; the lift is mostly the
ground's colour (a height channel repeating the colour channel) plus a
deterministic `q,r` hash so a field of one colour is not a plateau. Labels turn
back by the yaw. `shell/walk.ts` (`?place=n`) plays a fixed opening through the
reducer so every shot is a picture of ONE board. **Verified:** 713 tests / 42
files; typecheck, lint, format, build clean; **golden sim byte-identical**;
**nine Playwright tests at 390×844, including a placement taken at 45° tilt,
45° yaw with relief on** — the raycast survives the lean. **Eight shots in
`docs/shots/`** are Marc's surface for the yaw and the relief. Bundle 370KB
gzip. **The prism sides are lit by one near-overhead key against a near-black
background, so the relief reads softer than it is — a Stage 5 lighting number,
not relaxed here to flatter a shot. Still NOT played on a phone; NOT deployed.**

Previous checkpoint: **2026-08-28, later — Stage 2: the board exists in 3D, and a
tap means what it means today.** `apps/game/src/board/`: one `InstancedMesh`
per kind of ground with colour per instance, the stroke ladder as flat rings,
`labelFor`'s glyphs and numbers in the self-hosted Cinzel (as TTF — troika
does not read woff2), the torch as the view's `light`, the pop as the JUMP.
`camera.ts` carries Ashwake 1's contract (zoom 1 = fit, 34px-per-hex ceiling,
drag with the finger, eased flights) and is tested without a canvas; the rig
owns the camera in a ref; one finger drags past 8px, two pinch, a wheel zooms,
a tap is an R3F click with `delta ≤ 8`. `shell/store.ts` holds the run outside
React. **Verified:** 697 tests / 41 files; typecheck, lint, format, build
clean; **`e2e/board.spec.ts` in headless Chromium at 390×844 draws a picture,
places a tile by tapping, zooms and fits, no console errors, and opens in the
phone's language.** Bundle 369KB gzip (over estimate; drei's `Text` — weigh
in S5). Deploy job and `wrangler.toml` readied, gated on `DEPLOY_ENABLED`;
**secrets, variable and domain are Marc's.** **NOT played on a phone; NOT
deployed.** The camera question (`?tilt=`) is open with two screenshots in
`docs/shots/`.

Previous checkpoint: **2026-08-28, mid — Stage 1b: the core speaks two languages,
and English did not move.** `packages/core/src/text/` holds one typed catalogue
per language (`fr-CA.ts`, `en.ts`), ≈250 sentences each. The rule: **facts in
`view/` and `meta/`, words in the catalogue** — a catalogue function never
reads state and never decides whether to speak. English is the prose exactly
as it was: the 15 snapshots recorded before the move are byte-identical to the
new `· en` blocks, checked key by key against the pre-move commit. Québec
French under Marc's glossary (D4: LICHEN · TISONS · CENDRES · RIVIÈRES; MÛR ·
RÉCOLTER · POCHE · RÉSERVE · RELIQUES · CHANCE), tutoiement, OQLF typography
held by `text.test.ts` (fine space before `:` and `%` only, `’` throughout,
accents on capitals). Theme names per locale (`namesOf`); `pickLocale` pure,
device language with fr-CA as the fallback. **Findings:** the core was not
DOM-free (`tips.ts`, `figure.ts` — element builders removed, the ban now covers
all of core); `\b` is ASCII (term matcher rewritten with Unicode classes, and a
new invariant: every term occurs in its own lesson). **Verified:** 693 tests /
40 files, typecheck / lint / format / build clean, golden sim identical. **The
French has NOT been read by Marc.** Nothing playable.

Previous checkpoint: **2026-08-28 — Stage 1: the core is a package, and the rules
did not move.** The DOM-free half of Ashwake 1 was lifted into
`packages/core` **verbatim**: `engine`, `content`, `meta`, `sim`, the pure
geometry (`render/layout.ts`), the `BoardView` contract (`render/Renderer.ts`),
the props layer (`view/view.ts`), the teaching registry (`view/lessons.ts`,
`figure.ts`, `tips.ts`), and the theme data with its contrast and greyscale
budgets — with every one of their tests. **Two edits, both findings rather than
rules:** `labelFor` (faint means SPENT) lived inside `PixiRenderer.ts` and is
now `render/labels.ts`, because a rule about what a star means is not a rule
about Pixi; and `scripts/sim.ts`'s four relative imports. **Verified:** 646
tests across 37 files; typecheck, lint, format and the app build clean; and
`pnpm sim` **byte-identical** to `tiles@42d4da3` — captured as
`packages/core/sim.golden.txt` and diffed by CI on every push. `apps/game` is
a scaffold: Vite + React 19 + three + R3F installed, one component proving the
aliases reach the core (66KB gzip before a single hex is drawn). **Nothing is
playable. Nothing has been seen on a phone.**

## Shipped and settled

- **Repository.** `ashwake/` is its own git repo (`majeanson/ashwake`), a pnpm
  workspace: `packages/core` + `apps/game`. Nothing here belongs to `../tiles`,
  which is frozen at v1.0.0 and gets ledger commits only.
- **Toolchain.** Vite 8 · TypeScript 5.9 strict · Vitest 4 (one runner, per-package
  projects) · ESLint 10 with type-aware rules · Prettier · pnpm 10. TypeScript
  stays below 7 until `typescript-eslint` parses it.
- **The layering rule is machine-enforced** across the package boundary: the
  core may not import React, three, the app or the DOM; `engine/` and
  `content/` additionally may not touch `Math.random`, `Date`, timers or
  storage.
- **The aliases are the layers.** `@engine @content @meta @render @theme @view
@sim` resolve to `packages/core/src/*` from both packages
  (`tsconfig.base.json`, each `vite`/`vitest` config). The app imports the
  core by alias, never by path (lint).

## Not started

- **S4's remainder:** the PWA and its service worker, `?seed=` share links, and
  the History-API router. Everything else in S4 has landed — store, keeper,
  save/resume, three world slots, the daily, backup/restore.
- **S5 — the look.** Chosen: settlement (D7, 2026-08-29), officialized and the
  registry closed to two directions — settlement and a bright settlement
  reskinned onto `daylight` (D12, 2026-09-03; `torchlit`, `torchlit-bright`
  and `placeholder` retired). What is left is the same as everything else in
  S6: on a phone, not from a build.
- **S6 — the console, Session A on v2, then the stranger.** `/playtest` with
  COPY SHEET; Session A re-run against the deployed v2; fixes; Session C.

Marc's own list, which no amount of building here clears: set
`CLOUDFLARE_API_TOKEN` with `--body` (the interactive prompt took an EOF and
the secret is EMPTY, so the deploy job cannot run); pick the look numbers on a
phone; read the French; then Session A, then the stranger.
