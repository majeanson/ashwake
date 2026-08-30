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
