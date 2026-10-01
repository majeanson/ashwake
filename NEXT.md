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
   set `beaconHorizon: 3` and `cachePays: 10` (§3a, ruled 2026-09-29), and
   the knee, `costGrace: 40`, `costRisesEvery: 10`, `pointsPerPop: 0.20`
   (§3a, ruled 2026-10-01). Rule moves, so `sim.golden.txt` moves with them.
3. **Then the cutover** (§5c, `CUTOVER.md`), and v2.0.

The friends keep playing through all of it — Marc: _"carry on forward while
users are playing … don't care about midgame updates"_. Work that does not
touch the first minute (the hall of fame, the atlas, the end screen's later
doors) can still ship.

---

## 1. Marc, on the phone — round eleven, the caravan

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
`Hud.tsx`, `e2e/hud.spec.ts`). So round ten was that one look (`r10-header`).

**Round ten came back ok (2026-09-29, on the sheet and again in the session),
so Session C's build is `ccc5379`** (`PLAYTEST.md`). It carries the day's
balance pass (§3a) on purpose. Marc also passed both new French steer
sentences. From here, anything that changes the first minute needs a new look
before the stranger plays.

**And the caravan changes it** (§3a): a line under the header from the first
placement and a pick-one-of-three sheet. So **round eleven (`r11-caravan`,
`r11-french`) is its look**, and its _ok_ names Session C's build in place of
`ccc5379`. **Since 2026-09-30 the look is different** (LOG Sessions 118-120).
The line wears a storefront and says only _CARAVAN · ON ITS WAY_ / _IN TOWN_
/ _LEFT TOWN_, POP wears no mark, and the receipt says _took it_ or _passed
on this one_. The first time it is in town with a pop to try, a CARAVAN card
explains it, and the manual has a CARAVAN section under PLAY with the sizes
and every ware in its DETAILS. The sheet's round-eleven items were rewritten
for this look on 2026-09-30, before either was answered. To judge: does the
in-town line read as a reason to pop, and does the card land at a good
moment? The in-town accent and the dimmed away lines are old styles, reused
sight unseen, and the storefront beside them is new. And the new French: the
line (`CARAVANE · EN ROUTE / EN VILLE / PARTIE / N MARCHANDISES EN ATTENTE`),
the receipt's `passed`, the card and section (`lesson.caravan`), and eight
wares (EVERY POP PAYS, RARER
DRAWS, RARES PAY, ALL POWERS, THE ROAD PAYS, BIGGER BOUNTIES, LUCKY POPS, A
BIGGER STASH, in `fr-CA.ts` `caravan.ware`). ALL POWERS's note was
reworded in review (Session 119): it said _double_ and the ware is ×1.5, so it
now says _moitié plus fort_. **Measured 2026-10-01** (`LOG.md` Session 125):
three of the longest wares, in French, at 320x568, ran the picker 55 px off
the top of the screen, head and first name with it. It now stops at the header
and scrolls inside; at 360x640 and up, all three fit without scrolling. So on
the smallest phone the third ware sits under the fold, and whether that reads
as "there is more" is part of this look.

**And THE FOUR GROUNDS joins this round (2026-09-30, `LOG.md` Sessions
122-123; Marc: build it for round eleven).** The COLOURS card had never shown
in this body: the drip fired `colours` into a card with no lesson, so it was
never told, and LAST GASP, behind it, never spoke. It is Ashwake 1's card: a
lead line and one row per ground, each with the real baked tile and the
ground's own sentence (the one a second tap on a card says). It fires on the
first placement, so it is part of this look. So is the baked tile now beside
the PURSE card's four steer rows, which drew flat squares. To judge: is the
card worth stopping for at the first placement, and do the four rows read at
a glance? And its French: _LES QUATRE SOLS_, _Chaque carte est l’un de ces
quatre sols, et chacun marque à sa façon._

---

## 2. Somebody else's device

- **~~P6.7, the iOS install offer~~ — CLOSED 2026-09-24.** Marc: it shows
  _"only in incognito, seems fine for new users"_ — the friend's own Safari
  had spent its showings on an earlier visit, which is the rule working
  (`shell/installDue.ts`). Confirmed from the desk the same day: a fresh
  iPhone-Safari WebKit page shows the line under DAILY.
- **~~Cloudflare Web Analytics on marcportal.com~~ — DISABLED 2026-10-01**
  by Marc (Web Analytics → marcportal.com → RUM: Disable), the same day it
  was found (`LOG.md` Session 125). The edge had injected its beacon on both
  custom domains; v2's CSP refused it, and v1, with no CSP, POSTed to
  `/cdn-cgi/rum` under _"no analytics"_. Checked after, in a browser: neither
  host loads the beacon or sends anything. If it ever comes back, a browser
  load shows `data-cf-beacon` in the HTML; `curl` without a browser user
  agent never does.
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
Colour now counts at every stage (the placing paid twice, pocket size +0.4 a
tile: colour's share 34/26/38% → 47/37/50%), and steer is a GUARANTEE —
six draws of the colour named, at 20 luck — which pays when it reads the
ground and wastes its luck when it does not. The steer French was passed.

**Built the same day: THE CARAVAN**, the answer to "waiting is always right"
(`content/caravan.ts`, `LOG.md` Sessions 117-118). **Hidden since
2026-09-30**, at Marc's word. It comes to town for 10 placements, away 1 to
10 between, wanting a small (3-6) or big (7+) pocket it never names. The
first pop that fits buys one of three of thirteen wares: the first five
doubled, and eight more.
There is no multiplier and no outrageous ask (both dials at 0). Trying a pop
in town pays ~8-9% over the same habit that doesn't, fixed habits score the
game without a caravan, runs are 4-7 placements longer (forging, 7; Marc:
~20 is okay), singles never pay (1000 seeds, `LOG.md` Session 119). **Marc's:
the phone round (§1) and its French.**

**Did the caravan answer "waiting is always right"? No, measured
2026-09-30** (`LOG.md` Session 122, 1000 seeds). Taking wares, the pop-at-size
curve still rises at every step: 451 at 1, 1199 at 8, 1275 at 12, 1295 at 20.
The tryers rise too: 947 at 3, 1293 at 8, 1390 at 20. What changed is the
top: waiting from 8 to 20 is worth +8% now, against +11% before the caravan,
and **trying at 8 scores what waiting to 20 does** (1293 against 1295). So
the caravan gives an earlier habit a way to match the patient one; it does
not make waiting wrong. Marc's, if it matters: whether that is enough.

**And the rule move queued for after Session C is measured and ready**
(`beaconHorizon: 3`, `cachePays: 10`). `seeker`'s trap closes: runs dying
before 40 placements go 41 → 9 per 1000, and its median 1052 → 1131. Other
lines move 1-2% (bank20 1076 → 1089, try12 1387 → 1417, lengths +0-1). `pnpm
sim` moves in the points and best columns (e.g. seeker 1020 → 1185, bank20
1066 → 1095); the new golden is one `pnpm sim` away when it ships.

**The halftime peak, explained, and a candidate measured (2026-10-01,
`LOG.md` Session 124).** It is the purse: from halftime the runway falls
under 5 placements and pocket size halves every fifth of the run, so the last
30% is singles cashed to stay alive. `costGrace` (the "two eras" knee,
designed in August, shipped at 0) is the first thing that moves it. At 40/10
with `pointsPerPop` 0.20, medians stay within 7% of shipped, the points peak
moves to the run's last fifth, the singles tail halves and the glow trap
closes (41 → 6), for +9 placements. Its cost: waiting gets more right
(+27% → +56% from pop-at-4 to pop-at-20) and small-pocket play almost never
nearly dies. **Ruled 2026-10-01: queued for after Session C**, beside the
horizon/cache move (§0). Measured together at 1000 seeds: the trap closes
entirely (0 runs dead before 40), other lines move 0-1% from the knee alone,
runs +10 over shipped. It is three dials, so nothing needs building. The day
it ships, the cost-curve sentences take the grace clause (`COST_CURVE_GRACE`),
the `prose.pin` snapshots move with them, and so does `sim.golden.txt`.
Two things checked after the ruling. STEADY PACE (+2 a level to the step)
is a bigger share of 10 than of 22, but the ladder holds: maxed, shipped goes
2.0× (1199 → 2396) and the knee 1.8× (1291 → 2275). And Marc's 2026-08-18
_"easier gradually with relics, not at the start"_ (`tuning.ts` at
`costRisesEvery`): the knee makes placements 22-40 cost 1, not 2, an easier
start bought with a harder end. Worth his eye on the phone the day it ships.

**And steer and reroll, re-measured the same day.** Both pay: the ground-reading
steer +6%, a reroll of any hand worth under 4 +6% (the old reroll line only
redrew worthless hands). Forge pays about 3× either per point of luck (+33%).
Cheaper prices (reroll 8, steer 15) take them to +11% and +10%. **Ruled
2026-10-01: leave it.** All three pay, and forge being the strong one is fine.

## 4. Watching — no action unless it happens again

- **A run saved on 2026-09-29 shows the caravan's size in its price.** It
  keeps that evening's multipliers in its own tuning, so POP's figure and the
  lens row jump when a pocket fits (`tuning.ts` at `caravanMult*`, `LOG.md`
  Session 119). No run started since shows it. If a friend reports a caravan
  row in the lens, this is why. And no multiplier dial comes back on while
  the ask is hidden.

- **~~`quota.spec.ts:185`, the toast that said nothing~~ — EXPLAINED AND FIXED
  2026-09-30** (`LOG.md` Session 121). Every CI failure that printed a DIAG
  (2026-09-24, -29, -30, both engines) printed the same one: the diary shed,
  the toast blank. The keeper writes 400 ms after a change, so a write left
  pending by BEGIN could land between filling the disk and the test starting
  to listen. It shed the diary and said so unheard, and the test's own tap cleared the line. Forced on
  demand, 3/3 failed with that DIAG; with the recorder moved before the fill,
  3/3 passed, plus 15/15 Chromium and 9/9 WebKit. The app was right every
  time. The diagnostic in the test stays until 2026-10-07; if it fires again,
  the explanation was not the whole of it.
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
- **~~The sweep counted a same-named key as a supplier~~ — FIXED 2026-09-30**
  (`LOG.md` Session 122). The fault was not `optional.ts#suppliers`, as this
  entry said, but `keys.ts`: every object-literal key read as
  "unattributable" and withheld its NAME program-wide. A key is now asked
  through the literal's contextual type, and `scripts/sweep/optional.test.ts`
  (a new `sweep` test project) fails on the old code. The corrected pass found
  three gaps it had been hiding. `IconProps.className` and `Lesson.rows` were
  options nothing supplied, and were deleted. `TipRow.art`, the real baked
  tile beside a ground (_"visuals with real tiles … in the how to play"_,
  2026-08-27), was never supplied in this body; since Session 123 `TipRows`
  draws the bake for every ground row itself, and the field is gone.
  `Lesson.rows` came back the same day with THE FOUR GROUNDS as its supplier
  (§1).
- **~~`verify:deploy` "fetch failed" once, on `06d7ed1` (2026-09-29)~~ —
  HARDENED 2026-10-01** (`LOG.md` Session 125). Every request now retries a
  connection that could not be made (`reach`), never an answer, and says the
  cause. If a deploy still fails on `fetch failed` after five tries, it is not
  a blip.
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
