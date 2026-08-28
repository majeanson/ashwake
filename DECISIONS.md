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

## Open

- **The name.** Same name, new look? "Ashwake 2"? Marc's, before Stage 5.
- **Camera: top-down or a tilt?** Offered with screenshots in Stage 2.
- **The visual direction** (Stage 5), by looking, on the phone.
- **Session C** — v2.0's gate. Unattempted on either body.
- Ashwake 1's D22 (telemetry and the privacy line) and D23 (the first-run
  acknowledgement, only after Session C) carry over unchanged.
