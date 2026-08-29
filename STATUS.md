# STATUS.md — checkpoint ledger

What is DONE and VERIFIED, so future work starts from trust instead of
re-checking. Updated at checkpoints only. The reasoning lives in `LOG.md`; the
rules in `CLAUDE.md`.

Last checkpoint: **2026-08-29, last — Stage 4 (most of it): a run counts, and
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
colour lens was dead code the shell passed `null` to. **Verified:** 823 tests /
54 files; typecheck, lint, format, build clean; golden sim byte-identical.
**Still not played on a phone.**

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
- **S5 — the look.** The parked "settlement" reading of the colours (FARM ·
  MARKET · QUARRY · ROADS), built as a fourth direction beside the three that
  ship, shot, and picked on a phone.
- **S6 — the console, Session A on v2, then the stranger.** `/playtest` with
  COPY SHEET; Session A re-run against the deployed v2; fixes; Session C.
- **The screen audit harness** (`pnpm audit:screens`), owed since S3 and
  cheapest built beside the screens rather than after them.

Marc's own list, which no amount of building here clears: set
`CLOUDFLARE_API_TOKEN` with `--body` (the interactive prompt took an EOF and
the secret is EMPTY, so the deploy job cannot run); pick the look numbers on a
phone; read the French; then Session A, then the stranger.
