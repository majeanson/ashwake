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

So the road to v2.0 is now:

1. **Session C**, the stranger test, `PLAYTEST.md`. v2.0's gate, never run on
   either body.
2. **Then D22 and D23** (§3), both ruled to wait for it.

The friends keep playing through all of it — Marc: _"carry on forward while
users are playing … don't care about midgame updates"_. Work that does not
touch the first minute (the hall of fame, the atlas, the end screen's later
doors) can still ship.

---

## 1. Marc, on the phone — what landed on the evening of 2026-09-24

**The sheet is a published page**, _The phone sitting_ —
https://claude.ai/artifact/D9Hu295m8xDoXGNkLHiGyc — and its answers land in
the page's `answers` collection, one document per item id. A session reads
them with `ArtifactData` `list` before touching anything here. Rounds one and
two were answered on 2026-09-24 and every change they asked for is built:
round two kept the waking tap and the new French as they are, and asked for
the five builds below — plus one bug from Marc's own play (item 1).

Each was built from a desk that evening and has not been seen on a phone:

1. **The replay camera FOLLOWS** (_"not the right one. make it more fluid,
   less step-y"_). The dive per pop is gone: the camera eases continuously
   toward each move at `FOLLOW_ZOOM` (1.8, `board/camera.ts`), and closing a
   film by any door drops the follow and flies the whole board back. That
   last part answers _"when i came back … i started a new one and my camera
   was misplaced"_ — which the harness could not reproduce; the likeliest
   cause (a tap during a dive parking the camera at an old pop) no longer
   exists. **Is 1.8 the closeness, and is the easing (`FOLLOW_TAU_MS`, 650)
   smooth without lagging?**
2. **The chosen pocket flashes slower** — every 1.5 s (_"flash slower"_).
3. **Under the lens, every tile of that ground prints its worth** (_"show
   points on concerned color of each tile too while lens is on"_) — worth,
   the unit the panel speaks, since a tile has no points until it pops.
4. **The atlas is the hall of fame's ATLAS tab** (_"put it in hall of fame
   somehow"_), opening on one line that says what it is. With four tabs the
   French tab strip scrolls at a phone's width — JOURNAL is cut off while
   ATLAS is open. A look.
5. **New French**: « Le monde où tu es, à travers toutes les parties jouées
   dessus. » (the ATLAS tab's line).

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

- **The ✦ marks in the diary — yours (2026-09-24).** Every diary row stores
  what made its run worth remembering (a best, a shrine, a perk, a goal, a
  territory, a camp) and no screen shows it; Ashwake 1 put "✦ N" on the row
  and listed the marks when it opened. For one day the automatic replay was
  its only reader; when that went, `pnpm sweep` flagged it, and showing them
  is exactly Ashwake 1's parked _"spine-vs-✦"_ question (§7), so it was not
  built. Bring the marks back to the diary, or leave them stored? **Asked
  twice on the phone sheet (round two) and left unanswered**, so still open.
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
  first one here with a second data point. If it fails again, read the screenshot
  before touching the spec; `e2e` gates nothing, `smoke` does.
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
timeline's spine question, and pop-vs-burn-vs-wait (answered over weeks of
play, not before a tag).
