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
- `PASS.md` and `IMPROVEMENTS.md` — the records of two finished passes. Their
  one open row (P6.7) is §2 below and nowhere else.
- `PLAYTEST.md` — the phone scripts, Session A and Session C.

---

## 0. Where it stands

**Session A's list is built.** Marc's verdict on 2026-09-16 was _"clean enough,
fix the list above then freeze"_, and every item on that list has shipped: the
desk fixes, the fly-in, the rest screen, the lens panel, the welcome and the
replay (`NEXT-HISTORY.md` §1a). The late-lesson question the replay raised was
ruled and built on 2026-09-24.

So the road to v2.0 is three steps, in this order:

1. **Session A's last clean pass** (§1). The friends keep playing through it —
   Marc: _"carry on forward while users are playing … don't care about midgame
   updates"_.
2. **The freeze.** From that pass on, nothing that changes the first minute
   ships until Session C has run. A stranger is a one-shot resource.
3. **Session C**, the stranger test, `PLAYTEST.md`. v2.0's gate, never run on
   either body. D23 (§3) waits for it on purpose.

**Nothing on this list can be done from a desk alone.** A session with no phone
answer in hand has housekeeping (§5) and nothing else queued.

---

## 1. Marc, on the phone — one sitting

**The sheet for this sitting is a published page**, _The phone sitting_ —
https://claude.ai/artifact/D9Hu295m8xDoXGNkLHiGyc — with a link into the live
game for each item below, §2's P6.7, and three of §3's questions. Marc's marks
and notes land in its `answers` collection, one document per item id; a
session reads them with `ArtifactData` `list` before touching anything here.

Each of these is a number or a look chosen at a desk and never seen on a
device. Where a URL dial exists it is given, so the alternative can be tried
without a build. The number lives where it says; changing it is one line.

1. **The welcome** — the wash and lockup lifting as a run opens. Is 900 ms the
   beat, and should the lockup appear at all when you are RESUMING a run?
   `board/waking.ts` `WAKE_MS`; `?wake=3000` slows it down to look at,
   `?wake=0` removes it.
2. **The fly-in** — whole world, a hold, then one glide to the frontier. Is the
   700 ms hold right, and does the landing read on a BIG world, where DEFAULT's
   zoom crops to the frontier? `board/flight.ts` `OPEN_WIDE_HOLD_MS`. No dial.
3. **The rest screen** — after fifteen still seconds the board dims under a
   72% scrim with the lockup at a third of the width. Scrim depth and lockup
   size are desk guesses. `ui.css` `.board-rest`; `?rest=2` rests after two
   seconds.
4. **The replay** — a whole run in about 14 s, 760 ms on each pop, playing
   itself after every run that earned a ✦. Is 14 s the length, does the pop
   beat read, and does an automatic film after every ✦ run stay welcome or wear
   out? `shell/watching.ts` `TARGET_MS`, `POP_MS`.
5. **The lens panel** — its density, and whether WORTH (before pocket size and
   distance) is the number you wanted or it should be the priced points. Also
   the word LENTILLE on a corner button, for your ear. `screens/LensPanel`.
6. **The pocket POP will take** is outlined in accent ink
   (`board/rings.ts`), and you asked for it while looking straight at it — so
   on a phone it is not loud enough. How loud is a look.
7. **The atlas's door is too quiet** — you did not notice the atlas existed.
   Where its button lives and how it is marked is a look.
8. **Settlement's shaded terrain sides** sit 0.126–0.374 L\* from the board.
   The wall's gap was measured and fixed; whether FARM's shaded side still reads
   as a gap is an eye. `?light=0.7` flattens the rig; if that fixes it, the
   answer is the rig, not the palette.
9. **One new French sentence**, the spare purse, once a run: « Plus de tuiles
   que tu peux en dépenser. Seuls les points comptent dorénavant. »
10. **Then Session A's last clean pass**, `PLAYTEST.md`. It starts the freeze.

The French in general stays where it is: _"fine so far"_, corrections as you
meet them.

---

## 2. Somebody else's device

- **P6.7, the iOS install offer.** It hides itself on an installed copy, so
  your phone cannot show it. It needs a friend's iPhone where the game is NOT
  on the home screen: open the front door and see the offer; its timing is
  ruled and built (`shell/installDue.ts` — at once, then again after a week,
  then never).
- **A genuinely full phone**, if one ever turns up: open the game, press BEGIN,
  and see whether the strip says the diary was shed once the board is up. No
  harness can stage it (`e2e/quota.spec.ts`'s skip carries five measurements
  of why).

---

## 3. Decisions still open

- **D22 — collecting play data, and the privacy line.** SETTINGS says
  _"Nothing leaves your phone: no account, no analytics, no server."_ The two
  honest options are keep the line and take nothing, or amend the line in the
  same commit that adds collection. `ROADMAP.md` counts it in v2.0's definition
  of done. Ashwake 1's `DECISIONS.md` D22 has the whole argument.
- **D23 — the first-run acknowledgement.** Sequenced AFTER Session C, on
  purpose: shipped before it, a stranger who starts a second run tells us
  nothing about the game.
- **TREASURE's price.** Reachable through a shrine unlock
  (`content/tuning.ts` `treasureNeed`), and it forfeits a pocket's tiles AND
  points for one rare tile: a 20-tile harvest averages ~1,467 points in the
  sim, and the rare tile pays back +5 to +15 worth once. Three directions were
  raised on 2026-09-03 and none was ruled — keep the tiles and forfeit only
  points, make the rare tile do more, or lower `treasureNeed`. Marc said
  _"dont reintroduce it"_ of TREASURE during the 2026-09-04 scoring pass
  (`LOG.md` Session 51), which kept it out of that rebalance; whether he also
  meant the button should go was never asked. One question settles it.
- **The board's fit ignores how tall a tile stands.** `screenOf` gets height
  `0` at every production site (`board/camera.ts`, `board/cursor.ts`), so the
  fit measures the ground while relief lifts a hex up to ~0.55 radii (about
  20 px at the top edge). `0` is correct for the drag; whether the FIT should
  include lift is a framing change on the first screen. Cheap either way —
  and inside the freeze once Session A passes.
- **One epitaph says "The torch carried N placements out"** (`text/en.ts`,
  `text/fr-CA.ts`, the epitaph pool). Settlement has lamps, not a torch.
  Reword it, or accept it.

---

## 4. Watching — no action unless it happens again

- **`board.spec.ts` "two fingers lean and turn the board"** failed CI's `e2e`
  job once on 2026-09-16, retry included (`toHaveAttribute` at line 1138), and
  has passed on every push since. First noted 2026-09-14 as a synthesised
  gesture on a runner that had never shown it. If it fails again, read the
  screenshot before touching the spec; `e2e` gates nothing, `smoke` does.
- **Three `z-index: calc(...)` sites** in `ui.css` (`.board-menu`, `.lens-off`,
  `.directions`) were suspected of a WebKit stacking bug in 2026-09 and the
  theory was disproved (`e2e/stacking.spec.ts` asks the engine). Nothing to do
  unless a control is reported drawn over another one again.
- **Retired 2026-09-24:** the `quota.spec.ts` WebKit diagnostic entry. It said
  _"if it never fails in a week, delete this entry"_; it has not failed since
  2026-09-14.

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
