# IMPROVEMENTS.md — the broad pass, item by item

Opened 2026-09-02, on Marc's ask for _"improvements to what we already have —
UI/UX and beyond"_, with **no new features and no new logic**. The rules are
frozen: `pnpm sim` stays byte-identical to `packages/core/sim.golden.txt`, and
nothing in this file changes engine behaviour.

This is a **living checklist**, not a record. `STATUS.md` is what is done and
verified; `LOG.md` is the reasoning; this file exists only so a pass this wide
is resumable across sessions. When every row is `done`, fold the lessons into
`LOG.md` and `STATUS.md` and delete the rest.

**Check a row against the code before acting on it** — the standing rule, and
this file is exactly the kind of open-list `NEXT.md` warns about.

## How to read a row

- **id** — batch and item. Batches land in order; each batch is one commit.
- **status** — `open`, `done`, or `ruled` (a look decision taken and stated).
- **where** — the file, and the line it was found at. Lines drift; the symbol
  named beside them does not.

Three rulings from Marc govern this pass:

1. Land all of it, tracked here so the work is resumable.
2. **Turn the React Compiler on.** It is referenced throughout as a constraint
   and is not installed — only its lint rules are.
3. **Resolve look findings with a defensible default**, landed and stated,
   rather than deferring them to a phone.

On (3): `CLAUDE.md` says a guessed look change cost a bug report within the
hour. Marc has overridden that for this pass. What survives is the discipline
of **saying what was picked and why**, at the declaration and in `LOG.md` — so
each look row names its default and its argument, and any row that changes the
board's silhouette or the first minute gets its own commit so it can be
reverted alone.

---

## Batch 1 — the things that are actually broken

| id    | status | statement                                                                                                                             | where                                                   |
| ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| B1.1  | done   | `.quiet` has no rule; two buttons wear it and render at full weight, under a comment claiming it "already carries that voice"         | `ui.css:2088`, `EndScreen.tsx:385`, `FrontDoor.tsx:144` |
| B1.2  | done   | `.fame-shot` has no rule — an unconstrained board screenshot forces horizontal overflow on a phone                                    | `Fame.tsx:203`                                          |
| B1.3  | done   | the `<Canvas>` unmounts on a 0-width measure, taking the WebGL context. **Violates a hard rule in `CLAUDE.md`**                       | `Board.tsx:421`                                         |
| B1.4  | done   | the resize handler writes fractional `contentRect` unconditionally — a collapsing URL bar re-renders the Canvas subtree per sub-pixel | `Board.tsx:281`                                         |
| B1.5  | done   | two `setTimeout`s survive their run: POP then NEW RUN lands the previous run's receipt over the new board                             | `App.tsx:1410`, `App.tsx:1468`                          |
| B1.6  | done   | a card taller than the viewport puts GOT IT off-screen with no scroll; `.end` and `.front-door` already solved this                   | `ui.css:396`                                            |
| B1.7  | done   | MENU goes inert while its own menu is open; keyboard focus drops to `<body>` and `dialog.tsx:110` then focuses an inert element       | `App.tsx:2392`                                          |
| B1.8  | done   | the hand stays tabbable behind the quick menu's scrim — taps are blocked, tab order is not                                            | `Menu.tsx:119`                                          |
| B1.9  | done   | SEND cannot be retried after failure, on the screen whose purpose is getting the report out                                           | `Settings.tsx:149`                                      |
| B1.10 | done   | SHARE never returns to SHARE — `said` is set to COPIED and never cleared                                                              | `EndScreen.tsx:159`                                     |
| B1.11 | done   | two toasts stack on identical pixels                                                                                                  | `App.tsx:2840`, `App.tsx:2861`                          |
| B1.12 | done   | the `visit()` return timer is never cleared on unmount                                                                                | `Board.tsx:764`                                         |
| B1.0  | done   | **`pnpm typecheck` was red on `main`, and CI gates on it** — `payout.test.tsx` never passed `Payout` the `points` and `reach` it grew | `payout.test.tsx:98`                                    |

### What Batch 1 changed its mind about

**B1.0 was not in the plan, and it should have been the first line of it.**
`pnpm typecheck` — step three of five in `.github/workflows/ci.yml`, before
`test`, `build`, the e2e suite, the golden and the bake — does not pass on
`main`. `Payout` grew `points` and `reach` when the ending learned to account
for the reach bonus (`c929c0d`); its test kept rendering the old four props,
and nothing caught it because **`vitest` does not typecheck**, so all 1091
tests stayed green over five type errors. Verified by stashing this batch and
running it on a clean tree. Fixed here because every other row in this file is
verified by a command that cannot run until it is.

**B1.7 and B1.8 were one bug, and it was not where the plan said.** The plan
proposed excluding the quick drawer from the board host's `inert` condition.
That would be wrong: a scrim is over the board while the drawer is open and
nothing behind it should be actable, so `inert` there is correct. Looking at
what actually fails instead:

- `focusOpener` called `.focus()` **inline, inside the click handler**, one
  commit before React removes `inert` — and `focus()` on an inert element is a
  silent no-op. So focus fell to `<body>` when **any** panel closed, not just
  the drawer. Fixed in `ui/dialog.tsx` by recording the wish and spending it in
  an effect. One fix, every panel.
- The drawer took no focus of its own on the way in. Fixed in `screens/Menu`,
  first item, per the menu pattern.
- And the hand was tabbable behind **every** panel, not only the drawer —
  `{playing && …}` carried no `inert` at all, so a Tab out of the manual landed
  on POP and SACRIFICE under an opaque page. Fixed with a `display: contents`
  wrapper that takes the attribute and gives the layout nothing.

## Batch 2 — the instrument, so the rest can be judged from pictures

| id   | status | statement                                                                                                                              | where                        |
| ---- | ------ | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| B2.1 | done   | **photograph the teaching drip.** Every fixture carries `taught=1`, and the file says why — so the first minute has never been shot    | `e2e/audit/screens.audit.ts` |
| B2.2 | done   | six unphotographed surfaces: quick menu, THIS DEVICE, the daily, the directions picker, the board with a lens on, the routine pop line | `e2e/audit/screens.audit.ts` |
| B2.3 | done   | a French pass. French is the shipping default, runs ~20% longer, and the clipped/overflow checks have never run against it             | `e2e/audit/screens.audit.ts` |
| B2.4 | done   | a 320px pass on the board and the action bar — `STATUS.md` records 320×568 measurements taken by hand and never pinned                 | `e2e/audit/screens.audit.ts` |
| B2.5 | open   | regenerate `audit-shots/` and `report.md`                                                                                              | —                            |

### What Batch 2 changed its mind about, and what it found

**`teaching-first` was the wrong name for the right screen.** It was written
to wait for the card a stranger meets after BEGIN, and there is no card: **the
teaching drip fires on ACTIONS, not on arrival.** So the first thing a stranger
sees after pressing BEGIN is an empty board with no instruction on it at all.
That is a screen worth a picture and it is not the picture the name promised;
it is `teaching-board` now, and `teaching-placed` plays with the keyboard
**until** the game teaches something, because which placement first says
anything is a property of the board rather than a number this file may assume.

**The instrument overwrote its own record, and did it in this session.**
`afterAll` writes `report.md` unconditionally, and Playwright runs it after a
filtered run exactly as after a whole one — so
`playwright test -g "one · test"`, run to debug a single screen, silently
replaced the committed table with an empty one. The header now says how many
of the expected screen-visits actually happened, and a run that gathered
nothing leaves the file alone.

**And the finding count FELL, which is the fix showing up in the instrument.**
132 → 34 across more screens, and the drop is B1.8: `audit.ts` skips anything
inside `[inert]`, and until this pass the hand was not inert under an open
panel. Every panel screen had been measuring the four cards and the purse rows
BEHIND it — controls a player cannot reach — and counting them as findings.

## Batch 3 — accessibility

| id    | status | statement                                                                                                                         | where                                             |
| ----- | ------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| B3.1  | done   | `role="tablist"` with no tabpanel, no `aria-controls`, no roving tabindex, no arrow keys                                          | `ui/Tabs.tsx:34`                                  |
| B3.2  | done   | `aria-pressed` on a `role="menuitem"` is invalid — the sound toggle's state is silently dropped                                   | `Menu.tsx:125`                                    |
| B3.3  | done   | shop buttons are named by a bare number; the relic balance announces as "412"; an `<h2>` reads "3/5"                              | `Shop.tsx:80`                                     |
| B3.4  | done   | the end screen has no `h1`                                                                                                        | `EndScreen.tsx:192`                               |
| B3.5  | done   | heading skip in the manual's PLAY tab — `h3` under Panel's `h1`                                                                   | `Legend.tsx:70`                                   |
| B3.6  | done   | three live regions are inserted at the moment they gain content — the exact rule `Device.tsx:52` states                           | `App.tsx:2840`, `App.tsx:2861`, `ui/Card.tsx:127` |
| B3.7  | done   | a brief card is a live region holding a button that vanishes under the focus                                                      | `ui/Card.tsx:122`                                 |
| B3.8  | done   | a raised panel does not take focus, though `dialog.tsx:141` supports raising an already-open one                                  | `Panel.tsx:41`                                    |
| B3.9  | done   | `.term` is the one undeclared sub-44px exemption                                                                                  | `ui.css:707`                                      |
| B3.10 | done   | the focus ring is invisible on the six loudest controls — accent-on-accent. **Default: contrasting offset + a `--bg` inner ring** | `ui.css:122`                                      |
| B3.11 | done   | `aria-pressed` on disabled feature switches loses the state                                                                       | `Settings.tsx:178`                                |
| B3.12 | done   | `.quick-scrim` is a bare clickable div — the only non-button clickable in the chrome                                              | `Menu.tsx:119`                                    |

## Batch 4 — the board

| id    | status | statement                                                                                                                            | where                                         |
| ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| B4.1  | open   | `paintPlan` + `planKey` run once per **cell**, not once per surface — ~500 plan graphs and ~300 KB of transient JSON per view change | `board/ground.ts:88`                          |
| B4.2  | open   | the beacon breath pins the board at 60 fps for the whole run, and recomputes `cellTint` per instance per frame                       | `HexField.tsx:183`                            |
| B4.3  | open   | the same per-instance `cellTint` recompute, at the busiest moment on the board                                                       | `Pop.tsx:208`                                 |
| B4.4  | open   | every batch is allocated capacity for the whole board — ~780 KB of GPU buffers, >95% never drawn                                     | `HexField.tsx:263`, `Pop.tsx:267`             |
| B4.5  | open   | the keyboard marker is geometrically **inside** its taller neighbours and invisible on most sides                                    | `HexField.tsx:317`                            |
| B4.6  | open   | no WebGL context-loss handling exists anywhere; three module-level GPU caches would survive a restore holding dead handles           | `glow.ts:19`, `marks.ts:44`, `surfaces.ts:30` |
| B4.7  | done   | `material.dispose()` inside a `useMemo`, with a ref mutated during render, under StrictMode                                          | `resources.ts:51`                             |
| B4.8  | open   | Pop builds and destroys 6 prism geometries per harvest                                                                               | `resources.ts:40`                             |
| B4.9  | open   | `frame` and `focus` recompute on every half-degree — ~4 passes over every cell, up to 720 times per full turn                        | `Board.tsx:535`                               |
| B4.10 | open   | `apply()` reallocates every frame whether or not anything moved                                                                      | `Board.tsx:644`                               |
| B4.11 | open   | one `planeGeometry` + one material per mark                                                                                          | `Labels.tsx:152`                              |
| B4.12 | open   | `tap()` mints a new handler per mesh per render — R3F re-registers on ~20 meshes every 0.5° of orbit                                 | `HexField.tsx:218`                            |
| B4.13 | open   | `setAnisotropy` mutates textures without `needsUpdate` — works today only by render order                                            | `surfaces.ts:39`                              |
| B4.14 | open   | ground materials are the only ones without `toneMapped: false`                                                                       | `resources.ts:85`                             |
| B4.15 | ruled  | `visit()` is not honoured by `reducedMotion` — the excursion becomes two teleports. **Default: skip the excursion entirely**         | `Board.tsx:756`                               |
| B4.16 | ruled  | no low-end path. **Default: cap dpr at 1.5 above devicePixelRatio 2, drop MSAA at dpr ≥ 2**                                          | `Board.tsx:426`                               |

## Batch 5 — shell correctness

| id    | status | statement                                                                                                                            | where                                                       |
| ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| B5.1  | done   | the crossing reads three different copies of the world, under a comment saying they are "the same number by construction"            | `shell/cross.ts:16`, `App.tsx:707`, `App.tsx:2885`, `:1834` |
| B5.2  | done   | `useLedgers`' change-stamp is a hand-kept list that has missed four writers — the argument `dialog.tsx:27` makes, one file later     | `App.tsx:1078`                                              |
| B5.3  | done   | the five run-doors each reset a different subset; `takeCrossing` skips three refs, and `newRun` never calls `beginRun`               | `App.tsx:437`                                               |
| B5.4  | done   | `createSession` runs inside a `useMemo` with side effects — mints a seed, writes localStorage, walks the reducer, during render      | `App.tsx:593`                                               |
| B5.5  | done   | `onShed` is a single-slot registry with no cleanup, and can be invoked from render via B5.4                                          | `App.tsx:567`                                               |
| B5.6  | done   | the cleanup captures the first keeper, so after any `move()` the current one is never dropped and the original is dropped twice      | `useDevice.ts:173`                                          |
| B5.7  | done   | a ref read during render inside a `useMemo` that does not list it                                                                    | `useDevice.ts:289`                                          |
| B5.8  | done   | everything is decoded twice at boot — `useState(read)` plus an effect that re-reads                                                  | `ledgers.ts:46`                                             |
| B5.9  | done   | `worker.ts` returns no teardown, so its interval and listener have no cleanup                                                        | `worker.ts:57`, `App.tsx:495`                               |
| B5.10 | done   | `useDoor` returns fresh closures every render and its Escape effect depends on `stack` — eight doors rebinding on every stack change | `dialog.tsx:236`                                            |
| B5.11 | done   | a dependency listed that is never read                                                                                               | `App.tsx:756`                                               |
| B5.12 | done   | the update toast reloads without flushing the keeper — up to 400 ms of play lost                                                     | `App.tsx:2841`                                              |
| B5.13 | done   | a totally-failed write is silent; the run in progress is lost and nothing tells the player                                           | `storage.ts:212`                                            |
| B5.14 | done   | `writeShopLevels` stringifies inline while its reader correctly uses `parseShopLevels` — asymmetric trust boundary                   | `storage.ts:319`                                            |
| B5.15 | done   | share failures are invisible; `share()` already returns `'failed'`                                                                   | `main.tsx:33`                                               |

### What Batch 5 found that the plan did not

**The rules of hooks were scoped to `*.tsx`.** `eslint.config.js` says _"the
rules of hooks, on the chrome"_ — and four of this app's hooks have no JSX in
them, so they were never read: `shell/useDevice.ts` (300 lines, every piece of
device state and the keeper's whole lifetime), `shell/useMedia.ts`,
`shell/ledgers.ts`, and `board/resources.ts`'s material cache. **The file with
the most hook logic in the build was the file the lint did not open.** Widened
to `{ts,tsx}`; it found four things immediately, all fixed here: B5.6, B5.7,
B4.7, and two cascading renders on the boot path (`useMedia`'s subscribe-time
`setState`, now `useSyncExternalStore`; `board/assets.ts`'s reset of the
default `?art=0` path, now derived).

**Nothing sets `Said.brief`.** Found walking the optional fields —
`CLAUDE.md`'s own newest rule, and the same blind spot `perkAt` hid in. The
whole brief-card path is unreachable from the running game: `.card-scrim.brief`
and `.card-scrim.brief .card` in `ui.css`, `BRIEF_MS` and the pointerdown
dismissal in `ui/Card.tsx`, the "takes no focus" rule, `SaidCard`'s `brief`
prop. The harvest branch its docblock names is the branch that STOPPED setting
it, on 2026-08-30, when a routine pop became a line over the board.

**Left in place rather than cut, and this one is genuinely Marc's** — "is there
any receipt this game wants to show and not make the player dismiss?" is a
question about how the board should feel, and the answer decides whether this
is dead weight or a mode to wire back up. Stated at the declaration
(`shell/store.ts`) and in `NEXT.md`.

## Batch 6 — the compiler, memoisation, and App.tsx

`babel-plugin-react-compiler` is in no `package.json` and no `node_modules`;
`vite.config.ts:163` is a bare `react()`. What **is** on is
`eslint-plugin-react-hooks@7` recommended, whose compiler-derived rules are
disabled only for `board/`. So the constraints the code reasons about are real
and enforced, and the auto-memoisation is absent — which is why a toast
re-renders the 3D board today. The tree is already written to be
compiler-safe, because those lint rules have been enforcing exactly that.

| id   | status | statement                                                                                                                          | where                |
| ---- | ------ | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| B6.1 | open   | install and configure the React Compiler; verify with the healthcheck, the e2e suite, and a before/after Profiler trace on a toast | `vite.config.ts:163` |
| B6.2 | open   | fix whatever the healthcheck rejects; opt a file out explicitly, with the reason at the top, if it cannot compile                  | `board/`             |
| B6.3 | open   | `memo()` on `Board` regardless, and lift speech into a `<Speech>` subtree so it cannot reach the R3F tree                          | `App.tsx`            |
| B6.4 | done   | extract `shell/beginning.ts` — one `enterRun(...)` every door calls. Closes B5.3                                                   | `App.tsx:437`        |
| B6.5 | open   | extract the rest, following the `shell/signpost.ts` convention (pure decision out, wiring thin)                                    | `App.tsx`            |
| B6.6 | open   | `StringsContext` + `ThemeContext` — `s` reaches 15 components, `theme` 11; `EndScreen` takes 18 props                              | `App.tsx`            |
| B6.7 | open   | move the historical half of the docblocks to `LOG.md` — ~1,100 of 2,928 lines are dated changelog                                  | `App.tsx`            |

## Batch 7 — tokens, consistency, and the catalogue

### Tokens

| id   | status | statement                                                                                                                             | where                                 |
| ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| B7.1 | open   | name the z-index ladder — nine implicit tiers, three owners tied at 15 with source order breaking it                                  | `ui.css`                              |
| B7.2 | open   | `44px` typed literally in five places instead of `var(--tap)`                                                                         | `ui.css:2015`, `2034`, `2057`, `2202` |
| B7.3 | ruled  | five competing border radii. **Default: `--radius` for controls, `--radius-sm: 4px` for swatch-sized things**                         | `ui.css`                              |
| B7.4 | open   | `.end-map` is the only bordered block with square corners                                                                             | `ui.css:2447`                         |
| B7.5 | open   | `letter-spacing: 0.08em` typed instead of `--label-tracking`                                                                          | `ui.css:1823`, `1832`                 |
| B7.6 | open   | two spacing scales — `--gap` alongside ~30 hand-typed values, and the half-gap idea expressed twice                                   | `ui.css`                              |
| B7.7 | open   | one `--measure`: `34rem` typed three times, and the ending's fact grid visibly inset inside its own section                           | `ui.css:1205`, `1668`, `1304`         |
| B7.8 | ruled  | six theme tokens emitted and read by nothing, under a comment saying they exist "for the manual's figures". **Default: make it true** | `theme/css.ts:90`, `Figure.tsx:86`    |

### Layout

| id    | status | statement                                                                                                    | where                         |
| ----- | ------ | ------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| B7.9  | open   | **every panel section is indented 2rem for a mark it doesn't have** — the single most visible layout finding | `ui.css:506`                  |
| B7.10 | open   | `.act` labels can neither wrap nor clip, and French is the long language                                     | `ui.css:1582`                 |
| B7.11 | ruled  | the stat row clips French mid-glyph; a half-drawn É reads as a rendering bug. **Default: ellipsis**          | `ui.css:948`                  |
| B7.12 | open   | missing `min-width: 0` on flex children holding text                                                         | `ui.css:1722`, `2241`, `2106` |
| B7.13 | open   | `.card-scrim` ignores the safe-area insets while six other containers handle them                            | `ui.css:396`                  |
| B7.14 | open   | `.spends` and `.quick` are the same drawer declared twice                                                    | `ui.css:1205`, `1668`         |
| B7.15 | open   | `.door-begin` at 320px in French survives only by wrapping to two lines                                      | `ui.css`                      |

### Motion

| id    | status | statement                                                                                                                   | where       |
| ----- | ------ | --------------------------------------------------------------------------------------------------------------------------- | ----------- |
| B7.16 | ruled  | **seven controls give no press feedback under reduced motion.** **Default: a `color-mix` lift, graded against the budgets** | `ui.css`    |
| B7.17 | open   | `color` is never transitioned, so selection snaps while its border animates                                                 | `ui.css`    |
| B7.18 | ruled  | no `:hover` anywhere in 2515 lines. **Default: one `(hover: hover)` border-colour acknowledgement**                         | `ui.css`    |
| B7.19 | ruled  | the stylesheet promises an arrival it never implements. **Default: one shared 140 ms rise, inside the no-preference guard** | `ui.css:89` |
| B7.20 | ruled  | disabled purse rows may fall under contrast. **Default: `--ink-faint`, already held at 4.5:1, instead of `opacity`**        | `ui.css`    |

### Dead and duplicated

| id    | status | statement                                                                                                      | where                                                  |
| ----- | ------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| B7.21 | open   | `.toast` declared twice; the orphaned `min-height` is why `.toast:empty` is needed at all                      | `ui.css:981`, `1032`                                   |
| B7.22 | open   | `.panel-back` declared twice and the first is dead                                                             | `ui.css:320`, `2229`                                   |
| B7.23 | open   | six classNames with no rule — plus `.quiet` from B1.1                                                          | `ui.css`                                               |
| B7.24 | open   | two verbatim-duplicated comment blocks, both looking like a merge that kept both sides                         | `ui.css:1275`, `879`                                   |
| B7.25 | open   | physical and logical properties for one idea, in a bilingual app                                               | `ui.css`                                               |
| B7.26 | open   | `.tile-mark` rules live 900 lines apart                                                                        | `ui.css:1468`, `2390`                                  |
| B7.27 | open   | inline styles that belong in the stylesheet — the exact hazard `ui.css:1354` documents                         | `ui/Card.tsx:142`, `ui/Figure.tsx:63`, `ActionBar.tsx` |
| B7.28 | open   | empty spans occupying a grid column `.panel-title.marked` already reserves                                     | `Manual.tsx:232`, `252`, `273`                         |
| B7.29 | open   | `Confirming`'s `className` prop is dead — joined but never passed                                              | `ui/Confirming.tsx`                                    |
| B7.30 | open   | `--mark-hang` couples a negative margin to a padding via two copies of one calc                                | `ui.css:481`, `507`                                    |
| B7.31 | open   | `keeper.alive()` has no production consumer                                                                    | `shell/keeper.ts:45`                                   |
| B7.32 | open   | unnecessary exports in `camera.ts`                                                                             | `board/camera.ts`                                      |
| B7.33 | open   | `isTappable()` always returns true — a predicate with no predicate in it                                       | `HexField.tsx:356`                                     |
| B7.34 | open   | repeated math worth one helper each — the tint unpack ×3, degree→radian ×3, the rotation reset ×4, `kindOf` ×3 | `board/`                                               |
| B7.35 | open   | `App.tsx` duplications — the mode ternary twice, a book decoded twice in one handler, `session.get()` ×3       | `App.tsx`                                              |
| B7.36 | open   | `lang` has two authorities; the `<html>` one is correct                                                        | `App.tsx:2343`, `ui/theme.ts:63`                       |
| B7.37 | open   | a dropped word in a comment, and eight identical restated signatures                                           | `Board.tsx:590`, `Board.tsx:80`                        |

### The catalogue (D4)

| id    | status | statement                                                                                                        | where                                                |
| ----- | ------ | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| B7.38 | open   | `statLabel` hard-codes four French labels behind a ternary — a missing French label is an `if`, not a type error | `Hud.tsx:121`                                        |
| B7.39 | open   | a sentence completed outside the catalogue                                                                       | `signpost.ts:49`                                     |
| B7.40 | open   | armed confirmations built in code while the catalogue spells out three others in full                            | `App.tsx:2689`, `Settings.tsx:197`, `Worlds.tsx:122` |
| B7.41 | open   | three untranslated literals **on the language screen**, and a literal `PTS`                                      | `Settings.tsx:186`, `Fame.tsx:114`, `207`            |
| B7.42 | open   | a raw `↗` against D10 — `Hud.tsx:112` documents removing exactly this character for this reason                  | `Worlds.tsx:94`                                      |
| B7.43 | open   | a raw ISO date beside a localised one, in the same row                                                           | `Fame.tsx:188`                                       |
| B7.44 | open   | the first-pop card is assembled with a joining rule `store.ts:365` already implements                            | `App.tsx:1400`                                       |
| B7.45 | open   | locale-insensitive `toUpperCase()`                                                                               | `shareCard.ts:124`                                   |
| B7.46 | open   | Fame's tabs borrow the manual's strings                                                                          | `Fame.tsx:87`                                        |
| B7.47 | open   | a quantity joined to a noun in the component — safe at 1, the shape that breaks when the number varies           | `ActionBar.tsx:138`                                  |
| B7.48 | open   | `data-grows` is a sighted-only affordance                                                                        | `Tabs.tsx:42`                                        |

## Batch 8 — delivery and the launch surfaces

| id   | status | statement                                                                                                                    | where                    |
| ---- | ------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| B8.1 | open   | split the vendor chunk — one 425 KB-gzipped chunk under immutable caching, so a one-line app change costs a player all of it | `vite.config.ts`         |
| B8.2 | open   | preload the two body faces — a FOUT on the front door, the screen the stranger test starts on                                | `index.html`             |
| B8.3 | open   | narrow the service worker's precache to the shipping direction — ~1.2 MB of PNGs never rendered                              | `vite.config.ts`         |
| B8.4 | ruled  | **the pre-JS paint is the wrong direction.** **Default: `#14100c`; the manifest already made this call**                     | `index.html:124`, `:100` |
| B8.5 | ruled  | the installed icon is baked on torchlit's background. **Default: `#14100c`.** Own commit — visible on a home screen          | `meta/mark.ts:26`        |
| B8.6 | open   | consider CI running `audit:screens` — a report, not a gate; but the shots have gone stale once already                       | `.github/`               |

## Batch 9 — tests for what has none

| id   | status | statement                                                                                                     | where                |
| ---- | ------ | ------------------------------------------------------------------------------------------------------------- | -------------------- |
| B9.1 | open   | `storage.ts` has no test — 606 lines, and the file declares itself the trust boundary                         | `shell/storage.ts`   |
| B9.2 | open   | `useDevice.ts` has no test — 306 lines, all device state                                                      | `shell/useDevice.ts` |
| B9.3 | open   | `teaching.ts` has no test, while it says it is pure "which is what lets it be tested by handing it two views" | `shell/teaching.ts`  |
| B9.4 | open   | five orphan test files named by subject while every other file follows `x.ts` ↔ `x.test.ts`                   | `shell/`             |

---

## Order, and why

1. **Batch 1 first** — broken things, and B1.3 is a hard-rule violation.
2. **Batch 2 second**, because it produces the pictures every look default in
   Batches 3 and 7 should be argued from. Regenerate again at the end.
3. **Batch 6's compiler early**, because it changes the shape of Batch 4's
   memoisation work — B4.2 and B6.3 overlap.
4. Batches 3, 4, 5 in any order; they touch disjoint files.
5. **Batch 7 last of the code**, because it is the widest diff.
6. Batch 8 independently — it touches only build config, `index.html` and `sw.js`.

## Verification, per batch

- `pnpm test` — baseline 1091 tests / 77 files; it should only rise
- `pnpm typecheck && pnpm lint && pnpm format:check`
- **`pnpm sim` byte-identical to `packages/core/sim.golden.txt`** — the gate
- `pnpm test:e2e`

## What this pass deliberately does not do

- **No rule moves.** `pnpm sim` is the proof.
- No new mechanics, screens or vocabulary.
- The five unread theme channels in `NEXT.md` §5b stay unwired. They are a
  re-tune of the whole board's line weight and atmosphere, not a polish item,
  and the ring repaint already proved that guessing there costs a bug report.
