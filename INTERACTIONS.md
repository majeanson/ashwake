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

| Gesture                                              | Ashwake 1                                                                     | Ashwake 2                                             |
| ---------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------- |
| Tap a **legal empty hex** with a card                | places                                                                        | ✓                                                     |
| Tap a **legal hex, hand empty**                      | _"Your hand is empty — tap a card below to pick one up."_                     | → was a **silent no-op**                              |
| Tap a **ripe tile**                                  | prices that pocket, outlines it, and prints the whole `pocketNote` arithmetic | → priced, but **said nothing**                        |
| Tap a **cache / site / shrine / territory / find**   | `describeHexOf` — what it is, what claiming pays, in this run's numbers       | → was a **silent no-op**                              |
| Tap a **shrine**, in particular                      | names the unlock the NEXT one gives, or offers the crossing                   | → **said "a system" on every world until 2026-09-01** |
| Tap a **beacon** (a landmark glowing off-board)      | its line + _"Build your chain out to it."_                                    | → **refused a raycast until 2026-09-01**              |
| Tap a **wall**                                       | _"▲ Wall — cannot be built on."_ + why it still helps things ripen            | → via `describeHexOf`                                 |
| Tap **spent stone**                                  | _"● Spent ground … except for {RED}, which feeds on it."_                     | → via `describeHexOf`                                 |
| Tap a **tile not yet ripe**                          | its worth, the ripening rule, its colour's power, its rarity line             | → via `describeHexOf`                                 |
| Tap **native ground**                                | _"Ground native to {NAME} — a {NAME} tile here is worth one more."_           | → via `describeHexOf`                                 |
| Tap **remembered fog** (the biome lens)              | lights every known patch of that colour; the same tap lets go                 | → **the fog was not drawn at all until 2026-09-01**   |
| Tap **outside the map**                              | nothing at all                                                                | ✓                                                     |
| Drag                                                 | pan, cancels a camera flight                                                  | ✓ (plus momentum, which v1 had not)                   |
| Pinch                                                | zoom                                                                          | ✓                                                     |
| Wheel                                                | zoom                                                                          | ✓                                                     |
| `touch-action: none` on the board                    | yes, since Stage 2                                                            | → **was missing entirely**                            |
| Refuse the 28px iOS edge swipe                       | yes                                                                           | → **was missing entirely**                            |
| Double-tap to zoom · drag-and-drop a card            | —                                                                             | —                                                     |
| **Right-drag / Shift-drag** to turn and lean         | —                                                                             | → the desktop's two fingers                           |
| Right-click raises the browser's menu over the board | yes                                                                           | → refused, because the button turns                   |

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

Since 2026-08-30 POP and SACRIFICE wear MARKS — a hand taking and a flame — and
the same two shapes head their own sections in HOW TO PLAY and lead the receipt
each action leaves. TAKE has none: it appears on one button, only when a pocket
earns a treasure, and the registry only marks ideas that recur.

Since 2026-08-30 the hand is the FOOTER and the bar sits above it (Marc:
_"tiles hand always footer but in finger zone, accessible"_), and every button
in the bar wears the accent, because spending a pocket is the loudest thing the
board does and they were drawn in the ink of the empty HOLD slot beside them.

And since the same day the LUCK purse is back on this row, at its far end —
**chrome floats over the board, actions sit in the footer.** POP, TAKE,
SACRIFICE and the purse are the four ways to spend something, they share the
one accent, and the board corners hold only MENU (top right) and the camera
(bottom right).

| Gesture                                          | Ashwake 1                                     | Ashwake 2                                                                                                                                                       |
| ------------------------------------------------ | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POP (tiles)                                      | flies the camera to the pocket, then harvests | → glides, then harvests                                                                                                                                         |
| POP for points                                   | harvests for points                           | ✓                                                                                                                                                               |
| TAKE (treasure)                                  | harvests for a rare tile                      | → offered when the pocket earns one                                                                                                                             |
| SACRIFICE (burn)                                 | harvests for relics                           | → offered once relics are known                                                                                                                                 |
| LUCK ▸ purse drawer                              | opens; teaches on first deliberate open       | ✓ — the button moved OUT of this bar and up beside VIEW on 2026-08-30, in the accent, because it is the one control here that does not spend the current pocket |
| REDRAW · steer a colour · FORGE · SACRIFICE LUCK | spend, each with its own receipt              | → each says what it cost                                                                                                                                        |
| Tap a **stat box**                               | prints that stat's `statNote`                 | ✓                                                                                                                                                               |
| Enter/Space on a focused stat                    | same                                          | ✓                                                                                                                                                               |

## 4. What speaks after an action

| Moment                                                  | Ashwake 1                                           | Ashwake 2                                                                                                                                                                                              |
| ------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Claiming** a cache / site / shrine / territory / find | a ranked receipt per claim, the rare ones as a card | → `view/receipts.ts`, same ranking                                                                                                                                                                     |
| **Popping** a pocket                                    | `harvestNote` receipt; the first pop ever is a card | ✓ — and every pop after the first is a LINE over the board (2026-08-30): the receipt's own lead sentence, with the rest one tap behind it. It was a brief card for a day; a brief card is still a card |
| Goal met (world survey)                                 | `GOAL MET: {text}`                                  | ✓ since 2026-08-30 (`LOG.md` S21)                                                                                                                                                                      |
| Teaching moments                                        | a priority list, first unmet-and-true fires         | ✓                                                                                                                                                                                                      |
| NEW GROUND / UNIQUE, once per run                       | toast                                               | ✓ (`shell/onceARun.ts`)                                                                                                                                                                                |

## 5. Dialogs, chrome, keyboard

| Gesture                                  | Ashwake 1                  | Ashwake 2                                                                                                                                                                                                                                    |
| ---------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tap the toast                            | dismisses it               | ✓ — unless it is a pop's line, where the tap OPENS the full receipt (2026-08-30)                                                                                                                                                             |
| Toast never auto-expires                 | yes                        | ✓                                                                                                                                                                                                                                            |
| Tap anywhere on an event card            | closes it                  | ✓                                                                                                                                                                                                                                            |
| **Escape** closes the top dialog only    | yes                        | ✓                                                                                                                                                                                                                                            |
| Tap a glossary term in prose             | opens the term card        | ✓                                                                                                                                                                                                                                            |
| Term card closes on GOT IT / Escape only | yes                        | ✓                                                                                                                                                                                                                                            |
| Manual tabs, `<details>` folds           | yes                        | ✓                                                                                                                                                                                                                                            |
| Two-tap confirm on anything destructive  | yes                        | ✓                                                                                                                                                                                                                                            |
| FIT ⇄ HERE camera toggle                 | yes                        | ✓                                                                                                                                                                                                                                            |
| Diary rows unfold                        | yes                        | ✓                                                                                                                                                                                                                                            |
| Shop: buy, wear, unfold a perk           | yes                        | ✓                                                                                                                                                                                                                                            |
| WORLDS: **BEGIN AT CAMP**                | yes, in that panel         | ✓ (2026-08-30 — the fifth shrine's unlock)                                                                                                                                                                                                   |
| Sound toggle over the board              | yes                        | ✓ again since 2026-08-30 — a ROW behind MENU rather than a button on the board: _"menu could add a submenu for quick actions like sound in off etc."_ One tap from the board, costing no board. Still one wire with SETTINGS, still one flag |
| LENS OFF button over the board           | yes                        | ✓ 2026-09-01 — top-left, present exactly while a lens is lit, wearing the lit colour's own mark. Marc: _"a quick Lens off button (see other repo)"_. It is also the only one of the three ways out that SAYS the lens is off                 |
| MENU over the board                      | ✗ (it had ♪ and ?)         | ✓ 2026-08-30 — TOP-RIGHT, out of the arc a thumb sweeps: one door onto a short list (SOUND, HOW TO PLAY, MORE) that opens as a drawer under the stat row. A door on the stack, so Escape and Android BACK close it                           |
| THE GROUND YOU WALKED, on the ending     | a picture of the board     | ✓ 2026-08-30 — a DOOR onto the live board: the ending steps aside to a bar and the real board takes the screen back, pan and pinch and FIT. Marc: _"i dont want a picture i want to actual screengame where we can move around"_             |
| Starting a world or a daily              | opened framed on the start | ✓ 2026-08-30 — the rig fits ONCE EVER, so a new world used to open wherever the last one was left. Every way into a run now flies to its wake hex                                                                                            |

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

## What this file got wrong, and what that is worth (2026-09-01)

Three of its own rows were claims the code did not keep, and the file said so
at the top: **check this against the code before trusting it.** Marc asked for
tappable shrines and highlightable biomes; both were already ticked here.

- **Tap a beacon** and **tap remembered fog** were ✓. `HexField`'s `isTappable`
  refused both outright, and `App`'s `onTap` has carried a whole branch for the
  fog since it was written. The keyboard could reach the fog and the finger
  could not, which is the reverse of the gap this file was built to find.
- **The fog itself was never drawn.** `createSession` passed `toBoardView` an
  empty list where the world's revealed ground goes, for four stages. A matrix
  of GESTURES cannot see that: there is nothing wrong with the gesture, there
  was nothing to point at. Same blindness as the two surfaces at the bottom of
  this file.

The lesson is the one already at the top, with a sharper edge on it: a ✓ here
means somebody read the shell and found a handler. It does not mean the input
reaches it, and it does not mean the thing being pointed at is on screen.

## What a GESTURE MATRIX cannot see, proved a third time (2026-09-02)

Marc asked what was still missing against `../tiles`. This file said "nothing",
and it was right — and twelve surfaces were missing anyway. Every one of them
sits one level below a gesture: **a tested export in `packages/core` with no
importer in `apps/game`.** A matrix asks what a finger can do; it cannot see a
sentence the core writes that no screen prints.

So the standing check in `CLAUDE.md` grew a second half, and it is the one that
found all twelve: **before calling a MODULE done, grep for a consumer of every
export it has.** Run it over the core, not only over a screen.

The two that were purely dead code, both now wired:

| Export                             | Was                                                                          | Now                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------- |
| `HudView.hint` (`hintFor`)         | computed every render, read by **nothing** — the plane's own signpost        | a toast on change, `shell/signpost.ts`, with its 3 guards |
| `parseOverrides` / `withOverrides` | `?ff=` tested since the lift, **no caller** — so `debug.overlay` had no door | applied and persisted in `useDevice`                      |
| `debug.overlay` (`wired: true`)    | no reader either                                                             | `view#debugLine`, over the board                          |

And the ten that were facts computed and not said. All built 2026-09-02:

| Surface                                    | Ashwake 1                             | Was here                                     |
| ------------------------------------------ | ------------------------------------- | -------------------------------------------- |
| A pop's SCORE, with its recipe             | every term named                      | `+8971 pts.` under nothing at all            |
| NEW BEST · N short of best                 | on the ending                         | computed by `settle`, discarded              |
| RUN N · TRY N                              | on the ending                         | never said                                   |
| The two end-of-run bonuses, itemised       | POPS · SITES · REACH · CLAIMS · TOTAL | the breakdown summed to less than the score  |
| Relics banked this run                     | CARRIED OUT                           | never printed, with the shop right under it  |
| The run's shape (placements, biggest pop…) | six fixed facts                       | restated the score, double-counted the purse |
| TRY AGAIN, on a daily's ending             | beside the try count                  | no way back onto today's board but MORE      |
| The SHARE CARD                             | a picture with the link               | the link alone                               |
| WHICH GAME · the mode line on the door     | named in three places                 | a `?seed=` recipient was told nothing        |
| SETTLE THIS WORLD (keep the seed)          | front door and ending                 | a shared board could never be kept           |
| The onward-share line                      | beside SHARE                          | the chain propagated silently                |
| THE SURVEY, met and unmet                  | a standing ledger                     | only the goal a run happened to meet         |
| The install prompt                         | caught, offered once                  | thrown away by the browser                   |
| The in-app-browser warning                 | once ever                             | absent, on the mode links land in most       |
| Midnight rollover on the daily             | re-read on `visible`                  | sampled once, on a page that never reloads   |
| Fame TOTALS: worlds, perks found           | listed per world                      | four device-wide numbers                     |

## And a second pass, on FIELDS rather than exports (2026-09-02)

The sweep above walks the module graph. It cannot see a field: `CellView` has
twenty-two, the board is the only thing that could read any of them, and
"nothing imports it" is never true of a property. So the second pass walked
every field of `CellView` and `BoardView` and grepped the board for each.

| Field / export       | Was                                                         | Now                                                                |
| -------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------ |
| `voice.dry`          | every direction tunes the note; **nothing ever played it**  | the low fade, with Ashwake 1's hysteresis (`shell/dry.ts`)         |
| `cell.previewColour` | legal edges in one fixed ink — the very bug the field fixed | **tried and REVERTED the same day** — see below                    |
| `cell.band`          | five contour bands; the **3D** board drew them flat         | the world's own slopes, under the rarity channel                   |
| `startingPerk`       | exported "so the UI can say why", said by nothing           | the arrival line, through `beginRun`                               |
| the manual's drip    | all thirteen lessons printed to everyone                    | grows with the ledger, and a tab says when it is holding some back |

**`previewColour` is unread ON PURPOSE now**, and this is the row a fourth pass
will otherwise re-open. Wiring it made a legal hex wear the held card's colour;
Marc caught it on a phone within the hour — _"the first tile i put seems to
refresh the whole map display"_ — because after a placement the hand redraws
and **every legal edge changed colour at once**. It worked in Ashwake 1 because
there it was a hairline at `alpha: 0.75`; here it is a `0.16` ring band at full
opacity, so the colour source was ported and the weight was not. If the held
colour is ever worth showing on this board it belongs to the preview FILL, not
the outline, and that is Marc's call on a phone. `rings.test.ts` pins the edge
against the hand.

Verified rather than fixed, so a third pass need not re-walk them: the keeper's
lifetime guards and hide-flush, `theme/tokens.ts` and `labelFor` (both
supersets of Ashwake 1's), every remaining core diff (D4 text extraction, no
rule moved), `shimmer` and `native` (consumed through `render/materials.ts`,
not by the board directly), and every key in the text catalogue.

## What is still missing

1. Nothing this file has ever listed as a GESTURE. The lens-clear button was
   the last entry and it was built 2026-09-01 (see the row above); the sixteen
   rows above this section were all built 2026-09-02.

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
