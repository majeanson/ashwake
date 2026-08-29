# NEXT.md — what is left, and who each item needs

Written 2026-08-29, on Marc's ask for a goal big enough to run a session
through the night. Ashwake 1's own lesson is why this file exists at all: "what
is actually left" ended up spread across five documents, three of them stale,
and **a stale open-list is worse than none — it sends a session hunting for
work that shipped days ago.** Check every claim here against the code before
acting on it.

`STATUS.md` is what is done and verified. `ROADMAP.md` is the stages.
`LOG.md` is the per-session record. This file is the short answer to "what
now", sorted by whether it needs Marc.

---

## 0. Wired this session, and what it revealed

The hold mechanism and the colour lens were both **dead code the shell never
called**, and the audit found the draft card unreadable on its own fill. Three
misses of one shape: a screen that renders a thing without connecting it. Worth
a standing check — **before calling a screen done, grep for a consumer of every
action it can produce.**

Still unconsumed by the app, verified 2026-08-29: `share`, `route`, `goals`,
`report`, `shedLadder`, `shopLevels`, `mark`. Two of those are live
inconsistencies rather than gaps — the privacy sentence a player reads today
promises a share sheet and a SEND REPORT that do not exist, and `storage.ts`
drops a write on a full quota where `shedLadder` is the module written to
decide what to drop instead. `share` and `report` were half-built when the
hold question arrived: `shell/share.ts` and the whole catalogue for both are
in, the buttons and the failure panel are not.

## 1. Needs Marc, and only Marc

**The Cloudflare API token.** CI's deploy job runs and fails: the
`CLOUDFLARE_API_TOKEN` secret exists on `majeanson/ashwake` but is EMPTY — the
Actions log prints `CLOUDFLARE_API_TOKEN:` with nothing after it, while
`CLOUDFLARE_ACCOUNT_ID` is masked. A `gh secret set` through the interactive
prompt got EOF instead of a paste. Fix:

```
gh secret set CLOUDFLARE_API_TOKEN -R majeanson/ashwake --body "PASTE"
```

Make a NEW token rather than reusing Ashwake 1's — rolling that one would
break `majeanson/tiles`. `dash.cloudflare.com/profile/api-tokens` → **Edit
Cloudflare Workers** template, account = Marc's, zone = `marcportal.com`.
Until then every deploy is manual (`pnpm build && pnpm run deploy:prod &&
pnpm verify:deploy`) and it works fine.

**The look numbers, by looking, on a phone.** Every dial defaults to 0, so the
plain URL is still the flat board. These are not questions code can answer:

|                                  |                                                  |
| -------------------------------- | ------------------------------------------------ |
| the lit board                    | `?tilt=35&light=1`                               |
| with materials                   | `&materials=1`                                   |
| with Ashwake 1's painted terrain | `&art=1`                                         |
| with relief (height = rarity)    | `&relief=0.35`                                   |
| everything                       | `?tilt=35&light=1&materials=1&art=1&relief=0.35` |
| the yaw, still open              | `&yaw=45`                                        |

Pick a number for each. They become the defaults, and then they move into
`Theme` where the rest of the materials live.

**One number the tests could not settle.** At the full rig, torchlit's darkest
terrain SIDE sits 0.070 in L* from the board and torchlit-bright's 0.072 —
above the wall floor (0.045, "must not read as fog") and below the ground floor
(0.1, "a placed tile is a visible shape"). Holding sides to 0.1 needs the
darkest facet exposed at 0.655, a top-to-side ratio of 1.53, a board with
almost no shading left. On a near-black board a dark terrain's shaded side and
the board genuinely are close. **Does it read as a face or as a gap?** Only an
eye can say.

**The French.** ≈250 sentences in Québec French, recorded into the snapshot
files as the review surface, and still unread. The chrome gets built on that
catalogue, so corrections are cheapest before S3.

**Session A, then the stranger.** `PLAYTEST.md`. Session A is owed against THIS
body before Session C, and nothing that changes the first minute ships between
A's last clean pass and C's run. Session C is v2.0's only gate.

---

## 2. There is no town art, and there was never going to be

Marc asked to "check for more art like we talked about (town theme)". The
answer, checked rather than assumed:

- The only art in `../tiles` is the three shipped directions — seven terrain
  PNGs plus `fx.pop`, `ui.logo` and `ui.runEnd` each — all now carried over to
  Ashwake 2 (the terrain seven, at least; the other three are S3's).
- `../tiles/ideas/Hex Roguelite Graveyard Theme/` is a **Claude Design canvas**
  (`Art Directions.dc.html`) with one exported PNG: three side-by-side mockups
  of the directions that already ship. Not town art.
- "FARM · MARKET · QUARRY · ROADS" exists only as **four words** in
  `DECISIONS.md` D4 §4 — Marc's own thought while naming the colours, parked as
  a candidate direction. No palette, no assets, nothing built.

**So the settlement direction has to be MADE, and the pipeline to make it is
already here.** Ashwake 1 generates every terrain PNG procedurally from theme
tokens (`../tiles/scripts/terrain.ts`, 591 lines: seeded, offline, sharp-based,
reading the theme objects directly rather than a copied palette, with a
guardrail that throws if the baked greyscale ordering disagrees with the token
ordering). A new direction is a new file in `theme/themes/` plus one line in
`theme/index.ts` — **and it earns its place by passing the budgets, not by
being liked.** That is S5, and it is a real session, not a fetch.

---

## 3. What the overnight run did, and what it left

**Done 2026-08-29 (`LOG.md` Sessions 5–6):** S2c's materials and lit budget,
S2d's motion and landmark props, and S3's whole chrome. **A run can now be
started from a front door, played, finished, and started again** — the shape
of v2.0's gate, walked by a Playwright test.

**Done 2026-08-29, later (`LOG.md` Session 7):** most of S4. A finished run is
BANKED — `shell/settle.ts` folds the ground into the world, keeps the shelf of
bests and writes the diary row, once. The rooms are back: SHOP (also hosted on
the end screen, where the relics were earned), HALL OF FAME, MORE, the three
WORLDS, and the DAILY as a `Place` rather than a fourth world. The end screen
gained its payout breakdown and arc chart. The PWA landed: manifest, icons,
stamped service worker, and an update the player TAPS rather than one taken out
from under them. The colour lens is wired and pinned. `verify-deploy` now
checks the install surface instead of owing it.

**What is left of the original goal:**

- **S4's remainder:** the History-API router, and whether it is wanted at all.
  `?seed=` links already work (`App.tsx` reads the seed at session build), and
  every screen is a state change by ruling — so a router would buy BACK on a
  panel and a shareable deep link, and cost the one invariant that has held
  since Stage 2. Decide by looking, not by porting.
- **The screen audit's third axis.** The harness exists and runs (`pnpm
audit:screens`, fourteen screens × three directions); what it does not have
  is DEVICE HISTORIES beyond `?taught=1` and `?end=1`. Five runs in and three
  hundred runs in are now buildable, because persistence exists, and they are
  where the hall of fame and the shop stop looking empty.
- **The purse's spend actions** dispatch but nothing tests them.
- **The atlas**, if it earns its place: it is on the "review rather than port"
  list and no stranger has ever seen one.

The prompt below still stands for the rest.

## 3b. The overnight goal, as a prompt

The rest of this file is the prompt. It is deliberately one GOAL with a
definition of done rather than a task list, because the interesting decisions
are the ones a list would pre-empt.

```
Ashwake 2 — take the game from "a board that draws" to "a game you can play
end to end on a phone", in one long run.

Read CLAUDE.md first, then STATUS.md (what is done AND verified), NEXT.md
(this file), ROADMAP.md S2d–S4, and LOG.md sessions 3–6. DECISIONS.md holds
the rulings; D4 is the language and glossary ruling that governs every
sentence. Check every ledger claim against the code before you act on it —
Ashwake 1 lost a session to a stale open-list, and it is cheaper to grep
than to trust.

Where things stand: the rules are a package and byte-identical to Ashwake 1
(pnpm sim, diffed by CI). The board is 3D, lit, materialled, tappable, and
deployed at ashwake.marcportal.com. What does not exist is everything a
person actually plays: there is one screen of skeleton chrome, and no front
door, no manual, no settings, no end screen, no persistence.

THE GOAL: a stranger could finish a run and start another. Not "the code is
there" — the whole first minute, on a phone, in portrait, from the front
door to the end screen and back into a second run.

Work through it in this order, and land each stage on main with its own
commit, its ledgers updated, and the site deployed and verified:

  S2d rest — ambient life and the landmark props. The pop and its cascade
  landed; what is owed is embers off spent ground (pooled and hard-capped,
  Ashwake 1 held 140 sprites), the beacon breath as a floored sine, camera
  momentum on the drag, the refit softener, and reduced-motion honoured per
  effect rather than globally. Then the landmarks: Marc chose BUILT PROPS
  standing on the ground — a small modelled thing per kind, catching the
  rig's light, with LANDMARK_GLYPH still the authority on what each MEANS
  and the glyph kept as the fallback and the manual's vocabulary.

  S3 — the chrome, in React, bilingual from the first component. Front
  door, HUD, hand + action bar, purse drawer, teaching cards, term card,
  the manual, settings, end screen. Everything a stranger touches. Build
  the shared system FIRST and the screens over it: one Panel/Door, one
  Card, one Tabs, one Fold, one FactGrid, one Tile, one TipRows, one
  Figure, one Confirming two-tap control — Ashwake 1 implemented Tabs
  twice and Confirming five times, and its own duplication is the spec for
  what to unify. Then the glossary: conceptPattern() runs over EVERY piece
  of prose, so a term is tappable in the manual, in a teaching card, on
  the end screen and in settings — not only in the manual as in Ashwake 1.
  Two things the core does NOT give you and you must write: the teaching
  TRIGGERS (the core has the ledger and the words, not the moments), and
  theme APPLICATION (themeCssVars hands back the map; a React root sets the
  properties, and nothing visual is hand-typed into a stylesheet).

  S4 — one page, many sessions. Store, session, router on the History API,
  the two allowed reloads and no others, the keeper's alive/dropped guards,
  save/resume, three world slots, the daily, ?seed= links, PWA, and
  backup/restore. resetShell()'s hand-kept 25-id list disappears in React;
  that was the one honest argument for the framework and this is where it
  gets collected.

  The audit harness grows BESIDE S3, not after it. Ashwake 1's was owed
  from the day its fields were built and only landed in its final week.
  Copy its separation exactly: e2e/audit/*.audit.ts under its own
  Playwright config, invisible to the default testMatch, producing pictures
  and a measured report rather than a pass/fail. ../tiles/audit-shots/ is a
  ready-made visual baseline to hold this against.

Non-negotiable, all inherited and all enforced:
  - packages/core stays pure: no DOM, no React, no three, no Math.random,
    no Date. ESLint proves it.
  - pnpm sim byte-identical to sim.golden.txt. A diff is a rule that moved.
  - Every system behind a flag or a dial that zeroes it, defaulting off.
  - Every sentence a player reads lives in packages/core/src/text/, fr-CA
    first. A missing sentence is a type error. English snapshots are never
    re-recorded silently.
  - The budgets answer to tests. Do not relax a threshold to pass —
    darken something. render/materials.test.ts grades what actually
    renders; extend it as new surfaces appear.
  - The <Canvas> mounts once, above every scene. Losing it loses the
    context.
  - Accessibility is inherited, not re-earned: 44px targets, two-line
    buttons that state their own name, no control that drops focus when it
    hides itself, aria-controls where a drawer opens above its button,
    live regions inserted empty then filled, #stats deliberately NOT live.
  - Land on main. No PR gate. Deploy manually (pnpm build && pnpm run
    deploy:prod && pnpm verify:deploy) until the token is set.

Write the session's question in LOG.md BEFORE building and answer it after.
Put option-set questions to Marc on any fork where two answers mean
genuinely different work — but do not block on them: pick the defensible
default, say which you picked and why, and keep going.

Done, for this run, means: a run can be started from a front door, played,
finished, and started again, on a phone, in portrait, against the deployed
site — with the golden sim green, the budgets green, and the shot set and
screen audit regenerated so Marc can look at what changed while he slept.
```

---

## 4. Deferred by ruling — do not reopen

Ashwake 1's parking lot carries over unchanged: Tier-1 uniques, sound's written
question, a leaderboard (needs a backend, D13), store wrappers, the
waypoint-perk earn, world mood, ground-feeds-draft, storage compaction, the
timeline's spine question, and pop-vs-burn-vs-wait (answered over weeks of
play, not before a tag).
