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

_(Answer written after the work.)_
