# STATUS.md — checkpoint ledger

What is DONE and VERIFIED, so future work starts from trust instead of
re-checking. Updated at checkpoints only. The reasoning lives in `LOG.md`; the
rules in `CLAUDE.md`.

Last checkpoint: **2026-08-28, last — Stage 2b: the board has depth, and no
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

Stages 3–6 of `ROADMAP.md`: the React chrome, the shell and PWA, the look, the
playtest console and the two phone sessions. `theme/apply.ts`
(sets CSS variables on `document`) was deliberately left in Ashwake 1; the app
will grow its own edge for it in Stage 3.
