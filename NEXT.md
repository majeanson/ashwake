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

## 0. Wired, and what it revealed

The hold mechanism and the colour lens were both **dead code the shell never
called**, and the audit found the draft card unreadable on its own fill. Three
misses of one shape: a screen that renders a thing without connecting it. Worth
a standing check — **before calling a screen done, grep for a consumer of every
action it can produce.**

**This section was itself stale, and in the reassuring direction** (corrected
2026-08-29, `LOG.md` Session 13, by grepping rather than trusting). It listed
`route`, `goals`, `shedLadder`, `shopLevels` and `mark` as unconsumed, and
claimed `storage.ts` still dropped a write on a full quota. Three of those were
already wired — `newlyMetGoals` at `shell/settle.ts:113`, `SHED_LADDER` inside
`storage.ts`'s `write`, `inheritShopLevels` in `useDevice.ts` — and the quota
claim was false with `shell/shed.test.ts` pinning it. **A session that trusted
this file would have "fixed" a bug that was not there.** That is exactly the
hazard the paragraph at the top of this file warns about, come true of itself.

`route` WAS genuinely dead and is not any more: a shared `?daily=` link ignored
its date and opened the recipient's own front door. What is left of the module
is `searchFor` and `HOME`, still unread — the app builds its share links
through `meta/share.ts` instead, so those two are a duplicate statement of the
same thing rather than a gap. Decide whether they earn their place.

`mark.ts`'s `MARK_SVG_MASKABLE`, `MARK_GROUP` and `markGroup` are read again as
of 2026-08-29: `scripts/icons.ts` bakes the shipped icons
from them and `scripts/artslots.ts` draws the lockup with `markGroup`. The
source of an asset that ships now has the maker beside it (§5).

## 1. Needs Marc, and only Marc

**The camera, by feel.** Two fingers now lean and turn the board as well as
pinch it (`LOG.md` Session 15), and three things about it are arithmetic
waiting on a hand: whether `PX_PER_DEGREE = 4` makes the lean feel like
pushing a horizon or like fighting one, whether the 55° ceiling is where the
board stops reading as a map, and whether the deadzones let a plain pinch stay
a plain pinch. **The tilt and yaw questions in the table below are half
retired by this** — the answer can be the player's hands rather than a
number — but the DEFAULT the board opens at is still yours, and it is still 35.

**The keyboard, by using one.** The board answers keys as of 2026-08-29
(`LOG.md` Session 16, `INTERACTIONS.md` §6) and four of its numbers are
arithmetic waiting on a desktop: 15° a turn, 5° a lean, 96px a pan, and the
marker's ring drawn just outside the hex in the accent. Also worth an eye:
whether `Q`/`E`/`R`/`F` is the pair a hand reaches for, or whether the board
should have taken the arrows for the CAMERA and given the marker the modifier
instead. Nothing here needs code first — it needs somebody to play a run with
their hands on a keyboard and say which half felt wrong.

**~~The Cloudflare API token.~~ DONE — the deploy is automatic again.**
Corrected 2026-08-29 by looking rather than trusting: `CLOUDFLARE_API_TOKEN`
was re-set on 2026-08-29, `DEPLOY_ENABLED` is `true`, and CI's **deploy job ran
and verified green** on the push that closed this session. This entry claimed
the secret was empty and every deploy manual; both were true when written and
neither is now. A push to `main` deploys and verifies itself.

A hand deploy is still there when you want one, and is what this session used
before the CI run caught up: `pnpm build && pnpm run deploy:prod && pnpm
verify:deploy`. **Build AFTER committing** — the bundle stamps the sha it was
built at, so building before the commit deploys the previous one and
`verify:deploy` correctly refuses it.

**The look numbers, by looking, on a phone.** Corrected 2026-08-29: this
entry used to say every dial defaults to 0 and `the plain URL is still the flat
board`. It has not been true since Stage 3 — the plain URL opens at **tilt 35,
light 1, materials 1, art 1, relief 0.35**, which are working defaults rather
than rulings (`App.tsx`). So the question is no longer "turn them on and look"
but "are these the numbers", and the dials are how you argue with them:

|                           |                                              |
| ------------------------- | -------------------------------------------- |
| what everyone gets today  | `/` — nothing in the query string            |
| the flat map, for compare | `?tilt=0&light=0&materials=0&art=0&relief=0` |
| without the painted art   | `?art=0`                                     |
| without the relief        | `?relief=0`                                  |
| the yaw, still open       | `?yaw=45`                                    |

The tilt and the yaw are half retired by the camera gesture above — two fingers
set them now — but the DEFAULT the board opens at is still a number and still
yours. When you pick them they move into `Theme` beside the rest of the
materials.

**One number the tests could not settle.** At the full rig, torchlit's darkest
terrain SIDE sits 0.070 in L* from the board and torchlit-bright's 0.072 —
above the wall floor (0.045, "must not read as fog") and below the ground floor
(0.1, "a placed tile is a visible shape"). Holding sides to 0.1 needs the
darkest facet exposed at 0.655, a top-to-side ratio of 1.53, a board with
almost no shading left. On a near-black board a dark terrain's shaded side and
the board genuinely are close. **Does it read as a face or as a gap?** Only an
eye can say.

**Walk the v1 → v2 bridge with a real backup.** `DECISIONS.md` D3 says this is
how your Ashwake 1 worlds reach this body, and until 2026-08-29 it could not
work at all — every v1 key begins `tiles.` and this body refused them. It is
built and tested now, including through the real storage edge
(`shell/bridge.test.ts`), but **a synthetic v1 blob is not the same evidence as
your own**: open tiles.marcportal.com, MORE ▸ THIS DEVICE ▸ BACK UP MY WORLDS,
then paste it into Ashwake 2's RESTORE and check the worlds arrive with their
reach, relics and diary. This is the one check code cannot do for itself, and
it is worth doing BEFORE the v2.0 tag cuts the domain over.

**The look, by looking — and there is MORE of it to look at than there was.**
The typeface and the art pipeline both landed 2026-08-29 (§5), which means the
first minute now looks different from anything you have seen: the chrome is in
Cinzel and EB Garamond rather than fallback serif, the door and the end screen
have their baked art, settlement has terrain for the first time, and daylight
carries a contrast correction that had been lost in both bodies. **None of it
has been on a phone.** Worth doing BEFORE Session A rather than after — a
Session A run against the old look would have to be run again.

**~~The settlement, now that it is drawn in its own hand.~~ CHOSEN — it is the
direction** (2026-08-29, `LOG.md` Sessions 18–19, `DECISIONS.md` D7 closed, D8).
Its art was the plane's recoloured and two of its layers were nothing at all;
that is fixed and re-baked, and then Marc chose it: _"i want to go this way
since its a strong theme and i feael like names of eahc color reveal what they
do too."_ `DEFAULT_THEME_ID` is `settlement`, the tab tint, install splash and
share card moved with it, and the game has a story on its front door.

**What is still owed is the same sentence it has always been: a phone.** The
direction is now what a phone would OPEN rather than what a phone might be
shown, which raises the stakes on the same look questions — the four grounds at
34px, the lamplit crest on a furrow, whether MARKET's crates read as goods or
as dirt. `docs/shots/s5-settlement*.png`, `s5-directions.png` and
`s3-door.png` are the pictures; the phone is the judge.

**One thing the ruling did NOT carry, and it is an accessibility one.**
`pickForScheme` still answers a stated preference with the plane —
`torchlit-bright` for more contrast, `daylight` for light — so the player who
needs contrast is the one player who does not get the fiction the front door
just told them, and that is exactly the population that fork exists to serve.
The honest fix is a bright settlement that passes the same 152 palette
assertions, which is a palette sitting rather than a line of code.

**Three concept questions the fiction cannot answer for itself.** Found
reviewing the backstory against what a settlement player actually reads:

1. **The powers are still named in the plane's words.** `text/*.ts` hard-codes
   `colourWord: { green: CROWDS, yellow: COMPANY, red: ASH, blue: TIDE }`, and
   the rule lines say "· ash: stone beside red count as matches" and "· tide:
   +1 worth per N hexes from home". **ASH and TIDE are torchlit's GROUND
   names.** So a settlement player reads FARM · MARKET · QUARRY · ROADS on the
   board and their cards, and then reads a rule about "ash" and "tide" — two
   vocabularies in one sentence, and the exact thing D4.2 says a direction may
   not do. Even in torchlit the four are inconsistent: two are named for the
   rule and two for the ground. The fix is a ruling, not a patch — either the
   power words move into the theme beside `terrainNames`, or the catalogue
   takes them as arguments the way it takes the ground's name. It touches both
   languages and re-records English snapshots, so it is yours.
2. **One epitaph says "The torch carried N placements out."** There is no torch
   in a settlement; there are lamps. It is one line in a random pool, and the
   rest of the plane's vocabulary is fine — this direction is still "the plane,
   once somebody stayed", so "the plane" holds. Reword per direction, or accept
   it.
3. **~~If settlement ever becomes the DEFAULT~~ — DONE 2026-08-29**, because it
   did. The share card is baked from the shipping direction rather than from
   `TORCHLIT` by name, and the tab tint and install splash are `#14100c`. The
   manifest's description had also drifted to a third wording of the tagline
   and now matches the catalogue's.

**The shrine, if you want it standing.** Measured this session
(`board/landmarks.test.ts`): the shrine prop is a ring lying LEVEL, 0.88 wide
and 0.16 tall, floating a third of a hex over its ground — its comment claimed
it stood on edge, and three builds a torus upright, so the `rotateX` that was
meant to stand it up laid it down. It stays level because a level ring reads
the same from every yaw and the camera now turns through all of them. Standing
it up needs something to turn it toward the camera per instance. **A look
question: is a hovering ring a shrine, or a doorway you can walk through?**

**Not art, and it stops a run from ending: a production build crashes the end
screen.** With the working tree as it stood on 2026-08-29 evening,
`pnpm build` produces a bundle where `toMainMenu` is referenced and never
declared — the minifier drops the `const`, an unminified build keeps it, and
the end screen falls into the failure panel with `ReferenceError`. Reproduced
twice, and `e2e/shots.spec.ts`'s "first minute" fails on it. Whoever owns that
change owns this; it is recorded here because a stranger cannot finish a run
while it is true.

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
  PNGs plus `fx.pop`, `ui.logo` and `ui.runEnd` each. All of it is REMADE here
  now rather than copied (§5), except `fx.pop`, which this body deliberately
  does not use.
- `../tiles/ideas/Hex Roguelite Graveyard Theme/` is a **Claude Design canvas**
  (`Art Directions.dc.html`) with one exported PNG: three side-by-side mockups
  of the directions that already ship. Not town art.
- "FARM · MARKET · QUARRY · ROADS" exists only as **four words** in
  `DECISIONS.md` D4 §4 — Marc's own thought while naming the colours, parked as
  a candidate direction. No palette, no assets, nothing built.

**So the settlement direction had to be MADE — and as of 2026-08-29 it is.**
The pipeline is in THIS repo now (`scripts/terrain.ts`, §5): seeded, offline,
sharp-based, reading the theme objects directly rather than a copied palette,
with a guardrail that throws if the baked greyscale ordering disagrees with the
token ordering. Settlement was one new entry in one array and it passed that
guardrail on the first run — **it earned its place by passing the budgets, not
by being liked.** What is left of S5 is choosing it, on a phone.

**Corrected 2026-08-29 (Session 18): "one new entry in one array" was the
problem, not the boast.** Being one entry meant it was drawn with the plane's
figures — tide ripples, moss tufts, ember glints — in settlement colours, and
in the two slots whose declared pattern kinds departed from the plane's it was
drawn with nothing. It has its own hand now (`DECISIONS.md` D8), and adding a
direction is still one file and one line as long as it borrows a motif that
exists.

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

## 5. The art pipeline — DONE 2026-08-29, and now it needs an eye

Found auditing this body against Ashwake 1 (`LOG.md` Session 13) and built the
same day (Session 14). Everything below is landed; what is left is the part
code cannot do, which is Marc looking at it.

**What landed:**

- **The typeface.** There was no `@font-face` in this body at all, so the
  twenty-one `font-family` declarations naming Cinzel and EB Garamond all fell
  through to Georgia — the board was in the right face and the chrome was not.
  Three files, three rules, four precached, and two guards
  (`e2e/type.spec.ts`, `verify:deploy`) because nothing would ever have
  reported it.
- **The bakers** — `scripts/{terrain,artslots,icons,social}.ts` and
  `scripts/fonts/`, ported with their paths rewritten and nothing else touched.
  `pnpm bake` runs all four. **CI runs it and diffs `apps/game/public`**, which
  checks that the art still matches the theme it was baked from AND, through
  terrain's own guardrail, that the greyscale ordering has not inverted.
- **A contrast fix that had gone missing in two bodies.** Ashwake 1 darkened
  daylight's terrain ladder on 2026-08-28 and never re-baked; this body
  inherited the stale PNGs. Re-baking moved green, yellow and blue and left
  red — the one colour that release did not touch. **This is the whole case
  for a recipe over a frozen loaf.**
- **Settlement has terrain art**, for the first time and by passing the
  guardrail rather than by being liked.
- **`ui.logo` and `ui.runEnd` are baked AND WIRED** through `shell/art.ts` —
  the door's lockup and the end screen's hero. `fx.pop` is deliberately NOT
  baked: this body's pop is one white disc every direction tints through an
  additive material, and a pre-coloured per-theme PNG cannot serve that. The
  reason is written where the baker skips it.

**What is left is yours, and it is one sitting:** every direction's art has
changed and none of it has been on a phone. Look at all four, and at daylight
in particular — that is a contrast correction nobody has ever seen applied.

## 4. Deferred by ruling — do not reopen

Ashwake 1's parking lot carries over unchanged: Tier-1 uniques, sound's written
question, a leaderboard (needs a backend, D13), store wrappers, the
waypoint-perk earn, world mood, ground-feeds-draft, storage compaction, the
timeline's spine question, and pop-vs-burn-vs-wait (answered over weeks of
play, not before a tag).
