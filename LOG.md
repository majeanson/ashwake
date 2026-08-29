# LOG.md — the per-session record

One written question per session, answered after the work. Ashwake 1's
`LOG.md` (69 sessions, in `../tiles`) is the history of the rules; this file
starts at Session 1 for the body.

### Session 1 — the core is a package, and the rules did not move (2026-08-28)

**Question:** can Ashwake 1's DOM-free half be lifted into a package without
editing a rule?

**Answer: yes.** Everything ESLint already forbade the DOM — `engine`,
`content`, `meta`, `sim`, `render/layout.ts`, the `BoardView` contract,
`view.ts`, the lessons registry with `figure.ts` and `tips.ts`, and the theme
data with its budgets — was copied verbatim with every test, and the harness
in this repo prints byte for byte what the harness in `tiles@42d4da3` prints.
That output is `packages/core/sim.golden.txt` and CI diffs against it on every
push, so "same rules" is now a fact the build checks rather than a sentence.

**Two edits, both findings.**

1. `labelFor` — the rule that FAINT MEANS SPENT, with its 2026-08-27 story in
   `labels.test.ts` — lived inside `PixiRenderer.ts`, a file that cannot come
   along. It is `render/labels.ts` now. The extraction is the argument: a rule
   about what a star means was filed under a rendering library, and a 3D board
   would have had to re-derive it or disagree.
2. `scripts/sim.ts`'s four relative imports, because the file moved one
   directory.

**What did not come.** `theme/apply.ts` (sets CSS variables on `document`),
`render/PixiRenderer.ts`, `bake.ts`, `surfaces.ts`, `shareCard.ts`, all of
`ui/game.ts`, `shop`, `dialog`, `audio`, all of `shell/`, `style.css`,
`index.html`, and their 5,954 lines of DOM-coupled tests — the surface the
plan says gets rebuilt, not ported. 898 tests in Ashwake 1 became 646 here; the
252 that stayed behind are all pinned to markup this repo does not have.

**The scaffold.** A pnpm workspace with one vitest runner, one alias set
(`tsconfig.base.json`), and the layering lint ported across the package
boundary — the core may not import React, three, the app or the DOM, and the
app may not import the core by path. `apps/game` boots, reaches the core
through the aliases and prints the opening board's cell count; that is all it
does, on purpose.

**Verified:** 646 tests / 37 files; typecheck, lint, format and build clean;
`pnpm sim` identical to Ashwake 1's, 25 lines, 18 policies, 0 stalled, 0
capped. **Nothing playable; nothing seen on a phone.**

**Next:** S2 — the 3D board. Open before it: does the camera tilt (Marc,
with screenshots).

### Session 2 — the core speaks two languages, and English did not move (2026-08-28)

**Question:** can every sentence a player reads move into a catalogue without
a single English string changing — and can French be a first language rather
than a translation layer?

**Answer: yes, and the proof is procedural.** Fifteen snapshots were recorded
BEFORE the move (`teaching.pin.test.ts` already had six; `prose.pin.test.ts`
added nine for the receipts, the tap-a-hex answers, the epitaph pools, the
guide/hint lines, the purse card, the figure captions and the small labels in
`meta/` and `content/`). After the move, every one of those fifteen English
bodies is byte-identical to its new `· en` block — checked key by key against
the pre-move commit, twice, once after the French landed. The golden sim diff
stayed empty throughout.

**The shape.** `text/Strings.ts` is the type: one object per language, every
sentence a string or a function of its facts. The rule that makes two
languages safe is that **the catalogue never decides**: `lessons.ts` keeps
the dial conditions and reads `s.lesson.ripe.stoneAsh(name)`; `view.ts`
computes worth, multipliers and counts and hands them to `s.view.pocket.score`;
`PERKS`, `UPGRADES`, `GOALS`, `UNLOCKS`, `SHED_LADDER` and `FEATURES` keep ids
and numbers and hand back words through `perkText`, `upgradeText`,
`unlockLabel`, `shedNote`, `featureText`. Theme names and notes are per
locale; `namesOf(theme, locale)` is the one accessor. `pickLocale` is pure and
lives in `content/` so both `theme` and `text` can see the `Locale` type
without a cycle.

**Four findings the second language surfaced.**

1. **The core was not DOM-free.** `view/tips.ts` and `view/figure.ts` called
   `document.createElement`; the determinism lint only watched `engine/` and
   `content/`. Their element builders are gone (a React `TipRows` and `Figure`
   replace them in Stage 3), `figureLayout` keeps the geometry pure, and the
   DOM ban covers all of `packages/core` now. `meta/report.ts`'s injectable
   `fetch` default is the one exemption, marked for Stage 4.
2. **`\b` is ASCII.** The term matcher would never have found `RÉSERVE`; it
   uses `(?<![\p{L}\p{N}])…(?![\p{L}\p{N}])` with the `u` flag now, and a
   new invariant says every term occurs in its own lesson — which is what
   catches an accent dropped in a term but kept in the prose.
3. **Québec is not France.** The plan said a fine space before `:` `;` `!`
   `?` `%`; the OQLF's Québec usage is `:` and `%` only. The test says so and
   the French follows it.
4. **Plurals and ordinals are facts of a language.** `ordinal` moved from
   `daily.ts` to `text/format.ts` with a locale; French counts `1er`, `2e`;
   0 and 1 are singular in French, so the catalogue has its own `pl`.

**The French.** ≈250 sentences in Québec French under Marc's glossary (D4):
tutoiement, names as headings never as nouns with articles, `’` throughout,
accents on capitals, `12 345` from five digits. Recorded once into the
snapshot files as the review surface. **Not yet read by Marc.**

**Verified:** 693 tests / 40 files (646 → 693: the French blocks, the
typography and format tests, `pickLocale`); typecheck, lint, format, build
green; golden sim identical; CI green.

**Next:** Marc reads the French; S2 — the 3D board.

### Session 3 — the board exists in 3D, and a tap means what it means today (2026-08-28)

**Question:** can the same `BoardView` the Pixi renderer drew be drawn as a lit
3D board, on a phone, with a tap still reaching the same reducer?

**Answer: yes — the smoke test plays it.** `apps/game/src/board/`:

- **`HexField.tsx`** — one `InstancedMesh` per KIND of ground (tile, empty,
  stone, wall, remembered, beacon), each its own prism height; colour per
  instance, so the four terrains are four colours on one draw call. The stroke
  ladder (targeted › ripe › unclaimed landmark › rare › legal › lensed › home)
  is a second family of instances: flat hexagonal rings a hair above the
  ground. `labelFor` (core) says what a cell prints; drei's `Text` prints it
  in the self-hosted Cinzel — **woff2 is not a format troika reads**, so the
  font ships as TTF. The torch is the view's `light` pulling each colour toward
  the board's background. The pop is the JUMP: popped cells rise and fall by
  the direction's `popLift` while the field asks for frames, then stop asking.
- **`camera.ts`** — the arithmetic apart from three.js, tested without a
  canvas: zoom 1 is the fit, the ceiling is `HEX_PX_MAX` (34px) so it rises as
  the board grows, a drag moves the world with the finger, flights ease out.
  World units are hex radii; `fit.size` is what a radius is worth in pixels.
- **`Board.tsx`** — one `<Canvas frameloop="demand">`, orthographic, mounted
  once. The rig owns the camera in a ref (gestures write it many times a
  second and React never re-renders for them), re-fits a board that grew at
  zoom 1, and exposes `zoomBy / flyToHex / flyToFit / zoomLevel / zoomMax` —
  Ashwake 1's contract. One finger drags past an 8px slop, two pinch, a wheel
  zooms; a tap is R3F's click with `delta ≤ 8`, on the instance it hit.
  **`?tilt=35`** leans the camera: the open question for Marc, answerable by
  looking at `docs/shots/s2-board-top.png` beside `s2-board-tilt35.png`.
- **`shell/store.ts`** — the run outside React: the reducer, one snapshot
  per dispatch (`BoardView` + `HudView` from one `renderContext`), and
  `useSyncExternalStore`. No persistence yet (Stage 4).

**Two things the first screenshot taught.** The canvas was black: troika had
refused the woff2 and the `Text` failure took the frame with it — a font that
cannot load is a board that cannot draw, which is the argument for the smoke
test being a picture check and not a "no errors" check alone. And the rings
stood on edge, invisible to a top-down camera, because `RingGeometry` lies in
XY; they are rotated flat now.

**Verified:** 697 tests / 41 files (the camera's own four); typecheck, lint,
format, build clean; **`e2e/board.spec.ts` in headless Chromium at 390×844:
boots, draws a picture (not a flat colour), places a tile by tapping, zooms
and fits, no console errors — and opens in French on a French phone and in
English on an English one.** Golden sim untouched. **Bundle: 369KB gzip** —
over the plan's ~280KB estimate; drei's `Text` (troika) is most of the excess
and is the first thing to weigh in Stage 5's look-and-perf pass.

**Deploy readied, not fired.** `wrangler.toml` (worker `ashwake`,
`ashwake.marcportal.com`, assets from `apps/game/dist`) and a `deploy` job
gated on the `DEPLOY_ENABLED` repository variable, with a live check that the
served index names the bundle just built. **Needs Marc:** the two secrets
(`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` — the same as Ashwake 1's)
and the variable on `majeanson/ashwake`, plus the custom domain on the zone.

**Not played on a phone.** The board has been seen only through Playwright's
eyes, which is exactly the thing `CLAUDE.md` says is not the gate.

**Next:** Marc picks top-down or tilt from the two shots, reads the French;
S3 — the chrome.

### Session 4 — the board has depth, and no rule can see it (2026-08-28)

**Question:** Marc answered Stage 2's camera question with "tilt 35, and show
me 45 too, and consider elevation — no change in rules, just a 3D map with
tiles." So: **can the board lean, turn and stand at different heights without
any of it reaching a rule — and does a leaned board still fit, still drag with
the thumb, and still take a tap on the hex under the finger?**

**Answer: yes, and three of those four were arithmetic that had to move.**

**The lean is camera arithmetic, not rig code.** `tilt` leans the eye back,
`yaw` turns the board under it, and both live in `camera.ts` because both
change things the Stage 2 contract already promised:

1. **The fit.** A tilted board is foreshortened — and everything standing on
   it leans INTO the top of the frame, so a fit that measures floors crops the
   far edge with the board's own walls. `Lean.tallest` is what the rig now
   hands the fit, and `frameFor` reserves `tallest · sin(tilt)` of sky. The
   test is the honest one: at four angles, every corner of every hex, at the
   floor and at the top, lands inside 390×844.
2. **The drag.** "The world moves with the finger" stopped being "along x and
   z" the moment the board could turn, and stopped being one-pixel-one-unit
   the moment it could foreshorten. Both are one screen mapping now, inverted
   for the pan: turned 90°, a drag right moves the centre along z; at 60°, a
   drag of one hex's worth of pixels covers two hexes of board.
3. **Straight down needed its own branch, and does not any more.** The rig
   carried `camera.up.set(0, tilt < 0.5 ? -1 : 1, …)` followed by a second
   `set` that undid half of it — a camera looking along its own up vector has
   no orientation, so the top-down case was special-cased twice. `eyeOf` is
   one expression for every angle, tested at 0°, 90° and a quarter turn.

**Elevation is a thickness, not a float.** The first attempt lifted a hex's
prism off the ground, and a lifted tile reads as a tile hovering over a hole.
Relief STRETCHES the prism instead: a raised hex is a column standing on the
same floor as its neighbours, which is what makes the board read as terrain.
The lift is mostly the ground's own colour and only a little the hex's — a
height channel that repeats the colour channel is a second way to tell two
grounds apart for anyone who cannot tell them apart by hue, and noise alone
would spend the geometry and say nothing. A small deterministic jitter per hex
keeps a field of one colour from being a plateau; it is a hash of `q,r`, never
`Math.random`, because the same world has to look the same twice.

**Nothing here can reach a rule.** `relief.ts` is in `apps/game`, not the core;
it reads `CellView` and returns a number of hex radii; the golden sim is
byte-identical. The ladder itself (rivers low, embers high) is a placeholder
with a shape, not a decision — Stage 5 picks the numbers by looking and moves
them into `Theme` with the rest of the materials.

**A finding, and the reason there is a shot set at all.** The two Stage 2
screenshots were not comparable: taps are placed by ringing the canvas, where
a ring lands depends on the very angle the shot is meant to show, so each shot
was a different board. `?place=n` plays a fixed opening through the same
reducer a finger would — highest preview, ties by coordinate — so eight
pictures are eight pictures of ONE board and the only thing that differs is
the look. It is not an AI and is not trying to play well; it is a fixed hand.

**A second finding: a number lying on a turned board is a number read at an
angle.** Labels lie flat on the hex's top, which is right for a map and wrong
the moment the map turns; they are turned back by the yaw now, so 45° costs
nothing in legibility. The tilt still foreshortens them, exactly as it did at
35° in Stage 2.

**Eight shots in `docs/shots/`**, all at 390×844, all seed 7 after the same
twelve placements: `top`, `tilt35`, `tilt45`, `tilt35-yaw45`, `tilt45-yaw45`,
`tilt35-relief`, `tilt45-relief`, `tilt45-relief-high`. Each one is also a
smoke test — a board that draws at 0° can still draw nothing at 45°, so every
angle has to be a picture with no console error — and `board.spec.ts` gained a
placement taken at 45° tilt, 45° yaw and relief on, because the tap is a
raycast and the angle is exactly what could quietly break it.

**Where the depth does NOT yet read.** The prism sides are lit by one
near-overhead key light against a near-black background, so a side face and a
gap look alike and the relief reads softer than it is. That is a lighting
number, and lighting is Stage 5's; nothing was relaxed here to flatter a shot.

**Defaults.** Tilt is 35 — Marc's pick, so it is the default rather than a
query string. Yaw and relief default to 0, which is the flat map Stage 2
shipped: the tuning dial every system ships behind.

**Verified:** 713 tests / 42 files (+16: the lean's six, relief's seven, the
fixed hand's three); typecheck, lint, format, build clean; `pnpm sim`
byte-identical to the golden; nine Playwright tests green in headless Chromium
at 390×844, including a placement taken with the board leaned and turned.
Bundle 370KB gzip (+1KB).

**Still not played on a phone.**

**Next:** Marc picks the yaw and the relief from the shot set, reads the
French; S3 — the chrome.

### Session 5 — the board earns its third dimension (2026-08-29)

**Question, written before building:** can the colour a hex actually renders in
be computed by a pure function in the core — and does every direction still
pass the contrast budget and the greyscale ladder once it is?

**Answer: yes — and the budget it made possible failed on three of four
directions the first time it ran, which is what a real test does.**

**The shape.** The rig is DATA (`theme/rig.ts`): an ambient level and a list of
directions and intensities, **normalised so a face pointing straight up is
exposed at exactly 1**. That one property is what makes the whole thing hold —
a hex top at full torch renders EXACTLY the colour the direction authored, so
every assertion already in `contrast.test.ts` and `theme.test.ts` became
literally true of a rendered pixel rather than approximately true of theme
data. `LightRig.tsx` builds three.js lights from the same object the test
measures, so the board and the budget have nothing to disagree about — the
property `fieldGround` and `depthOf` bought Ashwake 1's gallery. It also means
the rig cannot be brightened to flatter a screenshot: more key has to come out
of the ambient.

**Three findings, all verified against the dependencies rather than assumed.**

1. **The contrast budget was describing a board that did not exist.** React
   Three Fiber sets `ACESFilmicToneMapping` unless the `<Canvas>` is given
   `flat`, so every lit fragment went through a filmic roll-off — and drei's
   `Text` is tone-mapped too, so **the label ink on screen was never
   `theme.ink.ink`**. The rings already passed `toneMapped={false}`; the labels
   never did. A palette graded to 4.5:1 with a curve between the grade and the
   screen is a palette graded to nothing.
2. **`cylinderGeometry` shades a prism as a blob.** Its torso normals are
   radial and shared between segments, so six faces Gouraud-shaded into a
   rounded lump. `flatShading` is one flag and was most of why the board read
   flat. Its cap UVs are also transposed — `u` along +z, `v` along +x — which
   would have landed every baked texture a quarter turn off.
3. **The torch has to multiply in DISPLAY space.** `theme.light.floor`
   (torchlit 0.42) and `MIN_LIT_FIELD_LIFT` were tuned against Pixi's sprite
   tint, which was an sRGB multiply. `instanceColor` multiplies in the linear
   working space, and a linear ×0.42 is about a display ×0.70 — invisible in a
   screenshot, fatal to a threshold. One `onBeforeCompile` chunk decodes,
   multiplies and re-encodes.

**What the new budget found, and what moved.** `render/materials.test.ts`
grades `surfaceSamples(paintPlan(...))` — the set of colours a finished hex
actually contains — through `renders()`. It failed five ways on first run.
Three were the test's own scoping and two were real distinctions:

- **A label is not graded where no label is drawn.** The samples now split into
  `label` (the fill and its ends, plus any OPAQUE pattern — rubble replaces
  what it covers) and `face` (those, plus the depth wash at both ends and every
  translucent ink). A centred label sits where the wash is transparent by
  construction, and a hatch bar covers a fraction of a digit. Prose is graded at
  4.5:1 on `label`; marks at 3:1 on `face`. Holding a digit to the contrast of a
  speck fails hexes that read perfectly well.
- **A shaded side is graded at the WALL floor, not the ground floor**, and the
  numbers are worth recording. `MIN_GROUND_CLEARANCE` (0.1) is "a placed tile is
  a visible shape" and is measured on the TOP face, which normalisation already
  holds exactly. `MIN_WALL_CLEARANCE` (0.045) is "blocked ground must not read
  as fog" — the same sentence as "a shaded side must not read as a gap". At the
  full rig, **torchlit's darkest terrain side sits at 0.070 clearance and
  torchlit-bright's at 0.072**: above the wall floor, below the ground floor.
  Holding sides to 0.1 would need the darkest facet exposed at **0.655** — a
  top-to-side ratio of 1.53, a board with almost no shading left. On a
  near-black board a dark terrain's shaded side and the board are genuinely
  close, and that is a fact about the palette rather than a threshold to argue
  with. **Marc's, by looking**, and the honest read from the shots is that the
  shading is real but modest on torchlit.

**The materials.** `render/paint.ts` carries every layer and number of Ashwake
1's `bake.ts` as a closed union of ops; `bakeCanvas.ts` walks them and decides
nothing. Three corrections, all because the target is a prism: no hex clip and
no inset (the geometry IS the hex, so the gutter goes on the prism radius); a
square bake spanning the circumscribed square; and pattern density stated per
hex RADIUS rather than per screen pixel, because Ashwake 1 rebaked at every
zoom level and this bakes once. `planKey` is derived from the plan, which
structurally retires the "a key that forgot a field" bug Ashwake 1 guarded with
a test. Batches are now a kind AND a surface — about twenty meshes, against a
renderer already spending a draw call per label.

**A bug a human found that no test could.** Marc, on a phone: "most of the
clicks in the upper tiles don't work." `InstancedMesh.raycast` tests a cached
bounding sphere before any instance, and `computeBoundingSphere` only ever runs
on the first null — so the sphere was measured the first time a finger touched
the board and never again, and every cell grown after that silently stopped
answering. A board growing outward from home is the whole game, so the frontier
went deaf partway through every run, with no error anywhere.
`commitInstances()` nulls the bounds; the fix is pinned in node (raycasting is
pure arithmetic) and in a browser walking a board outward through eight
placements. **Eleven green Playwright tests never caught it, because every one
of them tapped a board that had not grown since boot.**

**Verified:** 766 tests / 49 files; typecheck, lint, format, build clean;
golden sim byte-identical; 21 Playwright tests at 390×844. Bundle 375KB gzip
(+5KB). Art payload is ~170KB per direction, fetched only at `?art=1`.

**Not played on a phone since the click fix.**

**Next:** Marc picks the light, relief and materials numbers from the shots;
S2d — movement and the landmark props.

### Session 6 — the chrome, and a first minute that exists (2026-08-29)

**Question, written before building:** can the whole first minute — front door,
HUD, hand, teaching, manual, settings, end screen — be built over the core's
props layer without a single sentence being written in a component, and does
the manual / card / term trio still say one sentence one way?

**The order changed, and here is why.** `NEXT.md` §3 sequenced S2d's remaining
motion before S3's chrome. The goal it serves is _a stranger could finish a run
and start another_, and no quantity of embers gets anyone through a first
minute that has no front door and no end screen. Chrome is the critical path;
ambient motion and the landmark props are polish that can land against a
finished screen. So S3 first, S2d's remainder after it.

**The look dials are on by default now**, as working defaults rather than as a
ruling: `tilt=35 light=1 materials=1 art=1 relief=0.35`. Marc has not seen them
on a phone, and the chrome is about to be built AROUND whatever the board looks
like — building it over a board nobody has chosen is the more expensive
mistake. Every dial still takes a number, so `?light=0` is one keystroke away
and `DECISIONS.md` still records the question as open.

**Answer: yes, and the trio holds by construction rather than by discipline.**

Not one sentence a player reads is written in a component. The manual's
sections ARE lessons — `lessonLines` writes the paragraphs and `lessonDetail`
fills the fold — a teaching card and a term card are the same component over
the same `lessonDefine`, and `Prose` runs the core's `conceptPattern` over
EVERY string the chrome renders, so a term is tappable in a card, on the end
screen and in settings rather than only in the manual as in Ashwake 1. A test
walks every lesson term in both languages and insists each one is offered,
which is also what would catch an accent dropped from a French term. Four
words WERE missing from the catalogue (DETAILS, HOW TO PLAY, RESUME, GOT IT);
they are typed entries in both languages now, so a fifth omission is a type
error rather than a hard-coded string.

**The shared system came first and paid for itself immediately.** Ashwake 1's
own duplication was the specification: Tabs implemented twice, Confirming once
as a helper and four times by hand across seven controls, the label/value grid
written twice, draft and held cards as two near-identical builders. Building
screens first would have reproduced all of it. `resetShell()`'s hand-kept
25-id list — which had already missed three — does not exist in this body; the
dialog stack is a provider, and that was the one honest argument for React.

**What the core did not have, and Stage 3 had to write: the moments.** The
ledger and the words were there; nothing knew that a tile had just become ripe
for the first time. `shell/teaching.ts` is Ashwake 1's shape — a priority list
rather than a queue, so the first unmet-and-true moment fires and the rest stay
armed; cards outrank toasts — and it is pure, so it is tested by handing it two
snapshots.

**`eslint-plugin-react-hooks` found two real bugs in the first minute it ran:**
a prop mirrored into state through an effect in `Board`, which cost the pop a
frame of latency on the one animation that has to feel immediate, and a stale
`fly` closure behind `useImperativeHandle`. Its purity rules are scoped OFF
for `board/` with an argument — `useFrame` is not render, and the whole board
writes three.js objects in place precisely so React never re-renders for a
gesture — and LOUD everywhere else, which is where both bugs were.

**Four things a screenshot found that no test could**: the camera controls were
dropped in the rewire (restored as Ashwake 1's FIT⇄HERE toggle rather than +/−,
because a phone already has a pinch); the stat row rendered under the board;
`index.html` hard-coded `#0a0806` over every direction (it stays as the PRE-JS
paint, the one literal colour there is a reason for, with the resolved
direction written over it inline at boot); and the manual's tabs were crammed
beside the title and BACK, pushing the one control a player needs to leave with
off the screen.

**The loop closes.** The fixed hand only placed, so it stalled at 22
placements with the run still open and the end screen — the screen the whole
gate turns on — could not be reached without playing for ten minutes. It
harvests when it cannot place now, which plays a whole deterministic run: seed
7 ends at 57 placements and 781 points, each with its own epitaph. `?end=1`
plays one, and `finishes a run and starts another` walks the shape of
`DECISIONS.md` D1 in a browser, because a loop a script cannot complete
certainly cannot be completed by a person.

**S2d's remainder landed with it.** Momentum on the drag (measured over the
last few moves, decayed exponentially and INTEGRATED over the step so a slow
phone and a fast one land the board in the same place); the beacons breathing
on a floored sine and asking for no frames when there are no beacons; embers
off spent ground, deterministic per hex so a board looks the same twice; and
the landmark PROPS — a built thing standing on each destination, catching the
key light, with `LANDMARK_GLYPH` still the authority on what each one MEANS.
The props spent an hour correct in memory and absent on screen: rendering is
on demand, and writing instances is not the same as asking for a frame.

**Two case collisions on one night.** `pop.ts` beside `Pop.tsx` and `props.ts`
beside `Props.tsx` differ only in case, which Windows cannot tell apart. The
convention that avoids it is now explicit: a pure board module is named for
what it DESCRIBES (`ambient`, `relief`, `leap`, `landmarks`), a component for
what it DRAWS.

**Verified:** 800 tests / 51 files; 25 Playwright tests at 390×844 including a
full run finished and restarted; typecheck, lint, format, build clean; golden
sim byte-identical. Bundle 384KB gzip + 5KB CSS.

**Not played on a phone.** Every screen in this session was seen through
Playwright's eyes, which is exactly what `CLAUDE.md` says is not the gate.

**Next:** Marc plays the first minute; S4 — the shell, persistence and the PWA;
the screen audit harness beside it.

### Session 7 — a run counts, and the game has rooms again (2026-08-29)

**Question, written before building:** when a run ends, does the game
_remember_ it — and can everything Ashwake 1 kept behind menus come back
without a single screen deciding anything?

**Answer: yes, and the second half is the interesting one.** Every room built
this session — the shop, the hall of fame, MORE, the worlds panel, the payout
breakdown — is a component over the core's arithmetic and the catalogue's
words. `settle.ts` is the whole of "a run counts": `rememberRun` folds the
ground into the world, `recordRun` keeps the shelf of bests, `runHighlights`
decides what was worth saying, `arcSparkline` draws the shape. It is a pure
function of the run and what was already there, so it is tested by handing it
a finished run rather than by playing one.

**A run counts ONCE**, and the identity is the state object: the end screen
can re-render for any reason, and a run counted twice is a world that
remembers ground nobody walked.

**The daily is a place, not a fourth world.** It has no world memory to fold
into and it does not touch the shelf of bests — a shared seed's score on the
same shelf as private ones makes the record book mean nothing. Modelling it
as a `Place` (`Slot | { daily }`) and putting the rule inside the KEEPER is
what makes it structural: the keeper is the only thing that writes, so a
`saveWorld` from a daily is dropped where it is issued rather than avoided by
care at four call sites.

**`backup.ts` would have written an empty file.** `PREFIX` was still `tiles.`
— lifted verbatim with the rest of the core and wrong the moment the keys
around it became `ashwake.`. BACK UP filters by that prefix, so it would have
produced an empty backup and RESTORE would have wiped a device and put nothing
back. The golden sim cannot see it: a namespace is a property of the body, not
of the rules. Found by reading the file that was about to be wired, which is
the cheapest place to find it.

**Three bugs the browser found that no unit test could.** The front door sat
at `z-index: 40`, above panels at 20 — so HOW TO PLAY had been opening the
manual _underneath the door_ since Stage 3, and nothing in the suite stacks
anything. The end screen had the same rank and the same bug. And `.end` is a
flex column, where a child's default `flex-shrink: 1` squeezes content out of
its own box the moment the column overflows: the shop landing on the end
screen made its own MORE button unclickable, with a paragraph swallowing the
taps. The fix for the first two is that a scene is a scene — the door and the
end screen now sit BELOW the panels and go `inert` while one is open, because
a z-index alone leaves focus reaching a screen nobody can see.

**A crashed test worker reported green.** Sixteen forks, each importing jsdom
and three's types, exhausted the heap; the dead worker's file simply vanished
from the run and vitest printed `51 passed`. A suite that can lose a file
silently is worse than one that fails, so the runner is capped at eight
workers rather than given a bigger heap.

**Two features were dead code that every core test still covered.** The colour
lens — `spotlight`, and the `dimmed`/`lensed` the core computes from it,
memory included — was passed `null` by the shell, so long-pressing a card did
nothing. And `ActionBar` declared an `onSpend` it never used. The lens is
wired and pinned; the phantom prop is gone.

**`Rarity` and `PointSource` moved to `content/`.** The payout breakdown needs
to NAME the seven ways a point is earned, and `text/` may read `content/` and
not the engine (lint). They are content — the dials already argue about magic
and unique by name — and `engine/state.ts` re-exports both, so nothing that
imported them from there changed. Ashwake 1 wrote all seven words straight
into its end screen in English for want of exactly this.

**A test had been failing for reasons nobody had looked at.** `remembers a
run across a reload` was the one test that taps the board without waiting
first, and it fails at HEAD too — this session did not break it, it found it.
The cause is real and worth knowing: **the board is not tappable for about
350ms after it appears**, because the camera is still easing into its fit and a
ray cast mid-flight lands where the board has not arrived yet. Measured — taps
miss at 300ms and land at 400ms. The wait now lives in `placeOneTile`, once,
because every caller needs it and only some of them happened to have it.

**The browser suite runs on ONE worker.** Every test here boots a WebGL
context, and the default worker count is a fraction of the CPU count — three
headless Chromiums on one GPU produced shader programs failing
`VALIDATE_STATUS`, "Target page, context or browser has been closed", and a
worker exiting with a Windows crash code. None of that is a bug in the game and
all of it looks like one.

**Verified:** 828 tests / 55 files; 34 Playwright at 390×844; typecheck, lint,
format, build clean; golden sim byte-identical.

**S4's rooms came with two more things.** The PWA — manifest, icons, and a
service worker whose cache name and precache list are STAMPED at build time,
both asserted rather than hoped, because an unstamped cache name is a phone
that never sees another build and an unfilled precache is offline that only
works from the second visit. Registration waits for an idle moment: installing
it downloads the whole precache, and doing that while the board draws its first
frames is a first minute competing with a feature that only helps the second
visit. And `pnpm audit:screens` — fourteen screens × three directions,
photographed and measured (contrast, tap targets, overflow, clipped text), in
its own config with an `*.audit.ts` suffix so `pnpm test:e2e` cannot see it. It
is a report, not a gate.

**The audit's first run found two real things and 114 decided ones.** The real
ones: the draft card's label sat at 1.66:1 on torchlit, because a selected card
paints itself in its own terrain fill and left the label in the ink chosen
against the PANEL — a draft card is a board tile that happens to be DOM, so it
now gets the board's own answer, `ink` over an `ink.halo` outline.
`--card-text-shadow` was ported for exactly this and had been doing duty as a
teaching card's drop shadow. The other 114 are decided: the stat row's 28px
targets (argued in `.stat` since Stage 3 — a stat is an explanation, never an
action) and disabled controls. Both now say so at the source
(`data-audit-compact`, `data-audit-halo`) and are counted in their own columns,
because thirty-nine copies of a rule somebody already decided will drown the
two rows that need deciding.

**CI failed on two balance sims timing out at 5000ms** — vitest's default,
which the maxed-ladder and every-perk simulations sit inside on a shared
runner while passing locally in under a second. They now carry a 60s bound
that says what it is: a guard against a hang, not a claim about speed. Ashwake
1's wall-clock assertion held its deploys shut for nine commits.

### Session 8 — the stash was never wired, and the hand was the wrong width (2026-08-29)

**Question, written before building:** does the hold mechanism work, and does
the hand it lives in fit a thumb?

**No, and no.** Marc asked about the hold mechanism, its UI/UX and hand
ergonomics. Both answers were bugs, and both were on the first screen a
stranger meets.

**The stash was inert.** Nothing in the app ever dispatched `HOLD`. The empty
slot rendered as a `disabled` button and the held card was given no `onPick`,
so a player could neither put a tile away nor take one back. The rule
underneath is complete and tested in the core — `hold(state, slot)` stashes
into a free slot and TRADES with a named one — and it was reachable from
nothing. The same class as the colour lens, found the same way: by reading for
a consumer instead of trusting the screen.

**And it ships from run one.** `TUNING` spreads `PLANE`, which sets
`holdSlots: 1` — so this was not a mechanic waiting behind an unlock. A dashed
HOLD card has been sitting in every hand since Stage 3, doing nothing. That is
now pinned, so the width is a decision rather than a diff nobody noticed.

**The hand was drawing `draft + stash` columns.** Ashwake 1 does not: it
computes the width from the total, and the rule is Marc's own from the session
where the stash moved INTO the hand — five or fewer is one row, **six is 2×3**
("we can use 2x3 too"), seven or eight fall back to four across. Six across on
a 390px phone is 56px a card, which fits a thumb but not the ground's NAME, and
the name is one of three channels a card says its colour in. A second row costs
about 79px of board — "we lost too much game space" — which is why the
threshold sits as high as it does. Ported with its reasons into
`screens/hand.ts` and pinned.

**The spacers came with it.** Stashing takes a card out of the draft and
nothing puts one back until the next placement, so without a held column the
row reflows twice under a thumb in the two taps between — the cards move while
you are reaching for one.

**Consulting the old repo was the whole session.** Every one of these was
already answered in `../tiles`, including the two sentences the empty hand
needs — "Nothing in hand to stash" and "the stash trades, it does not deal" —
which Ashwake 1 wrote in English and which live in the catalogue here (D4).
Designing it fresh would have produced something close and wrong: I would have
sent no slot index for an empty card, and drawn six columns.

**Verified:** 842 tests / 56 files; typecheck, lint, format clean; golden sim
byte-identical.

**Deployed manually**, at Marc's ask, so the session's work could be looked at:
`5cfee1d` is live on ashwake.marcportal.com and `verify:deploy` passes,
including the install surface. It used the local wrangler OAuth login, not a CI
token — **CI's deploy job is still failing** and still needs Marc.

### Session 9 — the game stops promising things it cannot do (2026-08-29)

**Question, written before building:** the privacy sentence a player reads
says _"Sharing sends only what you see in the share sheet, and a crash report
only if you tap SEND REPORT"_ — can both halves be made true?

**Both are true now.**

**SHARE is the game's entire distribution mechanism**, and it had no button.
No backend, no account, no store listing: a run reaches another person because
somebody pasted a sentence and a link. `meta/share.ts` has owned both since
the rules were lifted and was reachable from nothing. The edge it refused to
be — `location`, the share sheet, the clipboard — is `shell/share.ts`, and
**the link is built from the ORIGIN**: one built from `location.href` would
drag `?end=1&taught=1&tilt=` along and hand a stranger somebody else's
debugging. The e2e asserts exactly that.

**The failure panel is plain DOM, and that is the design.** It exists for the
moments React and WebGL are what broke, so a panel built out of either is a
panel that cannot appear. Every decision in it is Ashwake 1's, paid for on
Marc's phone: an OVERLAY rather than a body replacement (one transient throw
used to destroy a perfectly good end screen), CONTINUE beside RELOAD, repeats
counted rather than stacked, the actual error shown because a phone has no
console, theme vars with their old literals as fallbacks because it can fire
before the theme has written a property, and the honest no-WebGL split — a
browser that cannot draw at all is not helped by being told its run is saved.

**The privacy contract is the load-bearing part**, and it is now a test: a
recorded failure must touch the network **zero** times. Nothing runs at boot,
on error, or on a timer. The tap is the consent.

**`sendCrashReport` moved to the app**, which is what its own comment asked
for in Ashwake 1. The envelope is arithmetic and stays in the core; `fetch`
was the only network call in `packages/core` and the only place it reached for
a global the DOM ban would otherwise have caught. Its tests moved with it.

**SETTINGS ▸ LAST ERROR** is the door that stays open: a player who tapped
CONTINUE an hour ago is a bug report that walked away, unless what they saw is
still there to send.

**The appearance picker was a list of words.** The one decision on that screen
whose answer is entirely visual, and it asked the player to read. Each row now
carries the direction's own four grounds and its ink, drawn from that theme's
tokens rather than from CSS variables — the variables belong to the direction
currently APPLIED, so every swatch would have come out the same colour. The
ink stripe is there deliberately: a direction whose grounds are lovely and
whose ink is unreadable should look wrong in the picker. **Adding a direction
is still one file and one entry in `THEMES`; it arrives with a swatch and
needs no code** — which is what S5's settlement direction will land into.

**`AUTO` was hard-coded English**, on the screen whose row directly above it
is the language picker.

**`__BUILD_SHA__` was undefined under vitest** — a crash inside the crash
reporter, which is the one place a second failure is least welcome. The app's
vitest config defines it now.

**Verified:** 847 tests / 57 files; typecheck, lint, format clean; golden sim
byte-identical.

**Not played on a phone.** Again.
