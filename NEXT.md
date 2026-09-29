# NEXT.md — what is left, and who each item needs

Rewritten 2026-09-24 (`LOG.md` Session 115). **Only open items live here.**
When one closes, strike it for a session and then move it to
`NEXT-HISTORY.md` — do not let this file grow a second history.

The rule this file exists for is unchanged: **a stale open-list is worse than
none — it sends a session hunting for work that shipped days ago.** Check every
claim here against the code before acting on it. Every item below was checked on
2026-09-24.

Where the rest lives:

- `STATUS.md` — what is done and verified.
- `ROADMAP.md` — the stages, and v2.0's definition of done.
- `LOG.md` — the per-session record and its reasoning.
- `NEXT-HISTORY.md` — everything this file used to hold, whole, under its
  old section numbers. **Code that cites `NEXT.md` §0–§5d means that file.**
- `PASS.md` and `IMPROVEMENTS.md` — the records of two finished passes. Every
  row in both is closed; the last one, P6.7, closed on 2026-09-24 (§2).
- `PLAYTEST.md` — the phone scripts, Session A and Session C.

---

## 0. Where it stands

**Session A passed clean on 2026-09-24**, on the phone sheet (§1), and the
first minute is **frozen from today until Session C has run.** The same
sitting asked for six changes and all six landed the same day as the pass's
own fixes — TREASURE retired, the replay a door that dives to its pops, the
waking tap swallowed, the chosen pocket flashing, the lens panel's detail, the
lamps epitaph (`LOG.md` Session 115). **Nothing else that changes the first
minute ships before Session C.** A stranger is a one-shot resource.

**Two deliberate exceptions since, both Marc's own (2026-09-25):**

- POP left the row above the hand for the cluster over the board — _"pop,
  luck, lens, camera"_ — and the footer is only the hand (`cc6c1ee`).
- A tap on a placed tile lights its ground on the board — _"make it pop the
  lens for that color"_ (`5cd33b1`), then, the same day, _"dont open lens
  when we click on the board, just the map is updated"_ — where it used to say
  the tile's one-line description; and the purse and lens sheets now sit above
  the cluster's real height.

Both change the first minute after the clean pass, on purpose and by the
owner. Round six saw them on the phone and asked for more (the cluster's marks,
a hold on a tile), so round seven was Session A's pass, and came back clean at `8e77420` —
until the taste round asked for four more changes the stranger would see, built
and re-frozen the same evening. **Round eight came back clean**, with one small
addition of Marc's (a ✕ on a pop's result), and that build is Session C's (§1).

So the road to v2.0 is now:

1. **Session C**, the stranger test, `PLAYTEST.md`. v2.0's gate, never run on
   either body.
2. **Then light D23**: delete the `ui.firstRun` flag in `meta/features.ts`
   so the first-run line is unconditional (built and tested dark on
   2026-09-29, §3). D22 is ruled and needs nothing: the promise stays. And
   set `beaconHorizon: 3` and `cachePays: 10` (§3a, ruled 2026-09-29) — a
   rule move, so `sim.golden.txt` moves with it.
3. **Then the cutover** (§5c, `CUTOVER.md`), and v2.0.

The friends keep playing through all of it — Marc: _"carry on forward while
users are playing … don't care about midgame updates"_. Work that does not
touch the first minute (the hall of fame, the atlas, the end screen's later
doors) can still ship.

---

## 1. Marc, on the phone — round ten, one look

**The sheet is a published page**, _The phone sitting_ —
https://claude.ai/artifact/D9Hu295m8xDoXGNkLHiGyc — and its answers land in
the page's `answers` collection, one document per item id. A session reads
them with `ArtifactData` `list` before touching anything here.

**Eight rounds and the taste round, all answered, all built**; round eight
came back clean at `8e7785d`. Then Marc, the same evening: _"make sure the
header in game uses all height available (with menu in it changed) and make
sure symbols and points occupy maximum size so its easy to read"_ — built, and
it is the first row of the first minute, so round nine was that one look.

**Round nine came back on 2026-09-29** (in the session, not on the sheet; the
answer is written into `r9-header` all the same): _"the visual is good, but im
wondering if we could priotize tiles, points (the other 2 are less important
and affect the overall progress of the game still)"_. Offered a weighted row
or two tiers, he chose the weighted row: reach and cost keep their place and
their tap in narrower boxes, with smaller, dimmer numbers (`MINOR` in
`Hud.tsx`, `e2e/hud.spec.ts`). So **round ten is that one look
(`r10-header`), and its _ok_ names Session C's build.** No stranger is lined
up yet, so there is no hurry on it.

---

## 2. Somebody else's device

- **~~P6.7, the iOS install offer~~ — CLOSED 2026-09-24.** Marc: it shows
  _"only in incognito, seems fine for new users"_ — the friend's own Safari
  had spent its showings on an earlier visit, which is the rule working
  (`shell/installDue.ts`). Confirmed from the desk the same day: a fresh
  iPhone-Safari WebKit page shows the line under DAILY.
- **A genuinely full phone**, if one ever turns up: open the game, press BEGIN,
  and see whether the strip says the diary was shed once the board is up. No
  harness can stage it (`e2e/quota.spec.ts`'s skip carries five measurements
  of why).

---

## 3. Decisions still open

- **~~The ✦ marks in the diary~~ — SHOWN 2026-09-24**, like Ashwake 1 (§1, item 3).
- **~~The atlas~~ — MOVED 2026-09-24** to the hall of fame (§1, item 4).
- **~~D22 — collecting play data~~ — RULED 2026-09-29: (a), keep the
  promise.** Marc chose to keep _"Nothing leaves your phone: no account, no
  analytics, no server."_ No collection; balance stays answered by the sim
  harness and the reports players choose to send (`DECISIONS.md` D13).
- **D23 — the first-run acknowledgement. RULED 2026-09-29: an end-screen
  beat**, on the first finished run only, naming what just opened; no new
  unlock axis (`DECISIONS.md` D13). Built behind a flag that stays OFF until
  Session C has run: shipped on, a stranger who starts a second run tells us
  nothing about the game.
- **~~The board's fit ignores how tall a tile stands~~ — NOT TRUE, checked
  2026-09-29.** `frameFor` has reserved `tallest × sin(tilt)` of sky at the
  top edge since Stage 2b (`2a9cd3c`); `tallest` is the relief-lifted
  `tallestOf` (`Board.tsx`); and `camera.test.ts` (_"keeps the whole board on
  screen at every angle, walls and all"_) holds every corner at floor AND top
  height inside the phone. The 2026-09-10 finding read `h = 0`
  at the call sites and missed the `sky` term. The remaining zeros are right:
  the drag inverse maps a finger onto the ground, and an arrow asks which
  neighbour lies that way on the ground. Nothing to decide.
- **~~TREASURE's price~~ — RETIRED 2026-09-24.** Marc: _"i never used that
  option get rid of the whole concept."_ `treasureNeed` is 0 and every
  surface is gone (`content/tuning.ts` says what stays and why).
- **~~The torch epitaph~~ — REWORDED 2026-09-24**: the lamps.

---

## 3a. The balance-and-fun study — findings, each a decision of Marc's

`packages/core/scripts/study.ts`, 1000 seeds, the shipped `TUNING`, run
2026-09-29 (`LOG.md` Session 117 has the table). Bots are not people: these
are places where fun is known to leak, not verdicts. **Any change here moves a
rule, so it moves `sim.golden.txt` in the same commit.**

- **Waiting is never wrong.** Popping at pocket size k scores 458 at k=1,
  1182 at 8 and 1334 at 20, and never turns down. Waiting costs only close
  calls (0 → 4 a run) and spread. The pop-or-wait question is on the table
  on 82% of turns, but its answer is always "wait if you can".
- **The run peaks at halftime.** The biggest pop lands on average 52% of the
  way through, on every line. The second half is a wind-down under a rising
  cost, not a climax.
- **Two of the three luck spends buy nothing.** Forge pays: +11% median.
  Steer is taken eight times a run and gains nothing, and reroll is almost
  never worth taking. Luck mostly goes unspent and becomes relics at 5%.
- **Chasing the glow is a trap for 4% of runs.** `seeker` dies before 40
  placements in 41 runs out of 1000, and its median is 10% under plain
  banking.
- **The seed decides a lot.** The best line's 90th-percentile score is 2.7× its
  10th. The skill gap is healthy all the same: greedy 458, patient 1334.
- **Walking pays about 15% of the tiles**; pops pay the rest. Session 11 made
  caches "the survival engine", and they are a supplement now.

**Ruled 2026-09-29:** forge at 40, shipped. Horizon 3 and caches paying 10
are queued for after Session C. Escalation and overripe pockets are dropped.
Next is making **colour matter at every stage of a run** (Marc); steer's
shape waits on that. Timing ideas not yet chosen: chains, tides, bounty
deadlines, colour sets.

## 4. Watching — no action unless it happens again

- **`quota.spec.ts:185` on WebKit — back on this list the day it was taken
  off.** Retired on the morning of 2026-09-24 by its own rule (no failure
  since 2026-09-14), it failed CI's `e2e` job that evening on `0941f5e`,
  retry included: `DIAG {"ashwake.world.1.v1":157,"ashwake.run.1.v1":2553,
"__error":null,"__errorLength":null,"__toast":""}` — the diary WAS shed and
  the toast was empty. `30c027e`, one commit earlier with the same app code,
  passed it; the commit between them touched only `board.spec.ts`. So a
  flake, with a clean diagnostic now: the shed happened and the sentence did
  not reach `.toast`. If it fails again, start from that.
- **`board.spec.ts` "two fingers lean and turn the board"** failed CI's `e2e`
  job on 2026-09-16, retry included (`toHaveAttribute` at line 1138), and
  **again on 2026-09-24** on Chromium, on `5e7bc07` — a commit that changed
  only the pocket flash's period, which that test cannot see; the four pushes
  around it passed it. Twice in eight days is still a flake, but it is the
  first one here with a second data point. **A third on 2026-09-25**, on
  `7353e35` (a `budget.json` bar move), _"MY VIEW did not give back the angle
  the hands made"_ — three in nine days, two of them after the follow camera
  landed. The follow is dropped by every lean change, so it should not be the
  cause, but that is now worth proving rather than assuming.
  **Run and read on 2026-09-25 (`LOG.md` Session 116):** 20/20 on `b72e6b4^`,
  20/20 on `b72e6b4`, then **1 in 20 on HEAD** with the CI message: the hands
  left yaw 45, MY VIEW gave back 30 — the second-to-last move's angle. Not the
  follow: the `orbited` flag, which a stale passive effect could consume, so
  the last angle stamped nothing. **Fixed in the same session** by carrying
  `hands` with the angle itself (`Board.tsx`, `leanBy`). The repeat runs
  cannot prove it — 60/60 with the fix, and 60/60 without it as a control — so
  the fix stands on the mechanism. **If it fails again, the theory is wrong**:
  read the screenshot before touching the spec; `e2e` gates nothing, `smoke`
  does. **2026-09-29: sixteen pushes green in a row** on both engines since
  the last failure (`3df3fe6` → `de4c781`), eleven of them after the fix in
  `b514f6f`.
- **Three `z-index: calc(...)` sites** in `ui.css` (`.board-menu`, `.lens-off`,
  `.directions`) were suspected of a WebKit stacking bug in 2026-09 and the
  theory was disproved (`e2e/stacking.spec.ts` asks the engine). Nothing to do
  unless a control is reported drawn over another one again.

---

## 5. Housekeeping with a date on it

- **On or after 2026-10-09: delete `claim.shrineDetour` and
  `view.hex.shrineDetour` / `shrineDetourClaimed`** from both catalogues. They
  are reachable only by a `?seed=` run saved before 2026-09-09 and resumed
  after, and a month is generous. Left past that, the next dead-text sweep
  re-adjudicates them from scratch.

---

## 5c. The cutover — prepared, decided, not run

`CUTOVER.md` (2026-09-25) is tiles.marcportal.com becoming Ashwake 2, after
Session C. Marc's decisions the same day: **no automatic bring-over** of v1
worlds, **no warning** to v1 players, and **ashwake.marcportal.com redirected
or dropped** (which of the two is left for the day). Both strand the saves made
there, so the runbook's step 0a is a backup and restore by Marc and every
tester.

---

## 6. Taste, never ruled, no defect under it

Questions from late August and early September that were put as "by feel" and
never answered, because nothing went wrong. Listed once so they are not lost;
**none needs an answer unless something bothers you on the phone.** The
original argument for each is in `NEXT-HISTORY.md` §1. **Seven of them are the
sheet's taste round (2026-09-25)**, `t-corner`, `t-marks`, `t-accent` (the
harvest row's question, asked of the cluster POP moved into), `t-details`,
`t-walked`, `t-camera` and `t-keys`; the stat row's is Session C's to answer.
A _change_ there that touches the first minute waits for Session C.

- The two corners: MENU top-right is out of a thumb's reach one-handed on a big
  phone, deliberately.
- POP's mark is a hand and SACRIFICE's a flame — do they read at 16 px?
- The harvest row: four accented buttons in one row, the accent ration spent or
  broken?
- The pop line: does anyone ever tap DETAILS?
- THE GROUND YOU WALKED: is the live board worth going back into, or is it one
  tap too close?
- The camera by hand: `PX_PER_DEGREE = 4`, the 55° ceiling, the deadzones
  (`board/camera.ts`), and the default tilt of 35.
- The keyboard: 15° a turn, 5° a lean, 96 px a pan, and whether Q/E/R/F is the
  pair a hand reaches for.
- A stat row of six marks: does a stranger ever tap one? (Session C.)

---

## 7. Deferred by ruling — do not reopen

Ashwake 1's parking lot carries over unchanged: Tier-1 uniques, sound's written
question, a leaderboard (needs a backend, D13), store wrappers, the
waypoint-perk earn, world mood, ground-feeds-draft, storage compaction, the
timeline's spine question (its ✦ half answered 2026-09-24: Marc had the
marks shown in the diary, like Ashwake 1 — the spine itself stays parked), and pop-vs-burn-vs-wait (answered over weeks of
play, not before a tag; its BURN half no longer exists — `burnLuck` and
`burnRelics` are both 0 and SACRIFICE is hidden — and the harness's half is
measured in §3a, 2026-09-29).
