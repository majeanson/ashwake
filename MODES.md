# MODES.md — the three kinds of run, and every door between them

Written 2026-09-09, because three sessions of bug-hunting in a row landed on
the same thing: **a mode is a set of flags, the flags are set by DOORS, and
every bug was a door that forgot one.** `Session.detour` outlived its run;
RESET ALL left `daily` set; the end screen gated an offer on `daily` when the
shell had already decided. None of those are visible from inside one file.

Check this against the code before acting on it (`CLAUDE.md`'s standing rule).
The authorities are `shell/economy.ts` for the dials, `shell/beginning.ts` for
the doors, and `shell/settle.ts` for what banks.

---

## The three kinds

|                           | **World**                                       | **Daily**                         | **Shared**                        |
| ------------------------- | ----------------------------------------------- | --------------------------------- | --------------------------------- |
| Seed                      | the slot's `worldSeed`, minted once             | `dailySeed(date)`                 | the `?seed=` in the link          |
| Flag that says so         | neither flag set                                | `daily !== null`                  | `session.detour`                  |
| Economy (`economyFor`)    | `home`: unlocks, then shop + perks              | `daily`                           | `detour` — same dials as `daily`  |
| Shrines                   | yes, and they unlock                            | rewritten to cache/site           | rewritten to cache/site           |
| Hidden finds              | yes, grant a perk                               | none generated                    | none generated                    |
| Territory                 | field + `territoryTiles` later + dowry          | field + `territoryPays` tiles now | field + `territoryPays` tiles now |
| Relics                    | earned                                          | all faucets 0                     | all faucets 0                     |
| Shop upgrades / worn perk | applied                                         | ignored                           | ignored                           |
| Fog + claims lent in      | `memoryFor(slot, seed)`                         | none                              | none                              |
| World learns mid-run      | `mergeRun` every action                         | no                                | no                                |
| Banks at the end          | `settle`: world, records, relics, survey, diary | `settleDaily`: ladder + diary     | nothing                           |
| Ending offers             | NEW RUN, crossing (if awake)                    | TRY AGAIN, KEEP THIS BOARD        | KEEP THIS BOARD                   |

**Only shrines differ in the GEOGRAPHY**, and only by wearing a cache's or a
site's face instead (`engine/world.ts`'s `reborn`). Ground, walls, caches,
sites, territories and elevation are identical on one seed across all three.
That is what makes keeping a board coherent: continuing it as a world does not
rearrange it, it **wakes** it, and the doors appear where the caches were.

## The doors

Every door goes through `enterRun` (`shell/beginning.ts`) and states its whole
`Door`. The compiler asks: a new field is a compile error at all four.

| Door                                                                  | `daily`        | `detour`            | `memory`                 | `economy`   | `keepsWorld` |
| --------------------------------------------------------------------- | -------------- | ------------------- | ------------------------ | ----------- | ------------ |
| **boot** (not `enterRun`; `App`'s `buildSession`)                     | from `?daily=` | seed ≠ slot's world | the slot's, unless daily | by kind     | —            |
| **NEW RUN / BEGIN AT CAMP**                                           | null           | false               | the slot's               | `economyAt` | false        |
| **enterWorld** (world switch, kept board, front-door SETTLE, RESTORE) | null           | false               | the slot's               | `economyAt` | false        |
| **enterDaily**                                                        | the date       | false               | none                     | `daily`     | false        |
| **takeCrossing**                                                      | null           | false               | none (fresh world)       | `economyAt` | **true**     |
| **RESET ALL** (direct `session.restart`)                              | null           | false (default)     | none                     | `economyAt` | —            |

**NOT MODE FLAGS**, and this list is what makes the table above checkable:
`Door` carries ten fields and the five columns are the five that decide what
KIND of run this is. The other five — `resume`, `seed`, `wakeAt`, `from` and
`fromMenus` — are facts about one PRESS: which board is being handed back, on
what seed, whether a camp was chosen, what this run measures its gains against,
and whether a panel has to close behind it. `seed` is in the three-kinds table
above, where it belongs. **An eleventh field fails `shell/modes.test.ts` until
somebody decides which of the two it is**, which is the one question the
compiler cannot ask — it can only insist every door answers.

**`detour` is false on every door and that is not redundancy.** A detour can
only be ENTERED at boot, from the URL. Making each door say so is the check
that a sixth door cannot forget — which is exactly what went wrong when the
flag lived on the session instead.

**RESTART uses two of these doors rather than being a seventh** (Marc's ruling,
2026-09-10: _"restart should restart whats being played currently (world or
daily, one or the other)"_). MORE's RESTART called `newRun` unconditionally,
and `newRun` LEAVES the daily by design — so the one control that says "start
this over" took a daily player into their own world. It now branches on
`daily`: `openDaily(null)` deals today's board fresh, `newRun` starts the next
expedition in this world. No new row above, because no new door.

**A shared board is not offered it at all**, and that follows from the rule
directly above rather than from taste: a mid-run RESTART that dealt the same
shared seed again would be the seventh door, with `detour: true`, which is the
one invariant three sessions of bugs bought. `More`'s `canRestart` is where
that is spent, and `NEXT.md` §1 records it as the case Marc's sentence did not
name.

## Where a world comes from

Four ways, and two of them mint a world holding facts no run there earned:

1. **`worldSeedFor(slot)`** — a fresh random seed, minted on first read. Empty.
2. **`cross`** — a fresh seed, **carrying the perk shelf** (`newWorld`'s
   `carry`) and the device's relics. Everything that is the place stays behind.
3. **`worldFromRun`** — KEEP THIS BOARD, from a daily or a shared board: the
   ground walked, the territories claimed, how far it got. Not `runs`, not
   `bestPoints`.
4. **`fixture.ts`** — the `?runs=300` audit axis.

**Cases 2, 3 and 4 must all call `sealGoals`** (`meta/goals.ts`), and each one
learned it separately before the function existed. A minted world's
`goalsMet` starts empty and the survey pays at the END of the next run, so
without the seal one placement collects relics for facts the world was handed:
`perksAll` after a crossing (40 relics a lap, forever), and `known40` +
`reach20` + `territories4` on a kept board (90). **Wherever a world is minted
holding facts it did not earn, seal the survey.**

## The two seed guards

Both halves of the banking fork refuse a run played on a foreign board, and
they are the same rule stated twice because they write different ledgers:

- **`settle`** refuses a run whose `rootSeed` is not the world's and returns
  every ledger untouched. Ground unioned from a foreign geography is
  unremovable afterwards. Proved by **"a run played on somebody else's seed"**
  in `shell/settle.test.ts`.
- **`settleDaily`** refuses a run whose `rootSeed` is not `dailySeed(date)`
  and returns the ladder and the diary untouched. Added 2026-09-09; this half
  took the date on trust for the whole of Stage 4, and the ladder is the one
  ledger compared BETWEEN people, so a score on it from a private board is the
  only kind of wrong nobody can notice from outside. Proved by **"a daily
  banked from a board that is not that date's"**, same file.

**Both citations are asserted** (`shell/modes.test.ts`), and the citation is
the point rather than the prose: a guard is protected by its test, so a matrix
that names the test fails when the proof is deleted and not merely when the
sentence rots. This section used to QUOTE the two expressions instead, and one
of the two quotes was already wrong — `settle` compares against `before`, not
a variable called `world`. A doc that quotes code is a doc that has to be
edited every time the code is tidied, which is how it stops being edited.

## Which reader may see a foreign board, and which may not

A slot's run key holds a DETOUR's run: the keeper is made from the `Place`, and
a `?seed=` visitor is standing in a slot. So "the run in this slot" and "the
run on this world" are different questions, and every reader has to pick one.

| Reader                  | Filters by seed?      | Why                                                                                                                                   |
| ----------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `readRun(slot)`         | **no, deliberately**  | `App`'s boot ladder resumes a shared link on reload. Adding a guard here silently breaks that.                                        |
| `runFor(slot, seed)`    | yes                   | What a door INTO a world must ask. `enterWorld` used `readRun` and handed a visitor the shared board back under WORLD 1.              |
| `memoryFor(slot, seed)` | yes                   | Since Stage 4: "hands back nothing when the seed is not its own."                                                                     |
| `readDailyRun(date)`    | yes, since 2026-09-09 | A date's key can only ever hold that date's board, so the guard belongs in the reader — one of its two callers had already forgotten. |
| `worldHeld(seed)`       | yes                   | Which is what blocked the `enterWorld` bug from corrupting anything, and what made it invisible.                                      |

## What is deliberately NOT shared

- A shared board's **geography is the sharer's**, which is why `NO_LEDGER`
  touches no terrain dial. A replay scored under this device's upgrades would
  not be a replay of anything.
- A daily's **score stays on the daily ladder** even if the board is kept
  (`worldFromRun` leaves `runs` and `bestPoints` at zero). Marc's answer when
  asked, over both "the run counts as run 1" and "seed only".
- A shared run banks **no ledger**, and until 2026-09-09 it left no trace at
  all. It gets a DIARY ROW now and nothing else: `SharedEntry`
  (`meta/timeline.ts:136`) is its own timeline kind, written by `settle`'s
  detour branch and led by the seed the way a daily's row is led by its date.
  Its own kind rather than a `RunEntry` with a marker, because `runsOf` feeds
  the TOTALS run count and `prehistory`'s arithmetic — both questions about
  THIS device's worlds — and a shared run inside that filter would inflate
  every total.

  **This bullet said "Open question in `NEXT.md` §1" until 2026-09-09**, while
  §1 had recorded the answer on the day the file was written. Corrected by
  `PASS.md` P10.5, which is the item that exists because of it: a matrix that
  states in prose what the code could assert goes stale on the same day it is
  written.

---

## Names in this file the code does not declare

`shell/modes.test.ts` asserts that every symbol either matrix names in
backticks is declared somewhere in `packages/core/src` or `apps/game/src` — so
a rename cannot quietly turn a claim about today into a claim about a version
that is gone. Two kinds of name legitimately cannot resolve, and they are
listed rather than excluded by a rule, because a reader wants to know which
names they can go and read:

**GONE:** nothing. Every symbol this file names is still there.

**NOT OURS:** nothing. This file names no platform API.
