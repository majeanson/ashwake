# STATUS.md — checkpoint ledger

What is DONE and VERIFIED, so future work starts from trust instead of
re-checking. Updated at checkpoints only. The reasoning lives in `LOG.md`; the
rules in `CLAUDE.md`.

Last checkpoint: **2026-08-29, last — the camera comes off its rail.** Marc:
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
now runs `pnpm bake` and diffs `apps/game/public`, which checks both that the
art matches its theme and, via terrain's own guardrail, that the greyscale
ordering has not inverted. **Torchlit re-bakes byte-identical**, which is how
the port proved itself. **SETTLEMENT has art for the first time** — it could
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
- **S5 — the look.** Built: the settlement direction, the typeface, and the art
  pipeline that makes both (2026-08-29). What is left is the CHOOSING, on a
  phone.
- **S6 — the console, Session A on v2, then the stranger.** `/playtest` with
  COPY SHEET; Session A re-run against the deployed v2; fixes; Session C.

Marc's own list, which no amount of building here clears: set
`CLOUDFLARE_API_TOKEN` with `--body` (the interactive prompt took an EOF and
the secret is EMPTY, so the deploy job cannot run); pick the look numbers on a
phone; read the French; then Session A, then the stranger.
