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
