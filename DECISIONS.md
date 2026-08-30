# Decisions — the answered ledger

Ashwake 1's `DECISIONS.md` (D1–D24, in `../tiles`) still governs every rule of
the game, because the rules are the same code. This file starts at D1 again
for decisions about THIS body.

### D1 — Ashwake 2 exists, and what it is — RULED 2026-08-28

Marc, planning v2.0 with the assistant on the day v1.0.0 was tagged:

> "I'm not locked to React, I just want a nice game." · "My only requirement is
> web app, game oriented, maybe even some 3D or game engine library." · "The
> game was fun, I want to replicate it in a new repo with the same rules and
> different visuals." · "Extract concepts, unify components, DRY — but logic and
> similarities stay."

Five rulings, each put to him as an option set:

1. **Body: a 3D board in Three.js + React Three Fiber, chrome in React 19.**
   Considered and rejected: Godot/Unity web exports (20–40MB loads, iOS
   threading limits, and the TypeScript rules would have to be rewritten —
   breaks every hard rule); Phaser (2D, fights DOM chrome, Pixi already drew
   the 2D board); Babylon.js (viable, ~500KB, more engine than a hex board
   needs). Three + R3F was chosen as the one stack where "3D, game-oriented"
   and "React" both land where they belong: React over `view.ts`'s props, R3F
   over `BoardView`.
2. **Repo: a new pnpm monorepo — `packages/core` + `apps/game`.** `../tiles`
   is frozen at v1.0.0 as the fallback and the deployed game; it receives
   ledger commits only. The core is a real package so a third consumer (a
   tool, a dashboard) can import it.
3. **The stranger test is held for v2.** Session C has never been run. Marc
   chose to spend the one-shot stranger on the new body; it is v2.0's gate.
4. **The clean pass comes before the stranger** — it IS the port.
5. **No React in the v1 chrome.** The one honest argument for it —
   `resetShell()`'s hand-kept 30-id list — turned out to be "every id
   `index.html` declares `hidden`", replaceable by a boot-time snapshot; and
   the list already missed three ids. React was never needed for it.

Also recorded: the playtest console's long-term home is a `/playtest` route in
`apps/game`, with a COPY SHEET button rather than live sync. `PLAYTEST.md`'s own
rules (no coaching, no fixes at the table) mean there is nothing for an AI to
act on DURING a stranger's run, so live sync buys little; the sheet reaching
`LOG.md` intact is what matters.

### D2 — The rules are the same code, and CI says so — RULED 2026-08-28

`pnpm sim` must print `packages/core/sim.golden.txt` byte for byte (captured
from `tiles@42d4da3`). This is the proof "same rules" is a fact rather than an
intention. Moving the golden file is allowed only in a commit that says, in
`LOG.md`, which rule moved and on what evidence — Ashwake 1's standing rule
that a retune needs play or the harness behind it, not taste.

### D3 — The v1 → v2 bridge is BACK UP MY WORLDS → RESTORE A BACKUP — RULED 2026-08-28

A new origin is a fresh device. `meta/backup.ts` is in the core, so the codec
is shared; the app's restore is the migration path, and the daily's epoch stays
2026-08-25 (Ashwake 1's D20), so daily numbers keep meaning the same thing on
both bodies.

### D4 — Two languages, Québec French first — RULED 2026-08-28

Marc: **"introduce i18n for fr(qc) first, then en (what we did)"**, and on
the forks put to him:

1. **Default language: the device's, falling back to fr-CA.** Any French tag
   opens Québec French, any English tag opens English, anything else opens
   French. A LANGUE / LANGUAGE row in SETTINGS overrides it and is remembered
   (Stage 3).
2. **The four grounds in French, his words: LICHEN · TISONS · CENDRES ·
   RIVIÈRES.** Each still names its power (the crowd, the live coals, what
   feeds on stone, what pays far from home). Names are per direction AND per
   language (`Theme.terrainNames[locale]`), because a direction names its
   ground by its own fiction in every language rather than translating
   another direction's.
3. **The glossary:** RIPE→MÛR · POP→RÉCOLTER · BURN→BRÛLER · POCKET→POCHE ·
   STASH→RÉSERVE · RELICS→RELIQUES · LUCK→CHANCE · BEGIN→COMMENCER · NEW
   RUN→NOUVELLE PARTIE · WORLD→MONDE · THE DAILY→LE QUOTIDIEN ·
   SHRINE→SANCTUAIRE · TERRITORY→TERRITOIRE · SACRIFICE LUCK→SACRIFIER LA
   CHANCE. He chose POCHE over GRAPPE and RÉCOLTER over ÉCLATER.
4. **"FARM · MARKET · ? · ROADS"** — his thought while naming the colours —
   is a _direction_, not a translation, and is parked for Stage 5 as a
   candidate ("settlement": FARM · MARKET · QUARRY · ROADS), to be chosen by
   looking.

**How it is built** (`packages/core/src/text/`): one typed catalogue per
language — no library, no string keys — so a missing French sentence is a
type error. **Facts are computed in `view/` and `meta/`; words are looked
up**: a catalogue function takes numbers and names and returns a sentence,
never reads state and never decides whether to speak, so the two languages
cannot disagree about WHEN a rule applies. English is the prose exactly as it
was, proved by the pre-move snapshots passing byte-identical. Québec
typography is a test (`text.test.ts`): the fine space before `:` and `%` and
nowhere else, the typographic apostrophe, accents kept on capitals. Marc
reviews the French on the snapshot files, then on the phone.

### D5 — The daily is a PLACE, not a fourth world — RULED 2026-08-29

A run is played somewhere: one of the three worlds, or the daily. Modelled as
`Place = Slot | { daily: string }` and enforced inside the KEEPER, because the
keeper is the only thing that writes.

What the daily does NOT touch, and why:

- **A world's memory.** Every phone plays the same board, so there is no ground
  "this world" walked. Folding it in would make a world remember terrain that
  belongs to nobody.
- **The shelf of bests.** A shared seed's score standing beside runs on private
  ones makes the record book mean nothing.

It touches exactly two things: the ladder for its date, and the diary. The try
count is CONFESSED rather than enforced — replaying today's board is allowed
and the ladder simply says which attempt this was.

The failure this ruling guards against is one tap away and silent: NEW RUN on a
daily's end screen starts a random private run, and a shell that still believed
it was in the daily would bank it as a try on the shared ladder. So NEW RUN
leaves the daily, stated in `App.tsx` and pinned in `settle.test.ts`.

### D6 — A scene sits BELOW the panels, and goes inert — RULED 2026-08-29

The front door and the end screen are SCENES in the same sense the board is:
they fill the screen, they are what the game is currently showing, and a panel
opens over them. They sat at `z-index: 40` — above panels at 20 and cards at 30
— which meant HOW TO PLAY had been opening the manual UNDERNEATH the front door
since Stage 3, invisibly, because nothing in the unit suite stacks anything.

Both halves are the ruling. A scene sits below the panels (15), **and** it goes
`inert` while one is open: a z-index alone leaves focus and taps reaching a
screen the player cannot see, which is the half a repaint would not fix.

### D7 — SETTLEMENT is built, and it is a CANDIDATE — 2026-08-29

Marc's own reading of the colours (D4.4) exists as a direction now: FARM ·
MARKET · QUARRY · ROADS, in `theme/themes/settlement.ts`. The fiction is the
third thing that can happen to a place — torchlit is standing in the dark plane
with a torch, daylight is the survey you draw afterwards, and this is somebody
having **stayed**.

The names still name their powers, which D4.2 requires. QUARRY is the one that
says its rule BETTER than the old name did: red feeds on stone, and spent
ground is a quarry's whole supply.

**It is not the default and Gate E is not reopened.** It ships as a fifth
entry in `THEMES` and a fifth row in SETTINGS, which is what makes it
choosable rather than imposed. Whether it BECOMES the direction is Marc's, on
a phone, against `docs/shots/s5-settlement*.png` — a direction earns its place
by passing the budgets and then by being looked at, in that order.

**How it was built is the part worth keeping.** The four L* stops
(0.34 · 0.43 · 0.53 · 0.70) were chosen before a single hue, because
`theme.test` asks a direction to separate its terrains by VALUE and not by
hue; spent ground then went in the widest gap left. Three colours moved to
clear the budget and **no threshold did**: the faint ink (4.31:1 on its own
panel), the danger ink (4.32:1 on the same panel), and the fog's veil, deepened
so a remembered MARKET stops landing in the dead band. The last one is also the
truer sentence — a settlement forgets more completely than a survey does.

**Bands are for the wall.** An opaque `bands` pattern reaches the middle of a
face, so a banded terrain puts a third colour under a centred label;
`paint.test` caught it on the first run. Every terrain in every direction uses
a translucent ink, and now there is a written reason.

### D8 — A direction states its MOTIF, and a dropped layer is a build failure — RULED 2026-08-29

Settlement had art and it was the plane's art, recoloured: `scripts/terrain.ts`
drew moss tufts, dry grass, ember glints, ash pits and tide ripples for every
direction and changed only the colours. Correct for torchlit, torchlit-bright
and daylight — one place at three exposures, which is exactly what a variant
IS — and wrong for a direction whose entire claim is that it is a different
place. FARM was tide ripples with moss on them, under a theme file that said
"planted rows".

**So a direction now says what its art is made OF** (`theme/tokens.ts#Motif`):
`plane` or `settlement`. Not derived, unlike `isLight` — two directions can
share a palette's polarity and mean completely different places. A motif is a
COMPLETE set of figures, so nothing can end up half weather and half street,
and where the two genuinely agree (blocked ground is unbuilt rock either way;
a preview is a preview) the table holds the same function rather than a copy.

**Adding a direction stays one theme file and one line in `THEMES`** as long as
it picks a motif that exists. Inventing a motif is deliberately a bigger thing:
it is a new set of drawings, and the table is where that cost shows up honestly
instead of as a recoloured moss tuft.

**The half of this that is a rule rather than a look:** a layer a theme
declares and the baker cannot draw now THROWS. The old guards read as defensive
(`pattern.kind === 'dots' ? pattern : null`) and did the opposite — settlement
is the only direction that departs from the plane's kind layout, so MARKET
matched neither guard and baked with **no texture at all**, and QUARRY lost the
cut-face overlay that carries its meaning. The live painter drew both correctly
the whole time, which means the art path was worse than the fallback it
supersedes, on the ground a player looks at first. The greyscale guardrail
looked straight at it and passed, correctly: it grades value, and a missing
texture barely moves a mean.

**A guard that watches one axis says nothing about the other**, and that is the
general lesson worth keeping out of this: the fix is not a second threshold, it
is refusing to bake something the direction asked for and the maker cannot
make.

## Open

- **The name.** Same name, new look? "Ashwake 2"? Marc's, before Stage 5.
- **How far the board turns, and how high the ground stands.** The TILT is
  settled: 35 degrees, Marc's pick from the Stage 2 shots, and the angle the
  board now boots at. Two dials are open beside it, both defaulting to the flat
  map: `?yaw=` turns the board under the camera, `?relief=` gives the ground
  height. Eight shots in `docs/shots/`, all seed 7 after the same twelve
  placements (`?place=12`), so the only thing that differs between them is the
  look — `top`, `tilt35`, `tilt45`, `tilt35-yaw45`, `tilt45-yaw45`,
  `tilt35-relief`, `tilt45-relief`, `tilt45-relief-high`. Marc's, by looking,
  and then on the phone. The relief LADDER — which ground stands above which —
  is a placeholder with a shape, and belongs to Stage 5 with the materials.
- **Deploy secrets.** The `deploy` job exists and is gated on the
  `DEPLOY_ENABLED` variable; the two Cloudflare secrets and the custom domain
  `ashwake.marcportal.com` are Marc's to set.
- **The visual direction** (Stage 5), by looking, on the phone.
- **Session C** — v2.0's gate. Unattempted on either body.
- Ashwake 1's D22 (telemetry and the privacy line) and D23 (the first-run
  acknowledgement, only after Session C) carry over unchanged.
