# INTERACTIONS.md — every gesture, Ashwake 1 vs Ashwake 2

Built 2026-08-29, on Marc's ask: _"make sure we can click on things like
shrines, biomes, tiles, unselect tiles, etc. draw a matrix of what we had
before vs what we have now and lets get back to what we had."_

The whole inventory of Ashwake 1's input handling was read out of `../tiles`
and checked against this body, gesture by gesture. **Check this file against
the code before trusting it** — that is the standing rule, and this file is
exactly the kind that goes stale.

Legend: **✓** works here · **✗** missing · **→** fixed this session · **—**
deliberately absent in both.

---

## 1. The board

| Gesture                                              | Ashwake 1                                                                     | Ashwake 2                           |
| ---------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------- |
| Tap a **legal empty hex** with a card                | places                                                                        | ✓                                   |
| Tap a **legal hex, hand empty**                      | _"Your hand is empty — tap a card below to pick one up."_                     | → was a **silent no-op**            |
| Tap a **ripe tile**                                  | prices that pocket, outlines it, and prints the whole `pocketNote` arithmetic | → priced, but **said nothing**      |
| Tap a **cache / site / shrine / territory / find**   | `describeHexOf` — what it is, what claiming pays, in this run's numbers       | → was a **silent no-op**            |
| Tap a **beacon** (a landmark glowing off-board)      | its line + _"Build your chain out to it."_                                    | → via `describeHexOf`               |
| Tap a **wall**                                       | _"▲ Wall — cannot be built on."_ + why it still helps things ripen            | → via `describeHexOf`               |
| Tap **spent stone**                                  | _"● Spent ground … except for {RED}, which feeds on it."_                     | → via `describeHexOf`               |
| Tap a **tile not yet ripe**                          | its worth, the ripening rule, its colour's power, its rarity line             | → via `describeHexOf`               |
| Tap **native ground**                                | _"Ground native to {NAME} — a {NAME} tile here is worth one more."_           | → via `describeHexOf`               |
| Tap **remembered fog** (the biome lens)              | lights every known patch of that colour; the same tap lets go                 | → was a **silent no-op**            |
| Tap **outside the map**                              | nothing at all                                                                | ✓                                   |
| Drag                                                 | pan, cancels a camera flight                                                  | ✓ (plus momentum, which v1 had not) |
| Pinch                                                | zoom                                                                          | ✓                                   |
| Wheel                                                | zoom                                                                          | ✓                                   |
| `touch-action: none` on the board                    | yes, since Stage 2                                                            | → **was missing entirely**          |
| Refuse the 28px iOS edge swipe                       | yes                                                                           | → **was missing entirely**          |
| Double-tap to zoom · drag-and-drop a card            | —                                                                             | —                                   |
| **Right-drag / Shift-drag** to turn and lean         | —                                                                             | → the desktop's two fingers         |
| Right-click raises the browser's menu over the board | yes                                                                           | → refused, because the button turns |

## 2. The hand

| Gesture                                    | Ashwake 1                                              | Ashwake 2                                 |
| ------------------------------------------ | ------------------------------------------------------ | ----------------------------------------- |
| Tap an **unselected card**                 | selects it                                             | ✓                                         |
| Tap the **selected card again**            | puts it down (`SELECT -1`) **and** explains its colour | → sent the wrong action; **silent no-op** |
| **Long-press / right-click** a card        | toggles the colour lens on that colour                 | ✓ (wired 2026-08-29)                      |
| Menu key / Shift+F10 on a focused card     | same as long-press, via native `contextmenu`           | ✓ (same handler)                          |
| Tap an **empty HOLD** with a card          | stashes it                                             | ✓ (wired 2026-08-29)                      |
| Tap a **held card** with a card            | trades                                                 | ✓ (wired 2026-08-29)                      |
| Tap a stash slot with **nothing selected** | one of two sentences, per slot state                   | ✓                                         |
| Spacers so the row never reflows           | yes                                                    | ✓                                         |
| Long-press a **stash** card                | — (lens is draft-only)                                 | —                                         |

## 3. Action bar, purse, stats

| Gesture                                          | Ashwake 1                                     | Ashwake 2                           |
| ------------------------------------------------ | --------------------------------------------- | ----------------------------------- |
| POP (tiles)                                      | flies the camera to the pocket, then harvests | → glides, then harvests             |
| POP for points                                   | harvests for points                           | ✓                                   |
| TAKE (treasure)                                  | harvests for a rare tile                      | → offered when the pocket earns one |
| SACRIFICE (burn)                                 | harvests for relics                           | → offered once relics are known     |
| LUCK ▸ purse drawer                              | opens; teaches on first deliberate open       | ✓                                   |
| REDRAW · steer a colour · FORGE · SACRIFICE LUCK | spend, each with its own receipt              | → each says what it cost            |
| Tap a **stat box**                               | prints that stat's `statNote`                 | ✓                                   |
| Enter/Space on a focused stat                    | same                                          | ✓                                   |

## 4. What speaks after an action

| Moment                                                  | Ashwake 1                                           | Ashwake 2                                                      |
| ------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------- |
| **Claiming** a cache / site / shrine / territory / find | a ranked receipt per claim, the rare ones as a card | → `view/receipts.ts`, same ranking                             |
| **Popping** a pocket                                    | `harvestNote` receipt; the first pop ever is a card | ✓ — and every pop after the first is a BRIEF card (2026-08-30) |
| Goal met (world survey)                                 | `GOAL MET: {text}`                                  | ✓ since 2026-08-30 (`LOG.md` S21)                              |
| Teaching moments                                        | a priority list, first unmet-and-true fires         | ✓                                                              |
| NEW GROUND / UNIQUE, once per run                       | toast                                               | ✓ (`shell/onceARun.ts`)                                        |

## 5. Dialogs, chrome, keyboard

| Gesture                                  | Ashwake 1           | Ashwake 2                                           |
| ---------------------------------------- | ------------------- | --------------------------------------------------- |
| Tap the toast                            | dismisses it        | ✓                                                   |
| Toast never auto-expires                 | yes                 | ✓                                                   |
| Tap anywhere on an event card            | closes it           | ✓                                                   |
| **Escape** closes the top dialog only    | yes                 | ✓                                                   |
| Tap a glossary term in prose             | opens the term card | ✓                                                   |
| Term card closes on GOT IT / Escape only | yes                 | ✓                                                   |
| Manual tabs, `<details>` folds           | yes                 | ✓                                                   |
| Two-tap confirm on anything destructive  | yes                 | ✓                                                   |
| FIT ⇄ HERE camera toggle                 | yes                 | ✓                                                   |
| Diary rows unfold                        | yes                 | ✓                                                   |
| Shop: buy, wear, unfold a perk           | yes                 | ✓                                                   |
| WORLDS: **BEGIN AT CAMP**                | yes, in that panel  | ✓ (2026-08-30 — the fifth shrine's unlock)          |
| Sound toggle over the board              | yes                 | ✗ (no sound in this body yet)                       |
| `✕` lens-clear button                    | yes                 | ✗ — the fog tap and a second long-press both let go |

## 6. The keyboard, on the board

Built 2026-08-29 (`LOG.md` Session 16) on Marc's ask: _"do a pass for keyboard

- desktop play (all cam movement, etc.) and easy tile placements."_ Ashwake 1
  had none of this and said so; every row below is new to both bodies.

The map is one pure table (`board/keys.ts`) and the marker's arithmetic is
another (`board/cursor.ts`), so what a key does is a unit test rather than a
handler somebody has to read.

| Keys                            | What                                                               |
| ------------------------------- | ------------------------------------------------------------------ |
| Arrows                          | walk a marker to the nearest hex that way, and SAY what it is      |
| Enter · Space                   | do exactly what a tap on that hex does — place, price, claim, lens |
| Shift + arrows                  | slide the board                                                    |
| `+` · `−`                       | zoom                                                               |
| `Q` · `E`, or Home · End        | turn the board                                                     |
| `R` · `F`, or PageUp · PageDown | lean the camera back and forward                                   |
| `0`                             | the VIEW button's own cycle — FIT, HERE, FLAT, DEFAULT             |
| `1`–`8`                         | pick up that card from the hand                                    |
| Escape, with nothing open       | dismiss the toast — the tap gesture, reachable without a finger    |

Four rules that are not obvious from the table, each with its own test:

- **The first press only summons the marker.** Placement is the one action on
  this board that cannot be undone, and a key whose first act was to spend a
  tile on a hex nobody had looked at is the worst version of that.
- **Arrows LOOK, Enter ACTS.** Walking the marker prints the same sentence a
  tap on unbuildable ground prints, into the live region the toast already is
  — so a board that was unreadable to a screen reader now reads itself out.
  Looking never TARGETS a ripe tile, which a tap does: the marker must not
  quietly re-aim what POP will spend.
- **The keys come off the window, not off a focused element**, so a player who
  just pressed POP does not have to click the board before an arrow works. A
  focused control keeps Enter and Space and nothing else; a text field keeps
  everything.
- **A step is spatial, not axial.** The board is sparse, it can be turned, and
  a pointy-top hex has no neighbour straight up. So an arrow asks "what is the
  nearest cell that way ON SCREEN", and a run of them holds its column the way
  a text editor does.

---

## What is still missing

1. **The `✕` lens-clear button.** The fog tap and a second long-press both
   let go, so this is a convenience rather than a gap.
2. **~~The History-API router.~~ RULED OUT 2026-08-30** (`DECISIONS.md` D9),
   and **~~BACK on an open panel~~ BUILT the same day**. The one real gesture
   left inside the router's idea was Android's BACK, which left the site from
   on top of the manual — a player reading the rules pressed the one button
   that means "go back" and lost the game. It is one history entry per open
   dialog, owned by `ui/dialog.tsx` and carrying **no URL change at all**, so
   the address bar never becomes a second authority on what is on screen
   (which is what D9 rules out) and a shared `?seed=` survives untouched. BACK
   pops the top, exactly as Escape does; a panel closed from the UI gives its
   entry back, so leaving the page never costs one press per panel ever
   opened. Pinned in `e2e/menus.spec.ts`. `meta/route`'s `parseRoute` is read
   at boot for all three of its fields — `?seed=`, `?daily=` and `?camp=`;
   `searchFor` was the deletion D9 implied and is **gone**, while `HOME` stays
   as what "no query at all" IS.
3. **`meta/mark`**'s maskable exports duplicate nothing the app renders, and
   are kept on purpose: they are the source the shipped maskable icons were
   baked from, and the baker is part of the art pipeline `NEXT.md` §5 holds.

Everything else this file has ever listed is built. The standing check that
found most of it is in `CLAUDE.md`: before calling a screen done, grep for a
consumer of every action it can produce.

## Two surfaces this matrix never covered, and both were wrong

Audited 2026-08-29 against `../tiles` (`LOG.md` Session 13). A gesture matrix
asks "what can a finger do here", and by construction it cannot see the two
surfaces below — which is where the misses were. Worth keeping as the shape of
what a matrix is blind to.

| Surface                                  | Ashwake 1                          | Ashwake 2                                                        |
| ---------------------------------------- | ---------------------------------- | ---------------------------------------------------------------- |
| A shared **`?seed=`** link               | opens that run                     | ✓                                                                |
| A shared **`?daily=`** link              | opens that date's board            | → **ignored the date**; `@meta/route` had no importer at all     |
| A link **unfurled in a chat**            | title, description, board image    | → **had none of the three**, while `og-image.png` shipped unused |
| The OS's **reduced-motion** switch       | honoured, with a `change` listener | → **threaded through the board and never passed**                |
| The OS's **light/dark** switch, mid-page | followed                           | → was sampled once at boot, on a page that never reloads         |
| A **render error**, then CONTINUE        | the run carries on                 | → no boundary, so CONTINUE revealed a blank page                 |
