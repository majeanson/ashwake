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
- A tap on a placed tile opens the lens panel on its ground — _"make it pop
  the lens for that color"_ — where it used to say the tile's one-line
  description; and the purse and lens sheets now sit above the cluster's real
  height (`5cd33b1`).

Both change the first minute after the clean pass, on purpose and by the
owner. Neither had been seen on a phone when it landed, so they are round six
on the sheet (§1). **Round six is Session A's pass for the board the stranger
meets**: once it comes back clean, that build is the one Session C runs on.

So the road to v2.0 is now:

1. **Session C**, the stranger test, `PLAYTEST.md`. v2.0's gate, never run on
   either body.
2. **Then D22 and D23** (§3), both ruled to wait for it.

The friends keep playing through all of it — Marc: _"carry on forward while
users are playing … don't care about midgame updates"_. Work that does not
touch the first minute (the hall of fame, the atlas, the end screen's later
doors) can still ship.

---

## 1. Marc, on the phone — round six, four looks

**The sheet is a published page**, _The phone sitting_ —
https://claude.ai/artifact/D9Hu295m8xDoXGNkLHiGyc — and its answers land in
the page's `answers` collection, one document per item id. A session reads
them with `ArtifactData` `list` before touching anything here.

**Five rounds, all answered, all built, and the fifth kept everything**
(2026-09-25: the sharp diary picture and the pop receipt's table, both
_ok_).

**Round six, published 2026-09-25**, is the two first-minute changes (§0):
`r6-pop` (does POP over the board read as the button to press?), `r6-cover`
(does the floating cluster, two lines tall in French, ever hide a tile you
want?), `r6-tiletap` (does a tap on a tile opening the lens help or get in the
way in the first placements?), and `r6-sheets` (do the purse and the lens clear
the two-line cluster?). After it, the next thing that needs Marc's phone is a
stranger's — Session C (§0).

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
- **D22 — collecting play data, and the privacy line.** Marc, 2026-09-24:
  **after Session C.** SETTINGS still says _"Nothing leaves your phone: no
  account, no analytics, no server."_; the two honest options are unchanged.
  Still in `ROADMAP.md`'s definition of done.
- **D23 — the first-run acknowledgement.** Sequenced AFTER Session C, on
  purpose: shipped before it, a stranger who starts a second run tells us
  nothing about the game.
- **The board's fit ignores how tall a tile stands.** `screenOf` gets height
  `0` at every production site (`board/camera.ts`, `board/cursor.ts`), so the
  fit measures the ground while relief lifts a hex up to ~0.55 radii (about
  20 px at the top edge). A framing change on the first screen, so **frozen
  until Session C** with the rest of the first minute.
- **~~TREASURE's price~~ — RETIRED 2026-09-24.** Marc: _"i never used that
  option get rid of the whole concept."_ `treasureNeed` is 0 and every
  surface is gone (`content/tuning.ts` says what stays and why).
- **~~The torch epitaph~~ — REWORDED 2026-09-24**: the lamps.

---

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
  does.
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

## 6. Taste, never ruled, no defect under it

Questions from late August and early September that were put as "by feel" and
never answered, because nothing went wrong. Listed once so they are not lost;
**none needs an answer unless something bothers you on the phone.** The
original argument for each is in `NEXT-HISTORY.md` §1.

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
play, not before a tag).
