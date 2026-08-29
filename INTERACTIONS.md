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

| Gesture                                                                    | Ashwake 1                                                                     | Ashwake 2                           |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------- |
| Tap a **legal empty hex** with a card                                      | places                                                                        | ✓                                   |
| Tap a **legal hex, hand empty**                                            | _"Your hand is empty — tap a card below to pick one up."_                     | → was a **silent no-op**            |
| Tap a **ripe tile**                                                        | prices that pocket, outlines it, and prints the whole `pocketNote` arithmetic | → priced, but **said nothing**      |
| Tap a **cache / site / shrine / territory / find**                         | `describeHexOf` — what it is, what claiming pays, in this run's numbers       | → was a **silent no-op**            |
| Tap a **beacon** (a landmark glowing off-board)                            | its line + _"Build your chain out to it."_                                    | → via `describeHexOf`               |
| Tap a **wall**                                                             | _"▲ Wall — cannot be built on."_ + why it still helps things ripen            | → via `describeHexOf`               |
| Tap **spent stone**                                                        | _"● Spent ground … except for {RED}, which feeds on it."_                     | → via `describeHexOf`               |
| Tap a **tile not yet ripe**                                                | its worth, the ripening rule, its colour's power, its rarity line             | → via `describeHexOf`               |
| Tap **native ground**                                                      | _"Ground native to {NAME} — a {NAME} tile here is worth one more."_           | → via `describeHexOf`               |
| Tap **remembered fog** (the biome lens)                                    | lights every known patch of that colour; the same tap lets go                 | → was a **silent no-op**            |
| Tap **outside the map**                                                    | nothing at all                                                                | ✓                                   |
| Drag                                                                       | pan, cancels a camera flight                                                  | ✓ (plus momentum, which v1 had not) |
| Pinch                                                                      | zoom                                                                          | ✓                                   |
| Wheel                                                                      | zoom                                                                          | ✓                                   |
| `touch-action: none` on the board                                          | yes, since Stage 2                                                            | → **was missing entirely**          |
| Refuse the 28px iOS edge swipe                                             | yes                                                                           | → **was missing entirely**          |
| Double-tap to zoom · rotate · drag-and-drop a card · board keyboard cursor | —                                                                             | —                                   |

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

| Moment                                                  | Ashwake 1                                           | Ashwake 2                          |
| ------------------------------------------------------- | --------------------------------------------------- | ---------------------------------- |
| **Claiming** a cache / site / shrine / territory / find | a ranked receipt per claim, the rare ones as a card | → `view/receipts.ts`, same ranking |
| **Popping** a pocket                                    | `harvestNote` receipt; the first pop ever is a card | ✗ **nothing speaks**               |
| Goal met (world survey)                                 | `GOAL MET — {text}`                                 | ✗ (no survey here yet)             |
| Teaching moments                                        | a priority list, first unmet-and-true fires         | ✓                                  |
| NEW GROUND / UNIQUE, once per run                       | toast                                               | ✗                                  |

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
| Sound toggle over the board              | yes                 | ✗ (no sound in this body yet)                       |
| `✕` lens-clear button                    | yes                 | ✗ — the fog tap and a second long-press both let go |

---

## What is still missing, in the order it matters

Everything this file listed on 2026-08-29 is closed. What is left:

1. **NEW GROUND / UNIQUE, once per run** — two toasts Ashwake 1 fires at their
   first occurrence in a run.
2. **The `✕` lens-clear button.** The fog tap and a second long-press both let
   go, so this is a convenience rather than a gap.
3. **The atlas**, if it earns its place — on the "review rather than port" list,
   and no stranger has ever seen one.
4. **A keyboard path for placing a tile.** Ashwake 1 shipped without one too and
   said so in as many words; `#board` is a focus sink, not a cursor.

Closed since this file was written: the board's tap answers (all of them), the
fog lens, unselecting a card, `touch-action`, the iOS edge guard, claim
receipts, pop receipts, spend receipts, TAKE and SACRIFICE, POP's camera glide,
the first-pop card, the crossing, the world survey, sound, and the legend.

The standing check that would have caught the whole of it is in `CLAUDE.md`:
before calling a screen done, grep for a consumer of every action it can
produce.
