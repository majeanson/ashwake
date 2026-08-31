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

**The roguelite was not running at all, in two places** (found and fixed
2026-08-30, `LOG.md` Session 20). Recorded here rather than only in the log
because it is the strongest evidence yet for this file's own warning.

Nothing minted a world seed: a fresh device opened on the literal `1`, and
NEW RUN, the world switcher and RESET ALL each rolled `Math.random()`. So
every run after the first failed `settle`'s seed guard — which is correct, and
was doing its job against a shell that lied to it — and banked as a detour: no
relics, no ground, no goals, no shrine unlocks. And separately, `createSession`
had taken a `tuning` since Stage 1 that no caller ever passed, so
`applyProgress` and `withWorldPerks` had **zero callers** and `unlockedBy`
had three, all printing labels. Fixing either alone would have hidden the
other.

**The new part of the lesson.** The four earlier misses were screens that
rendered a control nothing consumed — visible, once you looked. This pair was
invisible: two runs of the same game and two different planets are the same
picture, and a shrine that unlocks nothing still lights up, still toasts, still
lists itself on the end screen. Only the numbers disagreed and nothing read
them. **Grepping for a consumer is not enough where the consumer is a number.**

**~~CAMPS ARE STILL DEAD~~ — DONE 2026-08-30** (`LOG.md` Session 21). The
WORLDS panel has BEGIN AT CAMP, `campFor` carries Ashwake 1's conditions
verbatim, `?camp=1` is read at boot, and `camp.test.ts` + `e2e/world.spec.ts`
pin both halves. `camp` is still deliberately absent from `applyUnlocks`: it
gates a door rather than a dial, and `economy.test.ts` pins that too so a later
reading of "the fifth unlock does nothing" does not become a bug report.

**EIGHT MORE INERT NUMBERS, found by building the instrument that could see
them** (2026-08-30, `LOG.md` Session 21). All fixed; recorded here because they
are the strongest case yet for this file's own warning, and because four of them
were found by the instrument rather than by a grep — two of those in a SHOT:

1. **The survey paid nothing.** `Goal.reward` — 25 to 40 relics a goal, five
   goals — had no consumer anywhere. Detected, written into `goalsMet`, listed
   on the end screen, never banked.
2. **A found perk never reached the world.** Perks moved onto `WorldMemory` on
   2026-08-26 and `encodeProgress` strips them from the device blob by
   contract; nothing wrote the world's copy and nothing read it back. So a perk
   died on the next reload and `economyFor` never saw one — the dials a worn
   perk sets were never set.
3. **`mergeRun` had no caller.** World memory was written only at `settle`, so
   a shrine woken mid-run did not reach the atlas and a closed tab lost the
   territory just claimed. Both were live bugs in Ashwake 1, both reintroduced.
4. **`?taught=1` erased the other histories.** It handed `useDevice` a whole
   `Progress` built on `EMPTY_PROGRESS`, so `?runs=300&taught=1` seeded a
   purse, a build and a shelf and then threw all three away. The audit's
   three-hundred-run shop photographed `0` relics.
5. **The audit's own PLAYED device had stopped being played, that morning.**
   `taught=1&end=1&seed=7` — and `?seed=` became a DETOUR when the world seed
   was fixed, so the run banked nothing, the device stayed VIRGIN, `More` hides
   SHOP and FAME on a virgin device, and three tests sat on a click that could
   never land until the 180-second timeout. **They then kept their previous
   run's screenshots**, so the report looked complete with three pictures a day
   old. It plays on `?runs=1` now. The first of these found in the instrument
   rather than in the game, which is the argument for the instrument having
   tests of its own (`shell/fixture.test.ts`, `e2e/world.spec.ts`).
6. **The atlas read `FINDS 6/5`** on a three-hundred-run world — found in a
   SCREENSHOT rather than by a grep, which is the whole argument for the axis.
   It counted find HEXES claimed against `PERKS.length`, the size of the perk
   POOL: two different things wearing one slash, both expressions correct on
   their own. Reachable in ordinary play by anyone who claims a sixth find.
7. **The end screen's list of unlocks woken this run was always empty**, and
   this was `mergeRun`'s missing caller wearing a different face: `wokeNow` read
   the world off the DISK, which nothing had updated since the run began, so it
   always equalled `unlocksAtStart`. The WOKE toast fired (it comes from the
   receipts, which read the run's own state); the end screen's summary of what
   the run CHANGED did not. It reads the live copy now.
8. **And then the SAME list said the opposite**, on the first run of a page:
   `perksAtStart`/`unlocksAtStart` were set by every door into a run except the
   one the page opens on — BEGIN on the front door, and `?end=1` before React
   mounts — so that run measured its gains against empty lists and told a
   returning player they had just woken every shrine and found every perk their
   world already held. Invisible on a fresh device, where empty IS the right
   answer, which is how it survived. The three refs are one lazily-initialised
   object now (`startedFrom`), and `e2e/world.spec.ts` pins it. **Also found in
   a shot** — `end-many`, in all four directions.

**THE SWEEP, item by item, so nobody has to re-derive it.** Every reward number
`NEXT.md` listed, and where the test that watches it lives:

| number                                      | proved by                                                                                                                                                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `burnRelics`, `claimRelics`, `luckToRelics` | `engine/tilesonly.test.ts`, `finds.test.ts`; reaches the purse through `endingPayout` → `settle`, pinned in `shell/settle.test.ts`                                                                           |
| `titheRate`                                 | `engine/tilesonly.test.ts`, and the row that spends it in `screens/purse.test.tsx`                                                                                                                           |
| `GOALS[].reward` / `world.goalsMet`         | `shell/settle.test.ts` — **was inert**, see above                                                                                                                                                            |
| the shed ladder                             | `shell/shed.test.ts`, called from `storage.ts`'s `write`                                                                                                                                                     |
| `startingPerk`                              | `shell/homeworld.test.ts`                                                                                                                                                                                    |
| `questBonus` (the bounty)                   | `engine/quest.test.ts`; reaches the player through `pointsSplit`'s `bySource.bounty` on the payout breakdown (`screens/payout.test.tsx`). Not a progression dial and never was — there is no ladder above it |
| `rearmedSpent`                              | `meta/world.test.ts` for the roll, `shell/homeworld.test.ts` for it reaching a run's state                                                                                                                   |
| the perk shelf                              | `shell/shelf.test.ts` — **was inert**, see above                                                                                                                                                             |
| the world's live memory                     | `e2e/world.spec.ts` — **was inert**, see above                                                                                                                                                               |
| the atlas's own fractions                   | `screens/atlas.test.tsx` — **was wrong**, see above                                                                                                                                                          |
| the whole instrument                        | `shell/fixture.test.ts`, and `e2e/world.spec.ts` for what it renders                                                                                                                                         |

**~~The one thing on that list with no test and no bug~~ — DONE 2026-08-30.**
`meta/route.ts`'s `searchFor` is deleted. It built the query a `Route` answers
to, and nothing in this game builds a link that way: `meta/share.ts` hands back
the exact params a receiver needs and the shell puts them on this ORIGIN, which
is what makes it impossible for a shared link to carry the sender's rig. Its
only tests were round-trips against itself. `HOME` stays and earns its place —
it is what "no query at all" IS, and the parser's tests read as intent with it.

**~~BACK on an open panel~~ — DONE 2026-08-30** (`ui/dialog.tsx`,
`INTERACTIONS.md` §2). It was filed for after Session A as a new global
gesture; it turned out to be one file, no URL change, and three rules that each
name a way it goes wrong. On Android BACK used to leave the site from on top of
the manual, which is the worst thing this game does to a stranger who opens the
rules.

**A FOURTEENTH inert mechanic, found the same day** (`LOG.md` Session 22).
`purseLesson` builds the LUCK IS FOR SPENDING card from the live tuning, one
row per button the drawer offers, each quoting its own face and price — Marc
asked for it twice in Ashwake 1 — and it had **no caller in this body**.
`purse` sits in the teaching ledger and in the CARDS set, `isTrue('purse')`
returns false by design because the OPEN is the moment, and `onPurse` marked
the lesson TOLD without ever showing it. The drip's most expensive card spent
its own ledger entry to say nothing. **A moment that is always false is only
honest while something else owns the moment.**

## 1. Needs Marc, and only Marc

**The two corners, by reaching for them (2026-08-30).** MENU is top-right and
the camera is alone bottom-right, on your call: _"this, but menu move top
right."_ **The mute worry that stood here is answered twice over** — sound is a
row behind MENU, one tap from the board and costing no button on it. What is
left is a thumb's opinion, and it is the trade this deliberately made: whether
the top-right corner is reachable one-handed on a large phone. The door left the
thumb zone on purpose, and a door you cannot reach is worse than a door in the
way. Also open: whether that list should carry RESTART. It is on the manual's
MENU tab, two rooms in, and it is the one quick action a live run actually
wants — left off because it destroys a run and everything else on the list is
harmless.

**The two new marks, by reading them (2026-08-30).** POP is a hand taking and
SACRIFICE is a flame, on the button, at the head of the manual section and on
the receipt. Both were picked for being the silhouettes furthest from the twenty
already in the set, which is an argument, not a look: whether a hand reads as
"cash this in" at 16px is a thing only an eye can say, and the alternative was a
basket. Also worth a glance: the SACRIFICE lesson is new prose in both
languages and nobody has read the French yet.

**The bottom of the screen, by playing fifty placements (2026-08-30).** The hand
is the footer, the harvest row sits above it — _"tiles hand always footer but in
finger zone, accessible"_ — and every button in that row wears the accent,
including the LUCK purse, which came back down from the corner. Two things only
a hand can settle: whether the cards being lowest is right when the row above
them is what a live pocket makes you reach for, and whether four accented
buttons in one row is the ration spent or the ration broken.
`theme/tokens.ts` says "if everything is accent, nothing is", and this is the
closest the board has come to testing that sentence. Measured at 320×568 it
fits with room — POP 55px, SACRIFICE 111px, LUCK 53px in a 304px row — so the
question is taste, not width.

**The pop line, by popping fifty times (2026-08-30).** A routine pop is the
receipt's lead sentence over the board's bottom edge, with the rest behind a
tap — your ask, twice: _"just show points in the bottom and we can tap for
details or tap out."_ What is unmeasurable from here is whether the line is
where the eye already is after a cascade, or whether the accounting is now so
cheap to ignore that nobody ever taps DETAILS and the receipts might as well
not be written. The first pop of a device still holds the screen; that is the
only card left in the loop.

**Walking the ending, by wanting to (2026-08-30).** THE GROUND YOU WALKED is a
door onto the live board rather than a picture — _"i dont want a picture i want
to actual screengame where we can move around."_ The question a phone answers:
whether the run's own board is worth going back into for its own sake, or
whether the ending's numbers are what you actually came for and the map should
be one tap further away. The snapshot is still taken either way; the hall of
fame's diary rows use it.

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

1. **~~The powers are still named in the plane's words.~~ CLOSED 2026-08-29** by
   Session 19b — the power words live in `Theme.powerNames` now, per direction
   and per language, and `DECISIONS.md` D4.2 records the ruling. Kept struck
   through because the ARGUMENT is the useful part and the ledger claimed
   otherwise for a day. As it stood: `text/*.ts` hard-coded
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

**~~Not art, and it stops a run from ending: a production build crashes the end
screen.~~ NOT REPRODUCIBLE as of 2026-08-30** — checked rather than trusted,
which is this file's own rule. `pnpm build` is clean and `e2e/shots.spec.ts`'s
"first minute" passes against the production bundle, along with the other 68
Playwright tests. `toMainMenu` is declared and referenced normally in
`App.tsx`. Left in the file struck through rather than deleted because the
symptom was reproduced twice when it was written: if it comes back, this is the
paragraph that says what it looked like.

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

**What is left of the original goal — all but one item closed 2026-08-30:**

- **~~S4's remainder: the History-API router.~~ DECIDED, not ported**
  (`DECISIONS.md` D9). Ashwake 1's router routes RUNS rather than panels and
  rebuilds the session from the URL on `popstate` — right for an imperative
  DOM shell, and a second authority on "what is on screen" here. Two of the
  three things it buys already exist (every link opens at boot; SHARE is the
  distribution mechanism, not the address bar). The third is real and is split
  off below.
- **~~The screen audit's third axis.~~ DONE** — `?runs=n` (`shell/fixture.ts`),
  wired in at five, thirty and three hundred runs of one world seed.
  Twenty-two screens × four directions now. It found a bug in its own first
  run (§0, item 4).
- **~~The purse's spend actions.~~ DONE** — `screens/purse.test.tsx`, each row
  clicked and then its action put through `reduce` with a number checked.
- **The BACK GESTURE on an open panel.** The one thing D9 says a router would
  genuinely have bought, split off from it: on Android the system back gesture
  leaves the site from on top of an open manual. It wants one history entry per
  open dialog, owned by `ui/dialog.tsx` — the file that already knows the panel
  stack — and no URL→scene table anywhere. Small, and worth its own question.
  **Not before Session A:** it is a new global gesture.
- **The atlas**, if it earns its place: it is on the "review rather than port"
  list and no stranger has ever seen one. It is at least no longer photographed
  empty — `worlds-thirty` and `worlds-many` in `audit-shots/` are what it looks
  like with a world behind it.

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
