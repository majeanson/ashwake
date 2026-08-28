# STATUS.md — checkpoint ledger

What is DONE and VERIFIED, so future work starts from trust instead of
re-checking. Updated at checkpoints only. The reasoning lives in `LOG.md`; the
rules in `CLAUDE.md`.

Last checkpoint: **2026-08-28, later — Stage 1b: the core speaks two languages,
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

Stages 2–6 of `ROADMAP.md`: the 3D board, the React chrome, the shell and PWA,
the look, the playtest console and the two phone sessions. `theme/apply.ts`
(sets CSS variables on `document`) was deliberately left in Ashwake 1; the app
will grow its own edge for it in Stage 3.
