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

### Session 10 — the settlement exists (2026-08-29)

**Question, written before building:** can Marc's own reading of the colours —
FARM · MARKET · QUARRY · ROADS — be a direction that passes every budget
without a single threshold moving?

**Yes, and three colours moved instead.**

**The fiction is the third thing that can happen to a place.** Torchlit is
standing in the dark plane with a torch; daylight is the survey you draw when
you get back; settlement is somebody having STAYED. Every ground is named for
what it is FOR rather than what it is made of, and each still names its power
(D4.2). QUARRY is the one that says its rule better than the old name did: red
feeds on stone, and spent ground is a quarry's whole supply.

**The ladder was chosen as values first and coloured second.** `theme.test`
asks a direction to separate its terrains by VALUE, not by hue, so the four L*
stops (0.34 · 0.43 · 0.53 · 0.70) were placed before a single hue was picked
and spent ground went in the widest gap left. The first draft did it the other
way round — four colours chosen for their fiction — and FARM and QUARRY landed
0.004 apart with stone sitting on both. Designing to the test's SHAPE rather
than iterating against its output is what made the rest of it one pass.

**Nothing was relaxed.** The faint ink read 4.31:1 on its own panel and 2.36:1
over a remembered MARKET; the danger ink read 4.32:1 on the panel. Both were
lifted. The fog's veil was deepened 0.34 → 0.45 for the same failure, and that
one is the truer sentence as well as the fix: a settlement forgets more
completely than a survey does. A number that only just clears was refused too
— the first solved faint ink cleared the fogged floor at exactly 3.00, which
is tuned-to-pass rather than passing.

**Bands are for the wall.** An opaque `bands` pattern reaches the middle of a
face, so a banded terrain puts a third colour under a centred label —
`paint.test` caught MARKET's awning stripes and ROADS' paving on the first
run. Both are translucent hatches now, which is what every terrain in every
shipped direction already was and now has a written reason to be.

**It is a CANDIDATE, not the default** (D7). Gate E is not reopened: it is a
fifth entry in `THEMES` and a fifth row in SETTINGS, and whether it becomes
the direction is Marc's, on a phone, against `docs/shots/s5-settlement*.png`.
Adding it needed one file and one line, which is what the swatch picker was
rebuilt for last session.

**Verified:** 876 tests / 57 files; 152 of them the palette budget, over five
directions now; golden sim byte-identical.

**Not played on a phone.** Again — and this is the one that most needs to be.

### Session 11 — the taps that said nothing (2026-08-29)

**Question, written before building:** how much of Ashwake 1's input does this
body actually have?

**Less than anyone would have guessed, and the gap has a single shape.**
`INTERACTIONS.md` is the whole matrix, gesture by gesture, read out of
`../tiles` and checked against this code. What it found:

**The board tap had three branches and needed six.** A tap that could not
build was a silent no-op — the engine returned the same state and the screen
said nothing, which Ashwake 1's own comment calls "the worst answer a game can
give a deliberate action". So tapping a shrine, a cache, a wall, spent stone,
an unripe tile or native ground did **nothing at all**, and `describeHexOf` —
the function whose docblock says it "covers the things a player can tap and not
understand" — had no caller. Neither did `pocketNote` (tapping a ripe pocket
priced it and explained nothing) or `rememberedNativeAt` (Marc's own fog lens:
"on clicking a tile in the fog that we know the biome it highlights the whole
known biome").

**Eleven view-layer describers had zero callers.** The three above, plus
`harvestNote`, `rarityLine`, `colourLesson`, `powerOf`, `groundHead`,
`purseLesson`, `whatGlows`, `runwayOf`.

**Unselecting a card was wired to the wrong action.** `selectDraft` carries
Marc's rule verbatim — _"we can always unselect a selected tile by tapping it
again — the UI sends -1 on that second tap"_ — and the UI sent `index`
instead. The reducer correctly returned the same state, so the gesture did
nothing. The second tap also EXPLAINS the colour, which is where a player
learns what their grounds do: putting a card down is the one moment they are
looking at the card rather than at the board.

**`touch-action: none` was missing from the board.** Without it the browser
keeps one-finger pan and pinch for itself, so on a phone a drag scrolls the
PAGE and a pinch zooms the document — the two gestures the board is built
around are the two the phone takes first. It never showed up in Playwright,
which synthesises pointer events that no browser gesture is competing for.
The iOS edge-swipe guard was missing with it: the left and right 28px are
where a thumb starts a pan, and losing the page mid-run to a back gesture is
the worst outcome a drag can have.

**Two tests were asserting the wrong opening.** A hand opens with its first
card already selected, so both the stash and deselect tests were clicking a
card to "pick it up" and actually putting it down. The behaviour was right and
the tests were wrong — which is only visible once the gesture does something.

**Consulting the old repo is now the method, not a courtesy.** Every fix this
session and last came from reading `../tiles` rather than from reasoning about
what ought to be there.

**What is still missing is in `INTERACTIONS.md` §"What is still missing"**,
and it is all one shape: **a rule the core implements with no consumer in the
shell.** Nothing speaks when a claim lands or a pocket pops; TAKE and SACRIFICE
are two of four harvest choices that cannot be reached from the screen; the
purse spends in silence.

**Verified:** 876 tests / 57 files; golden sim byte-identical.

### Session 12 — the gaps, closed (2026-08-29)

**Question, written before building:** can everything `INTERACTIONS.md`
listed as missing be built without cutting a corner on any of it?

**Yes, and the pinch bug came first**, because Marc found it on a phone and it
broke play: _"when zooming in and out with pinch, the map flies away at the end
so we can't see anything anymore."_ Two defects. `last` held where the FIRST
finger was, so lifting one finger of a pinch made the survivor's next move
measure its delta from the OTHER finger — the gap between two fingers, applied
as a pan, in one frame. And a pinch never marked the gesture as moved or
cleared the velocity samples, so the lift could throw the board using a pan
from before the pinch began. Pinned with raw CDP touch events, because
`page.mouse` cannot express two pointers and the bug only exists with two.

**The reward loop speaks.** `view/receipts.ts` is pure — two states in,
sentences out — and keeps Ashwake 1's two decisions: rarest leads, and the rare
ones hold the screen. Pops and spends came with it, the spend priced by
DIFFERENCE because a tithe takes the whole purse and a refused spend costs
nothing. All of it on one seam: the session computes what to say on dispatch,
the way it already computed `popped`, and the shell has one `act()` door.

**TAKE and SACRIFICE** were two of four harvest choices unreachable from the
screen, with `harvestTreasure` and `harvestBurn` computed and read by nobody.

**A full disk now sheds** rather than losing the run. `write` swallowed the
quota error under a comment saying the next write is the retry — true until the
disk is genuinely full, and then every write fails forever and the run in
progress is what dies. `storage.ts` caches the PROBE now and not the handle:
probing on every read would be wrong on a full disk, because the probe's own
`setItem` would throw and the game would conclude the device is ephemeral.

**Menus got a way out.** Marc: _"add a x that escape all too, left arrow for
back"_. Every panel head is ← title ✕, and the ✕ appears only past the first
panel — ← undoes one step and ✕ undoes all of them, which on a single panel
would be the same promise twice. One card at a time, too: a receipt outranks a
lesson, because two modal cards over one board is the same problem in card
form.

**The head and its tabs stick as ONE block.** They stuck separately, with the
tab row offset by a hand-typed `top: 3.2rem` guessing the head's height — a
guess that went stale the moment the head grew a ✕ and 44px controls, clipping
the tabs under it. A number that has to agree with a layout it cannot see is a
number that will disagree with it.

**The first pop holds the screen** (Marc's call), gated on the pop COUNT rather
than the `pop` teaching id — that lesson fires the instant a pocket becomes
poppable, so by the time anyone actually pops the ledger is already spent.

**The crossing, the survey and sound**, all three core systems with no
consumer. The crossing is priced in ONE place so the offer and the payment are
the same number by construction. The survey reports at settle, because a goal
is a fact about a world across every run it has held. Sound is synthesised from
each direction's own `voice` block, builds nothing until asked, gives the
audio context BACK when switched off, and may never throw into the game.

**And the manual shows the alphabet its rules are written in.** A player who
met `◈` on a hex could only learn it by tapping that hex, which needed them to
have walked there first. Nothing in the legend invents a mark: every glyph is
read from the registry that owns it and every name from the lesson that already
defines it.

**Verified:** 914 tests / 61 files; 46 Playwright at 390×844; typecheck, lint,
format clean; golden sim byte-identical.

**Not played on a phone** — except the pinch, which Marc found there, and which
is why it was the first thing fixed.

### Session 13 — what the new body lost, and the bridge that was never there (2026-08-29)

**The question, written first:** _Ashwake 2 was built by lifting the rules
verbatim and rebuilding the screen. The rules are proved identical by CI every
push. **Nothing proves the same about everything that is not a rule** — so what
did this body quietly fail to bring across?_

Marc asked for the comparison against `../tiles`: differences, improvements,
cut corners, overlooked things. Three sweeps read the two trees — the pure
layers, the shell and tooling, and this body's own dead ends — and every
load-bearing claim was then re-checked by hand, because a sweep is a ledger
too.

**The answer: the rules came across and the launch surfaces did not.**
`engine/` and `sim/` are byte-identical, every "missing" export turned out to
be relocated into the text catalogue, and the crossing still arms. What was
missing was everything that is not a rule.

**The bridge in `DECISIONS.md` D3 did not exist.** D3 rules that a v1 player's
worlds reach this body through BACK UP MY WORLDS → RESTORE A BACKUP. Every key
in an Ashwake 1 backup begins `tiles.`; `decodeBackup` dropped everything that
was not `ashwake.` and then refused the file for being empty. It refused
SAFELY — the empty-backup guard is exactly what stopped it wiping a device and
writing nothing back — so this was a missing bridge rather than data loss, and
the guard is the reason the finding is a feature request instead of an
incident. `migrateLegacy` is a table rather than a prefix swap because three
shapes moved with the name: the version suffix belongs to the BODY and not to
the blob (v1 was already on `features.v2`, `theme.v2`, `records.v2`), slot 1
kept the pre-slots key names in Ashwake 1 so that slot 1 is the one that moves,
and the daily's board and the last error were both renamed. Three v1 keys are
dropped on purpose — the shrine receipt, the board orientation and the install
nudge — because none of them is a world.

**`navigator.storage.persist()` was never called.** Safari evicts a
non-persisted origin after about seven days and there is no backend to restore
from. Ashwake 1 fixed this as `POLISH.md`'s finding F and learned WHERE to ask
the hard way: it asked after a home run's first successful save, so a
daily-only visitor — the shape of a stranger's first week — never reached the
call. It is asked at boot here, beside the first read.

**The backup screen was below the bar its own module sets.** `meta/backup.ts`
opens by saying a backup that silently restores nothing is worse than none;
BACK UP was a bare `void navigator.clipboard?.writeText(…)` with no share
sheet, no download, and no word either way, RESTORE was a native `prompt()`
asked to hold tens of kilobytes of JSON, a refused file said nothing at all,
and `describeBackup` — the line naming the worlds about to be overwritten —
had no caller. It is the run share's own ladder now, the paste is parsed as it
is typed so the arm names what will land, and `restorePlan`/`isOwnKey` stopped
being dead exports the shell was reimplementing inline.

**A fourth inert mechanic, and it was an accessibility one.** `reducedMotion`
is threaded through `Board`, `HexField` and `Pop`, all of which honour it, and
**nothing ever passed it** — there was no `prefers-reduced-motion` query
anywhere in the repo. `ui.css` honoured the preference for the DOM, which is
what made it easy to miss: the chrome obeyed and the board did not. The fix is
`useMediaQuery` with a live `change` listener, which the colour scheme and the
contrast preference now share — all three were sampled once, and on a page
whose only allowed reloads are the service-worker update and the failure panel,
sampled once means wrong until the tab closes.

**A shared daily link opened the wrong game.** `meta/share.ts` has emitted
`?daily=` since the rules were lifted and `meta/route.ts` was written to read
it back; `@meta/route` had zero importers, so the date was ignored and the
recipient got their own front door. The same shape as the four inert mechanics,
on the URL surface instead of a button. The place has to arrive in `useDevice`
rather than be stepped into afterwards, because the keeper is made from the
opening place and the keeper is the only thing that writes.

**The launch surfaces were gone wholesale.** No `og:*`, no `twitter:*`, no
canonical, no description, no `<noscript>`, no old-browser floor guard — while
`og-image.png` shipped byte-identical to Ashwake 1's baked board scene with
nothing referencing it. `shell/share.ts` calls sharing the game's entire
distribution mechanism, and every link it produced unfurled blank.

**The 44px gate came back, and found something on its first run** — the way
Ashwake 1's did. The measurement survived here only inside `audit:screens`,
which is deliberately non-gating, so a control under the floor could merge
green. The first run flagged the HUD's stats at 28px. That is a real and
argued exemption in this body — a stat explains, it never acts — so rather than
override the ruling or weaken the test, the exemption is now DECLARED on the
control (`data-compact`) and the test pins the hatch shut: exactly one kind of
thing may wear it, and anything new has to make its argument in a diff.

**And CONTINUE now continues into something.** There was no `ErrorBoundary`, so
a render error unmounted the tree before `window.onerror` ever reached the
failure panel — whose CONTINUE is `panel.remove()`, and would therefore have
revealed the blank page underneath while promising the run was still there.

**Three ledger claims were stale, all in the reassuring direction.**
`NEXT.md` §0 lists `goals`, `shedLadder` and `shopLevels` as unconsumed and all
three are wired; `INTERACTIONS.md`'s first open item is the NEW GROUND / UNIQUE
toasts, which `shell/onceARun.ts` shipped. Only `route` was still dead, and it
is not any more. That is the hazard `NEXT.md`'s own opening paragraph warns
about, having come true of itself.

**Held for Marc, deliberately, and it is the biggest one left:** there is no
`@font-face` anywhere in this body. `ui.css` asks for Cinzel and EB Garamond
twenty-one times, the themes name them, and the only font that ships is
`cinzel.ttf` — loaded by troika for the 3D hex labels and by no stylesheet. So
every DOM screen renders in fallback serif. Restoring it changes what every
screen looks like, which puts it on the wrong side of the first-minute freeze,
so it is Marc's to sequence along with the rest of the art pipeline
(`scripts/{terrain,artslots,icons,social}.ts`, gone, taking with them the
guardrail that throws when a theme edit inverts the baked greyscale ordering —
and the only way to make S5's settlement terrain).

**Verified:** 938 tests / 64 files; 51 Playwright at 390×844 including the
restored 44px gate and the shared-link spec; typecheck, lint, format clean;
golden sim byte-identical; `audit:screens` reports no unhandled findings (52
argued compact targets, 3 haloed labels, 88 disabled controls, no overflow, no
clipped text). **Not played on a phone, and the v1 → v2 restore has not been
walked with a real backup out of tiles.marcportal.com — that is Marc's, and it
is the one check that proves the bridge.**

### Session 14 — the bakers come home, and the art that had gone stale (2026-08-29)

**The question, written first:** _Ashwake 2 carried the terrain PNGs across as
frozen byte-copies and left the scripts that make them behind. Is a frozen copy
actually worse than a recipe, or is that just tidiness?_

**It is worse, and the proof was already sitting in the repository.** Ashwake 1
darkened daylight's terrain ladder on 2026-08-28 — moss 0.606 → 0.529, tide
0.726 → 0.611, the fix for "ember has no contrast" — and never re-baked. Its
own art has rendered the OLD ladder ever since, and this body inherited the
stale files. Re-baking here changed exactly three PNGs: green, yellow and blue.
**Red did not move, because ash was the one colour that release left alone.**
A contrast fix, made deliberately, gone missing in two bodies.

So the pipeline is back — `scripts/{terrain,artslots,icons,social}.ts`, ported
with their paths rewritten and nothing else touched — and CI now runs `pnpm
bake` and diffs `apps/game/public`. That single step checks two things at once:
that the committed art still matches the theme it was baked from, and, through
terrain's own guardrail, that the baked greyscale ordering has not inverted the
one the L* test protects. **Torchlit re-bakes byte-identical, which is how the
port proved itself faithful before anything else was believed.**

**SETTLEMENT has art for the first time.** The fourth direction was built on
2026-08-29 (D7) and could never have had any, because the thing that makes it
lived in the other repository. It is a new entry in one array — which is the
whole argument for a script that reads colour off the theme object rather than
a copied palette — and it passed the greyscale guardrail on the first run.

**Two declared slots stopped being empty, and one is staying empty on purpose.**
`ui.logo` and `ui.runEnd` have been declared in `theme/assets.ts` since the core
was lifted and had no file in any direction; they are baked now AND WIRED, which
is the half that matters — `shell/art.ts` answers "is there a file here, and
what is its URL" for DOM screens the way `board/assets.ts` answers it in
bitmaps for the renderer. The door shows the lockup where one exists and its
drawn mark where it does not, and the `<h1>` stays in the document either way:
a screen whose only title lives inside a PNG has no title.

**`fx.pop` is NOT baked, and that is a decision rather than an omission.**
Ashwake 1 shipped it and defended it — an audit there called it a redundant
radial gradient and it was kept for the rays and speckles the fallback does not
draw. Both true, and both about Pixi. This body's pop is one white,
colour-neutral disc that every direction TINTS through an additive material on
an instanced mesh, which is what lets the fade ride a per-instance colour with
no transparency, no sorting and no shader. A per-theme, pre-coloured PNG cannot
serve that. Baking it would have shipped four unread files — the exact shape
this repository keeps getting caught by — so the slot stays declared, the
reason is written where the baker skips it, and `../tiles` keeps the recipe.

**Two smaller things the work turned up.** The screen audit reported 36 CLIPPED
findings on the door's visually-hidden heading, which is text put out of sight
on purpose — it now recognises a box collapsed to a point as the pattern it is,
by shape rather than by marker. And the 44px gate I added in Session 13 invented
`data-compact` when the audit already had `data-audit-compact` on the same row:
two markers for one idea is how two checks come to disagree about which controls
may be small. One marker now, read by both.

**Verified:** 938 tests / 64 files; 53 Playwright at 390×844; typecheck, lint,
format, build clean; golden sim byte-identical; `pnpm bake` idempotent on this
machine; `audit:screens` back to argued classes only (52 declared
compact targets, 3 haloed labels, 84 disabled controls — no clipped, no
overflow). **Every direction's art has changed and NONE of it has been seen on
a phone. The daylight correction in particular is a contrast fix nobody has
looked at.**

### Session 15 — the camera comes off its rail (2026-08-29)

**The question, written first:** _The tilt has been a settled number and the yaw
an open one, both answered by looking at screenshots. If the arithmetic already
works at every angle, is there any reason the ANSWER has to be a constant rather
than the player's hands?_

Marc: _"anyway we could tilt, drag cameras as we want? 3d style"_. There was
not, and the expensive half turned out to be already built. `camera.ts` has
been angle-general since Stage 2b: `Lean` feeds one screen mapping used
forwards and backwards by every extent, centre and drag, the fit already
reserves `tallest · sin(tilt)` of sky, and a Playwright test has been taking
placements at 45°/45° with relief on since the day it landed. **What was
missing was a gesture.** The angles arrived as props from the query string and
nothing on screen could move them.

**The maps vocabulary, on the two pointers that were already there:** pinch
zooms, a twist turns, a two-finger drag leans. No modes, no third control, no
screen given up, and nobody has to be taught it. `twoFinger()` is pure and in
`camera.ts` with the rest of the lean arithmetic, and the one subtlety is
written into a test: **the lean is read off the MIDPOINT**, because a twist
moves both fingers hard in opposite directions and their midpoint not at all —
measuring either finger alone would report every rotation as a lean.

**Each channel latches past a deadzone.** Two fingers are never still: a pinch
rotates a degree or two and drifts a few pixels, so all three applied every
frame makes the board wobble under a gesture that meant one of them. And a
threshold re-tested per frame is a channel that stutters in and out exactly
when somebody slows down to be precise, so once engaged it stays engaged.

**The angle is state, not a ref** — the one place this board departs from "the
camera lives in a ref and React never re-renders for it". Three things read the
angle and only one is the camera: the fit reserves sky by the tilt, the light
rig turns with the yaw, and the labels turn back by it. Quantised to a half
degree so a hundredth-degree frame does not buy a re-fit.

**LEVEL is the third control, and it is not always there.** Marc asked for the
reset and it earns the cluster's own rule — the doc comment there argues hard
for two controls rather than four — by appearing only once the board IS off its
angle, which is the rule HERE already follows.

**The persistence answer, stated because the first draft of this said something
else:** the angle lives for the SESSION and is never written to storage. A
fresh page always opens at the direction's own angle, so the shot set, the
screen audit and a stranger arriving all get one known first minute; within a
session it survives a new run, because `Board` never remounts by ruling and a
run boundary is no reason to take an angle off the hands that chose it. The
code comment claiming it reset per run was wrong when it was written — nothing
called the reset — and reviewing the work is what caught it.

**Reviewing it found the pinch bug's shape again, before it shipped.** The two
fingers a gesture reads are the first two still down, so a third finger landing
and then the FIRST lifting leaves the pair `[B, C]` while the remembered
reference describes `[A, B]` — a delta between two different pairs of fingers,
a fifty-degree turn in one frame from a hand that barely moved. The fix is the
general rule rather than a third special case: **when the SET of pointers
changes, the gesture starts over from where the fingers are now.**

**And the test for that path could not be made honest, which is worth recording
rather than papering over.** Two drafts of it passed for the wrong reasons —
the first because the `down` path already prevented the spin, the second
because Chrome's `Input.dispatchTouchEvent` identifies touch points **by their
index in the array**, so asking it to end the third point ends the FIRST and
merely reports it at the third one's coordinates. A palm landing and leaving
cannot be expressed to that driver. The fix stays (it is right by construction
and cheap), the gap is named where the code is, and the escape if it ever bites
is the one this repo has taken twice: lift the bookkeeping into a pure tracker
and test it there.

The same review corrected the camera e2e itself: its first draft compared
screenshots and would have passed against a gesture doing nothing at all,
because the board is never still — embers and beacons animate. It measures
through LEVEL now, which appears exactly when the angle has moved.

**Verified:** 946 tests / 64 files; 54 Playwright at 390×844 — including the
pinch-bug test, still green, which is the one that mattered here since the new
gesture lives in its handler; typecheck, lint, format, build clean; golden sim
byte-identical; bake idempotent; the audit unchanged at argued classes only.
**The ceiling of 55° is arithmetic and has not been looked at on a phone**, and
neither has the gesture.

### Session 15b — the CI art check was wrong, and CI said so (2026-08-29)

The step added in Session 14 — `pnpm bake && git diff --exit-code` — failed on
its first real run, and the failure was the check's rather than the art's.
**`sharp` does not rasterise SVG byte-identically across platforms**, so a bake
on the Linux runner never reproduces one made on Windows, and the diff could
only ever be red. Everything else on that run was green: install, format, lint,
typecheck, 946 tests, 54 e2e, the golden sim.

Two portable replacements were measured and rejected, which is worth recording
so nobody re-derives them:

- **Baked mean luma against the token value.** The gap between them runs from
  −0.073 to −0.238 depending on how much texture a colour carries, so no single
  tolerance separates "textured" from "stale".
- **The NORMALISED ladder shape.** Closer, and still not clean: the four
  directions disagree with their own tokens by up to 0.057 once normalised,
  which is the same size as the drift it would need to catch.

So the step is now `pnpm bake` alone. That still does real work — it keeps the
pipeline from rotting unnoticed, which is exactly how it went missing from this
body, and terrain's guardrail throws if the baked greyscale ordering
contradicts the one `theme.test.ts` enforces. **What it does not do is prove
the committed PNGs are current, and the comments and ledgers that claimed
otherwise are corrected rather than left standing.** The honest way to close it
is a measured ladder derived from the THEME, committed like `sim.golden.txt`,
and graded against the committed art — measurable portably, unlike bytes. It is
written down in the workflow for whoever wants it.

The same review pass caught a second overclaim: the camera's angle was
documented as resetting on a new run, and nothing reset it — `Board` never
remounts, by ruling. The behaviour is right and the sentence was wrong; both
are now the same thing.

**Verified:** 946 tests / 64 files; 54 Playwright; typecheck, lint, format,
build clean; golden sim byte-identical; deployed and `verify:deploy` green
against `ashwake.marcportal.com`.

### Session 16 — the board answers a keyboard (2026-08-29)

Marc: _"do a pass for keyboard + desktop play (all cam movement, etc.) and easy
tile placements. same for mobile, do a accessibility / high level moment."_

**Question:** the board has been unreachable without a finger since this body
began, and Ashwake 1 was too. Is the missing piece a set of shortcuts, or is it
one idea?

**Answer: one idea, and the shortcuts fall out of it.** The thing the board
lacked was a way to SAY WHICH HEX YOU MEAN. Everything else a keyboard wants —
pan, zoom, turn, lean, the view button, picking up a card — is a shortcut to a
control that already exists, and none of it is worth anything while the board
itself cannot be pointed at. So the session is a marker, and a key map around
it.

**The marker's step is spatial, not axial**, and that is the design decision
worth keeping. Adding a hex direction to `{q, r}` is wrong three ways at once:
the board is sparse, so the neighbour may be nothing at all; it can be turned,
so "east" may point down the screen; and a pointy-top hex has no neighbour
straight up to give the up arrow. An arrow asks a SCREEN question instead —
_what is the nearest cell that way_ — answered through `screenOf`, the same
mapping the fit, the drag and the raycast already agree on. A turned board
still moves the marker the way the arrow points, and a gap in the ground is
stepped over rather than into.

That leaves the problem every hex grid has with an up arrow: there are two ways
up, sixty degrees either side, and taking the nearest each time walks a
diagonal — ten presses and the marker is five hexes off the column it left. The
answer is a text editor's: the marker carries a GOAL COLUMN, holds it across a
run of presses, and the two ways up alternate into a straight climb. The anchor
is a screen coordinate, so it carries the angle it was measured at and is
re-taken when that stops being true — asked where it is used rather than
repaired by an effect, which is the cascade `Board` already refuses for the pop.

**Arrows LOOK and Enter ACTS**, and that split is the accessibility half of the
session rather than a convenience. Walking the marker prints the same sentence
a tap on unbuildable ground prints, into the live region the toast already is —
so a board that a screen reader could not enter now reads itself out, hex by
hex, in the direction's own words and this run's own numbers, with no new prose
written for it. Looking deliberately does NOT target a ripe tile the way a tap
does: a marker crossing a pocket on its way somewhere else must not silently
re-aim what POP will spend.

**Three smaller decisions, each with a reason that outlives it.**

- **The keys come off the window, not off a focused element.** A listener on
  the board would mean clicking the board before every arrow, and a player who
  just pressed POP has their focus on POP. The safety is a two-line predicate:
  a focused control keeps Enter and Space and nothing else, a text field keeps
  everything, and Ctrl/Alt/Cmd are never ours — Ctrl+W is a closed tab and a
  closed tab is a lost run.
- **The first press only summons the marker.** Placement is the one action on
  this board that cannot be undone.
- **The turn and the lean have two spellings each.** `Q`/`E`/`R`/`F` is what a
  desktop player guesses; it is also not on every keyboard, because `Q` sits
  where `A` does on an AZERTY board and this game ships in French. Home, End,
  PageUp and PageDown are the same channels on every layout. The card digits
  are read off `event.code` for the same reason — an AZERTY digit row needs a
  Shift to print a `1`.

**The desktop got the gesture it never had.** Stage 15's two-finger vocabulary
was unreachable with a mouse — one pointer, so the board could be panned and
zoomed and never angled at all, and the only way back from a leaned board was
whichever view the VIEW button happened to be pointing at. A drag with the
secondary button (or with Shift, for a trackpad) carries turn and lean
together, exactly as two fingers do. The board eats its own context menu to
buy that button, and `HexField`'s tap now refuses anything that is not the
primary button — a right-click that never travelled far enough to register as
a drag must not fall through into a placement.

**The camera cycle moved up a level and stopped being duplicated.** `0` walks
the same four views the VIEW button does, through the same hook, because two
copies of a four-state cycle is how a key and a button come to disagree about
which view is next.

**What the pass did NOT find.** The mobile accessibility sweep turned up less
than expected, and that is worth recording rather than padding: 44px targets,
`aria-controls` on the purse drawer, two-line buttons with their own accessible
names, live regions inserted empty, reduced motion and `prefers-contrast` are
all already honoured, and the screen audit's 138 findings are the same 138
argued ones (52 tap-target-allowed, 24 contrast-haloed, 62 contrast-disabled).
The two real gaps were both on the board: it was an unnamed canvas nothing
could focus, and the toast was a `<p>` with a click handler and no keyboard
path to the same dismissal. The board is now a named, focusable
`role="application"` carrying the catalogue's own sentence about the arrows;
the toast keeps its `<p>` — a live region has to be on the page before its text
changes — and answers Escape when nothing is open.

**Verified:** 974 tests / 66 files; 61 Playwright including six new keyboard
tests at 1280×800, the only desktop viewport in the suite and it says why;
typecheck, lint, format, build clean; golden sim byte-identical; the screen
audit unchanged at argued classes only. **The key map has not been felt on a
real desktop, and the marker's ring has not been looked at on a phone** — the
step sizes (15° a turn, 5° a lean, 96px a pan) are chosen by arithmetic, like
`PX_PER_DEGREE` before them.

### Session 18 — the settlement's art was the plane's, recoloured (2026-08-29)

**Numbered 18 rather than 17 on purpose:** another session was working in this
repo at the same time and landed `ca1f18a` mid-way through this one, which also
swept this session's `theme/` edits into its commit. 17 is left for its own
entry.

**Question:** the settlement direction has terrain art — but is it art of its
own, or the plane's art in settlement colours, and would anything have told us?

**Answer: the plane's, recoloured — and worse than that in two slots, where it
was nothing at all. Nothing would have told us, and one of the guards we have
looked straight at it and passed.**

`scripts/terrain.ts` drew one set of figures for every direction — moss tufts,
dry grass blades, ember glints, ash pits, tide ripples — and changed only the
colours. That is exactly right for torchlit, torchlit-bright and daylight,
which are one place at three exposures, and it is the wrong answer for a
direction whose whole claim is that it is a DIFFERENT place. FARM was drawn as
tide ripples with moss growing on them. Its own theme file said "planted rows".

**The two empty slots are the finding under the finding.** Each slot function
picked its drawing off the layer's declared `kind` — `pattern.kind === 'dots' ?
pattern : null` — and skipped the layer when the answer was no. Settlement is
the only direction that departs from the plane's kind layout, because its
brightest ground is striped where the plane's is dotted. So **MARKET matched
neither guard and baked with no texture at all**, and **QUARRY silently lost the
cut-face overlay that carries its whole meaning**. The live procedural painter
(`render/paint.ts`) is kind-generic and drew both correctly the whole time,
which means the ART path — the one that exists to supersede the fallback — was
worse than the fallback for the ground a player looks at first.

**The greyscale guardrail looked at this and passed it**, and it was right to:
it grades VALUE, and a missing texture barely moves a mean. A guard that
watches one axis says nothing about the other, and this is the picture of what
that looks like.

**What landed.**

- **`Motif` is a claim a direction makes** (`theme/tokens.ts`): `plane` or
  `settlement`. The three inherited directions say `plane` and their art
  re-bakes BYTE-IDENTICAL, which is what makes the refactor provable rather
  than argued — five files changed in `public/assets/`, all settlement's.
- **A settlement's figures**: furrows with a lamplit crest and a crop planted
  in the rows (FARM); awning cloth with its fold-shadow over stacked, lit
  crates (MARKET); benched cut faces and angular chips (QUARRY); paving
  courses whose cross joints break course by course (ROADS); a pit cut in
  terraces where the plane's spent ground cracks open. Every highlight comes
  off `T.ink.lit` — the direction's own lamplight — rather than the two
  hard-coded "flame" and "torchlight" constants the plane's slots carry.
- **A silent drop is now a loud failure.** `need()` throws with the direction,
  the slot and both kinds. A layer a theme states and the maker cannot draw
  goes MISSING rather than wrong, and missing is the one failure nobody sees.
- **The destinations are built things** in this direction: a strongbox, a
  tower, a boundary post. The shrine's arch and the crystal are unchanged, and
  that is the argument that this is a reading and not a redecoration — a
  threshold is a threshold in both fictions, and a find is the one thing on
  the board nobody put where it is.
- **`ui.runEnd` re-baked itself into the new ground** without being asked,
  because it composes from the direction's own terrain PNGs. That is the
  recipe-over-loaf argument paying out a second time in two days.

**A third finding, measured rather than argued.** `propGeometry`'s shrine says
"standing on edge: a torus is born lying flat" — and three builds a torus
UPRIGHT, so that `rotateX` lays it down. The ring is 0.88 wide and 0.16 tall: a
disc, not a doorway, hanging a third of a hex over its ground. It stays laid
down (a level ring reads the same from every yaw, and the camera came off its
rail on 2026-08-29 — after the prop was written), the comment now says what the
code does, and `landmarks.test.ts` measures all ten props so the next one
cannot spend a stage being something other than its own description.

**And one that is not ours.** With the other session's uncommitted work in the
tree, a PRODUCTION build crashes the end screen: `ReferenceError: toMainMenu is
not defined`. The declaration is in the source and survives an unminified
build; the minifier drops it and leaves the reference free. Not a rules
problem, not an art problem, and not this session's to fix — but a run cannot
end on the deployed site while it is true.

**Verified:** 997 tests / 67 files (21 new, all props); typecheck, lint clean;
golden sim byte-identical; `pnpm bake` re-bakes the three plane directions
byte-identical and settlement's five changed files; the shot set regenerated.
**Nobody has seen any of it on a phone**, which is the same sentence this
direction has carried since it was built.

### Session 19 — the game gets a story, and the settlement gets the door (2026-08-29)

**Question:** what is the smallest story that makes this game make sense — and
can it be told without inventing a single word the manual would then have to
teach?

**Answer: three sentences, and yes — because the four grounds already say it.**

Marc asked for _"a little story, a small hook for this game towards the
settlement"_, and mid-session added the ruling the whole of S5 has been waiting
on: _"i want to go this way since its a strong theme and i feael like names of
eahc color reveal what they do too."_

**The story is the GAME's, not a direction's.** That is the whole design of it.
Written as a direction's it would have been a fifth theme note; written as the
game's it makes the four directions one fiction rather than four — somebody
stayed here and the plain took it back (settlement), you go out into that plain
with a light (torchlit), the survey is what you draw when you get home
(daylight). Nothing had to be retired to make room.

> Somebody stayed here once. The plain took it back.
> You go out at dusk with a lamp and a handful of ground — a field, a stall, a
> cut in the rock, a road — and you lay it where it will pay.
> What you carry home is never much. This place has more than it had yesterday.

**It promises nothing the game cannot do**, which is the rule this repo keeps
re-learning the hard way (the privacy sentence promising a share sheet that did
not exist, 2026-08-29). A field, a stall, a cut in the rock and a road are the
four grounds a player is about to be dealt; "more than it had yesterday" is the
world's own memory of the ground walked, which is a mechanic that shipped in
Stage 4. No lore about who left. **No new vocabulary at all** — which is why it
is the one passage in the game NOT run through the glossary matcher, and the
component says so.

**The direction, chosen.** D7 is closed. The argument is mechanical: FARM ·
MARKET · QUARRY · ROADS each name what their ground DOES, where MOSS and EMBER
name what theirs is made of. What follows a default and does not follow by
itself is the three surfaces that name a direction BY HAND because they run
before the app does — tab tint, install splash, share card — and all three
moved. The share card is baked from the shipping direction now rather than from
`TORCHLIT` by name, with the reason written where the next person will change
it.

**A finding, and it is the good kind: the story broke a screen.** Three
paragraphs pushed the front door past a 375×667 phone, and `justify-content:
center` on a scrolling column clips its own top with no way back — measured at
−24px with `scrollTop` already 0, MORE below the fold with no way down. **`safe
center` does not fix it**: it was the first fix, and this engine drops the
declaration and keeps plain `center` — which is why the number above is
measured rather than reasoned. Auto margins on the ends do what `safe center`
promises, everywhere. `e2e/menus.spec.ts` pins it at the smallest phone
anybody still hands you, and that test would have caught the original bug.

**Two snapshots were re-recorded, deliberately and with the reason in the test
file** — the tagline in both languages, whose frame moved with the direction.
The VERBS did not move: "Place, ripen, pop, and push on" is the glossary's
(D4.3) and is what a player actually does; only the clause in front of it
changed.

**What this ruling makes louder rather than fixes:** the rule lines still name
two powers in the plane's words. A player now reads QUARRY on the board and
"· ash:" in the tip, because `colourWord` lives in the catalogue rather than in
the direction, and two of its four entries are torchlit's ground names. It is
put to Marc as an option set rather than patched, because the shape of the fix
is a ruling about whose vocabulary the rules speak in.

**Verified:** 998 tests / 67 files; lint and format clean; core typechecks; the
door measured at 375×667 and 390×844 and shot in both. **The direction has
still never been seen on a phone** — the thing that changed today is that it is
now what a phone would open.

### Session 19b — the rules stop speaking another direction's language (2026-08-29)

**Question:** put to Marc as an option set rather than answered here — now that
settlement ships, whose vocabulary do the RULE lines speak in? He picked the
whole fix: the direction owns its power words, and a name that already says its
power does not repeat it.

**What was wrong.** `view.colourWord` was one shared table in the catalogue,
and two of its four entries — ASH and TIDE, CENDRES and COURANT — are
torchlit's own GROUND names. So a settlement player read QUARRY on the board
and `· ash:` in the tip under it. Two clauses were worse than that: they named
a ground as **"red"** and **"green"**, words the game shows on no screen in any
direction. Both were invisible for as long as torchlit was the default, which
is the whole shape of this: a shared thing that is secretly one direction's.

**What it reads now.** The pins are the proof, and they now loop settlement
because it is the only direction that exercises the dropped word:

|            |                                                                             |
| ---------- | --------------------------------------------------------------------------- |
| torchlit   | `MOSS — CROWDS.` · `  · crowds: +1 worth per MOSS neighbour past the first` |
| settlement | `QUARRY.` · ` · stone and walls beside QUARRY count as matches`             |

**The rule doing the work was already written**, for torchlit's own "ASH — ash."
stutter on 2026-08-27, and it only ever ran on the card. `powerHead` is the
same rule at the second door, and the fact that settlement needed nothing new
invented for it is the best evidence that D7 chose a direction rather than a
mood: **its names carry the teaching, so there is no second word to print.**

**One thing stayed in the catalogue on purpose.** `powerHead` returns the WORD,
never the punctuation — Québec French puts a narrow no-break space before a
colon and English puts none, which is a fact about a language rather than about
a power (D4). `text.test.ts` would have caught it; better that it never had to.

**Verified:** 1006 tests / 68 files; typecheck, lint, format clean. Two pin
files re-recorded deliberately, both listed above and both with the reason
written into the test file rather than only into this one.

### Session 20 — a world is a place, and the roguelite starts running (2026-08-30)

**Question:** Marc says he gains perks from shrines and still sees 0/5, and
that relics never arrive when Ashwake 1 paid them. Is the roguelite loop
running at all?

**Answer: no, and it never had been — in two independent places, each of which
would have hidden the other.**

**One. Nothing minted a world seed.** Ashwake 1 mints one when a world is
created and re-derives every run's geography from it — `keeper.ts` says it
outright, "the seed re-derives from `world.worldSeed` on the session that
starts next." That is what makes revealed ground, claimed territory and woken
shrines mean anything: you are going back to somewhere.

This body minted none. A fresh device opened on the literal `1` — every new
player got the same board — and NEW RUN, the world switcher and RESET ALL each
rolled `Math.random()`. The dependency ran backwards: `settle` adopted whatever
seed the run happened to carry as the world's.

And that is what switched the loop off. The seed guard added the day before is
correct — a run may only merge into the world it was played on, because ground
unioned from a foreign geography is unremovable afterwards — so once a world
existed, **every later run failed the guard and banked as a detour**: no
relics, no ground, no goals, no shrine unlocks. A correct guard, doing its job,
against a shell that was lying to it.

`worldSeedFor(slot)` mints on first read and writes the world down, so a world
exists before its first run. The boot's precedence is a ladder — the URL, then
the run this device left unfinished, then home — because a run is saved under
the seed it was PLAYED on, and reloading a shared link has to pick that same
run back up rather than deal a fresh board on the same number.

`memoryFor(slot, seed)` then hands the run what the world holds. `newRun` has
taken `claimed`, `claimedFinds` and `rearmed` since Stage 1 and nothing ever
filled them, so a territory was written down every run and read back never.

**Two. Nothing composed the economy.** `createSession` has taken a `tuning`
since Stage 1 and no caller ever passed one, so every run played the bare
`TUNING`. `applyProgress` — whose own docblock calls itself "the ONLY place
progress touches balance" — had zero callers outside its own file. So did
`withWorldPerks`. `unlockedBy` had three, and all three printed a LABEL: the
WOKE toast, the atlas row, the end screen's unlock list. A shrine announced
DRAFT, three screens agreed it had, and the hand stayed four cards wide.
`applyUnlocks` had no counterpart in this body at all.

**Fixing the first alone would not have been enough.** Once relics finally
reached the bank, they still bought nothing. `shell/economy.ts` composes the
three layers in Ashwake 1's order — plain, then what the shrines woke, then
what the shop bought and which perk is worn — and the economy is per RUN rather
than per session, because a session lives for the life of the page and could
never see a relic spent between two runs.

**Fifth and sixth of this body's signature shape**, after the colour lens, the
stash, the board's tap-to-describe and unselecting a card. `CLAUDE.md`'s
standing warning has now been earned six times, and the new part is the lesson:
**a screen that renders a thing without connecting it is the visible version;
this pair was the invisible one.** Nothing looked wrong. Two runs of the same
game and two different planets are the same picture, and a shrine that unlocks
nothing still lights up, still toasts, still lists itself on the end screen.
Only the numbers disagreed, and nothing was reading them.

**Also this session.** The drag had two lurches, both every time: the tap slop
was a debt rather than a threshold (every drag opened with a five pixel jump),
and `glidedAt` held the previous glide's last frame, so every throw spent 64ms
of travel on its first. H reaches the stash, which no key could. A pop pays out
in a card rather than a toast, and the stat row wears the registry's `✤` for
luck instead of a second symbol for a thing already named.

**One test moved for the runner, not the code.** `sim.test.ts` timed out at
5000ms on CI with every assertion still true — a GitHub runner played that file
about eleven times slower than this machine does. The timeout moves to both
`describe`s, where it describes the weight class; nothing asserted changed.

**Verified:** 1016 tests / 69 files, 64 Playwright, `pnpm sim` byte-identical,
typecheck/lint/format/build clean. Ten of the new tests each ask whether a
NUMBER moves, because a suite that only checked `economyFor` returned _a_
`Tuning` would have stayed green through every bit of this.

### Session 21 — a world with an age, and the reward that was never paid (2026-08-30)

**Question:** the last two sessions each found a mechanic that was inert
because nobody could SEE the number. Can that be turned into an instrument —
a fixture of a world three hundred runs old, rendered — and does the
instrument find a seventh?

**Answer: yes, and it found eight — four of them with its own hands, and two
of those in a SCREENSHOT rather than in the code.**

**THE INSTRUMENT.** `shell/fixture.ts` and `?runs=n`: the screen audit's third
axis, asked for in `NEXT.md` §3 since the file was written. The two histories it
had — `?taught=1` and `?end=1` — are both facts about a SESSION; this is a fact
about a DEVICE, so the worlds panel, the atlas, the shop, the hall of fame and
the end screen's unlock list stop being photographed nearly empty. Wired into
`pnpm audit:screens` at three ages of ONE world seed — five runs in, thirty,
three hundred — so the rows are a before, a middle and an after rather than
three unrelated places.

**It is honest by construction, which is the whole design.** The territories,
shrines and finds are REAL landmarks, read off the world seed with
`destinationsWithin`/`findsWithin` — the same pure functions the reducer
consults when growth reveals a hex — so pressing BEGIN in a fixture opens a
board that agrees with its own ledger. The perks come from folding `grantFind`
over those hexes, which is what the shell does. The goals met are `metGoalIds`
over the world it built. The purse and the shop are one arithmetic: relics
earned per run and by the survey, then SPENT through `buy`, so a shop level
always has a price behind it. The SEED is chosen rather than rolled, and chosen
against that arithmetic — a sparse plane gives a three-hundred-run world three
woken shrines out of five, which photographs as a bug in the game rather than a
fact about that seed.

**Three ages rather than two, and the middle one is not a convenience.** Thirty
runs is the only age at which the shop has rows on both sides of the affordable
line. Five is a shop nobody can shop in; three hundred is a ladder already
finished. From a distance those two pictures look like each other AND like a
purse that never earned anything, which is the exact confusion the axis exists
to end.

**THEN THE SWEEP, and `CLAUDE.md`'s warning extended from actions to numbers.**
Four more of this body's signature miss, all of the invisible kind:

**Seven. The survey paid nothing.** `content/goals.ts` opens by calling the five
goals "world-scale goals, each paying relics ONCE per world the moment it is
first met", and **`Goal.reward` had no consumer anywhere in this repository** —
25 to 40 relics apiece, detected, written into `goalsMet`, listed on the end
screen, and never banked. Ashwake 1 pays it in `keeper.ts`'s `checkGoals`. Paid
in `settle` now, where `newlyMetGoals` already runs and `goalsMet` is already
written, so there is one site rather than two. The end screen's line says the
amount as well (`s.goalMet(goal, relics)`, both languages): a line that says a
goal was met without saying what it was worth is the version of this bug a
player cannot tell from the real thing.

**Eight. A found perk never reached the world, so it died on every reload and
never touched a dial.** Perks moved onto `WorldMemory` on 2026-08-26 and
`encodeProgress` has stripped them from the device blob ever since,
deliberately — `decodeProgress` hands back an empty shelf **by contract**.
Nothing in this body ever wrote the world's copy, and nothing ever read it
back. So a find granted a perk into React state, the blob refused to carry it,
the next boot had none; and `economyFor`, which reads `world.perks`/`worn`,
never saw one, so the dials a worn perk sets were never set. **A perk was a
name in a toast.** `useDevice` composites the world's shelf at boot and at
every world switch now, and one effect in `App.tsx` mirrors it back through the
KEEPER — one seam rather than three call sites, because a find grants, the shelf
equips and the shelf unequips, and a rule written three times is a rule that
comes to disagree with itself.

**Nine. `mergeRun` had no caller at all.** Its own docblock says why it was
split off from `rememberRun` in Ashwake 1, and both halves were live bugs
there: a shrine woken at placement 40 did not reach the atlas until the
expedition ended (Marc: _"it still shows 0 of 5 found"_), and a player who
closed the tab lost the territory they had just walked to. This body had
reintroduced both — world memory was written only at `settle`, so every claim
was provisional until a run was over. It merges after every action now, through
one held copy of the world rather than a decode of a several-thousand-hex blob
per tap.

**Ten, and the instrument found this one itself.** `?taught=1` handed
`useDevice` a whole replacement `Progress` built on `EMPTY_PROGRESS`. Harmless
while the only other history was `?end=1`; fatal the moment a DEVICE history
existed, because `?runs=300&taught=1` seeded a purse, a build and a shelf and
then the taught override threw all three away on the way back in. **The
three-hundred-run shop photographed `0` relics** — precisely the picture the
axis was built to make impossible, produced by the axis itself, and caught by
the e2e test written for it. It is a boolean now: `?taught=1` fills the teaching
ledger and touches nothing else.

**Eleven, and the instrument caught this one too — in itself.** The audit's
PLAYED device, `taught=1&end=1&seed=7`, **stopped being played on the morning
of the same day**: `?seed=` became a DETOUR when the world seed was fixed, so
the run banked nothing, the device stayed VIRGIN, `More` hides SHOP and FAME on
a virgin device, and three tests sat on a click that could never land until the
180-second timeout. **They then kept the previous run's screenshots**, so the
report looked complete with three of its pictures a day old — which is the
worst property a report can have, and the same one the `imaged` check in
`audit.ts` was written to avoid. It plays on `?runs=1` now: one run deep, on a
fixed world seed, so the run banks AND the picture is the same picture twice.

**Twelve, and it is nine wearing a different face.** The end screen's list of
what a run UNLOCKED was always empty. `wokeNow` read the world off the DISK,
which nothing had updated since the run began, so it always equalled
`unlocksAtStart`. The WOKE toast fired — that comes from the receipts, which
read the run's own state — so the screen said a shrine had woken and then
summarised the run as having changed nothing. It reads the live copy now.

**Thirteen, and this one came out of a SCREENSHOT rather than a grep** —
which is the whole argument for the axis. `audit-shots/*/worlds-many.png` shows
a three-hundred-run world reading **`FINDS 6/5`**. The atlas counted find HEXES
claimed against `PERKS.length`, the size of the perk POOL: two different things
wearing one slash. A find grants a perk only while the shelf has room, so the
sixth find hex a veteran claims pushes the numerator past its own denominator,
and a player cannot tell a bug in the game from a bug in arithmetic. The
denominator settles which number belongs on top — the row asks how much of the
hunt is done, so it is the SHELF, which is also the fraction Marc quoted when
finds were paying nothing at all: _"in the end screen I still see 0/5."_ It is
reachable in ordinary play, and no grep would ever have found it: both
expressions had consumers, and both were correct on their own.

**Fourteen, and it is twelve saying the opposite thing.** The same end-screen
list, on the FIRST run of a page. `perksAtStart` and `unlocksAtStart` were set
by every door into a run except the one the page opens on — BEGIN on the front
door, and `?end=1` before React has mounted at all — so that run measured its
gains against empty lists and told a returning player they had just woken every
shrine and found every perk their world already held. Invisible on a fresh
device, where empty IS the right answer, which is exactly how it survived; and
found, again, in `end-many` rather than in the code — five WOKE lines and five A
FIND lines on a run that gained nothing, in all four directions. The three refs
are one lazily-initialised object now, which is also the shape `react-hooks/refs`
allows during a render, and `e2e/world.spec.ts` asserts the block is ABSENT —
its absence being the whole claim.

**CAMPS — the last piece of world memory to cross.** `newRun`'s `wakeAt` was
hard-wired `null` in `store.ts`'s `open`, because the fifth shrine gates a BEGIN
AT CAMP button this body never built, so the last rung of the ladder woke a door
onto nothing. `campFor` carries Ashwake 1's conditions verbatim — the CAMP
shrine woken, at least one territory held, wake at the FARTHEST of them (Marc's
anchor, _"every camp restarts the climb"_) — the WORLDS panel has the button,
and `?camp=1` is read at boot, which closes the last field of `parseRoute` that
nothing looked at. The engine had carried the rest since the rules were lifted:
`homeOf` anchors reach at the wake hex, so a camp run's climb is measured from
where it woke and REACH 20 cannot be minted by waking at ring 20 and placing one
tile.

**Two smaller ones, both found by reading rather than by running.** RESET
TEACHING handed back `EMPTY_PROGRESS` — the whole ledger, the relic purse and
every shop level with it. A control labelled "RÉINITIALISER LES LEÇONS" that
silently spends a world's savings does more than it says, and the part it does
not say is unrecoverable. And a DETOUR or a DAILY could grant a perk, which
Ashwake 1 guards in `findLabel`: a perk lives on the world it was found in, so a
run with no world was handing out perks with nowhere to be written.

**The purse's spend rows are tested** (`screens/purse.test.tsx`), which
`NEXT.md` §3 has asked for since it was written — and tested in the shape that
matters: each row actually clicked, then its action put through `reduce` and a
NUMBER checked, because a spend that returns the same state is what the reducer
does with an action it REFUSES and that is indistinguishable from a working
button.

**The router is DECIDED and not ported** (`DECISIONS.md` D9). Ashwake 1's
router routes RUNS, not panels, and its `popstate` rebuilds the session from the
URL — right for a shell whose screens are imperative DOM and wrong here, where
it would introduce a second authority on what is on screen. Two of the three
things it buys are already delivered: every link the game hands out opens at
boot, and SHARE rather than the address bar is the distribution mechanism. The
third — BACK on an open panel — is real, and needs one history entry per open
dialog owned by `ui/dialog.tsx`, not a URL→scene table. Filed rather than built:
the freeze before Session A is on the first minute, and a new global gesture
wants its own question.

**Nothing that changes the first minute shipped.** The fixtures are behind a
query, camps are behind the fifth shrine, and the two paid rewards are numbers
a player only reaches after a run.

**Verified:** 1059 tests / 74 files, 68 Playwright, `pnpm sim` byte-identical,
typecheck/lint/format/build clean, `pnpm audit:screens` regenerated across
twenty-three screens × four directions.

### Session 22 — the game stops interrupting itself, and the prose stops sounding written by a machine (2026-08-30)

**Question:** Marc played it and named six things at once — the pop card, the
tile card, the view buttons, the header, the manual's double-explained
destinations, and the writing. Is there a single fault under them, and does
fixing it find more?

**Answer: yes, and the fault is SAYING A THING TWICE.** Every one of the six is
a place where the game states something once and then states it again in a
second, worse way. The pop card said the accounting a second, third and
fortieth time at full modal weight. The manual named the five destinations and
then explained four of them, one screen apart. The prose set a colon, a full
stop, a comma and a separator with one character. The header laid six numbers
out and then folded them onto a second row when they grew a digit. And FIT and
FLAT each had their own idea of where the board was.

**THE POP CARD IS BRIEF AFTER THE FIRST** (`ui/Card.tsx`). Marc: _"after the
first pop, we don't need to have the pop card appear, we can keep it briefly
but easy to tap out."_ The first pop still holds the screen — it teaches the
one rule that reshapes the board — and every pop after is the same card with
every claim on the player dropped: no focus taken, no focus trapped, any tap
anywhere sends it away, and it leaves on its own after 4.2 seconds over a scrim
you can see the board through. It stays a CARD rather than falling back to the
toast, because the toast is the strip the eye is not on while the cascade
plays, which is the finding that made pops cards in the first place. Both
halves are pinned in `board.spec.ts`, as a pair, because either one alone is
the old bug pointing the other way.

**And the tap that sends it away still LANDS.** The obvious build puts the
dismiss on the scrim, which means the scrim has to catch pointer events, which
means the first tap after every pop is EATEN — a player popping steadily loses
a placement's worth of tapping to a card they were not reading. The scrim
passes pointers through and the dismissal rides a document-level
`pointerdown`, so tapping the board puts a tile down AND clears the card in
one press. That is what "easy to tap out" has to mean on a board you are still
playing.

**THE CARD IN YOUR HAND IS THE TILE** (`ui/Tile.tsx`, `shell/art.ts`). Marc:
_"I also liked the tile card we had having the tile itself."_ Ashwake 1 put the
baked hex on the card — the very PNG the board composites into the ground it
draws — so what you hold and what it becomes are one picture. This body drew a
rounded rectangle in the terrain fill. The art is asked for through the
manifest the board already fetches, the ground goes to the panel colour so the
hex has a SHAPE, and the outline is Ashwake 1's two-pass alpha shadow in
`--ink-faint`, carried over for the reason it was written: a terrain hex on the
panel can run under 2:1 and a card read every turn cannot be a shape you hunt
for. Null art stays the ordinary state and the card draws itself.

**FIT STOPS SHRINKING BEFORE THE BOARD STOPS BEING READABLE, AND FLAT
RE-FRAMES** (`board/camera.ts`, `board/Board.tsx`). Marc: _"when pressing FLAT,
FIT, etc. make sure we recenter the map not too zoomed out."_ Two bugs under
one sentence. FIT flew to zoom 1, and zoom 1 is by definition whatever it takes
to get every hex on screen, so on a board fifteen rings across the button that
hands the board back was the button that made it unreadable — and it got worse
the longer a run ran. It stops at `FIT_HEX_PX_MIN` now, and once it is CROPPING
rather than shrinking it centres on the frontier — live tiles, unclaimed
destinations and the legal edge — because the middle of a grown board is mostly
stone already spent. FLAT and DEFAULT only ever set an ANGLE, and changing the
angle changes where every hex lands on screen, so a camera left where it was
was looking at a place that had moved; they bump a tick the rig re-frames on. A
gesture that leans the board deliberately does NOT, because a camera that
re-centres under a thumb mid-drag is the board fighting the hand.

**THE HEADER IS ONE ROW, ON EVERY SCREEN THERE IS** (`ui.css`). It was a
wrapping flex row of content-sized cards, which fails at both ends of the range
in opposite ways: six stats do not fit across a narrow phone, so the row wrapped
— a second band of chrome taken out of the board, appearing and disappearing as
the numbers grew digits, so the board resized because the score went from 99 to
100 — while on a desktop the same six huddled in the top-left corner of a wide
screen. One grid track per stat, `minmax(0, 7rem)`, centred: it fits a 320px
phone by getting narrower rather than by folding, and it sits in the middle of a
wide one. `board.spec.ts` measures the TOP EDGES and fails if there are two.

**THE MANUAL SAYS EACH DESTINATION ONCE** (`screens/Legend.tsx`,
`screens/Manual.tsx`). Marc: _"in how to play, we have the destinations
enumerated, then later on explanations, make sure all is one."_ The PLAY tab
opened with a legend naming the five places and then, a thumb's length below,
printed a section for four of them saying what they do: the same five things
twice, in one tab, in a different order, each pass carrying half the answer —
the list had the marks and no rules, the sections had the rules and no marks.
A legend row now carries the mark, the name and the lesson's own definition,
and the sections are gone. **Nothing was rewritten to do it**: `lessonDefine`
is the very function those sections were printing. STONE moved the same way,
and its hand-shortened copy of the STONE lesson (`ui.legendStone`) is deleted.
The sections that remain wear their lesson's glyph, so a rule about a thing you
can see is findable by that thing.

**A FIND IS A DESTINATION, AND NOW HAS A LESSON.** `LESSON_FOR_REWARD` pointed
`find` at RELICS, on the argument that what a find gives you is a perk and
RELICS is where the game explains what you carry out of a run. True of the
reward and wrong about the question: the legend printed a row reading "◈
RELICS", and tapping a find on the board opened a card about the end-screen
currency rather than about the thing under the thumb.

**NO EM DASH ANYWHERE A PLAYER CAN READ** (`text/en.ts`, `text/fr-CA.ts`,
`text.test.ts`, and six components). Marc: _"review help and text content so
it's not AI-like (no em dashes, etc.), be concise and simple in all content."_
It was the punctuation of 249 sentences across the two catalogues, doing the
work of four different marks at once with no way for a reader to tell which. A
colon introduces, a full stop separates, a comma joins, `·` divides the parts
of a label. Both languages, because the French had it in exactly the same
places: it was written beside the English, sentence for sentence. **The facts
did not move** — every number, name and condition is the one that was there —
and the two pin snapshots were re-recorded deliberately in this commit, which
is what `CLAUDE.md` asks for. The rule is a test now, so it cannot come back.

**THEN THE SWEEP, and it found four more of this body's signature miss.**

**Ten. The `card` weight had no reader at all.** `view/lessons.ts` models a
lesson as sentences with WEIGHTS, and `card` exists for one stated reason: a
teaching card fires at FIRST CONTACT, where the manual has four other sections
to lean on, so RIPE's card must say what to do next because the player meeting
it has not read POP and may never open the manual. Four such sentences are
written, translated, given a weight, and pinned by `teaching.pin.test.ts` —
and **every door in this body printed `lessonDefine`, which is `core` + `more`**.
`lessonCardText`, the only function that read them, had no caller. So the
sentences written for the moment a stranger meets a rule reached nobody.
`lessonCardDefine` replaces it, `LessonCard` takes a `firstContact` flag (a
card the game FIRES gets them; a term card a player OPENS by tapping a word
they already know does not), and `lessons.test.ts` now asserts the sentence is
in one and out of the other, in both languages at every dial setting.

**Eleven. The pop card's heading was parsed as if its first word were a mark.**
`SaidCard` split the lead line on whitespace and called the first token a
glyph, which is right for a CLAIM — `receipts.ts` prefixes the mark itself, so
the words and the thing that paid are one object — and wrong for everything
else. A pop's lead is "POPPED 5, total worth 12", so "POPPED" was drawn in the
1.3em glyph face and "5, total worth 12" was the heading; the first pop of a
device read "YOUR" over "FIRST POP". On the two cards a player sees most, and
on the very first one they ever see. The registries are the authority now: a
first token is a glyph only when it is one.

**Twelve. The purse toggle drew a second symbol for luck.** `CONCEPT_MARK.luck`
is ✤ and exists because luck follows a player between the board, the purse, the
shop and the end screen. The stat row was fixed on 2026-08-29 with a comment
saying it was "the one place that did not" — and the action bar's purse button,
which is the door to the purse and the most-seen luck on the screen, was
drawing ♦ the whole time. A claim about being the last one is a claim worth
grepping before writing down.

**Thirteen. The audit had eighty-odd pictures of this game and none of the page
that teaches it.** `manual` opens on the MENU tab, which is three buttons, so
every rule, every figure and the whole legend — the longest prose in the build,
and the place a clipped line would actually happen — had never been
photographed. `manual-play` and `manual-expedition` are screens now.

**Three dead exports removed rather than left to be found again**:
`isLegacyKey` and its `LEGACY_PREFIX` (the backup bridge detects Ashwake 1 by
what `migrateLegacy` recovers, not by prefix), and `lessonCardText`. The shed
ladder clears the last error through `clearLastError` rather than dropping the
key a second way.

**Fourteen. The purse's own card had no caller.** `purseLesson` builds LUCK IS
FOR SPENDING from the live tuning: the use-it-or-lose-it sentence, then one row
per button the drawer offers, each quoting its own button face and its own
price. Marc asked for it twice in Ashwake 1 — _"first luck drawer expand we
should explain all actions"_, then again because the first answer did not land.
In this body `purse` sits in the teaching ledger AND in the CARDS set,
`isTrue('purse')` returns false **by design** because the OPEN is the moment,
and `onPurse` marked the lesson TOLD without ever showing it. So the drip's
most expensive card spent its own ledger entry to say nothing, and the ledger
entry is what hid it: a device that had opened the purse once looked, to every
later check, exactly like a device that had been taught. **A moment that is
always false is only honest while something else owns the moment.**

**And then the two ledger items that were a deletion rather than a debt, taken
at their word.** `meta/route.ts`'s `searchFor` is gone: it built the query a
`Route` answers to, nothing in this game builds a link that way, and its only
tests were round-trips against itself. `HOME` stays — it is what "no query at
all" IS. And **BACK on an open panel is built** rather than filed. It was the
one real gesture inside the router D9 ruled out, and it turned out to be one
file: one history entry per open dialog, **carrying no URL change at all**, so
the address bar never becomes a second authority on what is on screen and a
shared `?seed=` survives untouched. Three rules keep it safe, and each one is a
way it goes wrong — every history call in an event handler and never in an
effect (StrictMode runs those twice, and a doubled `pushState` is a back button
that needs pressing twice); a panel closed from the UI gives its entry back, or
leaving the page costs one press per panel ever opened; and the stack owns
nothing while nothing is open, so a `popstate` with no entry of ours is
somebody leaving and is left alone. On Android, BACK with the manual open used
to leave the site — the worst thing this game does to a stranger who opens the
rules.

**Fifteen. The catalogue promised a button that did not exist.** `ui.sound`'s
own note reads, in both languages, _"the ♪ button on the board is this
switch"_ — and there was no such button. Ashwake 1 has carried it by the camera
since 2026-08-20, on Marc's launch call (_"a way to toggle on/off easily"_);
this body kept the sentence and dropped the control, so sound lived only in
SETTINGS, three taps and a panel away, which is not where anybody mutes a game
in a quiet room. It is back, and it is the SAME WIRE as the settings switch —
one flag, written once, read by both, because two surfaces for one setting is
how they come to disagree. The tap that turns sound on is also the user gesture
every browser wants before audio may exist, spent on one note that confirms
itself; turning it off gives the context back rather than muting it.

**And the two doors nothing could address.** The manual's MENU tab is the only
way from a live board into SETTINGS or MORE, and its two buttons were the only
doors in the game with no `data-go` — so nothing had ever walked that path, in
any test, which is why the missing ♪ survived a matrix that lists it. **A
control a test cannot address is a control no test addresses.**

**Sixteen, and it was the em-dash rule catching itself.** The pass above was
verified against the source and the catalogues, and then the DEPLOYED bundle
was grepped — and it still held five player-facing em dashes the test could not
see, because `text.test.ts` walks `STRINGS_EN` and `STRINGS_FR` and neither of
these lives there:

- **A DIRECTION's own name and note.** `Torchlit — Lamps Lit`, and two notes
  the APPEARANCE picker prints in full, in both languages. They are deliberately
  not in `text/` — a direction carries its own fiction — so they were outside
  the only thing looking.
- **A sentence ASSEMBLED outside `text/`.** `groundHead` hard-coded `—`
  between a ground's name and its power, so every colour card in the game read
  "MARKET — company." in both languages **while both catalogues were clean**.
  It is the same D4 argument `powerHead` makes two functions below it about
  its own colon, in the same file, already resolved once: the separator is a
  fact about a LANGUAGE. The catalogue owns it now and `groundHead` keeps only
  the rule (say the name once where a direction named its ground for its
  power).

Both are pinned, and pinned where the layering allows: the directions in
`text.test.ts`, the composed sentence in `view/view.test.ts`, because `text/`
may not import `view/` and that lint is right. **A test written against one
source is a rule that holds in one source** — and the only reason this was
found is that the live bundle was read rather than the code that made it.

The five dashes left in the build are `theme/assets.ts`'s slot notes, which
describe art slots to a baker and reach no player: `ASSET_SLOTS` has no
consumer in the app at all.

**Nothing here changes a rule.** `pnpm sim` is byte-identical to
`sim.golden.txt` and the freeze before Session A holds in the sense that
matters: the first minute is the same game, told better.

**Verified:** 1063 tests / 74 files, 76 Playwright, `pnpm sim` byte-identical,
typecheck/lint/format/build clean, `pnpm audit:screens` regenerated across
twenty-five screens × four directions.

### Session 23 — the marks stop being a request and become a shape (2026-08-30)

**Question:** Marc, after playing it: _"no emojis only phosphor icons or
assets."_ Is that a coat of paint, or is a character-as-mark a defect?

**Answer: a defect, and the swap found three more.** A character is a REQUEST
for a shape. What answers it is the font stack — different by platform, by
browser, by which faces a phone has, and by whether the glyph exists at all —
and this game had staked three surfaces on that lottery without ever saying so.
The board drew `✚ ★ ◈ ❖ ✦ ▦` as troika text in `cinzel.ttf`, **a face this
project self-hosts for a wordmark**, which carries those glyphs by luck; a
subset pass or a font swap would have emptied the board's alphabet silently and
nothing would have failed. The manual's figures asked the same of
`--font-display`. The chrome asked it of whatever the system serif resolved to,
which is exactly how `♦` could stand in for `✤` on two different screens and
look plausible on both.

**THE SHAPE OF THE RULING** (`DECISIONS.md` D10). The vocabulary does not move:
the same four registries, the same members, the same no-collision rule, the same
exemption for the chrome and the same ban on the plane ever wearing one of its
marks. `tokens.test.ts`'s one-symbol-language test did not have to change to
follow them, which is the argument for this being a change of CURRENCY rather
than of language. Only the currency moves, from a codepoint to a NAME:

- `theme/icons.ts` names them. The core says what a thing MEANS; an SVG path is
  a fact about how it is DRAWN, and the layering lint exists to keep those out.
- `scripts/phosphor.ts` vendors the twenty-three paths this game draws from
  `@phosphor-icons/core` (MIT, a devDependency) into one generated, committed
  file — 8KB. The package is 1512 icons per weight, and importing it at runtime
  would ship all of them or lean on tree-shaking to undo a decision we can
  simply not make. Same shape as the terrain baker: the recipe beside the loaf.
- `ui/Icon.tsx` draws them in the chrome, in `em` and `currentColor`, so every
  call site keeps the rule its span already had.
- `board/marks.ts` draws them on the BOARD — a `Path2D` painted into a texture
  and laid on the hex — so the board and the manual draw one shape from one
  file rather than two fonts' opinions of one codepoint.

**WEIGHT is part of the decision** and lives beside the names (`ICON_SOURCE`):
FILL for the game's own vocabulary, because those marks are read at 16px on a
card and at hex size on a leaning board and a hairline survives neither — the
lesson the heavy `✚` was picked for on 2026-08-26. BOLD for the chrome, where
an outline is clearer at button size.

**WHAT IT FORCED.** A mark used to be composed INTO catalogue sentences —
`${LANDMARK_GLYPH.cache} CACHE: build a tile…` — and split back out of a
receipt by whitespace. **An icon cannot live in a string**, so the mark rides
BESIDE the words: `Receipt` and `Said` carry an icon name, `SaidCard` renders
it, and the whole split is deleted. That took the "first word drawn as a mark"
bug with it — the one patched a day earlier by checking the token against the
registries — because there is no longer anything to parse. Eighteen catalogue
strings got shorter and none of them lost a fact.

**AND WHAT IT FOUND, which is the argument for doing it properly.**

**Seventeen. The manual promised a star the board has never drawn.** `s.rareStar`,
the `rare` figure and `ui.legendRare` all say a placed rare "wears a star" —
Ashwake 1's 2D board did. **This one never has**: `board/rings.ts` gives a rare
tile a RING in its rarity's own colour and `board/relief.ts` stands it taller.
Five stages of a claim about something you can SEE, wrong in both languages,
found only because replacing a mark means finding out what draws it. The figure
draws rings now, and the sentence says ring and height.

**Eighteen. `↗` and `$` were the last two characters on the busiest row in the
game**, and `theme/tokens.ts` had already ruled against them in as many words:
marks are for cross-screen CONCEPTS and stats stay words. They are REACH and
COST now, which the new grid has room for; LUCK stays a mark because luck is
one of the seven ideas the registry names.

**Nineteen. A `▾` lived in a CSS `content`**, where no test in this repository
could see it — the fold's caret. A pseudo-element cannot hold an SVG, which is
the whole reason it was a character. It is an element now.

**Two exemptions, both stated so nobody re-argues them.** The arc sparkline
stays block-drawing characters (`▁▂▃▄▅▆▇█`): it is pasted into a chat, where an
icon cannot go. And a ground's FIELD keeps saying its colour with a TEXTURE
rather than a mark — a different channel, retired as a shape by Marc on
2026-08-18.

**Three tests, at three levels, because one of these hid at each.**
`tokens.test.ts` holds the registries (no two meanings share a mark, the chrome
and the plane never share one, every name is vendored and every vendored name is
drawn). `text.test.ts` holds the catalogues: **no mark is ever spelled into a
sentence**, which is the rule that keeps them beside the words. And
`e2e/menus.spec.ts` reads the RENDERED text of every screen the game has,
including `aria-label`s, and fails on any character from the retired
vocabulary — because `♦` and `▾` both got in below the level the other two
watch.

**Verified:** 1066 tests / 74 files, 77 Playwright, `pnpm sim` byte-identical,
typecheck/lint/format/build clean, `pnpm bake` runs end to end and
`icons.gen.ts` is formatted by the project's own Prettier so a re-bake leaves
the tree clean. `pnpm audit:screens` regenerated: 156 findings, down from 162,
the six being the characters that are words now.

### Session 24 — the manual stops drawing its own pictures (2026-08-30)

**Question:** Marc: _"in how to play we reuse the same visuals as in game for
all"_, and _"make sure all indentation is good"_. How much of the manual was a
second-hand copy of something the game already draws?

**Answer: all four of its picture kinds, and it had been written down.** This
file's own `Figure` docblock has said since Stage 3 that Ashwake 1 drew its
figures from the BAKED tile art and that this one would "when the asset book
reaches the chrome" — which happened on 2026-08-30, for the hand's cards, and
the figures were not revisited. So the manual drew:

- a GROUND as a rounded square of `theme.terrain[c].fill`, beside a board that
  draws a textured hex;
- an EDGE as a square with a border, beside a board that draws a ring;
- a FIGURE's hexes as flat polygons, beside the same;
- and the STASH figure's cards as hand-rolled spans, beside a hand that draws a
  baked hex with its mark and its name on it — **two pictures of one thing, and
  the one in the manual was the one nobody had looked at since the hand was
  rebuilt.**

**Every one of them is the game's own picture now.** `useGroundArt` extends the
hand's art hook to all six grounds (the four terrains plus STONE and WALL,
which the legend names and the board draws). `GroundSwatch` draws a hex from
the same `corners()` the board and the figures use, at the direction's own
facing, clipped over the very PNG the board composites. `Figure` fills each hex
the same way and falls back to the flat fill where a direction has none baked.
`FigureCards` renders `Tile` — the hand's own component — so the card in the
lesson is the card under your thumb, dashed HOLD slot included.

**The pin is IDENTITY rather than resemblance** (`e2e/menus.spec.ts`): every
file the hand's cards point at must be a file the legend's swatches point at.
Anything weaker passes while the two drift, which is exactly what happened.

**A card with nothing to do stopped being a button.** `Tile` is a `<button>`,
and the manual's rule since 2026-08-29 is that nothing in it is tappable — so
the figure's cards were three tab stops that did nothing on the one screen that
forbids them. No `onPick` means no button: same class, same CSS, a picture with
a name.

**And two things fell out of looking.**

**Twenty. `Tile` carried `flex: 1 1 0` as an INLINE style, where it did
nothing.** `.hand` is a grid and a grid item ignores flex; the declaration only
ever took effect in the manual's new figure — a flex row — where it made the two
real cards grow while the dashed slot beside them stayed put. An inline style
also beats every rule a stylesheet can write, so the figure could not correct
it. Removed rather than moved: nothing needs it.

**Twenty-one. MAGIC and UNIQUE drew the same figure twice, a paragraph apart.**
They share it by design — `lessons.ts` gives them the same shared sentence for
the same reason, and the caption reads "magic, then unique", so it is one
picture about a PAIR. A figure is claimed by the first lesson on a tab that
carries it now; the rest read under the picture already above them. Tracked in
the manual rather than in the registry, because it is a fact about a PAGE: a
teaching card shows the same figure and should.

**INDENTATION, and it was two faults.** Half the lessons carry a mark and half
do not, so POCKET began at the margin and BOUNTY an icon's width in, down a
page of sections meant to read as one list. And a marked heading was indented
past its own body text, which reads as an accident rather than as a hang. Both
are one rule now: a section reserves a mark column whether or not it fills it,
HANGS the mark in it, and indents everything else behind — so the marks make a
column down the page and every word in a section shares one left edge. Pinned
by measuring the left edge of every heading, paragraph and caption on a tab and
asserting there is exactly one.

**Verified:** 1066 tests / 74 files, 78 Playwright, `pnpm sim` byte-identical,
typecheck/lint/format/build clean, `pnpm audit:screens` regenerated across
twenty-six screens × four directions — the manual's HAND tab is photographed
now too, which is how the duplicated figure was seen at all.

### Session 25 — a card stops being a box with a tile in it (2026-08-30)

**Question:** Marc: _"make sure unselected card tiles blend in with the game,
no border, only the selected one."_ The border was carrying RARITY. What
carries it instead?

**Answer: the same thing the board uses — a ring on the hex.** Every card sat
in a bordered, panel-coloured rectangle with a hex inside it, so the hand read
as a row of BOXES rather than a row of tiles: three frames competing with the
three pictures they held, on the strip of screen the board is fighting for.
Taking the border away frees it, and rarity is exactly the thing that had been
sitting on it — magic violet, unique orange, drawn as a rounded rectangle
around a hexagon.

`board/rings.ts` has always drawn rarity as a ring around the hex itself, at
`edgeWidth * 2.5` in hex radii. So the card wears one too, at that width read
off the DIRECTION rather than eyeballed in pixels — a card's ring is now the
ring the board would draw round the same tile, in whichever direction.

**Which needed one hex drawing, and there were three.** The chrome drew a
ground as a rounded SQUARE in the legend, a flat polygon in the figures, and an
`<img>` in the hand — and an `<img>` cannot carry a ring. `ui/Hex` is the one
drawing now: `corners()` from `render/layout.ts` at the direction's own facing,
the flat fill under the baked art, and an optional ring. The legend asks it for
its swatches, the hand asks it for its cards, and the figures use the same
geometry and the same art in one shared SVG (a grid of hexes cannot be a grid
of separate SVGs).

**The box is transparent, not absent.** It still occupies its two pixels, so
choosing a card cannot reflow the row under a reaching thumb — and the chosen
one takes the INK, which `contrast.test.ts` grades against every terrain fill
and against the panel, so it reads wherever the card stands and can never be
mistaken for a rarity. That confusion is the one Marc reported on 2026-08-29,
when three channels were all speaking in hue.

**Twenty-two, and it was mine from an hour earlier.** Replacing the card's
`style` block took the FLEX layout with it — `display: flex`, the column, the
label face — because those had been written inline. For one build the card fell
back to inline flow: the mark sat BESIDE the name, wrapping only on the cards
too narrow to hold both, so a hand read as two different layouts at once.
Caught in a screenshot. They are CSS now, where they belonged: an inline style
beats every rule a stylesheet can write, which is the same property that made
`flex: 1 1 0` undefeatable in the manual's figure yesterday.

**Pinned by the thing that was wrong**: the computed border colour of every
card in the hand, asserting exactly one is inked — and polled rather than read
once, because `border-color` transitions over `--fade` and a single read
catches two boxes mid-crossfade.

**Verified:** 1066 tests / 74 files, 78 Playwright, `pnpm sim` byte-identical,
typecheck/lint/format/build clean, `pnpm audit:screens` regenerated across
twenty-six screens × four directions.

### Session 26 — the menus stop losing each other, and the board gets its height back (2026-08-30)

**Question:** two asks in one session. Marc: _"make sure all menus and
overlapped menus on top are all navigable and backable and make sense
(especially for More)"_, and then _"make sure our new hand tiles match
correctly on mobile and desktop, same with luck and any number of tiles in
hands. be thorough in ui/ux so we DON'T lose any height space and have maximum
map."_

**Answer to the first: two faults, both only reachable three panels deep.**

**Twenty-three. A door onto a panel already in the stack did NOTHING.**
`push` returned early when the id was open, so the board → `?` → MENU → MORE →
HOW TO PLAY path left MORE on top and the button the player had just pressed
appeared dead. "Open X" means "X is on top", so it RAISES now, with no history
entry added — the stack already owns one for that panel and BACK still pops one
layer.

**Twenty-four. A scene change closed panels BY NAME, and the list had already
missed four.** Four call sites ran `worlds.hide(); more.hide()`, which is
exactly Ashwake 1's `resetShell()` — the hand-maintained list `ui/dialog.tsx`'s
own docblock holds up as the thing React made unnecessary, noting that "the
list had already missed three". Stepping into another world from three panels
deep left the MANUAL standing over the new world's board; RESTART from the
manual's MENU tab left MORE standing over a run that had just been thrown away.
Every scene change calls `closeAll` now, which also hands the whole run of
history entries back in ONE `go(-n)` — two `hide()` calls are two
`history.back()`s a browser is free to coalesce.

**Answer to the second: 37px of board on a four-card hand, and 111px on a
six-card one.** Measured, at three viewport sizes, before and after:

|                   | before | after   |
| ----------------- | ------ | ------- |
| 390×844, 4 cards  | 647    | **684** |
| 390×844, 6 cards  | 573    | **684** |
| 320×568, 6 cards  | 297    | **406** |
| 1280×800, 6 cards | 539    | **632** |

**THE HAND IS ONE ROW, whatever the count.** It wrapped at six (`3 × 2`), and
six is the ordinary hand of any world that has woken two shrines — so most of a
device's life was played against a two-row hand costing 60px of board. The wrap
was bought for one thing and it was the right worry in 2026-08-27: six across
is 58px a card, "too narrow for the ground's NAME". Two of the three channels a
card speaks on have changed since: it is a baked HEX now with a Phosphor icon
on it, so the picture carries the colour at any width, and the name scales with
its own column (`calc(100vw / var(--hand-cols) / 7)`) instead of deciding the
layout. **Six is the real maximum** — `draftWidth` 3 +1, `holdSlots` 1 +1, and
OPEN HAND deals 5 with no stash — which is what makes one row safe, and
`hand.test.ts` now pins the DIALS rather than the layout: if a future unlock
could deal a seventh card, one row stops clearing the 44px tap floor on a 320px
phone and the test says so before a hand does.

**THE CONTROLS ARE ONE CENTRED MEASURE.** Stretched across a 1280px desktop,
four cards came out 312px wide and 54px tall — a hand of letterboxes — and the
purse drawer spanned the whole screen while the hand it belongs to did not,
because it opens ABOVE the bar and is a sibling of `.controls` rather than a
child. The hand, the action bar and the drawer share one 34rem measure now, so
they line up as a block on every screen and a phone is simply the case where
that measure is the whole width.

**THE TOAST STOPPED PAYING RENT.** It is a live region, so it has to be in the
document before its text changes — which had been read as "in the layout", and
cost a permanent 22px band above the hand, empty most of the time, on every
screen. Being in the DOCUMENT and being in the LAYOUT are different things: it
is absolutely positioned over the board's bottom edge now, still present, still
announced, and `:empty` when it has nothing to say. It sits clear of the camera
cluster, which the first build did not — the buttons punched holes through the
sentence.

**And the action bar stopped growing a second line.** A crowded bar — POP, POP
for points, TAKE, SACRIFICE and the purse, an ordinary late run — squeezed its
buttons until their VALUES wrapped: 65px measured where an uncrowded bar is 44.
Twenty-one pixels of board spent on a line break. Both lines hold their line and
give font size instead, which is what a reader loses least by.

**Twenty-five, found on the way past.** `→` in the purse's SACRIFICE row was the
last symbol character left in the chrome after D10 took the rest — and it was a
sentence assembled outside `text/`, which D4 forbids for the same reason the
em-dash pass found `groundHead`: "becomes" is a word, and which word it is
belongs to a language.

**Verified:** 1064 tests / 74 files, 79 Playwright, `pnpm sim` byte-identical,
typecheck/lint/format/build clean, `pnpm audit:screens` regenerated across
twenty-six screens × four directions.

### Session 27 — the panels stop hiding each other, and the board takes the corner back (2026-08-30)

**Question:** seven asks in one session, and the first one is the shape of the
rest. Marc: _"right now the more panel doesnt appear or is bugged when we
navigate further, check that again."_ Session 26 had answered _"make sure all
menus and overlapped menus on top are all navigable"_ and shipped a test that
walked the exact path and passed. **So the question is: why did the test agree
with a bug the player could see?**

**Answer: the test was measuring the STACK, and the bug was in the PAINT.**

**Twenty-six. Every panel had the same `z-index`, so the painter's order was
`App`'s source order.** Session 26 fixed which panel is on TOP OF THE STACK,
and nothing ever made the stack decide which panel is on top of the SCREEN. The
six panels are rendered from one fixed list — manual, settings, more, worlds,
shop, fame — so MORE, which sits late in it, painted over the manual and
SETTINGS: the two rooms MORE's own menu opens. Tap HOW TO PLAY inside MORE and
the manual opened, took focus, went top of the stack and took every subsequent
tap, **behind a MORE that was inert and fully opaque**. The screen did not
change. That is the whole of what Marc saw.

**And the test could not see it, for two reasons that both look like features.**
`waitFor({ state: 'visible' })` passes on a buried panel — every panel is
opaque and `position: fixed`, so a second one over it changes nothing
Playwright's visibility check looks at. And `elementFromPoint`, which the
three-deep test used and which reported `'manual'` throughout, **skips
`inert` subtrees when hit-testing** — so the one attribute that made the bug
invisible to a player made it invisible to the test. Both specs now read the
stacking rule itself: higher z-index wins, ties go to the later sibling.
`Panel` sets `--layer` from `stack.layerOf(id)` and `.panel` is
`calc(20 + var(--layer))`; six doors is the ceiling, so nothing reaches
`.card-scrim` at 30.

**The board's corner is MENU · LUCK · VIEW.** Marc: _"make sure sound on or off
and how to play stays in the menu, add a menu button instead"_, and _"put the
luck button next to the FIT button, as a new button ... luck button is another
colour more like an action one, but not in hand."_ The ♪ and the `?` were two
buttons for two rooms MORE already lists, floating over the thing this whole
layout spends its comments defending; they are one door now. LUCK came UP out
of the action bar — it was the only control in that row that did not spend the
current pocket, in a row that gets crowded — and it wears `--accent`, the one
signature colour, which is the ration `theme/tokens.ts` asks for.
`feature['ui.sound']`'s note said "the speaker button on the board is this
switch" in both languages and now does not, because a sentence that names a
control has to be re-read when the control moves.

**Twenty-seven. A rare card was TALLER than a common one, so the board resized
mid-run.** Marc: _"the height changes when we get magic tiles vs normal or
uniques, check why and make sure it stays the same."_ The rarity word and the
HELD label were ordinary flex children of a card with a `min-height`, and the
hand is a GRID — so one magic card in a four-card draft grew the whole row and
took that many pixels off the board Session 26 had just spent a session buying
back. Worse than the cost: it moved every time a rare was dealt, stashed or
spent, which is the board breathing under a reaching thumb, and is the same
class of fault as the placement re-fit Marc reported on 2026-08-29. Both labels
are badges now, out of flow, and the card's height is fixed.

**A POP stopped being a card at all.** Marc: _"i asked previously to not pop as
a card everytime, just show points in the bottom and we can tap for details or
tap out."_ Session 22 had answered the same ask with a BRIEF card — no focus,
any tap dismisses, leaves on its own — and a brief card is still a card: it
darkens the board, lands in the middle of the screen, and has to be waited out,
several times a minute. A routine pop is the receipt's own lead line in the
strip over the board's bottom edge, and the rest is one tap behind it. The lead
is `view/receipts.ts`'s first sentence, not a shorter one written in the
shell, so there is still exactly one place a pop is worded.

**THE GROUND YOU WALKED is a door, not a picture.** Marc: _"the ground you
walked 'picture' is ugly, i dont want a picture i want to actual screengame
where we can move around."_ He is right, and the picture was never what he
asked for in the first place — _"check it back again"_ is a verb, and it had
been answered with a 240px PNG blown up to 26rem. **The board never went
anywhere.** The R3F host lives once above every scene and never remounts, so at
the moment a run ends the real board is still mounted, still holding the cells
it ended on, still able to pan and pinch; it was covered by an opaque page. The
ending steps aside to a bar and hands the screen back. The snapshot is still
taken, for the hall of fame's diary rows, which is the one place a picture is
the right answer. Found on the way: the board was **not** `inert` under the
end screen, so a Tab reached a board nobody could see.

**Twenty-eight. A new world opened wherever the last one was left.** Marc:
_"make sure when we start a new world or daily its centered on the starting
tile."_ The rig fits the board ONCE EVER — `framedOnce` is a ref, and the rig
is inside the host that by rule never remounts, so the one thing guaranteeing a
first fit is the one thing a new world does not get. Step into world 2 from a
board dragged two screens east and world 2 opens two screens east of its
settlement, on an empty plane, with nothing on screen to say which way to walk.
That ref is right about what it was written for — a placement must not move the
board — and starting a run is an asking, not a happening. It flies to the wake
hex rather than to the FIT frame, because `fitCamera` frames the glowing
landmarks too and slid the settlement to the bottom of the screen: Marc asked
for a TILE in the middle, which is a hex and not a bounding box.

**Twenty-nine. The sticky panel head had no bottom edge.** Marc: _"top header
of menu is glitching when scrolling down a how to play section, its sticky but
content goes behind and we see it."_ It was doing exactly what a sticky header
does and looked broken: the manual's tab row is the last thing in the block and
carried no border, so a line of prose sliding under it was guillotined against
nothing — half a row of glyphs hanging in the air under PLAY. A border says
where the block ends and a short fade below it says what is happening at that
line; prose dissolving into a header reads as "there is more above", prose
sliced in half reads as a bug.

**One contrast finding, caught by the audit and fixed rather than waived.** The
LUCK button's open state filled with `--panel-edge`, which dropped daylight's
accent from 6.16:1 to **3.1:1** — under the 4.5 bar. Darken something, never
the threshold, and here the thing to change was the idea: an open drawer is
said with an OUTLINE, which is a mark at the 3:1 bar and changes nothing about
what the number is standing on. Back to 156 findings, the same as before.

**Verified:** 1064 tests / 74 files, 82 Playwright, `pnpm sim` byte-identical
to the golden, typecheck/lint/format/build clean, `pnpm audit:screens` at 156
findings across twenty-six screens × four directions. The two new e2e tests were
each run against the unfixed code first and each failed for its own reason.
**Still not seen on a phone.**

### Session 28 — the bottom of the screen gets sorted out (2026-08-30)

**Question:** three asks about the same strip of phone. Marc: _"add pop and
sacrifice as action buttons, tiles hand always footer but in finger zone,
accessible. menu could add a submenu for quick actions like sound in off etc
and then an option that goes to menu."_ Session 27 had just taken the ♪ and
the `?` off the board and noted the cost in `NEXT.md` §1 — mute went three
taps deep, which Ashwake 1 never allowed. **This is that note being answered
before it had been felt on a phone.**

**THE HAND IS THE FOOTER.** It sat above the action bar, so the row a player
touches most — every placement begins with picking a card up, and a run is
fifty of them — was furthest from the thumb, with four buttons pressed once a
pocket between it and the bottom of the phone. Swapped in SOURCE order rather
than with `order: -1`: Tab has to walk the screen the way an eye does, and a
CSS-only swap leaves a keyboard reaching the bar first while a finger reaches
the hand first, which is one screen with two orders.

**POP, TAKE and SACRIFICE ARE ACTIONS AND SAY SO.** They were drawn in exactly
the ink of the HOLD slot beside them, which does nothing at all until a card is
picked up. `theme/tokens.ts` rations the accent — "if everything is accent,
nothing is" — and this is that ration spent rather than broken: the board
carries three accented things and they are the same KIND of thing, the harvest
bar, the LUCK button that opens the purse, and NEW RUN. The VERB takes the
colour and the payment stays `--ink-dim`, which is the point of the two lines.

**MENU OPENS A SHORT LIST BEFORE IT OPENS A ROOM.** SOUND, HOW TO PLAY, MORE.
Sound is one tap from the board again and costs no button — it is a row in a
list that is not there until you ask for it, which is the difference between a
control and a control in the way. It switches IN PLACE and the list stays open,
because a menu that closes on a toggle is a menu you have to reopen to see
whether the toggle took.

**Thirty. The list shipped inside the board host for one build, and was
untappable.** Every row drew, and `.board-host` goes `inert` the moment
anything is on the stack — which now includes this. **That is the same shape as
the bug the previous session opened with**: a control that renders and cannot
be reached. Caught by a probe screenshot whose click timed out, not by
reasoning. Anything that survives its own opening has to be outside the thing
that opening makes inert.

**And it is a DRAWER, not a popover.** The obvious build hangs a menu off its
button; this one cannot, because the cluster sits at the bottom of the board
host and how far up the screen that is depends on how tall the hand is — which
a `position: fixed` box cannot know, and which a `fixed` box guessing at it
half-covered the cluster that opened it. A flex child of the shell IS that
line, and the purse drawer has been one since it was built. So the list opens
where the purse opens, at the same measure, and the cluster stays whole above
it. **The pattern was already in the file; the popover was inventing a second
one.**

It is a door on the dialog stack rather than a `useState`, and the reason is
Android: a floating box in local state is one BACK walks straight past, off the
site — the exact fault `ui/dialog.tsx` was extended to fix a day earlier. Its
two journeys RAISE a panel over the list rather than closing it first, because
two history calls in one handler is a `go(-1)` racing a `pushState` and the
panel's own entry is what loses; BACK from the manual landing back on the list
it was opened from is also simply correct. The scrim is transparent and its
only job is to be what a dismissing tap lands on — the board behind is
`inert` and would eat the tap silently, and the hand is a footer that would
take it and place a tile.

**Verified:** 1064 tests / 74 files, 82 Playwright, `pnpm sim` byte-identical,
typecheck/lint/format/build clean, `pnpm audit:screens` at 156 findings with
**no new rows** — the accent on the harvest bar is graded against the panel it
stands on. **Still not seen on a phone**, and the whole of this session is a
guess about a thumb.

### Session 29 — the corner splits in two (2026-08-30)

**Question:** Marc, looking at a board whose accent was in two places: _"the
accented button should be with the luck buttons, some populs with actions to
do, what yiu think?"_ — a question rather than an instruction, so the session
started by checking the two assumptions the current layout rested on. **Both
were wrong, and both were mine.**

**`singlePayout` is TRUE in the shipped tuning**, so POP FOR POINTS never
renders. The action bar is POP and SACRIFICE, occasionally TAKE — two buttons,
not four. `.act`'s comment about a crowded row squeezing to 65px was measured
when the purse still lived in that row AND points were a choice, and neither
had been true for a day. A comment that describes a layout it no longer
describes is worse than no comment: it was the main argument for hiding the bar.

**And the bar is not a standing cost.** `.action-bar` has no `min-height`, so
with no live pocket it collapses to zero and the board keeps the 44px. It takes
height only at the moment it is earning it. So "hide POP in a popup to get the
board back" was buying height that mostly is not spent, at the price of a tap on
the game's most-repeated verb and of the pocket's price — `+5 · 4 pts` is the
decision being made, not decoration. Marc, given the numbers, chose **no
drawer**, and: _"this, but menu move top right."_

**The rule that came out of it, and it is worth more than the layout: chrome
floats over the board, actions sit in the footer.**

- **LUCK came back down** into the action row, beside POP and SACRIFICE, at the
  far end because it is the one thing there priced in a different currency.
  Every accented control is now in one row, in the thumb zone, with room for
  its price. It spent exactly one day in the corner.
- **MENU went top-right**, out of the arc a thumb sweeps fifty times a run. A
  door pressed twice does not belong where a hand lives. Its own file now
  (`screens/Menu.tsx`) — it stopped being a camera control the moment it
  stopped being a `?`, and `Camera.tsx`'s docblock had become an argument
  about three unrelated things.
- **The camera is alone in the corner it is named for**, one button, which is
  what the file's own 2026-08-29 note asked for before four things moved in.

**Thirty-one. The MENU list opened a screen away from its button.** Moving the
button to the top left the drawer hanging off the bottom of the shell, where it
had been correct one commit earlier. It hangs off the TOP now — still a flex
child of the shell, still the purse's own trick, mirrored: the purse hangs up
off the controls, this hangs down off the stat row. It cannot be
`position: fixed` and hung off the button, because where the board starts and
stops depends on the stat row above it and the hand below it, and the hand's
height is a run's. Caught by a geometry assertion added for exactly this —
everything else about the list still passed.

Both e2e selectors for the button were `.camera .menu`. They are `[data-go]`
now: **a selector that names a POSITION breaks every time the layout is an
opinion, and this one has been an opinion four times in a day.**

**Verified:** 1064 tests / 74 files, 82 Playwright, `pnpm sim` byte-identical,
typecheck/lint/format/build clean, `pnpm audit:screens` at 156 findings with
**no new rows**. Measured at 320×568 with the row fully loaded — POP 55px,
SACRIFICE 111px, LUCK 53px in a 304px row, no horizontal scroll, every control
at 44px. **Still not seen on a phone.**

### Session 30 — POP and SACRIFICE become shapes, and the burn gets explained at last (2026-08-30)

**Question:** Marc: _"make sure tiles in hand have a lil bit more height, same
for pop and sacrifice. make em icons, associate in how to play and cards too.
consice and simple ui."_ The heights are arithmetic. The interesting half is
what "associate" turns out to require.

**Two marks, and the registry's own rule decided which.** `theme/icons.ts` says
a mark is for an idea that RECURS across screens, so POP and SACRIFICE qualify
— each is a button, a manual section and a receipt — and **TAKE does not**: one
button, only when a pocket earns a treasure, and a mark for a thing seen in one
place is vocabulary nobody has room to learn. A HAND TAKING and a FLAME, chosen
as the two silhouettes furthest from the twenty already in the set: there is no
other hand and no other fire here, and `site` is a star and `find` a sparkle,
which is why neither of these is a burst.

**Thirty-two. SACRIFICE had no lesson, in either language.** The button has been
on the board since Stage 3 and nothing anywhere said what pressing it does —
found only because a mark cannot be associated with words that do not exist.
`CLAUDE.md`'s standing rule is to grep for a consumer of every action a screen
can produce; this is that gap seen from the other end, an action with no
explanation. It has a section on the EXPEDITION tab now, directly under POP,
because the two are what one ripe pocket can become.

**And the lesson taught the registry two of its own rules on the way in.** The
first draft folded the payout into one sentence gated on `burnRelics > 0`, and
`lessons.test.ts` refused it: **a lesson may never go silent, whatever the
dials say**. So what the action IS is unconditional and what it PAYS is a
second beat a dial can remove — the same split `redAshMatches` and
`holdSlots` already use. Then the French draft listed SACRIFICE as a term of a
lesson whose sentences say SACRIFIER, and the registry refused that too: **a
term has to appear in its own lesson.** Both are tests that existed before this
session and both caught a real mistake on the first run.

**One mark, three places, and a test that says so.** The e2e compares the SVG
PATH rather than a class name — two different icons under one class would pass
a name check and be exactly the bug the no-collision rule exists to prevent.

**The heights.** The hand went 3.1rem → 3.4rem and the action bar's 44px floor
went to the same 3.4rem: the two rows are read as one block and were 54 and 44,
so the block had a step in it. Sixteen pixels of board, spent on purpose —
Marc: _"a lil bit more height"_, on the thing a run is fifty taps of.

**Verified:** 1064 tests / 74 files, 83 Playwright, `pnpm sim` byte-identical,
typecheck/lint/format/build clean, `pnpm audit:screens` at 156 findings with
**no new rows**. The pins were re-recorded deliberately and the diff is only the
new lesson in both languages plus `pop` gaining its mark — no existing sentence
moved. **Still not seen on a phone.**

### Session 31 — the fog comes back, and the board starts answering (2026-09-01)

**Question:** Marc, with two phone photos and five asks — the shrine unlock on
the end screen, the panel overflowing its top and wasting its bottom, tapping
anything on the map for information, highlightable biomes with a LENS OFF
button, and a daily stripped of everything that only pays a ledger. Four of the
five are small. The question is what the fifth one — _"discovered biomes should
be highlightable"_ — turns out to be sitting on.

**It was sitting on a rendering layer that has never been drawn.**
`createSession`'s `build()` passes `toBoardView` a literal `[]` where the
world's revealed ground goes, and has since Stage 2. So **the fog has not
existed in this body at all**: `Renderer`'s "the map you carry in your head,
which is the whole meta-progression", absent for four stages. Every rule about
it held perfectly over an empty list — the lens reached into memory, held
territories unfurled their fields in it, a reborn landmark wore its new face in
it, `describeHexOf` had four sentences for it. There was no it. A world thirty
runs deep opened as one tile in a black void; the audit shot said so and nobody
read it as a bug, because a dark plane is what this game looks like.

Eighth of this body's signature miss and by a distance the largest surface.
`RunMemory` carries `revealed` now, `memoryFor` fills it from the world, and
`restart` keeps it — one field, four stages late. Compare
`audit-shots/*/board-thirty.png` before and after; it is not subtle.

**Sixth and seventh, in the same neighbourhood.** `HexField`'s raycast refused
beacons and remembered ground outright, so the whole fog layer would have been
untappable even once drawn — and `App`'s `onTap` has carried a branch for the
fog since it was written, and `INTERACTIONS.md` has listed **tap a beacon** and
**tap remembered fog** as working in this body since the matrix existed. The
keyboard could reach the fog (`cursor.ts` walks it on purpose, and says so in a
comment); only the finger could not. And `describeHexOf` takes an `unlockLabel`
and a `crossingDowry` that `App` passed neither of, so every shrine in the game
said "claim it to unlock **a system**" whether it was about to hand over the
fourth draft card or standing on a finished world with nothing left to give.
The pin test has been passing both fields since it was written.

**The ray needed a ladder, not a flag.** Making everything tappable is not
enough: beacons and fog lie nearly flat at hexes no live cell occupies, and at a
lean a foreground fog hex sits in front of the board behind it. `RAY_RANK` is
the existing wall rule generalised — live ground, then walls, then the map —
lower rank wins however far behind it stands.

**A modal is the wrong weight for a light on the horizon.** The first version
opened the glossary card for any landmark tapped, beacons included, and the
board e2e went from 967ms to a timeout: a young board is mostly edge, and every
stray tap threw a card. The card is for a landmark standing on your own board;
a beacon gets the sentence, which already ends _"Build your chain out to it."_
A test noticing a card is heavy is a better argument than a taste for one.

**The end screen was measured against the wrong world.** `gained` came off the
live merge, and that merge is a separate effect declared AFTER the settle one,
which bails once `hud.ended`. React runs effects in declaration order, so
everything the run's final action claimed was missing — including the shrine
woken by the placement that spent the last tile, which is a common way for a run
to end and the most exciting thing an ending can report. It reads `after.world`
now, the copy that reaches the disk. The atlas rides under the WOKE line for the
rest of Marc's ask: three of five, and which three, on the screen where they
were earned rather than three taps away in MORE.

**A daily kept the last ending's furniture.** `setGoals([])` was in `startRun`
alone — one of five doors into a run — and a daily banks down `settleDaily`'s
short path, which never reaches the writes that would clear the other two. One
`forgetEnding`, called by all five, for the reason `startRun`'s own docblock
gives about `wakeAt`.

**Padding on a scroll container is what made the header look broken.** `.panel`
was the scrollport AND carried `env(safe-area-inset-top)`. A scroll container
clips at its PADDING box, so content scrolled into that strip is still painted,
while a sticky child sticks from the CONTENT box — and the band between those
two edges is exactly a notch tall, which is exactly what Marc photographed. The
head is a plain flex item now and `.panel-body` is the scrollport, with the
bottom inset INSIDE it so the last line scrolls through the band instead of
stopping above it. `.end` and `.front-door` gained the top inset they never had;
his other photo shows RARE TILES drawn through the status bar's clock.

**The daily lost its finds.** Shrines already came out (`shrinesReborn`, Marc's
Day 2 ruling). Finds did not, and a find grants a perk, and perks live on the
world, and a daily has no world — so `App`'s grant is guarded by `daily === null`
and a daily's finds shimmered, cost a placement to reach, and paid nothing at
all. `NO_LEDGER` zeroes them at the tuning, so the whole game agrees there is
nothing out there rather than one guard refusing at the end. SACRIFICE needed no
change and is now pinned by a test anyway: it is held off a daily by three files
agreeing that `burnRelics` and `burnLuck` are both zero.

**Verified:** 1071 tests / 74 files, 86 Playwright, `pnpm sim` byte-identical,
typecheck/lint/format/build clean, `pnpm audit:screens` at 132 findings with
**no new rows** (156 → 132; the twenty-four that left are the end screen's
disabled shop buttons, pushed below the fold by the atlas — the audit only
measures what is in the viewport, so that is a move, not a fix). **Still not
seen on a phone.**

### Session 32 — a spent destination stops being spent ground (2026-09-01)

**Question:** Marc, for the third time in this class: _"make sure symbols used
on 'used' shrines, sites, caches, etc. are the same as when they are highlighted
and active, just grey and look deactivated instead (but keep same symbols like
star, cache, etc.)."_ The glyph and the prop were both fixed on 2026-08-29, on
his own words then. So what is still saying "gone" rather than "spent"?

**Two channels were being DELETED rather than dimmed, and both are the hex
rather than the thing standing on it.**

The ring: `ringOf` read `cell.kind === 'landmark' && !cell.claimed`, so reaching
a cache did not quieten its outline, it removed it — and an outline is what says
"this hex is a PLACE" from across a board. The ground: `surfaceFor` dropped a
claimed landmark to `theme.stone`, which is the surface a POPPED TILE wears, so
on a board that fills with spent ground as a run goes on, the hex you walked all
that way to reach became the same hex as everything around it. That is the
identical fault the prop had in 2026-08-29's session (painted `stone.fill`) and
the glyph had the same day (drawn in the faintest ink), one layer further down
each time. Three sessions, four channels, one sentence: **quiet is not gone.**

Both now speak `inkDim`, which is what the prop and the glyph already speak, so
a spent destination says one thing in one tone across all four.

**The new rung went in at the BOTTOM of the ladder, and that is the whole of
"nothing that had a ring changes".** The cheap version — flipping `!claimed` to
cover both — would have lifted the claimed case above `lensed`, so a claimed
territory of the lit colour would have stopped answering the lens. `rings.ts` is
a pure function that had no test at all; it has one now, and that case is in it.

**The budget had never graded the spent voice.** `inkDim` is drawn four times
over on a claimed destination and `materials.test.ts` graded `ink`, `halo`,
`lit` and `accent` and never it — so "still here, just spent" rested on a colour
no test looked at, and this session put `inkDim` ink on `inkDim`-speckled
ground, which is exactly the pair that can cancel itself out. Graded now, at the
same bars, in all four directions.

**And a ring's WIDTH turned out to be dead data.** Found by giving the spent
ring a thinner one and checking the board drew it thinner. It did not:
`HexField` draws every ring from one geometry with a hard-coded `0.16` band and
never reads the field, so six computed widths — including home's deliberately
quiet one — all draw the same. Wiring it is small and was built, measured and
**backed out in this session**: honouring the authored numbers makes every
outline on the board thinner than today's, and the legal edge (the most-used
affordance the board has) loses 45% of its weight. Those numbers were tuned by
eye against the 0.16 render, so honouring them is a re-tune of the whole board's
line weight rather than a fix — a look decision, which is Marc's on a phone and
not a session's. `NEXT.md` carries it; the test deliberately does not assert a
width difference no pixel honours.

**Verified:** 1080 tests / 75 files, 86 Playwright, `pnpm sim` byte-identical,
typecheck/lint/format/build clean, audit with no new rows. **Still not seen on
a phone.**

### Session 33 — landing a parallel session's work (2026-09-01)

**Not a session's own record.** Another session worked this repository at the
same time as Session 32 and left without writing one; this is the landing note,
written from the evidence in the diff so that `main` does not carry undocumented
work. Its reasoning is in its own docblocks, which are thorough and quote Marc
directly — `screens/Device.tsx` and `ui/Tile.tsx` are the two to read.

**What landed with it.** THIS DEVICE became a room rather than a footer — Marc:
_"make sure in the more menu, the whole Cet appareil subsection is transformed
into a new menu (similar to My worlds)"_ — so `screens/Device.tsx` is a panel
`More` opens and `App` puts on the dialog stack, and the backup, restore and
reset controls stop standing open under the list of places to go. And a hand
card became a PICTURE: _"remove text in the hand tiles, keep color and symbol"_,
so the ground's name, the rarity word and the HELD badge come off the card, the
colour and the Phosphor mark stay, and the words move into a clipped span so a
hand of buttons still announces what each one is. `hand.ts`, `Figure.tsx`,
`view/figure.ts` and `ui.css` follow it; `e2e/board.spec.ts` and
`menus.spec.ts` were updated with it.

**It was left mid-refactor and `main` would not have compiled.** `TileProps`
lost its `held` flag and `ActionBar` still passed one, so `pnpm typecheck` was
red — `ActionBar.tsx(254,15)`, the stash's own card. Three files were also
unformatted. Both are fixed here: the flag is gone from the call site, because
`slot` is what says a card is stashed now and `Tile`'s own docblock states that
rule ("a stashed card is the one standing in a stash slot").

**The lesson, which is this file's business rather than that session's.** Two
sessions in one working tree is a state this repository has no rule for, and the
failure mode is not a merge conflict — nothing overlapped — it is a GREEN
session committing a RED tree it never touched. Session 32 caught it only by
running `pnpm typecheck` on the whole tree rather than on what it had changed,
after a `set -e` chain hid the failure once by putting the check inside an `&&`
list. **Verify the tree, not the diff.**

**Verified, over both sessions' work together:** 1080 tests / 75 files, 86
Playwright, `pnpm sim` byte-identical, typecheck/lint/format/build clean,
`pnpm audit:screens` at 132 findings with **no new rows and none lost**. **Still
not seen on a phone.**

### Session 34 — the fog stops shouting, and a stashed card says so (2026-09-01)

**Question:** two of Marc's, and the second one is a consequence of yesterday's
fix. _"add a small visual for held tiles, no full words"_, and then, with a
phone photo of a remembered world: _"still see some weird block shapes."_

**The blocks are WALL MARKS, and the fog put dozens of them on screen.**
`labelFor` gives every wall `CONCEPT_ICON.wall` at FULL ink — a brick, which at
the eight pixels a hex label gets on a phone is a white rectangle with a line in
it. That was a cost nobody could see for as long as the fog was not drawn: a
live board carries a handful of walls and nobody counts a handful. The moment
`RunMemory.revealed` reached `toBoardView` (Session 31), a three-hundred-run
world drew one on every remembered wall, at full strength, across the entire
map — which is what the photo shows and what it should have occurred to this
session to check when it turned the layer on.

**The mark's own argument is what rules it out of the fog.** It exists to
separate a wall from SPENT STONE while you are choosing where to place (Marc,
2026-08-29). Remembered ground has no stone in it — `toBoardView` reconstructs
the fog as landmark, wall or empty — and no placement to choose. A wall out
there is the shape of the world, which its own dark fill already draws. So the
fog names DESTINATIONS and nothing else, which is the editorial rule it already
keeps about worths and previews.

**A stashed card wears the stash's own dashes.** The HELD badge came off with
the ground name and the rarity word on 2026-08-31, and what was left telling a
stashed card from a drafted one was its POSITION in the row — a fact about the
layout, not about the card, and gone the moment the row is glanced at. The
dashes are the one mark this screen can spend that the player has already been
taught: an empty slot has been a dashed frame since the stash was built, and the
manual's own figure says so in as many words. No new icon, and nothing added to
the closed registry for an idea that already has a shape. It spends the two
transparent pixels `.tile` reserves, so putting a card away cannot move the row.

The class is `stashed` rather than `held`: `.tile.hold` is the EMPTY slot, and
two classes one letter apart on the same element is a trap for whoever reads it
next.

**`toHaveClass` matches the WHOLE attribute.** The e2e pin failed green-looking
red on `/stashed/` against `"tile stashed"` — it reads as the class being
absent when it is present. `toContainClass` is the one that means what the
assertion says.

**Verified:** 1082 tests / 75 files, 86 Playwright, `pnpm sim` byte-identical,
typecheck/lint/format/build clean, audit at 132 findings with **no new rows and
none lost**. **Still not seen on a phone** — the two open look questions from
Session 32 (ring line weight, and whether the spent ring's `inkDim` out-shouts
the live one's gold on a dark board) are still Marc's.

### Session 35 — the props were never the colour they were written in (2026-09-01)

**Question:** Marc, twice, with a phone photo: _"still see some weird block
shapes"_, and after Session 34 shipped, _"still same blocks after hard refresh"_.
Session 34 read them as the WALL MARKS and removed those from the fog, which was
a real regression and the wrong answer to this question. So: what are they?

**They are the destination PROPS, and they render in the wrong colour space.**
`Props.tsx` writes each prop's instance colour with `Color.setRGB`, which writes
into the WORKING colour space — linear-sRGB. A display-space gold like
torchlit's `ink.lit` (0xc79a4b) was therefore handed to three as if those
numbers were already linear and encoded back out around 0xe6cc92: a washed-out
cream, lighter and far less saturated than the direction authored. The wash
lands hardest on the SHADING, because compressing the hue compresses the
difference between a prop's lit top and its shaded side — so a drum stops
reading as a cylinder and becomes a pale blob. Measured, not argued: the same
hex at the same zoom before and after is a cream lump and a gold, faceted
object.

**The ground does not have this bug, and that is why this one survived.**
`torchShader.ts` replaces `color_fragment` so the tint multiplies in DISPLAY
space, and its docblock spells the linear-multiply trap out in as many words —
"a linear multiply by 0.42 is about a display multiply by 0.70". Its materials
therefore WANT raw display numbers in `vColor`, so `HexField` and `Pop` write
`setRGB` on purpose and are correct. `Props.tsx` has no such shader and
inherited the call anyway. One line looked identical in three files and was
right in two of them.

`setHex` defaults to `SRGBColorSpace` and converts, so a prop's top face now
renders as the authored colour under the rig's exposure — the same guarantee
`theme/rig.ts`'s `litColour` already models and the budget already gives a hex
top. `landmarks.test.ts` pins the trap against three's own API, because nothing
in this repository can stop the next person reaching for `setRGB` and only a
test can say what it costs.

**Two wrong answers before the right one, and the lesson is about evidence.**
Session 34 diagnosed from a compressed phone screenshot and shipped. This
session rendered the same scene locally, cropped one hex to 8× and looked at the
pixels — which took four minutes and settled it. **A screenshot at arm's length
is a report, not a diagnosis.**

**What is still true and still open.** A prop stands over its hex's own mark,
so the star/package/key/flag/sparkle that `LANDMARK_ICON` calls "the authority
on MEANING" is buried the moment a destination is revealed — only a BEACON,
which gets no prop, shows its symbol. Marc has asked for those symbols twice
now. Raising the mark to float over the prop is a few lines and costs parallax
at a lean; it is not done here because it is a look decision and this session
has already guessed twice. `NEXT.md` carries it.

**Verified:** 1084 tests / 75 files, 86 Playwright, `pnpm sim` byte-identical,
typecheck/lint/format/build clean, audit at 132 findings with **no new rows and
none lost**.

### Session 36 — the destinations become their marks (2026-09-01)

**Question:** three rounds on one phone photo had produced two wrong answers, so
this one opens by asking rather than guessing. Marc, given the candidates:
_"i want the star symbol and just that for example"_, _"theyre not associated
with their right symbol it seems"_, and, of the four ways forward, **symbol
only, drop the 3D shape**.

**His own screenshot was the argument.** One clean STAR at the left edge of the
map, and pale lumps everywhere else. The star is a BEACON — a glow through
ground the board has not grown to — and a beacon is the one destination that
gets no prop, so it is the one whose mark nothing covers. The board was already
drawing the right picture in the only place it could not be hidden.

**`Props.tsx`, `landmarks.ts` and `landmarks.test.ts` are deleted**
(`DECISIONS.md` D11). The props stood on the hex and `Labels.tsx` laid the
mark flat underneath, so the object covered the only thing that said WHICH of
the five it was — while `landmarks.ts`'s own docblock claimed "the mark stays
the authority on MEANING". It could not be, and that is the ruling.

Deleted rather than dialled down, on this repository's own precedent
(`meta/route.ts`'s `searchFor`, D9): a system nobody may switch on is dead
code, and dead code is this body's signature failure. The shapes are in git, and
what would have to change for them to come back is written into D11.

**What the last session's colour fix bought, and what it did not.** Session 35
was a real bug — `setRGB` writes into the linear working space, so the props
rendered washed out and their own shading compressed with the hue. Fixing it
made them gold objects instead of cream ones, and did not make them a cache, a
site or a shrine. Worth stating: the fix was correct and did not answer the
question, which is the difference between a bug and a design.

**The trap it found outlives the props.** `HexField` and `Pop` write `setRGB`
ON PURPOSE — their materials carry `torchShader.ts`, which multiplies the tint
in display space and wants the raw numbers in `vColor`. So the rule is not
"never `setRGB`", it is **`setRGB` for a torch tint, `setHex` for a colour**,
and it now lives in `instances.test.ts` beside the other thing that goes wrong
with an instanced mesh on this board.

**`s2d-props` became `s2d-destinations`.** A doc shot named for objects the
board no longer draws is the stale ledger this repository keeps losing sessions
to, in its smallest form.

**The lesson, and it is the same one twice.** Session 34 diagnosed from a
compressed phone photo and shipped the wrong fix; Session 35 rendered the scene
locally, which found a real bug but still answered a question Marc had not
asked. What settled it was ASKING him, with the candidates drawn out. Three
sessions of inference lost to one question not asked.

**Verified:** 1062 tests / 74 files, 86 Playwright, `pnpm sim` byte-identical,
typecheck/lint/format/build clean, audit at 132 findings with **no new rows and
none lost**. The test count fell by 22 because the props' own file went with
them.

### Session 36b — a property test that was two per cent under its own timeout

**Not a question, a red build.** `4da7de1` — the commit that deleted the props —
failed CI on `packages/core/src/engine/hex.test.ts > distance > satisfies the
triangle inequality`, a file it did not touch. **Error: Test timed out in
5000ms**, measured at 5110ms.

**It was never about the change.** The test walks 37 cells cubed — 50,653
triples — and called `expect` on every one of them. `expect` builds matcher
state and a failure message per call, so the time went inside vitest rather than
inside `distance`: 425ms on this machine, 5110ms on a shared runner. A test two
per cent under its own limit is a test that fails on whichever machine is
busiest, and that is the one kind of red that teaches a team to press re-run
instead of reading.

The loops collect violations in plain JS and assert once. Coverage does not move
— every pair and every triple is still checked — and a failure now names the
cells rather than only the numbers. 425ms → 4ms, and the sibling symmetry test
43ms → 1ms.

**The pattern was checked against a real violation before it was trusted.** The
first counter-example picked to prove it was not vacuous — Manhattan distance on
(q, r) — passed, because Manhattan is itself a metric and satisfies the law. The
second, a squared metric, is rejected as it should be. Worth writing down: a
test whose proof of life is itself wrong is exactly the shape of the thing being
fixed here.

**Verified:** 1062 tests / 74 files, `pnpm sim` byte-identical,
typecheck/lint/format clean.

### Session 37 — the audit against Ashwake 1, and the twelve things it found (2026-09-02)

**Question:** Marc asked what is still missing in this body compared to
`../tiles`, and asked for it to be fixed. So: what does a module-by-module
audit find that four stages of ledgers did not — and is any of it a rule rather
than a screen?

**Answer: no rule moved, and twelve surfaces were missing.** `pnpm sim` is
byte-identical, `content/tuning.ts` differs from Ashwake 1's only by two
registries that moved out of `engine/state.ts`, and `TEACH_IDS` is unchanged.
Every one of the twelve is a fact the game had already computed and then
declined to say.

**The audit's method, and why it beat the ledgers.** `INTERACTIONS.md` asks
"what can a finger do here" and had been right about every gesture. The misses
are all one level below a gesture: a function in `packages/core` with a test, an
export, and no importer in `apps/game`. Diffing the two trees module by module
and then grepping each core export for a consumer found them in an afternoon —
which is `CLAUDE.md`'s own standing check, run over the CORE rather than over a
screen. **Extend the check: before calling a MODULE done, grep for a consumer
of every export it has.**

**The two dead-code findings, which are the fifth and sixth of this body's
signature miss.**

1. **`HudView.hint`.** `hintFor` computes the nearest unclaimed destination
   every render — "a CACHE, five hexes out" — and nothing in this body has ever
   read it. It is the endless plane's whole answer to "where do I go?". Back as
   a toast on CHANGE (`shell/signpost.ts`), with Ashwake 1's three guards:
   primed rather than greeting, only on a beat where nothing louder spoke, and
   silent until RIPE is taught — that last one cost Ashwake 1 a run-one killer,
   where a stranger was told to build out and touch the light before the game
   had said what ripening was.
2. **`debug.overlay` shipped `wired: true` with no reader AND no door.**
   `parseOverrides`/`withOverrides` — `?ff=`, tested since the lift — had no
   caller either, so the only way to reach a `player: false` flag did not
   exist. Both halves built: `useDevice` applies and persists `?ff=`, and
   `view#debugLine` is the reader. `features.ts`'s own header says a registry of
   aspirational flags is a to-do list that lies; it was lying about itself.

**The pop receipt was arithmetically right and rhetorically silent.** Marc's
phone: a pocket paying `+113 tuiles : 1 par tuile, +1 de plus par 2 de valeur,
+8 pour la profondeur` and then, under nothing at all, `+8971 pts.` The 8971 is
correct — 178 worth × 16 pocket × 3 distance × 3 bounty × 35% per pop, checked
against `harvestValue` and `scoreOf` end to end — but **the only number on the
card with no recipe was the one seventy times bigger than the one that had
one.** `h.points`, which spells out every term, was unreachable: it lives in the
`choice === 'points'` branch and `singlePayout` means `ActionBar` never
dispatches that. `scored` carries the whole recipe now, `pointsPerPop` included,
which is a term **no surface in either body has ever named** — so no product of
the numbers a player could see had ever reached their own total. And the bounty
moved INSIDE the equation: the ×3 is in the number, and a separate line saying
"COLLECTED" read as something that happened alongside the score.

**The end screen was where the most had been lost.** NEW BEST and the run
number were computed by `settle` and thrown away (`Settled.standing` now
returns them); the two end-of-run bonuses had never been on a screen, so the
breakdown's three honest columns summed to a fraction of the score with nothing
accounting for the difference; relics banked was never printed at all, on the
screen with the shop under it; and the fact grid restated the score and then
double-counted the purse. An e2e now reads the ledger rows back and checks they
sum to the score itself.

**And the distribution mechanism had lost its picture.** `shell/share.ts` calls
sharing "the game's entire distribution mechanism" and this body pasted a
sentence. `render/shareCard.ts` is ported — with one change that matters: every
string is handed in already worded, because Ashwake 1 drew `${points} pts` and
`REACH ${n}` straight into the canvas, in English, on a card a French player was
about to send. **D4 covers pictures.** Beside it: the front door and the manual
now name which of the three games you are in, a shared seed can be SETTLED as
one of your three worlds, and the onward-share line is back.

**Two things about where the game LIVES, both Ashwake 1 shipped.** Chrome's
`beforeinstallprompt` was being thrown away, so the only route to a home screen
was knowing your own browser's menu; and nothing warned a player inside an
Instagram or TikTok WebView that the world they were about to build might not be
kept — which is precisely where a SHARE link lands most often. The counterweight
to the growth mechanism was missing on the same axis as the growth mechanism.

**Two snapshots re-recorded, deliberately, and this is the reason** (`CLAUDE.md`
requires it in the same commit): `prose.pin.test.ts` moves `+1 pts.` to `+1 pts
= worth 1 × pocket 1 × distance 1, at 35% per pop.` in both languages, and that
is the whole diff. Marc's French review surface should be read for the new line.

**One thing lint taught, worth keeping.** `react-hooks/immutability` refuses a
write to a ref that a hook declared ABOVE it already closes over. The fix was
better than the workaround: the signpost now reads and writes its ref once per
dispatch, before any branch can return, rather than assigning on each of three
exit paths — which had been three places for "did we look" to drift apart.

**Verified:** 1071 tests / 76 files, 86 e2e, typecheck/lint clean, `pnpm sim`
byte-identical to `sim.golden.txt`. **Nothing seen on a phone yet** — the
signpost's cadence, the receipt's new line and the share card's composition are
all Marc's to judge in portrait.

**Next:** the phone pass on the above, and `NEXT.md` §5's art pipeline.

### Session 37b — the second pass, and the five the first one walked past (2026-09-02)

**Question:** the first audit compared MODULES and screens. Does the same
consumer-grep, pointed at the render contract and the theme instead of at the
exports list, find anything the first pass could not see?

**Answer: five more, and they are a different shape.** Session 37's twelve were
functions with no importer. These are FIELDS with no reader — `CellView` has
twenty-two of them and the board is the only thing that could consume any, so
"is it wired" is a question the module graph cannot answer at all. Three of the
five were caught by walking every field of `CellView` and `BoardView` and
grepping the board for it.

1. **`voice.dry` — the third sound this game has, and nothing ever played it.**
   Every direction has carried a tuned `dry` block since the rules were lifted;
   `voice.ts` exports the note; no caller existed. It is the low fade when the
   purse first sinks toward the next placement's cost, and it is not a death
   sting — death stays silent, because the dread is the sound. `shell/dry.ts`
   carries Ashwake 1's hysteresis (arm under cost+3, re-arm over cost+6) and
   the reason for it: a bare threshold fires and clears across one pop and one
   placement, and a warning that cries every other tap is one a player stops
   hearing.

2. **`cell.previewColour` — the fix came across and the bug came back.** The
   field's own docblock in the core says it exists because _"the ghost used to
   draw as one fixed tint regardless of what you were actually holding"_ —
   Ashwake 1 found that and fixed it. This body never read the field, so every
   legal edge drew in one ink again. It matters more here: a board of glowing
   outlines in a single colour asks a player to hold the selected card's colour
   in their head while reading it.

3. **`cell.band` — the world has five contour bands and the 3D board drew them
   flat.** `elevationBandAt` cuts the plane into `elevationBands` steps and the
   shipped tuning sets five of nine hexes each; `relief.ts` lifted by kind,
   rarity and jitter, and never by the one field that is actually terrain. The
   irony is exact: Ashwake 1, which had no Z axis at all, at least tinted the
   bands so contours were visible. `BAND_LIFT` is sized against this file's own
   argument rather than by eye — four bands plus the whole jitter range must
   stay under one rarity step, or a common tile on a hilltop out-stands a magic
   one in a valley and height stops meaning rarity. `4 × 0.09 + 0.16 = 0.52 <
0.55`, and `relief.test.ts` pins the inequality across every band, so moving
   the number without moving `RARITY_LIFT` fails.

4. **The manual did not grow with the world.** Ashwake 1's rule from
   `ideas/teaching.md` — a section about a concept this device has not met stays
   out — had not travelled, so a stranger opening HOW TO PLAY in their first
   minute read about relics, the stash, magic, unique and the luck purse before
   meeting any of them. That is the wall the teaching drip exists to take down,
   rebuilt inside the drip's own manual. Gated on the same ledger the cards
   write, with a dot on any tab still holding sections back — without a mark, a
   tab hiding three of five is indistinguishable from a tab that only had two,
   and the drip reads as a thinner game instead of a game arriving in order.

5. **`startingPerk` was never said, and its own docblock is the indictment:**
   _"Pure and exported so the UI can say WHY the starting number is not 30 — a
   perk nobody can see is indistinguishable from a bug."_ Nothing in this body
   called it. Hold four territories, start with more tiles, and nothing connects
   the two. Said on the arrival beat now, through a new `beginRun` that every
   one of the five doors into a run goes through — written first as an effect on
   the framing counter, which `react-hooks` correctly refused: a run beginning
   is something the player DID, and the counter misses the one door that matters
   most anyway (BEGIN on the front door never frames).

**What the pass VERIFIED rather than fixed**, and it is worth writing down so a
third pass does not re-walk it: the keeper's lifetime guards and its
pagehide/visibilitychange flush are complete; `theme/tokens.ts` and `labelFor`
are supersets of Ashwake 1's, not subsets; every remaining core-module diff is
D4 text extraction and no rule moved; `shimmer` and `native` ARE consumed, via
`render/materials.ts` rather than by the board directly, which is why the first
sweep flagged them and a reader had to check; and **every key in the text
catalogue has a consumer** — that hunt came back empty, which is the first time
one has.

**Verified:** 1077 tests / 76 files, 86 e2e, typecheck/lint/format clean,
`pnpm sim` byte-identical.

**Next:** all five want an eye on a phone, and two want it badly — the contour
lift changes the board's silhouette, and the legal edge changes the colour of
the thing a player looks at fifty times a run.

### Session 37c — a green suite against a bundle that was never built (2026-09-02)

**Not a question, a bug report.** Marc, minutes after 37b landed: _"i had a
visual bug where the first tile i put seems to refresh the whole map display."_

**He was describing exactly what the code did, and it was mine.** 37b wired
`cell.previewColour` into the legal ring, so a legal hex wore the colour of the
card in hand. After a placement the hand redraws and the auto-selected card is
usually a different colour — so **every legal edge on the board changed colour
in one frame.** A dozen of them at first, more as a run goes on. The most
frequent action in the game became the loudest visual event on the screen, and
it is not an event at all.

**Reverted, and the reason it worked in Ashwake 1 is WEIGHT, not colour.**
Ashwake 1 drew a hairline stroke at `alpha: 0.75` over a flat board: a tint on a
thin line. `HexField` draws a `0.16`-radius ring band at full opacity, an order
of magnitude more ink. The colour SOURCE was ported and the WEIGHT was not, so
four grounds authored to be fills became four outlines, none tuned for the job
— `legalEdge` is one authored colour precisely so it can be balanced once
against every terrain, and daylight's tan reads as nearly invisible on cream
while its red outshouts the ripe edge, which is meant to be the loudest thing
on the board. `rings.test.ts` now pins that the edge does NOT follow the hand,
because the field is still there and a future audit will find it unread again.

**And the process error under it, which is the more useful half.**
`playwright.config.ts` starts `vite preview`, which serves `dist` and never
builds it. `pnpm test:e2e` chains the build itself and is right; a bare
`npx playwright test` does not, and that is what 37b ran. **So an eighty-six
test suite came back green against code that had never been compiled** — every
second-pass change was verified against the previous bundle. That is worse than
a red suite, because a red one tells you something.

The fault was not carelessness, it was that the safe command and the obvious
command were different commands. They are the same command now: the web server
builds before it serves. A few hundred milliseconds against a suite that takes
minutes, so there is no version of this worth making optional.

**What re-running on a real build actually proved**, which is why it mattered:
the manual's drip works (a virgin device reads two sections of the HAND tab
with two tabs marked as growing; `?taught=1` reads six and is promised nothing
more) and is pinned in `menus.spec.ts` now; the contour lift is present and
quiet; and the ring repaint was real and visible in a screenshot the moment the
bundle was current.

**The lesson worth keeping:** a suite that cannot fail is not evidence. Ask what
the suite is actually running before believing what it says — the same question
`CLAUDE.md` already asks about ledgers, pointed at the harness.

**Verified, on a build:** 1077 tests / 76 files, 87 e2e, typecheck/lint/format
clean, `pnpm sim` byte-identical.

### Session 37d — the third pass, and a class of gap that is not mine to close (2026-09-02)

**Question:** the first pass swept exports, the second swept the render
contract's FIELDS. Point the same grep at the THEME, the TUNING and the state
shapes: is there anything left, and is it the same kind of thing?

**Answer: nothing in the rules, five in the look — and the right move is not to
fix them.**

**What came back clean, and it is worth writing down because it is the first
time.** Every one of the ~100 `Tuning` dials has a reader, so there is no dead
balance anywhere. Every field of `GameState`, `WorldMemory`, `Progress` and
`Records` has a reader. Every field of `HudView` has one. Every key in the text
catalogue has one. Every class in `ui.css` is used by a component. The public
assets are complete and `sw.js` is a superset of Ashwake 1's. Four sweeps that
each found something on the last two passes came back empty on this one, which
is the first honest signal that the mechanical hunt is near its end.

**What did not: the theme.** Five channels a direction author tunes and no
pixel reads.

- **`board.vignette`** — Ashwake 1 drew it, and **torchlit, the direction that
  ships, authors `strength: 0.72`**. So the default board is missing atmosphere
  its own direction asks for. Settlement authors 0.55; the other three are
  `null` and lose nothing.
- **`theme.ghost`** — a whole `Surface` per direction, alpha 0.16 to 0.34,
  never drawn. Read only by `theme.test.ts`, which is the shape of a channel
  that is checked and not used.
- **`Surface.inset`** — 0.06 on every terrain and **0.09 on `empty`** in four
  of five directions, so open ground is authored to read looser than built
  ground. `board/ground.ts`'s single `SEAM = 0.06` flattens the distinction.
- **`board.seam`** — 0.04 or 0.05 everywhere but the placeholder, against that
  same hard-coded 0.06.
- **`Ring.width`** — already known and already documented (2026-09-01).

**And the decision, which is the actual output of this session.** All five are
LOOK changes, and I had already got exactly this class wrong once today: the
legal ring's colour, guessed at from a session that cannot see the phone, cost
a bug report within the hour. Three passes of "find the unread thing and wire
it" is a good instinct that has now met its limit — **an unread number is a gap
only when there is a right answer to what it should draw.** For `hud.hint`
there was one; for a vignette's strength there is a screen and an eye.

So they are STATED rather than built: a note at each declaration in
`tokens.ts`, so nobody tunes into a void again, and `NEXT.md` §5b with the
authored values measured and tabulated so the decision can be made from numbers
instead of from memory. `theme.ghost` carries the extra note that it is the
honest home for `previewColour` — a fill under the preview number is a
PROPOSAL, an outline is a STATE, which is precisely why tinting the outline
repainted the board on every placement.

**The lesson, and it is a correction to the last two sessions' own lesson:**
the consumer-grep finds gaps, not answers. It says a channel is unread; it
cannot say what should come out of it. Where the answer is in the core
(a sentence, a number, a record) wiring it is the whole fix. Where the answer
is on a screen, the finding is the deliverable and the fix belongs to whoever
can look at it.

**Verified:** 1077 tests / 76 files, 87 e2e on a real build,
typecheck/lint/format clean, `pnpm sim` byte-identical. No behaviour changed
this session — the diff is comments, `NEXT.md` and this entry.

### Session 38 — the daily was advertising shrines it could not give (2026-09-02)

**Question:** Marc asked for a review of fog and shrine detection on a world
versus a daily, and across an abrupt switch between them. Do the two modes
actually differ in the two things a player sees first, and does the switch
carry anything across that it should not?

**Answer: the fog is clean, the shrines were not, and the switch leaked two
refs.** Three findings, and the first is a bug that is live in Ashwake 1 too.

**1. `destinationsWithin` never applied the shrine rewrite.** A daily has no
ledger, so `shrinesReborn` turns each shrine into a cache or a site
deterministically — and the rewrite lived in `destinationAt` alone, whose own
comment claimed it was placed there _"so the reveal, the beacons, the fog and
the tap answers all agree without a second rule anywhere."_

`destinationsWithin` is the function the view calls **to draw the beacons**. It
reaches `blockDestination` directly and never passed through that rewrite. So
on a daily a shrine glowed off-board as a SHRINE, the signpost said _"a SHRINE,
five hexes out"_, the ending's what-still-glows said the same — and building
out to it handed you a cache. **The one surface the rewrite existed to keep
honest was the one surface it missed**, and the comment asserting otherwise is
what made it invisible for four stages.

`../tiles` has the identical hole in the identical two functions, so this is
inherited rather than a port regression, and it is live on the deployed
Ashwake 1.

Fixed by moving the rewrite DOWN into `blockDestination`, where a destination
is made: both callers get it and a third cannot be written that does not.
`destinationAt` is the position test it always claimed to be. Invisible to the
golden — `shrinesReborn` is false in `TUNING` and in the plane, and only
`economyFor({ kind: 'daily' })` turns it on.

The test is written as **agreement** rather than as "no shrines on a daily",
because the bug was never really about shrines: it was two paths to one fact. A
third caller that skipped the rewrite would pass a shrine-shaped test and fail
this one.

**2. `enterDaily` did not reset `saidOnce`.** Every other door into a run does.
So a UNIQUE arriving in the hand on today's board stayed silent whenever the
world run before it had already met one — a per-run moment leaking across a
mode change.

**3. NEW GROUND was measured against the wrong world, and `null` is the fix.**
The line says _"farther than THIS WORLD has ever reached"_ — a claim about a
world. A daily has none and a shared seed is somebody else's, and the shell
handed both the HOME world's reach. **Wrong in two directions from one missing
distinction:** a player whose world had reached 20 had to out-reach their own
history before the daily would say anything, and a player on a fresh device was
told the daily was new ground on their first placement.

`reachAtStart` is `number | null` now, and null is a mode saying it has nothing
to measure against. UNIQUE still fires on both, which is the half a blanket
"say nothing on a daily" guard would have thrown away.

**What was already right, checked rather than assumed:** the fog. `restart`
takes the memory as an argument and `enterDaily` passes `undefined`, so the
remembered ground is dropped on the way in and handed back on the way out —
68 cells to 0 to 68 in the test. `move()` flushes, drops, then builds the new
keeper, in that order, so a pending write from the place being left lands where
it belongs. And every mid-run world merge is guarded on `daily !== null`.

**The lesson, and it is the sharpest of the four passes.** A comment that
asserts an invariant is not the invariant. `destinationAt`'s said the rewrite
was placed where all four surfaces would agree, which is exactly the sentence
that stops a reader checking whether they do — and the surface it named first,
the beacons, was the one that never came through. **Where a docblock claims
"there is no second rule anywhere", grep for the second rule.**

**Verified:** 1085 tests / 76 files, 87 e2e on a real build,
typecheck/lint/format clean, `pnpm sim` byte-identical.

### Session 38b — the receipt denied the perk it had just handed over (2026-09-02)

**Question:** Marc, following 38: does a daily and a world on the same plane
actually play differently, and is the difference only the shrines?

**Answer: they differ by more than shrines, the daily is device-independent as
it must be — and verifying it turned up a fourth bug next door.**

**What the check found, and it is reassuring.** `economyFor` gives a daily
`{...TUNING, ...NO_RELICS, ...NO_LEDGER}` and reads no progress at all, so a
fully-upgraded device and a fresh one get a byte-identical daily tuning. That
is the invariant the whole ladder rests on and it holds. Against it, a world
carrying three woken shrines and a bought shelf runs `startingTiles 27` against
the daily's 22, `holdSlots 2` against 1, `findSense 2` against 0, finds on
against off, and relics payable against zeroed. The two are not the same game
on the same plane, which is the answer.

**The bug next door: `perkAt` and `wornPerk` had no producer.**
`view/receipts.ts` takes both so a find's claim can name the perk it gave,
`shell/store.ts` forwards both into the session, and **`App` passed neither**.
So `perkAt?.(hex) ?? null` was always null and every find claimed in the real
game returned `findNothing` — _"Nothing new inside. A find grants only what you
do not already carry, and only on your own world."_ — including the ones that
had just granted a perk. Worse, the shell's own `perkFound` toast fires a few
lines EARLIER in the same handler and is then overwritten by that denial. **The
one moment the perk hunt pays out, the game denied it in the player's face.**

`receipts.test.ts` is green throughout and always was: it supplies `perkAt`
itself. **The machinery was proved and the wiring was not** — the signature miss
of this repository, wearing an OPTION this time instead of an export, which is
why three passes of grepping exports and fields walked past it. Worth adding to
the hunt: **a hook a test can inject is a hook a test cannot prove is
connected.**

**The fix, and why it is a module rather than a ref.** The receipt is built
INSIDE `dispatch`, so the shelf it must be judged against is the one from an
instant before the grant — a value only the dispatching handler knows. The
obvious shape is a React ref read by the session's closure, and the React
Compiler refuses it outright: the session is built during render, and a ref may
not be read there even from a closure that runs later. So the holder is module
scope (`shell/finds.ts`), the same deliberate choice `shell/install.ts` makes
for `beforeinstallprompt`: a value that has to outlive a render without
belonging to one. `aim` is called from an event handler, where that write is
allowed to live.

`grantFind` is asked with the pre-grant shelf, so the receipt names the very
perk the shell is about to hand out rather than a second guess at it — one
rule, asked twice, which is the only arrangement in which the two cannot
disagree. `grants: false` on a daily and a shared seed keeps `findNothing`
there, where its "and only on your own world" is already the honest sentence.

**Verified:** 1091 tests / 77 files, 87 e2e on a real build,
typecheck/lint/format clean, `pnpm sim` byte-identical.

### Session 39 — the wide pass, and a gate that was already red (2026-09-02)

**Question:** with the rules frozen and no new features allowed, how much of
what already ships is wrong, and how much of it can be fixed from a session
that cannot see a phone?

**Answer: a lot, and most of it.** `IMPROVEMENTS.md` is the row-by-row record —
121 items, 116 landed, five ruled. What follows is only what the pass changed
its mind about, because that is the part a future session cannot re-derive.

**It opened by finding the gate red.** `pnpm typecheck` — step three of five in
CI, before `test`, `build`, the e2e suite, the golden and the bake — did not
pass on `main`. `Payout` grew `points` and `reach` when the ending learned to
account for the reach bonus (`c929c0d`); its test kept rendering the old four
props; **`vitest` does not typecheck**, so 1091 green tests sat on top of five
type errors for a day. Verified by stashing the work and running it on a clean
tree. Every other row in the pass is verified by a command that could not run
until that was fixed, which is why it is item zero.

**The plan was wrong in four places, and each correction is the finding.**

1. **The focus bug was not the drawer's.** The plan read "MENU goes inert while
   its own menu is open" and proposed loosening `inert` on the board host.
   Wrong: a scrim is over the board and nothing behind it should be actable.
   What actually fails is `focusOpener`, which called `.focus()` **inline,
   inside the click handler, one commit before React removes `inert`** — and
   `focus()` on an inert element is a silent no-op. So focus fell to `<body>`
   when ANY panel closed, and had since the stack was built. A silent no-op is
   why it survived: nothing throws, the panel closes, and the only symptom is
   that the next Tab starts from the top of the document.
2. **The hand was tabbable behind every panel**, not only behind the drawer.
   `{playing && …}` carried no `inert` at all, so a Tab out of the manual landed
   on POP and SACRIFICE under an opaque page.
3. **`paintPlan` could not be memoised on the surface's identity**, because
   `surfaceFor` builds a fresh object per cell. What works is better: key the
   BATCH by the surface and build the plan when a bucket is opened. Once per
   batch instead of once per cell — and it closed a real hole, because
   `surface.alpha` is not in the plan, so two surfaces differing only in alpha
   shared a batch and every cell in it drew at whichever alpha arrived first.
4. **Context loss needed two lines, not three cache resets.** `three`
   re-initialises and re-uploads from the CPU-side data every cached object
   still holds; resetting would rebuild, from scratch, a set of objects about to
   be re-uploaded, on the one frame where a phone has just proved it is short of
   memory. What was missing is `preventDefault()` on `webglcontextlost` — without
   it the browser never tries to restore — and an `invalidate()` on restore,
   because `frameloop="demand"` otherwise draws a permanently blank board.

**The signature miss came back twice, in the two shapes `CLAUDE.md` names.**

`Said.brief` is set by nothing. The whole brief-card path — the scrim rule, the
4200ms clock, the pointerdown dismissal, the "takes no focus" rule, `SaidCard`'s
prop — is unreachable from the running game, and its own docblock names as its
writer the branch that stopped writing it on 2026-08-30. Found by walking the
OPTIONAL fields, which is the blind spot `perkAt` hid in and the newest rule in
`CLAUDE.md`. **Left in place**: whether this game wants a receipt you do not
dismiss is a screen decision, and it is in `NEXT.md` §5c.

And **the rules of hooks were scoped to `*.tsx`.** `eslint.config.js` says "the
rules of hooks, on the chrome" — and four of this app's hooks have no JSX in
them, including `useDevice.ts`, the 300-line file holding every piece of device
state and the keeper's whole lifetime. **The file with the most hook logic in
the build was the file the lint did not open.** Widened to `{ts,tsx}`; it found
four things immediately, all fixed here: a cleanup that dropped the wrong keeper
after any `move()`, a ref read during render inside a memo that did not list it,
a GPU material cache written during render, and two cascading renders on the
boot path.

**A new instrument finding: the audit overwrote its own record, in this
session.** `afterAll` writes `report.md` unconditionally, and Playwright runs it
after a filtered run exactly as after a whole one — so
`playwright test -g "one · test"`, run to debug a single screen, replaced the
committed table with an empty one and said nothing. The header now states how
many of the expected screen-visits actually happened, and a run that gathered
nothing leaves the file alone.

**The screen audit paid for itself the first time it ran.** The French pass —
French is the shipping default, is ~20% longer through the catalogue, and had
never been photographed — returned seven `clipped` findings, every one the stat
row cutting a French label mid-glyph, up to 17px at 320. That is the evidence
B7.11 was going to be argued from, and it arrived before the argument.

**The compiler was the pass's own biggest surprise, twice.**

`react-compiler-healthcheck` compiles **70 of 70** components: nothing opted
out, nothing rejected. Months of `eslint-plugin-react-hooks@7` had already
bought the constraint; only the compilation was missing. The bundle grew 16 KB
gzipped, measured by building with and without it, and the vendor split more
than pays for it — a returning player now re-downloads 115 KB rather than 449.

Then, checking whether B6.3 and B6.6 were still worth doing, **a first grep of
the minified bundle said the compiler was emitting nothing at all.** It was
wrong: minification renames `$` and `_c`. The unminified build says 63
components carry a cache holding 1,562 slots, the largest of them 112, which is
`Game` — the component those two items existed to protect the board from. Both
declined on that measurement. Worth writing down because the measurement nearly
produced the opposite conclusion, and a wrong grep is a confident answer.

**One item declined on taste rather than evidence, and it should be argued
with.** B6.7 asked for ~1,100 lines of dated reasoning to move out of `App.tsx`
into `LOG.md`. Declined: half of this pass's findings were made by READING
those docblocks and checking whether they were still true — `destinationAt`'s
comment, `cross.ts`'s "same number by construction", `.end-install`'s "`.quiet`
already carries that voice", `Said.brief`'s named writer. A changelog in a
separate file is a changelog nobody opens while editing the line it is about.

**Two literals said torchlit while the game ships settlement**, including the
one baked into the installed icon, which is the single place it is visible for
good. Same shape as the `destinationAt` docblock: `index.html`'s pre-JS paint
carried the wrong colour under a comment asserting it was the right one.

`pnpm sim` is byte-identical throughout. The prose pins were re-recorded once,
deliberately: the whole diff is eight full stops moving out of `signpost.ts`
and into the catalogue, where D4 says punctuation belongs.

### Session 39b — reviewing the wide pass, and finding it broke the budget (2026-09-03)

**Question:** the pass landed 116 items in a day. What did it break?

**Answer: three things, and the worst of them is the pass's own headline
lesson happening to the pass.**

**`button:active` fell below the contrast budget, under a comment saying it
could not.** B7.16 gave a press a `color-mix` lift so the seven controls whose
`:active` was a no-op would acknowledge a tap under reduced motion. It shipped
at 12% ink into the panel with this beside it: _"the palette's own inks are
what it is graded against, so nothing here can fall below a budget the theme
tests already hold."_

That sentence is false, and it is false in the exact way this pass spent a day
cataloguing. A pressed ground is a NEW colour; `contrast.test.ts` grades
TOKENS, and it had never seen this one. Measured: the accent reads **4.21:1 in
daylight**, under the 4.5 floor, on `.act`, `.door-begin` and `.purse-toggle` —
which is POP and BEGIN. Every direction lost between 1.2 and 4.2 points.

8% is the largest mix that clears the floor everywhere, and the fix that
matters is not the number: **`contrast.test.ts` grades the pressed ground now.**
Putting 12 back fails it with the measurement above. A comment asserting an
invariant is not the invariant — I wrote that sentence about `destinationAt`
yesterday and then did it.

**The B4.7 fix reintroduced the leak it removed, one layer down.** Moving the
material cache's write out of the memo and into an effect left the memo only
READING — and React double-invokes a memo factory under StrictMode, so both
passes saw an empty cache, both built, and the first set of GPU materials was
orphaned with nothing holding a reference to dispose it. The old ref version had
this right by accident of ordering; what was actually wrong with it was the
`dispose()` beside the write, freeing handles during a render that might not
commit. Remember immediately, free after the commit — which is neither of the
two versions before it.

**Localising the daily's date exposed a redundancy the two formats were
hiding.** B7.43 was right that an ISO key does not belong beside a localised
date. It also made visible that a daily row prints its date twice, because a
daily can only be played on the day it is for. The title keeps the date; the row
drops the timestamp.

**And the partial-run guard was too weak, which it proved the next day.** It
refused to write `report.md` only when NOTHING had been visited. A two-screen
`-g` run replaced 265 findings with a table of two under an honest `2 of 183`
header — honest and still destructive. A partial run writes nothing now, and
that guard then earned itself immediately: the first full re-run lost one screen
of 183 to a flaky tab click and correctly left the record alone.

**That flake is the same one, for the third time.** The manual's tab row scrolls
at 390 and `data-grows` changes the tabs' widths, so a click can be dispatched
at a row that re-lays-out underneath it. It was fixed in `menus.spec.ts`
yesterday and left in the audit's own `viaTab`, which is the shape of every
duplicate in this repository: one of the two copies gets the fix.

**Two suspicions cleared by measuring rather than arguing.** B7.42 replaced the
reach arrow with a WORD, which lengthens a row in the long language — `worlds`
and `worlds-many` are in the 320 pass now, and both are clean. And B1.8's fix
rested on a claim about what a browser does with `inert` on a
`display: contents` element; `targets.spec.ts` checks `closest('[inert]')`,
which is the DOM agreeing with itself. The new test presses Tab twenty-five
times with the manual open and asserts where focus is ALLOWED to land — removing
the attribute fails it with `THE HAND`.

**The lesson worth keeping.** Every one of the three regressions was in a fix,
not in the original code, and two of them were in the _comment_ attached to the
fix. A pass that lands 116 items needs a review pass at the same rigour, and the
first thing to re-read is whatever the fix claimed about itself.

### Session 40 — the instrument stops losing the fold, and the registry stops carrying a decision already made (2026-09-03)

**Question:** a broad UI/UX sweep, deliberately from angles the exports/fields/
gestures passes never walked — what does opening `audit-shots/report.md`'s own
pictures find that grepping the code cannot?

**Answer: three things, and the largest of them was the audit measuring the
top 844px of every screen and calling the rest untested.**

**`IMPROVEMENTS.md` had a false explanation sitting in it.** B3.9's own line
said `tap-target-allowed` rose 68→256 because `.term` "now declares itself".
It does not: `.term` renders as a `<button>` only where `App.tsx`,
`EndScreen.tsx`, `SaidCard.tsx`, `Shop.tsx` and `TipRows.tsx` pass it
`onTerm` — never in `Manual.tsx`, correctly, since the manual already spells
out full definitions inline. `grep -c "term" audit-shots/report.md` returns 0. All 256 rows are `button.stat`, the six-chip header's own exemption,
present on nearly every screen since Stage 4; the count moved because this
pass took the audit from 104 screen-visits to 183, not because a new element
started being counted. Corrected in place.

**The audit never measured below the fold, on any of 183 visits, in either
language.** `shown()`'s filter required `box.top < innerHeight && box.bottom

> 0` — a check against the WINDOW, on a game whose panels scroll internally
(`.panel-body`, `.front-door`, the end screen all declare `overflow-y: auto`inside a shell that never itself scrolls). Playwright never scrolls a panel
before the audit runs, so`getBoundingClientRect`reported every element past
the fold — in the page or inside a scrolling panel, the check cannot tell
them apart — as`top`past`innerHeight`, and it was walked straight past.
24 of 35 screens reported zero findings for exactly this reason: every one of
them was a panel or a scene, not because they were clean but because the
instrument had only ever graded the top of them. Fixed by dropping the
viewport bound entirely — `getBoundingClientRect` is still correct for an
unscrolled page regardless of how far down an element sits, and this
codebase hides content by collapsing it to a point (`.visually-hidden`),
never by transforming it off-canvas, so nothing the display/visibility/
opacity checks already exclude comes back. Measured after: still only
`tap-target-allowed`and`clipped`, in the same proportion the direction cut
> alone explains (164 ≈ 256 × 113/183) — the panels are genuinely clean, not
> still unmeasured. That is itself the finding: an open question from the
> first pass now has a verified answer instead of a guess.

**No document landmarks existed anywhere** — no `<main>`, no `<header>`/
`<footer>`, no `role="banner"/"contentinfo"/"navigation"`, only three bare
`<nav className="panel-menu">`. `role="main"` is on `.board-host` and on
`EndScreen`'s root now — the two views that are ever the PRIMARY content
rather than a dialog stacked over one (every `<Panel>` screen and the front
door already carry `role="dialog"`). Safe beside the existing `inert`
choreography: `board-host` goes inert exactly when something else is the
thing on screen, so the two `role="main"` elements never compete.

**Marc, separately, closed the theme registry down (D12): "we can officialize
the Settlement ui avenue and adapt the daylight skin for it, then keep only
those two."** D7 had chosen settlement and left one line open — its own
words, "the honest fix is a bright settlement that passes the same budgets,
not a line in `pickForScheme`." `torchlit`, `torchlit-bright` and
`placeholder` are deleted; `daylight` is reskinned onto settlement's own
names (FARM · MARKET · QUARRY · ROADS, both languages, `powerNames` equal to
`terrainNames` the way settlement's already are) and its motif, so the baked
art matches (awning cloth and stacked goods, cut benches, not moss tufts and
embers). Every colour number in `daylight.ts` is untouched — only two
terrains needed their `pattern`/`overlay` objects reordered or reshaped to
satisfy the settlement motif's own guardrail (D8), which threw at bake time
exactly as designed rather than shipping a silently empty MARKET the way it
once did for real. `pickForScheme`'s written-down gap closes with it: both
`prefersLight` and `prefersContrast` answer `daylight` now, so the player who
asks for more contrast gets the fiction the front door told them, not the
plane's. Registry: five entries to two; `pnpm bake` reproducible; `pnpm sim`
untouched.

**The lesson worth keeping.** The two biggest findings this session were not
in the game — one was in the report, and one was in the thing that writes the
report. A screen nobody has photographed is a screen nobody has looked at,
Session 37's own argument; a screen only ever photographed from the top of
the fold is the same blindness one level down, and it took opening actual
pictures — not grepping exports again — to see it.

### Session 41 — the phone's own hex ceiling was never asked about a tablet (2026-09-03)

**Question:** Marc, from a real device screenshot — a tablet-ish screen with
the board tiny and adrift in a mostly-empty page: _"review for different
sizes (phone, tablet, desktop) and improve ui/ux... font size ++ for all
medias."_ What does the picture say, and where does it come from?

**Answer: `HEX_PX_MAX` is Ashwake 1's phone number, and nothing had ever
asked it whether it still meant anything on a screen ten times the width.**

`board/camera.ts` capped a hex at 34px regardless of how much room the
viewport actually had — right on a 390px phone, where 34px already reads as
generous, and silently wrong on a tablet or a desktop, where the fit stops
growing the instant it hits that ceiling and everything past it is empty
page. Reproduced independently before touching anything: phone screenshots
matched the ledger's own picture, and a fresh build at several tablet/desktop
sizes showed the same small, floating board — not a stale cache, a live
gap. `hexPxMaxFor(width, height)` replaces the constant: unchanged at 34
under ~420px of room (every pinned camera test and phone shot stays exact),
rising to 52px past roughly a small tablet's worth, because the extra space
is better spent showing more of the board than inflating the same seven
hexes further. `zoomMaxOf` reads the same function from the frame's own
width/height, so the pinch ceiling never disagrees with the fit that set it.

**The font size moved too, and the first number tried broke a passing test.**
Every size in `ui.css` is `rem` on one root that had never been set — 1rem
was the browser's silent 16px since Stage 3. 18px (12.5%) read fine
everywhere it was looked at and failed `menus.spec.ts`'s manual-alignment
test: a heading's grid column and a paragraph's `calc()` padding, identical
everywhere else, landed 0.0156px apart at that one multiple — enough to round
to two different pixels and read as ragged where nothing had actually moved.
Not a structural bug owed a fix; a coincidence of one specific number, avoided
by landing on 110% (17.6px) instead.

**Two labels were pinned rather than raised.** `.stat-label`
(TUILES/PTS/PORTÉE/COÛT) and `.act-label` (RÉCOLTER/SACRIFIER) were already
spending an ellipsis at 320px before this session — a documented trade-off
from 2026-09-02, the label giving so the number survives. Letting the root
carry them too would have spent a budget that was already spent: `TUILE…`
losing further letters for no reason the player could see. Pinned to the
exact px their `rem` clamps resolved to at the old 16px root, they hold
their tuned size while every other word in the game gets bigger around them.

**Verified beyond the usual gate**, because a look change on the board's own
silhouette is the one category this project asks for extra proof of: fresh
screenshots at phone (390×844, byte-for-byte the same composition), tablet
(820×1180) and desktop (1600×1000, 1920×1080) — the desktop board visibly
larger and the phone one untouched. `pnpm sim` stayed byte-identical, as it
must for a change that touches no rule. The audit's `clipped` count rose from
9 to 17, every one of them the same already-designed ellipsis fallback
firing on the same two pinned labels at the tightest 320px/6-stat
configuration — measured, not guessed, and unchanged in kind from before
this session touched anything.

**The lesson worth keeping.** A ceiling with no unit attached to WHY it is
what it is — "Ashwake 1's number" — is a number nobody will ever think to
question again, because there is nothing in it that says it was ever meant
to be conditional. `hexPxMaxFor`'s whole docstring is the argument for why
34 was right on one screen and wrong to leave unquestioned on the others; the
next constant like it should carry the same kind of sentence, not just the
number.

### Session 42 — the two multipliers that never learned to stop (2026-09-03)

**Question:** Marc, from his own lifetime trophy screen — a 12,176-point blue
bar against green/yellow/red all under 2,000, and a source breakdown where
`distance` alone was 72% of every point ever scored and matching/power/rarity
combined were 2%: is the scoring balanced?

**Answer: two of the economy's multipliers had no ceiling, and one colour's
own power was riding on the same unbounded axis as both of them.**
`harvestMultiplier` (pockets pay more the farther the mean tile sits from
home) and blue's tide power (`+1 worth per blueTideEvery hexes from home`)
both grow forever with distance; only the pocket-size bonus had ever been
capped, back when the hard clock first resurrected the mega-bank exploit
(`harvestSizeCap`, `../tiles/LOG.md` Session 19). Confirmed with the harness
before touching anything: `harvestSizeCap: 20` is still load-bearing today —
`bank40`/`bank80` tie exactly, proving the greedy threshold binds — and a new
`distanceMultiplierCap` at 5+ is a no-op (no scripted policy's typical
harvest distance even reaches it) while 3 costs `rush` (built to chase
distance) −13 to −29% and leaves near-home play within a few per cent, the
same shape the size cap already has.

**Shipped:** `distanceMultiplierCap: 3` and `harvestSizeBonus: 0.5` (was the
full quadratic 1 — bank3 was scoring only 47.6% of bank15 on size alone;
halving it narrows that to 58.5%). `blueTideCap: 1`, chosen to stop tide at
the same real hex distance the harvest cap already stops at
(`distanceMultiplierCap x distanceStep / blueTideEvery` = 3x3/6 = 1) rather
than invent a second unrelated number. Colour totals were previously
unmeasurable — the harness tracked no such column — so this pass added the
instrumentation as a throwaway script rather than a committed one; it found
`rush` banking 41-49% of its points in blue against 15-23% for the other
three, which the cap only partly closes (41%→33%, still largest). Also
found, and at first left open: `greenCrowdBonus` running 43-46% of every
NEAR-HOME policy's points (farm, bank20, chooser — not just a green-focused
line), a bigger and more universal share than blue's ever was — but Marc's
own read, minutes later, was blunter than "open": _"green is obviously OP
right now."_

**So it got sized the same session.** Green double-dips where the other
three don't: a green neighbour already scores as an ordinary match — every
colour's same-colour neighbours do — and then scores AGAIN as one more
crowd, which is why it ran twice anyone else's share despite being bounded
by hex geometry (six neighbours) rather than by distance. Swept
`greenCrowdBonus` from 1 down: 0.5 flattened the split best (farm/bank20
within four points of an even 25/25/25/25) but dragged `sim.test.ts`'s
"rewards patience" gate down with it — the 200-seed bank40/bank3 ratio holds
at 1.6-1.7x at every value tried, but the gate's own fixed six-seed sample
sits on a knife edge and read 1.47 at 0.5, under its 1.5 floor. **Shipped
0.7** instead: keeps that gate at 1.57 and still lands farm/bank20/chooser
within a couple of points of even (27/27/22/24, 29/27/21/24, 29/28/23/19).
`rush` stays blue-heavy regardless of this dial, at any value tried — that's
the colour's stated niche ("the colour you carry outward") doing its job
under a strategy built to chase it, not a gap this dial should close.

**The bounty was the same question's second half.** `Primes: 0` in that same
screenshot is not `questNeed: 0` (an earlier wrong read of `BARE_TUNING`
instead of the shipped `TUNING`, corrected here — quests are on,
`questNeed: 8`) and not a dead wire: `state.quest` arms correctly on a
site-kind claim and never expires. It is just rare under ordinary play —
diagnosed by instrumenting individual runs rather than trusting the harness's
median column, which reads as a flat 0 for any outcome under 50% of runs:
farm/bank20 arm a quest in ~34-37% of 200 seeds and collect roughly half of
those, versus `seeker`'s majority. `questRadius` doesn't move the arming rate
at all (radius=999 changed nothing) but does rescue some already-armed runs
that 6 was missing — 34/68 → 37/68 for farm, 40/75 → 46/75 for bank20 at
radius=12 — so that shipped; `questNeed` and the cache/site/territory split
were left alone, since those trade against the survival economy
`cacheShareNear` was tuned for and this pass had no evidence to reweight it.

**Verified:** `pnpm sim` moved and the golden file moved with it in this
commit — every number in the table shifted (harvestSizeBonus alone touches
every scored line), stalled/capped stayed 0, and `%tiles`/`relics` stayed
exactly unchanged at every step of every sweep, confirming none of this
touches Gate B or the meta-economy. 1031 tests green; four snapshots moved
on purpose and are worth reading, not just trusting — the rule is never
silently: `teaching.pin.test.ts`'s bounty glossary line ("within 12 hexes",
was 6) and its green colour lesson, plus `prose.pin.test.ts`'s matching hex-
tap line, now read "+0.7 worth per [colour] neighbour" (was +1). Two
arithmetic pins updated to the new size bonus (`endless.test.ts`,
`wake.test.ts`'s tide fixture pinned back to uncapped since that test's
whole point is the raw wake-hex formula), and `quest.test.ts`'s pocket
fixture moved from green to yellow tiles — green's now-fractional crowd
bonus made an exact `points === plain * questBonus` assertion rounding-
dependent for reasons that have nothing to do with quests; yellow in a
same-colour-or-stone row never triggers its own company bonus either, so
the arithmetic stays on whole numbers again.

**The lesson worth keeping, twice over.** The size cap had a name and a
cited exploit; the distance multiplier and blue's tide had neither, despite
sharing the exact same shape — unbounded, multiplicative, and paid for
nothing but walking. A cap that exists because an exploit was MEASURED gets
remembered; an identical shape that nobody happened to sweep gets to run for
a whole project's history looking like a feature. And the gate that caught
`greenCrowdBonus: 0.5` was a six-seed canary, not a 200-seed one — the real
economy was fine at 0.5, the FIXED SAMPLE the test happens to run on was not.
Worth knowing which of those two a failing gate is telling you before
reaching for the tuning number instead of the seed count.

### Session 43 — red gets a dial, and two mechanics the harness never saw come out (2026-09-03)

**Question:** Marc, still on the colour split — can red be bumped without
becoming the new green? And separately: is BURN/TITHE worth keeping, or
should relics just stay passive?

**Red: yes, but the lever is touchier than it sounds.** Red never had a
magnitude dial — `redAshMatches`/`redAshWalls` were booleans, the ash bonus
hardcoded at 1 (2 for unique). Added `redAshBonus` (default 1, reproduces
today exactly) and swept it: 1.5 lifts red from the worst colour (~21%) to
parity with green/yellow (~27-31%) across every strategy, and the patience
gate gets HEALTHIER (1.57→1.87) because a red-heavy pocket wants to sit and
accumulate stone, which rewards waiting. Past 2.0 red overshoots into being
the new imbalance (37-53%) and the same patience gate fails the other way
(1.41 at 2.0). **Not shipped** — Marc: "keep 1 for now" — the dial exists,
off by construction, for whenever the answer changes.

**BURN and TITHE: cut.** Marc's call, after seeing the actual shape of the
relics economy: scrap the mid-run sacrifice, lean on `claimRelics` and
`luckToRelics` staying passive. `burnRelics: 1→0` and `titheRate: 0.15→0`
/`titheMin: 20→0` in the shipped `TUNING`. One finding worth keeping from
the process: **the harness has never modelled either mechanic** — no
scripted policy in `sim/policy.ts` ever chose `HARVEST choice:'burn'` or
`SPEND on:'tithe'`, so a 200-seed-per-policy before/after comparison came
back byte-identical, and the golden sim file did not move at all. Every
historical "median relics fell to X" number in `tuning.ts`'s own comments
must have come from real play or a one-off script, never from `pnpm sim` —
worth remembering next time a comment cites the harness for a mechanic that
turns out to have no policy touching it.

**Both mechanics were already correctly gated — this was a genuine
zero-dead-button change.** `view.ts` only emits the SACRIFICE button
(`harvestBurn`) and the TITHE purse row (`spendsFor`) when their tuning is
above zero, and `reduce.ts` no-ops both actions independently at the engine
level besides. Setting the two dials to 0 was the WHOLE UI change; nothing
needed a separate conditional added. What still needed hands: three engine
tests (`tilesonly.test.ts`) that priced the live mechanism against the
default `TUNING` now price it against their own explicit `{ ...T,
burnRelics: 1 }`/`{ ...T, titheRate: 0.15, titheMin: 20 }` fixtures instead,
so the mechanism stays tested without describing reachable behaviour;
`purse.test.tsx`'s TITHE round-trip test does the same; four pinned
snapshots lost the sentences that only existed because the dial was on
(the SACRIFICE lesson's "pays RELICS" clause, the purse card's whole TITHE
row); and an e2e spec (`board.spec.ts`) that hard-asserted the SACRIFICE
button and a matching manual section now checks the button is GONE and
drops the manual half of the comparison — it turns out the manual's
`start` tab statically lists 'sacrifice' regardless of tuning
(`Manual.tsx` `SECTIONS`), so a `?taught=1` device still prints a (shorter)
section for a mechanic that no real player's teaching ledger can ever mark
"met" now that its card can never fire. Left as-is rather than edited
speculatively — a real player never sees it; only the `taught=1` testing
shortcut and the "device with no ledger" gallery fallback do, and whether
that stale entry is worth trimming is a smaller, separate call.

**Verified:** `pnpm sim` byte-identical (confirms the "harness never
modelled it" finding above), 1031 vitest tests green, typecheck and lint
clean across `packages/core` and `apps/game`. The e2e edit could not be run
in this session (no browser) and is worth a spot-check before it ships.

**Addendum, same day: the manual's stale mention, closed rather than left.**
Marc asked for a pass over every screen and help surface to confirm neither
mechanic is still mentioned. The gates on the button and the purse row were
already airtight; the one live gap was `Manual.tsx`'s `SECTIONS.start`,
which listed `'sacrifice'` unconditionally rather than through the
teaching-ledger gate every other section goes through — invisible in
ordinary play (the first-contact card can never fire now, so no real
player's ledger ever marks it "met"), but still printed on a `?taught=1`
device or the "no ledger" gallery fallback, both of which mark every lesson
met regardless. Removed from the list; the lesson entry and its teach-card
plumbing stay in `lessons.ts` untouched, gated exactly as they always were,
in case the mechanic is ever reinstated. `board.spec.ts`'s icon-consistency
test now asserts the manual section is gone, the same way it already
asserted the bar button was.

### Session 44 — a screen the story used to fill, and a catalogue already through this once (2026-09-03)

**Question:** Marc, two more asks alongside confirming SACRIFICE/TITHE are
gone everywhere (the addendum above): cut the whole catalogue's word count
as far as it goes, and make the front door less text before BEGIN.

**The catalogue already went through exactly this pass, five days ago, with
three written rules.** `en.ts`'s own docblock: Marc, 2026-08-30 — _"review
help and text content so it's not AI-like (no em dashes, etc.), be concise
and simple in all content."_ No em dash a player can read, one idea per
sentence, say the thing once. Checked today: zero em dashes remain in
either catalogue outside developer comments — the rule held. Read the full
779/785 lines of both files rather than trust that holding meant nothing
else needed a look, and found the prose is already dense rather than
padded: most lesson `core` strings are one or two sentences that each carry
a fact the player needs, not filler. **Did not do a wholesale rewrite.**
Cutting further against an already-edited, rule-compliant text risks two
things a word-count number does not show: eroding the deliberate voice
`en.ts`'s own docblock argues for, and forcing a review of every French
line again (D4: French is Marc's own review surface, never re-recorded
silently) for savings that are mostly gone already. Flagged rather than
cut: `claim.shrineCrossing` is the one genuinely long instructional string
left (five sentences describing the world-crossing choice) — worth a look
if there is appetite for more, but it is one string, not a pass.

**The real bloat wasn't the words, it was the screen.** Screenshotted the
front door at 390×844 before touching anything: the tagline plus three
story paragraphs ran the tagline's one line into roughly half the visible
screen before BEGIN, and `.door-story`'s own CSS comment already knew this
was tight — "at 375×667 the content is 691px," more than the viewport,
before this session touched it. Folded the three paragraphs behind a
`THE STORY` disclosure using `Fold`, the same `<details>`-based pattern the
manual already uses for its own finer print — no new UI primitive, no new
persisted state, and the story is exactly as available as it was, one tap
away instead of the whole first screen. Verified at three sizes: 390×844
(logo, name, one line of tagline, THE STORY, BEGIN, the daily badge and all
three nav rows now fit with room left over), 320×568 (the audit's own
tightest phone — everything still fits, BEGIN visible with no scroll), and
the opened state (the three paragraphs read exactly as before, caret
flipped, nothing lost). Two new catalogue strings, `ui.theStory` (`THE
STORY` / `L’HISTOIRE`), the only text this needed.

**Verified:** typecheck and 1031 vitest tests green across both packages,
lint clean on every touched file. No snapshot moved — the fold changes
markup, not any string's content, so nothing pinned had reason to. The
front-door e2e audit screenshots (`screens.audit.ts`'s `front-door*`
entries) will get new baselines next run, which is the correct outcome for
a deliberate layout change, not a regression.

### Session 45 — a phone screenshot, a chased phantom, and the horizon that actually needed cutting (2026-09-03)

**Question:** Marc, from a live phone screenshot after a hard reload —
multiple shrines visible in a fresh daily's fog, make sure it resets right.

**The shrine chase came up empty, and that was the right answer.**
`destinationAt`, `destinationsWithin`, their shared `blockDestination` (which
already routes every return through `reborn`), `revealCell`'s `rearmed`
handling and `enterDaily`'s `memory: undefined` were all re-traced against
the screenshot and all correctly exclude a real shrine from a daily. The
CI/deploy backlog resolved separately this session (see below) is the more
likely explanation for what he saw — a stale cached build predating
`ef89d19`'s fix, which had been sitting on `origin/main` unable to deploy
since CI went red on 2026-09-02.

**What the screenshot actually showed, worked out together:** the "flower"
of seven hexes was the home cluster and its six legal placements (each
showing its preview worth) — completely ordinary board furniture, not a
shrine or a beacon. The scattered dots were confirmed real: caches, glowing
through fog, un-tappable until reached — also working as designed. Marc's
real objection, once the pieces were named: _"[beacon horizon] should be
much smaller in all cases, its just that in the world we get stuff that is
remembered vs daily that is always all new."_ A world's felt richness at
reach 0 comes from `remembered` ground layered over the live horizon, seen
once, on a player's first-ever run; a daily has zero memory and replays
that same "several lights already visible" moment fresh every single day,
which is what made a horizon sized for a world read as too wide for both.

**`beaconHorizon: 8 -> 4`, in `BARE_TUNING` so both world and daily inherit
it — confirmed visually, not just by the arithmetic.** Screenshotted a
fresh reach-0 shared run (no memory, same conditions a daily starts under)
at 8, 4 and 2: at 8 one real beacon was already visible with nothing
placed; at 4 and 2, nothing was, and a grown board at reach 5 still showed
real landmarks at either value, so 4 was picked as the one that visibly
clears reach 0 without being more aggressive than the evidence asked for.

**One dependency the smaller horizon broke, and a second dial that moved
with it.** `progress.test.ts` already pinned an invariant that had nothing
to do with today's change: `findSense < beaconHorizon`, because "a shimmer
that reaches the beacon horizon is a beacon with extra steps." KEEN NOSE's
old max (6, three levels at +2) already cleared the new horizon of 4 on its
own, so `UPGRADE_STEPS.sense` came down 2 -> 1 alongside it (new max 3),
keeping the same margin the design always meant to have rather than leaving
the upgrade to quietly become a second beacon system.

**One test fixture stopped proving anything, and got a new seed rather than
a patched assertion.** `store.test.ts`'s world-vs-daily shrine test names
its own contract in its failure message — "the fixture never reached a
shrine, so this proves nothing" — and at the smaller horizon, seed 11 (its
original pick) stopped tripping that self-check even at 350 placements, up
from the test's own 80. Swept ten seeds at three walk lengths; seed 23 still
finds one at 80, the original length, so that's what shipped instead of a
bigger number papering over a fixture that had quietly stopped testing what
it claimed to.

**This is a rules change, not a content one — `pnpm sim` moved and the
golden file moved with it.** `seeker` is the one scripted policy that reads
`beaconHorizon` at all (it steers toward the nearest beacon-visible
destination), so its whole row shifted: points 1162 -> 1192, reach 16 -> 14,
pops/placement 0.48 -> 0.53. Every other policy's row is untouched, which is
the correct fingerprint for a dial that only one line ever reads.

**Deploy, the other half of the ask.** Found CI on `origin/main` red since
2026-09-02 (a `payout.test.tsx` typecheck error already fixed in an
uncommitted-until-today local commit) — meaning nothing had deployed in two
days regardless of what landed locally. Committed the day's remaining work
in three pieces (a shrine-unlock-count fix already sitting in the working
tree, a daily end-screen navigation fix likewise, and this session's balance
and content work), ran the full CI-equivalent suite locally first (format,
lint, typecheck, 1031 unit tests, build, the sim diff, and the full 88-test
e2e suite — one flake reproduced as a resource-contention artifact and
confirmed clean in isolation), pushed, and watched the real CI run go green
end to end including the deploy and its `/version.json` verify. Confirmed
live at `ashwake.marcportal.com`.

### Session 46 — the legend gets one left edge, the manual unfolds, and the drip's silent half stops blocking its loud one (2026-09-03)

**Question:** Marc — in HOW TO PLAY's PLAY tab, "if we have the indent, we
have a standard on all line, so for example the destinations would have a
tile with yellow in left column"; inside EXPEDITION, "remove details and
explain each"; then review the whole manual against the engine for what is
missing or unexplained.

**Every legend row leads with a swatch now.** The grounds led with a hex and
the destinations led with a bare mark, so half the rows started a column
early. Each destination row opens with the board's own picture of one — a
hex on the wall's ground, ringed in `ink.lit`, the exact cell the
`destinations` figure draws — and the rare-tile row opens with the `rare`
figure's first cell (blue, ringed magic). The CSS escape hatch for
swatchless rows (`.legend li > .legend-mark:first-child`) had nothing left
to catch and is gone.

**WHICH GAME unfolds.** The three definitions and the share line sat behind
a DETAILS tap, on the argument that only one is about the run in front of
you — but the section exists precisely for the reader in the WRONG run, and
a definition behind a fold is one that reader never opens. Four short
paragraphs print in the open now.

**Two figures existed with pinned bilingual captions and nothing drew
them.** Figures reach a page only through `Lesson.figure`, and no lesson
carried `destinations` or `place` — so "Lit is unclaimed and still pays.
Faint means you have already spent it." (the manual's only statement of
FAINT MEANS SPENT) and "Glowing edges are where a tile may go. The faint
number is what it would pay." were written, translated, tested and shown to
nobody. The legend hangs `destinations` under THE DESTINATIONS; EXPEDITION
draws `place` under its own first claim.

**The audit's real find: the drip's toast half had no speaker, and it was
BLOCKING the card half.** `App` consumes `nextLesson` only where
`as === 'card'`; the seven toast-class moments were never spoken, never
told — and, `nextLesson` returning the first unmet-and-true moment,
`wall` (true from the first frame of nearly every run) stood permanently in
front of MAGIC, UNIQUE, LUCK, RELICS and THE COLOURS. A fresh device could
never be taught any of them, and the manual's HAND tab never grew past THE
STASH. `nextLesson` now skips toast-class moments — armed, not told, so
they fire the day the shell grows a speaker — and `teaching.test.ts` pins
both new rules, including the wall-blocks-colours regression. The fifteenth
unconsumed mechanic, and the lesson is new: **the dead thing was one BRANCH
of a consumed value — grep the branches, not only the value.** What still
needs Marc (toast wording, and the manual's remaining gaps: the cost curve,
REACH, the fog, native ground, the draw lean) is written up in `NEXT.md` §1.

**Coordinated live with two concurrent sessions** (ashwake-95, mid-flight on
the STORY card in the same files; ashwake-f6, a RAM audit) — file claims
exchanged before editing, no collisions; ashwake-95 confirmed the toast
finding independently and handed it here.

### Session 47 — the front door's own three choices, checked against what Marc actually asked for (2026-09-03)

**Question:** Marc — remove the front door's subtitle entirely (put it in
the story), give the story its own button in MORE, add a first-teaching card
that explains the story on entry, propose ten story directions, and check
BEGIN/DAILY parity plus the HOW TO PLAY / MORE / MENU / SETTINGS redundancy
Marc had been living with.

**Four of the five were already done, by whichever session left this
morning's uncommitted diff.** Read against the working tree rather than
trusted: the tagline is gone from `Strings.ts` entirely, folded into the
story's own opening line; THE STORY is a `Fold` row in the unified MENU
panel (`More.tsx`), closed by default; `.door-begin, .door-daily` in
`ui.css` already share one rule, same size and weight; and the front door /
board MENU button / end screen MENU button all open the same `More.tsx`
panel now — no separate QuickMenu drawer, no direct HOW TO PLAY or SETTINGS
doors on the front door. `CLAUDE.md`'s own rule paid off here: checked the
ledger (the diff) against the code before building anything on top of it,
rather than re-doing work that had already shipped.

**The one real gap: nothing explained the story to a stranger.** The
teaching drip (`shell/teaching.ts`) already had the shape for exactly this —
a priority-ordered list of concepts a device is told once, each a card. Added
`story` as a new `TeachId`, first in `TEACH_IDS`/`ORDER`/`CARDS` — ahead of
`place` — with `isTrue` always true, so it is the first thing any device is
ever shown. Rendered through `SaidCard` rather than `LessonCard`, on the
`purse` lesson's own precedent: it arrives with its four sentences already
written (`s.story`), so a `LESSONS` registry entry would be a second copy of
words that already have one source.

**Landed while `ashwake-f1` was mid-fix on the exact same file for the toast
jam** (see above) — file claims exchanged before either of us edited
`teaching.ts` again, and I independently hit the same toast-consumer gap
while adding `story` and handed the finding over rather than duplicate the
fix. Their rewrite of `nextLesson` (skip toast-class moments rather than let
one block every card behind it) landed on top of my `story` entry cleanly;
`teaching.test.ts` now carries both authors' pins. Re-ran the full suite
after their edit rather than assuming: 1033 tests, typecheck, lint and
`pnpm sim` against the golden file all green.

**Ten story directions given to Marc, decided nowhere** — a look/fiction
call, not a code one, so it stays a conversation rather than a NEXT.md wall
of prose. Recorded there anyway, §1, as a pointer back to this session.

**Marc answered, same session: the Inheritance direction, played subtle — a
loop only implied, never stated.** Two four-line drafts went back to him
(a quiet version and an overt "you have stood here before" version); he took
the quiet one. `story` is rewritten in `en.ts` and `fr-CA.ts`, and
`Strings.ts`'s doc comment says what changed and why it still promises
nothing the game cannot do — the ambiguity describes a thing the game
already does (a world remembers what you walked on it, across every run),
so a player who never notices the hint loses nothing. Both drafts were
written and checked against the house rule this file already carries scars
from (`text.test.ts`'s no-em-dash test, Session "review help and text
content" 2026-08-30) before either was offered, so nothing needed a second
pass. Also, on the same round of answers: LENS's toast wording ("Tap
remembered fog to light its ground") and dropping GLOW from `TEACH_IDS`
entirely (its toast duplicated the signpost's own line word for word) — the
GLOW deletion is done here (`progress.ts`, `teaching.ts`); the LENS wording
and the actual toast-speaker build, plus the four manual-gap sections Marc
also greenlit, went to `ashwake-f1`, already holding that context from
Session 46. Full suite (1033), typecheck, lint and `pnpm sim` green
throughout; nothing committed.

### Session 48 — a played run's own receipt, checked against Session 42's own fix (2026-09-04)

**Question:** Marc, from a fresh stats screen — DISTANCE 43%, TAILLE DE LA
POCHE 27%, PRIMES 25%, and matching/power/rarity/native ground combined 5% —
does this still make sense, after Session 42's pass at exactly this question?

**Answer: the runaway-single-axis problem stayed fixed, and the ask
underneath it — make identity read as more than background — ran into the
formula's own algebra rather than a missed dial.** `points = sumWorth *
sizeBonus * distanceMult * bounty`, and `pointsSplit` peels the same product
back apart, so identity's SHARE of the total is exactly `1 / (sizeBonus *
distanceMult * bounty)` — a ratio that does not depend on the worth numbers
themselves at all. No `matchValue`, `greenCrowdBonus`, rarity or native bonus
can move it a single point; only the three multiplier dials can.

A `pointsSplit` sweep (throwaway script, same technique as Session 42's
colour-share one, discarded after) across farm/bank20/rush/hoard/chooser/
seeker at 150 seeds put today's aggregate at identity 16%/distance 44%/
pocket 33%/bounty 8% under the Session 42 tuning — worse in Marc's own run
only because he chased the bounty harder than any scripted policy does (25%
against an 8% average).

**Two candidates, one shipped, one rejected on a gate.**
`distanceMultiplierCap: 1` zeroes distance's share outright but hands every
point of it to pocket (64%, identity still only 27%) and deletes DESIGN.md's
"leave — deeper maps pay more per point" pillar rather than sizing it — not
shipped. `harvestSizeBonus: 0.25` (half of Session 42's already-halved 0.5)
reads best on the sweep, identity 16% -> 25%, but broke `sim.test.ts`'s
"rewards patience" gate (bank40 stops beating bank3×1.5) and
`profiles.test.ts`'s "veteran beats naive" gate (`chooser` stops beating
`tourist`/`timid`) — caught by running the full suite before trusting the
sweep number, the same discipline Session 42's own lesson names. Identity's
share and "a big patient pocket clearly outscores a small greedy one" are the
same axis (`sizeBonus`) by construction, so pushing one further spends the
other, and the patience gate is load-bearing rather than a free knob.

**Shipped:** `distanceMultiplierCap: 2` (was 3) alone. Sweep: distance 44% ->
36%, no longer alone above pocket (39%, unmoved, by construction — patience
still has to pay); identity only moves 16% -> 16% (rounds the same at one
decimal, though every seed's own split does shift a little). `blueTideCap`
needed no change — `distanceMultiplierCap x distanceStep / blueTideEvery`
still floors to 1 at 2x3/6.

**The identity-share ask was left open here, not closed — see Session 49,
same session's continuation.** Raising it further than the small move above
with the EXISTING dials means weakening the patience/veteran gates, a real
invariant rather than a stale one. What actually closed it was a second,
additive term rather than a bigger cut of the existing ones.

**A mechanical near-miss on the way, worth naming.** The first edit
accidentally deleted `harvestSizeBonus: 0.5` from the `TUNING` override
entirely rather than leaving it — which silently fell back to `PLANE`'s
`harvestSizeBonus: 1` (the pre-Session-42 full quadratic) two lines away from
a comment describing 0.5 as shipped. Caught by `endless.test.ts`'s pinned
arithmetic failing with the wrong number (4, not the expected 3-then-2), not
by reading the diff — the harness earned its keep here.

**Verified:** full suite 722/722 (`packages/core`, this repo's count — the
1033 figure above is `apps/game`'s, a different session's number in a
concurrent worktree). `pnpm sim`'s golden moved with the tuning, every
points/relics-bearing column shifting a few points downward, `%tiles`
essentially flat (rush 81->83, trickle 81->79, others within a point),
`stalled`/`capped` at 0 throughout. `endless.test.ts`'s distance-pin updated
from ×3 to ×2 deliberately, with the reason written beside it. Nothing
committed; a large, unrelated uncommitted diff already sat in the working
tree (`apps/game/src/board/*`, `text/*`, a `sizeBonus` field on
`harvestValue`) from a concurrent session and was left untouched.

### Session 49 — identity gets a second, unmultiplied row instead of a bigger cut of the first (2026-09-04)

**Question, same session as 48, put back after the "left for Marc" answer:**
Marc — told the identity-share ask couldn't move further without weakening
the patience/veteran gates — said find a way rather than accept that.

**Answer: identity was competing with patience for the same number
(`sizeBonus`) because it was riding the same multiplied term. Giving it a
second, additive term that nothing multiplies stops the fight.** `points`
was `sumWorth * sizeBonus * distanceMult * bounty`; it is now `sumWorth *
(sizeBonus * distanceMult + identityBonusRate) * bounty` — a new dial,
`identityBonusRate`, defaulting to 0 (a byte-for-byte no-op, verified: the
full suite passes unchanged with it left at 0 before any other edit).
Matches/power/rarity/native are paid their normal multiplied share AND an
extra flat `sumWorth * identityBonusRate` on top; nothing about `pocket`,
`distance` or `bounty`'s own arithmetic changes. `bounty` still multiplies
the WHOLE catch including the new term — a collected bounty is "this pocket
is worth more," not "the size/distance part of this pocket is worth more" —
which keeps `quest.test.ts`'s `priced === plain * questBonus` invariant
intact in spirit (see below for the one rounding wrinkle it did cost).

**Swept 0 to 4 on the same 150-seed harness Session 48 built, and the sweep
LIED about the gate.** Identity share climbed smoothly and looked completely
safe at every value (16.3% at 0 up to 44.3% at 3), with a quick median-based
gate approximation reading PASS the whole way. **Running the actual
`pnpm vitest` suite — the real gate, not a stand-in for it — failed at
`identityBonusRate: 1` and still failed at `0.5`**, off by less than 0.2% at
0.5 (1265 vs a 1266.75 floor). This is the exact lesson Session 42 already
paid for once ("verify the tree, not a guess") and it had to be paid again
in the same session that wrote it down, because a NEW throwaway script is a
new place for the same mistake to hide. A finer real-suite sweep (0 to 0.4 in
steps of 0.05) found what looked like the true shape: a roughly flat ~12%
patience margin from 0 to 0.4, then a cliff to failure at 0.5. **That reading
was wrong too, and Session 51 found why:** the gate runs on `SEEDS = 6`, the
sweeps on 120–200. The cliff was six dice rolls crossing a threshold. Session
42 had written this down ("the gate's own fixed six-seed sample sits on a
knife edge") and this session read past it twice.

**Shipped `identityBonusRate: 0.4`** — the largest value swept before the
cliff, with a margin against the real gate close to the untouched baseline's
own. Combined with Session 48's `distanceMultiplierCap: 2`: identity's share
on the 150-seed sweep goes 16.3% -> 20.8%, distance and pocket both still
comfortably ahead of it (33.7%/37.0%) but no longer at Marc's original 95%-
of-everything. Full suite green, 722/722 (`packages/core`) and 1034/1034
across the workspace.

**One test needed a genuine fix, not a repin.** `quest.test.ts` asserted
`priced.points === plain.points * questBonus` — true only because, under the
old formula, `sumWorth * sizeBonus * mult` happened to be exact for this
fixture. Adding a non-integer `identityBonusRate` broke that coincidence (392
vs 390), which is `Math.floor(x) * b` disagreeing with `Math.floor(x * b)` by
the floor's own rounding, not a wrong formula. Loosened to a tolerance of
`questBonus` itself — enough to still catch a real multiplication bug, not
enough to complain about a floor doing what floors do — with the reasoning
written beside it rather than a bare number change.

**Verified:** `pnpm sim`'s golden moved again (a second `identityBonusRate`
term touches every scored line, same as `harvestSizeBonus` did in Session
42); full workspace suite 1034/1034; nothing committed yet, and the same
unrelated concurrent-session diff from Session 48 is still sitting untouched
in the working tree.

### Session 50 — "bad quality pixels" turned into a slider, not a guess (2026-09-04)

**Question:** Marc's third screenshot pass named two board complaints — "too
thick contours" and "bad quality pixels" — and only the first had been
touched. Marc, once you have looked: does letting SHARPNESS go higher than
the old guess actually read as crisper on your phone, and where should the
default sit?

**"Too thick contours" turned out to be already fixed**, by whichever
concurrent session left this morning's uncommitted diff: `board/ground.ts`'s
`hexRadiusOf` now reads `theme.board.seam` per direction instead of a
hard-coded `SEAM = 0.06`, and `tokens.ts`'s own docblock says so. Checked
against the code rather than assumed, per this file's own rule — nothing
built here duplicates it.

**"Bad quality pixels" was a real finding, and it was a documented guess,
not a bug.** `board/Board.tsx`'s `DENSE` check (landed 2026-09-02, "a
defensible default... nobody has looked") caps a phone with
`devicePixelRatio > 2` — most current phones — at 1.5 device pixels per CSS
pixel with antialiasing off, instead of its native ~3. That combination is
exactly what "bad quality pixels" describes, and per `CLAUDE.md`'s own scar
(a look change guessed at from a session that cannot see the phone cost a
bug report within the hour), it was not blindly flipped.

**Put to Marc as a scoped choice rather than fixed guesses:** where the
control lives, and what shape it takes. He asked for a slider by the camera
button, both explicitly (his own phrase: "put it in a scaler button on the
minimap itself... so users can choose their right settings") and by
overriding the corner's own "one button" history once it was surfaced
(`screens/Camera.tsx`'s own docblock names four earlier additions stripped
back out for exactly that reason).

**Built:** `board/quality.ts` holds the number and its bounds
(`DEFAULT_RENDER_SCALE` reproduces the old guess exactly, so an untouched
device renders unchanged; `MAX_RENDER_SCALE` is the phone's own
`devicePixelRatio`, capped at 3). `Board.tsx`'s `dpr` is now
`props.renderScale`-driven rather than a module constant; antialiasing stays
where it was, deliberately — it is a WebGL context flag fixed at canvas
creation, and the canvas may never remount (`CLAUDE.md`) to pick up a new
one, so the slider is honestly a resolution dial, not a full quality dial.
Persisted through `useDevice.ts` beside `theme`, same read-once/write-on-
change shape (`shell/storage.ts`'s `readRenderScale`/`writeRenderScale`). A
second small button in `.camera` (`SHARPNESS`) opens a popover with the
slider, closed by default so the corner still reads as one control at rest;
hidden outright on a phone whose own pixel ratio is already 1, where there
is nothing a slider could raise. New catalogue entry `s.ui.sharpness` in
both languages.

**Coordinated live with `ashwake-c8`**, mid-flight on moving LUCK/purse into
the same corner (`Camera.tsx`, the `<Camera .../>` call site in `App.tsx`,
and `ui.css`'s `.camera` rules) — claims exchanged over each file before
either of us touched it again, sequenced rather than merged blind. No
collisions; their `.purse-toggle` and my `.sharpness-popover` sit as
separate new rules beside the untouched shared ones.

**Verified:** full suite green both packages (`packages/core` 722/722,
`apps/game` 312/312), typecheck and lint clean, `pnpm sim` unchanged by this
work (it touches board/text only). Nothing committed — the same
unrelated concurrent diff from Sessions 48-49 is still sitting untouched in
the working tree, now joined by this session's own board/text/shell files.

### Session 51 — a run's whole score, measured for the first time, and the gate that was six dice rolls (2026-09-04)

**Question:** Marc, after Sessions 48–49 — _"tile placement (which color)
should remain the core thing, as well as 'where am i going? shrines?
biomes? etc.' then I like factoring luck and uniques/magic in for
'gambling-style' odds. Hoarding a big pocket should still feel good. anything
we should change towards these goals? be thorough"_ — then, offered four
builds: _"more rebalance towards what gives points is more what I meant"_,
and on TREASURE, _"dont reintroduce it"_. So: numbers, not mechanics.

**Answer: the biggest single channel in the game had never been on a
breakdown.** Every share quoted in Sessions 42, 48 and 49 was a share of
HARVEST points — `pointsSplit`'s seven rows. A run also banks site payouts
on the spot and, at the end, `reach × endReachBonus + claims ×
endClaimBonus` (Marc's own screenshot: PORTÉE 18 × 40 = +720, RÉCLAMÉS
5 × 60 = +300). Measured against a run's TOTAL for the first time (120 seeds
× 6 policies): identity 12%, pocket 21%, harvest-distance 19%, bounty 4%,
site 3%, claims 6%, and **the reach bonus 34%** — a third reward for the
same walk the harvest multiplier and every site already pay for, and larger
than any harvest row. Against Marc's ordering it was upside down: placement
12%, going far 56% in three coats.

**Shipped, all `content/tuning.ts`, no mechanic added or removed:**

- `endReachBonus 40 -> 20`, `endClaimBonus 60 -> 100`. Reach 34% -> 19%,
  claims 6% -> 10%. Reach 0 was swept and rejected: `tourist` — the profile
  whose whole score is the horizon — scored 0, and the ending's PORTÉE line
  would have gone blank.
- `identityBonusRate 0.4 -> 1.0`. Halving reach is what paid for it: ~400
  points of reach was a constant added to patient and greedy runs alike, so
  removing half WIDENED the patience ratio (x1.12 -> x1.20 at 200 seeds)
  instead of spending it. Identity 12% -> ~22% of a run, the top-tier
  channel beside pocket (23%) and harvest-distance (21%).
- `rareBonusRate: 3`, a new dial — a flat jackpot on the worth of a pocket's
  magic/unique tiles, neither size nor distance touching it, a bounty still
  multiplying the whole catch. The odds stay rare on purpose and "UNIQUE
  counts DOUBLE" stays as written in both catalogues; what changes is the
  payout when one lands. `rare` 1.6% -> 7.3% of harvest points; a pocket
  carrying a rare pays x2.6 a plain one per tile (was x2.1). Patience barely
  notices (x1.118 -> x1.103) — a 3% draw is a jackpot, not a strategy.

**The receipt had to learn two words, fr-CA first.** The pop line prints its
whole recipe so the arithmetic on screen sums to the number on screen
(2026-09-02), and `+2 pts = worth 1 × size bonus 1 × distance 1` had stopped
summing the moment `identityBonusRate` was non-zero — hidden at 0.4 only
because `Math.floor` ate the fraction in the pin's fixture. `harvestValue`
exposes `rareWorth`, the three catalogue functions take `placedRate` and
`rare`, and the sentence brackets the sum when a bounty multiplies it:
`(valeur 3 × bonus de taille 2 × distance 1 + valeur 3 × 1 pour la pose +
valeur rare 2 × 3 en gros lot) × PRIME 3`. Both `prose.pin` snapshots were
re-recorded deliberately; the diff is exactly the `TUNING` lines gaining
`+ worth 1 × 1 for the placing`, and the bare-economy lines are untouched.

**And the gate was six dice rolls.** Sessions 42, 48 and 49 all hit the same
wall — a 200-seed sweep says a dial is fine, the real test fails; a 6-seed
"cliff" at `identityBonusRate: 0.5` was written up here yesterday as median
discreteness. `sim.test.ts` and `profiles.test.ts` run their gates on
`SEEDS = 6`. Session 42 had said so in words ("the gate's own fixed six-seed
sample sits on a knife edge"), and this session read past it twice before
grepping the constant. Both files are `SEEDS = 40` now, still well under
their 60 s timeouts, with the reason beside them: a failure should mean the
economy moved, not the sample. Every gate passes at 40 with the values above
— and the 200-seed sweep already said it would.

**Verified:** `packages/core` 722/722, workspace 1034/1034, typecheck and
lint clean, format clean on every file of this session's (the one Prettier
complaint left is the concurrent session's `shell/storage.ts`). `pnpm sim`
golden moved with the tuning — every scored line down a little with half
the reach bonus gone, `tourist` 880 -> 440, `%tiles`, `relics`, `stalled`
and `capped` flat. `quest.test.ts`'s bounty invariant and `endless.test.ts`'s
near/far pin both updated with their reasons. Throwaway sweep scripts
deleted, not committed. Nothing committed; the concurrent session's diff is
still in the working tree beside this.

### Session 52 — four sessions' work landed, and the cap that was sized for the old sample (2026-09-04)

**Question:** the session before this one hit its limit and crashed with
everything still in the working tree. Does a tree four sessions deep, written
up but never committed, actually hold together as ONE state — and does it get
through CI?

**Answer: yes, on the second push, and the one thing that failed was not the
economy.** The tree was intact: Sessions 48–51's core rebalance, Session 50's
SHARPNESS slider, and a concurrent session's board/corner work, all uncommitted
beside ledgers that already described them. Verified as one state before
committing rather than trusting the write-ups — `format:check`, `lint`,
`typecheck`, 1034/1034 unit, 89/89 Playwright, `pnpm sim` byte-identical to the
golden it had moved to, and `pnpm bake` clean and producing no diff.

**The completeness checks were run over the code, not over the log**, per this
file's own rule. Every new export, field, optional input and catalogue string
was grepped for a consumer: `quality.ts` → `App` → `Camera`/`Board` →
`useDevice` → `storage` all connected, `fmt1`, `lesson.pop.when`,
`bountyReadySingle`, `s.ui.sharpness`, `harvestValue.sizeBonus` and `rareWorth`
each with a real reader. `pointsSplit`'s algebra was checked by hand rather
than assumed: the seven source rows, the four colour rows and the three rarity
rows each sum to `beforeBounty × bounty`, so the receipt still adds up to the
number it prints. One flaw fixed — a lost paragraph break in `tuning.ts` had
welded the `quest.test.ts` rounding note onto the end of the six-seed sentence.

**CI went red on `84d5d9c`, and it was a wall clock rather than a rule.**
`sim.test.ts`'s heaviest gate — "gives every policy a run that ends by itself",
which plays every policy in `POLICIES` — timed out at 60s with all 1033 other
tests green and every assertion in it still true. Session 51 had raised `SEEDS`
6 → 40 for a good reason and left `SIM_TIMEOUT` at 60s: nearly seven times the
work under a cap sized for the old sample. **The file's own docblock had
already measured that runner at about eleven times a desktop and written down
why this exact failure is the worst kind** — "a test that fails on the runner's
mood rather than on the code is a test nobody can read" — and then the sample
grew underneath the number that paragraph was defending. A docblock that names
a hazard does not defend against it; the number does.

**Fixed by the cap, not by the sample** (`23f38c3`): both gate files to 240s,
sized against the runner. Lowering `SEEDS` back would have changed what the
gates assert against, and Session 51 verified the economy at 40 — the timeout
changes nothing about the rules. `profiles.test.ts` raised with it rather than
left for a slower runner day: its tests were already reaching 25s against the
same 60.

**Verified:** CI green on `23f38c3`, both jobs — `ci` and `deploy`. `pnpm
verify:deploy` confirms https://ashwake.marcportal.com serves `23f38c3`, with
every bundle, font, chrome face, icon and the stamped service worker live.
NEXT.md's "not yet committed" claim is corrected in the same commit as this
entry.

**Left for Marc, unchanged:** SHARPNESS wants a phone and an eye (§1), and so
does the rebalance — a receipt with a placing row and a jackpot row on it is a
number until somebody plays a run and reads it.

### Session 53 — a grey shrine that was never grey, and two look questions a phone finally answered (2026-09-05)

**Question:** Marc, back from a phone with three things — the SHARPNESS popup
drawn behind its own buttons, "the 3d vs 2d grey'd shrine problems" still
there with a flat shot and a tilted shot to prove it, and "Crisper (3 or more)
was good". Two of those are looks and one is a bug. Which is which, and can
the bug be found by MEASURING a screenshot rather than by reasoning about it?

**Answer: yes, and reasoning about it got the wrong cause twice first.** The
grey shrine was reproduced in the first pass — the same cache mark, cream at
`tilt=0` and grey at `tilt=35`, on the same hex of the same seeded board — and
then three hypotheses were tried and killed by experiment rather than by
argument:

1. **Anisotropy.** `surfaces.ts` gives the ground the renderer's cap and says
   in its own opening why a texture on a prism needs it; `marks.ts`, written
   beside it, never took the same line. Plausible, and the ring (a
   `surfaces.ts` texture) staying bright while the mark inside it went to mud
   looked like proof. Added it — the mark got no brighter.
2. **Z-fighting** with the cap the mark lies on. `LABEL_LIFT` raised from 0.02
   to 0.25, twelve times the clearance: no change at all.
3. **Mipmaps** eating a thin bright glyph into its own dark halo. Disabled
   them outright on marks: no change, and the same grey to the byte.

**What found it was arithmetic on the pixels.** The tilted mark's brightest
pixel is `(83, 78, 69)` and the flat one's is `(242, 230, 207)` — which is
`0xf2e6cf`, `theme.ink.ink`, exactly. `inkDim`, the SPENT ink this looked like,
is `0xbfae92` and is nothing like either. So the ink never changed; the mark
was being blended. Solving `a x 242 + (1 - a) x 20 = 83` gives `a = 0.28`, and
`settlement`'s `beaconFade` is **0.72**. `render/materials.ts` gives a beacon's
disc `alpha: theme.board.beaconFade` and gives an alpha to nothing else on the
plane — so the one see-through ground on the board was painting itself over
the mark standing on it, at exactly the strength the palette says.

**Why the camera changed it, and why per-instance depth could not save it.** A
translucent disc and the mark above it are both in three's transparent pass,
sorted by distance — and the ground is an INSTANCED mesh, one object sorted
once by its own origin, so which of a hundred beacons is nearer counts for
nothing. Flat on, the mark won that sort; tilted, the disc did. That is also
why the symptom was a STEP and not a slope: `tilt=10` and `tilt=35` measured
identically, because an order either flips or it does not. **Fixed with
`MARK_ORDER = 1`** — `renderOrder`, not `depthTest: false`, because a mark
should still be hidden by a wall standing in front of it. All three tilts now
sample `0xf2e6cf`.

**The 2026-09-04 billboard was aimed at this same symptom and missed it.**
`Labels.tsx` already carried a note about a beacon's star "compressing to a
smudge no ring colour can rescue" at a shallow angle, and billboarded beacon
marks to fix it. The geometry was never the problem; the sort was. A symptom
seen on a phone and explained from a desk gets a plausible cause, and a
plausible cause ships.

**The anisotropy was kept and its docblock rewritten to say so.** It is right
on its own terms — marks lie flat exactly as the ground does, this renderer
reports a cap of 16, and the parity with `surfaces.ts` was a genuine gap — but
the paragraph written for it while it was still the hypothesis claimed it
explained the grey, and that is false. It now says what it is and what it is
not. **A comment that asserts an invariant is not the invariant**, and one
written mid-hypothesis is the easiest kind to leave behind lying.

**SHARPNESS answered by looking**, which is the whole reason the slider was
built rather than the guess moved: `DEFAULT_RENDER_SCALE` is `MAX_RENDER_SCALE`
now, the phone's own ratio capped at 3. It is a four-times pixel cost on every
dense phone, and the slider is the way back down.

**The popup was NOT reproducible, and is shipped as a theory rather than a
fix.** Chromium at 3x, portrait, draws it correctly above the row; Marc's
phone draws the buttons on top. The one construct that can do that is
`z-index: calc(var(--z-drawer) + 1)` — `z-index` takes an <integer>, `calc()`
yields a <number>, and a browser that declines the pair drops the declaration,
leaving `.camera` with no stacking context at all. It is a real rung on the
ladder now (`--z-camera`), and the popover carries the same rung so it is right
whether or not that context exists. **Three more `z-index: calc()` rules are
still in the file and were deliberately left alone** (`NEXT.md` §1): changing
four rules on an unconfirmed theory is how a guess becomes four guesses.

**Verified:** format, lint, typecheck, full unit suite and the Playwright
suite green; `pnpm sim` untouched (no core file moved); the fix measured rather
than eyeballed, three tilts sampling the same ink to the byte.
