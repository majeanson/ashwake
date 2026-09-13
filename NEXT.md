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

**`IMPROVEMENTS.md` is the 2026-09-02 improvement pass, row by row** — a wide
sweep over what already ships, opened on Marc's ask and tracked there so it is
resumable. A pointer rather than a copy, on purpose: two lists of the same work
is how one of them goes stale, which is the hazard the paragraph above exists
to warn about. What that pass left for Marc is in §5b–§5d below — all four answered
on 2026-09-08 except §5c, which he deferred. Its one remaining open row —
B6.5, the `App.tsx` extraction — **moved to `PASS.md` P2** on 2026-09-09 and is
struck there, so it lives in exactly one place.

**`PASS.md` is the 2026-09-09 pass, row by row** — ten items of two to three
days each, opened on Marc's ask for _"10 ideas of 2-3 days work"_ and then
_"plan to do all 10 thoroughly no rush no cut corners"_. A pointer rather than
a copy, for the reason directly above. Two things about it belong here rather
than there:

- **Session A runs NOW, in parallel** (Marc's ruling, 2026-09-09). It needs his
  evening rather than a session, so it is not in the queue at all; whatever it
  names is `PASS.md` P0 and outranks every row in that file.
- **The French goes to Marc as a published artifact he annotates** (his
  ruling, same day) — `PASS.md` P3. That closes the oldest thing on this list
  that has only ever needed his eyes: `ROADMAP.md` S1b has said "Marc has not
  read the French yet" since the day the catalogue shipped, and `fr-CA` is what
  a player sees unless they go and change it.

**And checking the code before planning it retired one of the ten and re-scoped
four**, which is this file's own rule paying for itself again — the corrections
are the first section of `PASS.md`. The retired one is the atlas: it is
argued, tested, bilingual and already photographed, so what was left of it was
never a session's work. It is one row on the Session A sheet instead — does he
open it twice?

---

## 0. Wired, and what it revealed

The hold mechanism and the colour lens were both **dead code the shell never
called**, and the audit found the draft card unreadable on its own fill. Three
misses of one shape: a screen that renders a thing without connecting it. Worth
a standing check — **before calling a screen done, grep for a consumer of every
action it can produce.**

**Run 2026-09-02 over the CORE rather than over the screens, and it found
twelve more** (`LOG.md` Session 37, `INTERACTIONS.md`'s new table). Two were
purely dead: `HudView.hint`, the endless plane's own signpost, computed every
render and read by nothing; and `parseOverrides` — `?ff=`, tested since the
lift — with no caller at all, which meant `debug.overlay` shipped `wired: true`
with neither a reader nor a door. Ten more were facts `settle`, `endingPayout`
and `harvestNote` had already computed and no screen printed. **All twelve are
built.** The lesson is now in `CLAUDE.md`: a gesture matrix cannot see a
sentence the core writes that no screen prints, so grep every EXPORT for a
consumer, not only every action.

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

**A NINTH, AND IT WAS A WHOLE RENDERING LAYER** (2026-09-01, `LOG.md`
Session 31). `createSession`'s `build()` passed `toBoardView` a literal `[]`
where the world's revealed ground goes, and had since Stage 2 — so **the fog has
never been drawn in this body**. Not a number and not a control: the map a
player carries in their head, and it was not on screen at all.

It survived four stages because every rule about it was correct over an empty
list. The lens reaches into memory, held territories unfurl their fields in it,
a reborn landmark wears its new face in it, `describeHexOf` has four sentences
for it, `cursor.ts` walks it on purpose — all of it tested, none of it reachable.
And a black board is what this game looks like, so the audit shot of a
thirty-run world showing one tile in a void read as art direction.

**The lesson this adds to the two above.** The four earliest misses were
controls nothing consumed; the 2026-08-30 pair were numbers nothing read. This
one is a piece of DATA nothing supplied — the consumer was there, tested, and
correct, and its input was hard-coded empty at the call site. Grepping for a
consumer finds nothing wrong. Neither does reading the consumer. **What finds it
is asking, of every argument a view takes, where the value comes from.**

Three smaller ones came with it, all the same shape: `HexField`'s raycast
refused beacons and remembered ground while `INTERACTIONS.md` listed both taps
as working; `describeHexOf`'s `unlockLabel` and `crossingDowry` were never
passed, so every shrine promised "a system"; and a daily's hidden finds granted
nothing at all, because a perk needs a world to live on.

**~~A ring's WIDTH is dead data~~ — RULED 2026-09-09: 0.16 STAYS.** Marc, asked
whether the board's line weight is better at the authored numbers: _"fine as is,
ill correct in the future if ever."_ So the hard-coded band is the ruling and
the three authored widths stay dead on purpose — the fourth look dial ruled
dead rather than wired, after `Ring.width` (2026-09-01), the props (D11) and
the theme's own `inset` reading (2026-09-08). **Do not wire them without asking
again**: honouring them makes every outline thinner than the one it draws
today, and the legal edge — the most-used affordance the board has — loses 45%
of its weight. The original argument follows.

**A ring's WIDTH is dead data** (found 2026-09-01, deliberately left). Every
direction authors three widths (`edgeWidth`, `ripeEdgeWidth`, `home.ringWidth`),
`board/rings.ts`'s ladder computes six values out of them, and `HexField` draws
every ring from one shared `ringGeometry` with a hard-coded `0.16` band and
never reads the field. So a ripe pocket's heavy outline, a legal hex's edge and
home's deliberately quiet ring — torchlit's own comment says `ringWidth` "sits
well under `ripeEdgeWidth`" — all draw identically.

Wiring it is small and was built and backed out in the same session: a ring's
width IS its geometry and an instanced mesh shares one, so it wants a mesh per
width, the shape `groundBatches` already uses. It is out until Marc has looked,
because honouring the authored numbers makes EVERY outline on the board thinner
than the one it draws today — the legal edge, the most-used affordance the board
has, loses 45% of its weight. The numbers were tuned by eye against the 0.16
render, so honouring them is a re-tune of the whole board's line weight rather
than a fix, and that is a look decision (`DECISIONS.md` on the look dials: they
are working defaults, not rulings).

**Needs Marc**, on a phone: is the board's line weight better at the authored
numbers, or is 0.16 what it should have been all along?

**~~A prop hides its own mark~~ — RULED 2026-09-01** (`DECISIONS.md` D11).
Marc chose the symbol over the object: the props are deleted and a destination
is its mark. See `LOG.md` Session 36.

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

**A FIFTEENTH — and the first that was eating OTHER mechanics (found and
half-fixed 2026-09-03, `LOG.md` Session 46).** The TOAST half of the teaching
drip had no speaker: `App` consumes `nextLesson` only where `as === 'card'`,
and `told` is written only from a card's dismiss (and the purse's own open).
So the seven toast-class moments — `place`, `glow`, `costRise`, `wall`,
`field`, `lens`, `lastGasp` — were never spoken and never marked told. Worse:
`nextLesson` returns the FIRST unmet-and-true moment, so an unspeakable toast
stood in front of every card behind it in `ORDER`. `wall` is true from the
first frame of nearly every run, which means a fresh device could never be
taught MAGIC, UNIQUE, LUCK, RELICS or THE COLOURS, and the manual — which
grows with the same ledger — never grew its HAND tab past THE STASH. A
stranger-test killer that fourteen findings of the same shape walked past,
because the dead thing was one BRANCH of a consumed return value: `teach` had
a reader, `teach.as === 'toast'` did not. **Grep the branches of a consumed
value, not only the value.** Fixed as far as it goes without choosing words:
`nextLesson` skips toast-class moments (armed, NOT told — the purse lesson
already showed what burning a ledger entry on unshown words costs), so the
card half runs and the manual grows again (`teaching.test.ts` pins both new
rules). Speaking the toasts is §1's first entry.

**A WEBKIT FLAKE WITH A DIAGNOSTIC WAITING (2026-09-11).** `quota.spec.ts:149`
failed twice and passed twice in full runs after the art-arrival change
(`LOG.md` Session 93), always as a toast that said nothing in five seconds
after a placement that landed. The test's failure path now prints the storage
keys, the last-error record and the toast's live text. If it fails again, read
that line before anything else; if it never does in a week, delete this entry.

## 1. Needs Marc, and only Marc

**THE BOARD RESTS AFTER A PAUSE — RULED, BUILT, MEASURED (2026-09-11,
`PASS.md` P5.4).** The 2026-09-10 measurement (five idle seconds cost 3.9–4.5 s
of main-thread time; the same five with reduced motion, 44–207 ms) was put to
Marc with three options, and his ruling was the second: **sleep after a
pause**. Not "leave it", because the case that costs real battery is a phone
left sitting on the board for minutes; not "slow the cadence", because 15 Hz
reads as a stutter rather than as calm.

`board/resting.ts` is the whole of it: fifteen untouched seconds, then the
breath stops at `STILL_BREATH` — the brightness reduced motion rests at, not
wherever the wave happened to be — and the first pointer, key, wheel or touch
wakes it. Pointer MOVEMENT deliberately does not count. `?rest=0` is every
build before this one, so the change can be undone from a phone without a
rebuild; `?rest=2` is how `perf.audit.ts` catches a sleeping board inside a
five-second phase. `perf/report.md` has a `rest` column now: **a resting board
costs 0–3 ms of CPU in five seconds where the awake one costs 2.6–4.3 s.**

**What is still yours, on the phone:** whether fifteen seconds is the right
pause, and whether the moment the beacons stop breathing reads as calm or as a
freeze while you are looking at your next tile. A glance, not a session: leave
the board alone for twenty seconds, watch it settle, tap. **And one more glance
beside it (2026-09-11, your _"full reload of the board when placing 1-2
tiles"_):** that was the direction's art landing a second into the run and
rebuilding every mesh; the art is fetched at boot now, the field waits up to
1.5 s for it, and a late book swaps materials instead of meshes
(`board/assets.ts`, `board/ground.ts`, `LOG.md` Session 93). On the phone the
board should appear once, in the look it keeps. If you still see a flip, note
whether it is a LOOK change alone or a hitch with it — the first means the line
was slower than the cap, the second is a new bug. `?rest=5` makes it
quick to see and `?rest=0` puts the old board back. **Since the same evening
the undo is also a row in SETTINGS** — PLATEAU TOUJOURS ÉVEILLÉ, the
`board.awake` flag, off by default so the shipped board rests — put there on
your ask (_"make the custom urls toggles in the settings we can remove
later"_) and marked TEMPORARY at every site: the registry entry in
`meta/features.ts`, two sentences in `text/`, one line in `App.tsx`.

**The smaller one from the same table:** at ratio 2, antialiasing costs 1.3× to 2.1×
the CPU of the same walk without it (`perf/report.md`, the `msaa` column). The
default keeps it there and drops it above ratio 2 — which the same table says
is the right way round at ratio 3. Whether a ratio-2 phone should keep paying
for it is a look question on a device: `?aa=0` shows you the cheap one. **And
so does the ANTICRÉNELAGE row in SETTINGS** (2026-09-11, temporary, same ask):
AUTO / ON / OFF, stored, read once when the canvas is built — so it takes
effect at the next launch, and the row says both what you chose and what this
canvas actually has. Removal sites: the section in `Settings.tsx`, its three
props through `App.tsx`, the `ANTIALIAS` export in `Board.tsx`, the pair in
`shell/storage.ts` and `useDevice.ts`, and `ui.antialias` in `text/`.

**SESSION A, FIRST LINE: DOES THE BOARD DRAW BEFORE YOU TOUCH IT? (2026-09-10,
`PASS.md` P6.8.)** On Playwright's WebKit there is a reproducible state where a
run opens and the board is **blank until something touches it** — the ground
colour, the HUD, the hand, POP, all correct, and no board. It needs the
returning player's path (`taught=1`, so no teaching card to dismiss, because
dismissing one repaints) and BEGIN pressed at one particular moment. Left alone
it stays blank; a single tap fills it in.

**AND CI REPRODUCES IT, FOUR RUNS IN FIVE (2026-09-11).** This stopped being a
Windows-only rumour the evening main was pushed. `board.spec.ts`'s centring
check fails on the runner's Linux WebKit with _"the daily opened on empty
ground"_ — and the screenshot, once the artifact step existed to keep one,
shows the answer is not a mis-centred board. **The board is EMPTY.** HUD 22
tiles, three cards in the hand, FLAT and the purse drawn, and the whole plane
bare. The new-world check three lines above it passes on the same page, so the
capture works and the engine draws; what does not survive is the scene change
into the daily with no finger landing after it.

That is a better debugging surface than this bug has ever had — a second
engine, a second operating system, and a failure four times in five rather
than once in a session. It does not replace the phone (only Marc's Safari can
say whether the same hole is there) but it means the NEXT attempt does not
have to start from a rumour. The artifact is on the run; `playwright.config.ts`
keeps a screenshot on every failure now.

I could not decide from here whether it is Playwright's WebKit or Safari, and I
will not guess: the scene, the camera, the instanced writes and the frame count
are all identical to Chromium's, frames render after the board's one resize,
and `preserveDrawingBuffer: true` still captures nothing — so it is not the
screenshot lying. Two candidate fixes were written, measured and reverted
because they fixed nothing.

**What to do on the phone, before anything else in Session A:** open the game
as a returning player (you have already seen the lessons), press BEGIN, and
**look without touching**. If the board is there, this is the harness and the
skip in `e2e/shots.spec.ts` is all it ever costs. If it is blank until your
finger lands, it is the most important bug in the file and everything else
waits.

**~~A FULL DEVICE THROWS YOUR DIARY AWAY WITHOUT SAYING SO~~ — RULED AND BUILT
2026-09-13 (`PASS.md` P8.2).** Marc's ruling was option 1 below: **hold it
until the first board frame.** `storage.ts` keeps a report that cannot be shown
(`holdShed` / `takeHeldSheds`) and `App` spends it through `speakAfter` when
`started` turns true; `shell/shed.test.ts` pins four cases and `LOG.md` Session
95 carries the reasoning.

**Two ways to lose that sentence, and the first build fixed only one.** Holding
reports made while nobody was subscribed caught nothing at all: `App`
subscribes in an effect and the boot write happens after that, so the watcher
set is not empty. The report was delivered live and `say` set a note under a
`.toast` that is rendered only while `playing`. **Being subscribed is not the
same as having somewhere to speak** — which is what the 2026-09-10 finding said
in the first place, and it took an e2e failure to hear it.

**AND ONE LINE OF THIS IS YOURS, ON A FULL PHONE.** There is no end-to-end
proof that the held sentence reaches a real screen, and it cannot be got:
measured five ways, **a Chromium store at quota loses a seeded value across a
reload whether or not this game is running at all** — with every script aborted
by `page.route`, so not one line of Ashwake runs, the seeded diary is still
gone. A diary that survives to the reload is a diary on a device with headroom,
and a device with headroom spends no rung; the two conditions the test needs
are mutually exclusive. The skip in `e2e/quota.spec.ts` carries all five
measurements.

So, on a genuinely full phone: **open the game, press BEGIN, and see whether
the strip says your diary is gone once the board is up.** A real device
answering a question a harness cannot. It also explains three red CI pushes
everybody read as a flake — on the Linux runner the value SURVIVES, so the old
assertion reported `Received: 1048576` while on this machine it passed for the
wrong reason entirely.

The original finding and its two options follow.

**A FULL DEVICE THROWS YOUR DIARY AWAY WITHOUT SAYING SO (2026-09-10,
`PASS.md` P8.2).** The shed ladder does the right thing on a real full phone —
measured in Chromium, not argued: it drops the diagnostic record, then the
other worlds' receipts, then the DIARY, then every other world, retrying each
time, and never the world being played. Each rung has its own sentence in both
languages and the shell says it.

Except when the rung is spent at BOOT. Open the game on a device that is
already full and the first write runs the whole ladder before anything is on
screen: the diary is gone and **the player is never told, then or later**. The
report is made exactly like the others; there is nothing to say it with. The
front door has no toast, and by the time the board has one the line has already
been delivered.

The ladder is right and the sentence exists. What is missing is where a storage
message that arrives before the game is on screen belongs, and that is a screen
question:

1. **Hold it until the first board frame** and say it there, through the same
   speaking queue every other line uses (`shell/speaking.ts` already has
   `speakAfter` for exactly "say this when there is somewhere to say it").
   Cheap, invisible when nothing was shed, and the player hears about their
   diary one screen later than it happened.
2. **Say it on the front door**, which is the only screen that is up when it
   happens. Truthful and immediate, and it means the first thing a stranger can
   be shown on the door is a sentence about storage — on the one screen whose
   whole job is the first minute.

I lean to **1**. A stranger's first minute is the one thing this repository
protects hardest, and a diary nobody has written yet cannot be missed at the
door; a returning player on a full phone is who this sentence is for, and they
will be on the board within seconds.

**~~HALF THE PHONES GET NO ART OFFLINE~~ — RULED 2026-09-13: LEAVE IT.** Marc
took the lean, so nothing is built and nothing moves: the precache stays at one
direction, `budget.json`'s 2085 KB bar stays where it is, and a
light-preferring phone that goes offline before it has drawn `daylight` gets the
procedural floor. That floor is what the game shipped with for weeks, it is
honest-looking, and the case is a minority of a minority — light-preferring AND
offline AND on a second visit. It also self-heals: the fetch handler caches the
art opportunistically on any online visit where it is drawn.

Kept rather than deleted because the measurement is the valuable part and the
trade can be re-opened if the stranger test ever meets it. The original
finding follows.

**HALF THE PHONES GET NO ART OFFLINE, AND COVERING THEM IS 301 KB (2026-09-10,
`PASS.md` P8.5).** The service worker precaches ONE direction's art —
`settlement`, the default — because `vite.config.ts` argued on 2026-09-02 that
a device renders one direction and downloading the rest in the background of
somebody's first minute is the minute the stranger test measures. That argument
was written when FOUR directions shipped. Two do now (D12), and
`pickForScheme` sends every device that prefers light _or_ more contrast to
`daylight` — so the share that is uncovered went from a quarter to roughly
half.

Measured rather than guessed, now that offline is actually exercised: such a
device's second visit **still boots, still plays, and draws on the procedural
floor**; the nine `daylight` PNGs are the only things the network refuses, and
nothing else breaks. So this is a trade, not a bug.

- **Cover it:** +301.3 KB raw in the precache (2043.8 → 2345.1 KB), which is
  over `budget.json`'s 2085 KB precache bar — so the bar moves too, with the
  reason. Cost is paid once, in the background, by every phone.
- **Leave it:** half of devices get a stone-and-ink board offline instead of a
  painted one, until they have visited enough times for the fetch handler to
  have cached the art opportunistically (which it does, on any online visit
  where the art is drawn).

My lean is **leave it** — the fallback is the floor the game shipped with for
weeks and it is honest-looking, and 301 KB is a real cost for the second visit
of a minority of a minority (light-preferring AND offline). But it is a payload
and a look question at once, which makes it yours.

**THE E2E SUITE HAS A GPU FLAKE ON THIS MACHINE (found 2026-09-10, not
fixed).** Two full runs of identical code: the first failed one test, the
second failed a different one, and both failed on
`THREE.WebGLProgram: Shader Error - VALIDATE_STATUS false` caught by
`watchErrors`. `board.spec.ts:683` — untouched by that session — passed in the
first run and failed in the second, which is what makes it a flake rather than
a regression.

It is a driver complaint rather than an app one, and it appears only when the
whole suite runs (thirty-odd WebGL contexts back to back on one GPU); every
spec passes alone. **CI has never shown it**, which fits: a Linux runner draws
through software WebGL, the difference `playwright.audit.config.ts` already
names as the reason it will not photograph screens there.

**Not papered over.** `e2e/helpers.ts` keeps its noise filter deliberately
WebKit-only and says at the line that a new entry _"is a new fact and wants
reading before it is added"_ — and swallowing a Chromium shader error would
blind the one canary that catches a renderer crash. What was done instead is
narrow: `e2e/daily.spec.ts` does not assert the canary, because its subject is
a tile count and twenty other specs carry it.

**Needs a decision if it spreads**: retry the affected specs, run the suite at
one worker, or find out what actually fails to link. Left alone while it is one
flake on one machine.

**IT SPREAD ONCE, WITH A DIFFERENT SYMPTOM (2026-09-10, Session 78).** A full
run failed `board.spec.ts:167` — "takes a placement with the board leaned and
turned" — on `placeOneTile: no legal hex found in the search rings`, which is
not a shader error and is not `watchErrors`. That spec passed alone
immediately, and two full runs after it were clean: 116 Chromium and 46 WebKit,
twice. **The change it ran against cannot have caused it** — the only edit to
`board/` that day was type-level (`{ cx, cz }` gaining the name `Centre`, no
value moved), which is the strongest evidence yet that the machine rather than
the code is producing these.

So the count is now two symptoms, three specs, one machine, and still nothing
on CI. It is the same decision as above and it is a little more urgent: a suite
that fails one in three runs on different tests each time is a suite whose red
nobody will read. **The cheapest honest option is a retry on the affected
project**, because it makes a flake look like a flake instead of like a
regression somebody has to disprove by hand — which is what this session spent
twenty minutes doing.

**AND THE THIRD SYMPTOM IS NOT A FLAKE OF THAT KIND — IT FAILS ALONE, AND IT
IS A THRESHOLD (2026-09-10, Session 79).** `board.spec.ts:683` — "the view
cycle hands the board back" — failed a full run and then failed **once in three
runs of that spec on its own**, which is the property the entry above says
these do not have. Measured: `settleUntil(page, own, 'home')` returned
**3.0894** and **3.3971** against a `toBeLessThan(3)`.

**It is not this session's change, and that is proved rather than argued.** The
only edit to `board/` was giving `{ cx, cz }` the name `Centre` in
`camera.ts`. Building HEAD and building the change produces **byte-identical
JavaScript across all five bundled assets** (sha256, `apps/game/dist`), so the
shipped code is the same code. Whatever this is, it predates the session.

**What the number means, because it decides who fixes it.** `stillBoard` calls
a board STILL when two frames are less than **1.5** apart — that is the ambient
life, the embers and the beacons' breath, averaged over 48×48. `settleUntil`
calls a board HOME when it is less than **3** apart from the reference shot.
So the whole margin between "this board is holding still" and "this board is
back where it started" is 1.5 units wide, and the failures land 0.1 to 0.4
outside it. That is a tolerance chosen to be tight, sitting one ambient beat
away from its neighbour.

**~~A hypothesis worth writing down~~ — WRONG ON BOTH HALVES, and the second
half was a claim I should have checked.** I wrote that this spec does not call
`watchErrors`, so a failed shader link would surface as this assertion with no
canary. **It does call it** — `board.spec.ts` has twenty-seven `watchErrors`
call sites and this test's last line is `expect(errors).toEqual([])`. The
tolerance assertion simply fires first. And the shader idea is dead too: see
below.

**~~The decision is yours, and it is three ways~~ — ANSWERED 2026-09-11: both
symptoms were real bugs and both are fixed. Nothing was retried, nothing was
relaxed. The three readings are kept below because the reasoning that rejected
options 1 and 2 is what made somebody look for the cause.**

**The decision was, three ways:**

1. **A retry on the chromium project.** Cheapest, and it stops a flake looking
   like a regression. It also hides the cause, and if the hypothesis above is
   right the cause is a renderer failing to link on this GPU.
2. **Widen the tolerance, with a measured basis** — sample the settled distance
   over twenty runs and set the bar off that, rather than off 3. Honest work,
   but `CLAUDE.md`'s standing instruction about thresholds is **do not relax
   one to pass**, and it is written about the palette for the same reason it
   applies here.
3. **Find out what fails to link.** The real fix, the most expensive, and the
   only one that answers the first entry above as well.

**Nothing was changed.** Relaxing a threshold to make a suite green is the one
move the rules name, so the measurements are the deliverable.

**RULED 2026-09-10: option 3** — _find out what fails to link_. **ANSWERED:
nothing fails to link. The board draws correctly; it draws the WRONG VIEW.**

Three things were measured rather than argued, with a throwaway spec that has
been deleted:

1. **Not a shader.** Forty frames of console and `pageerror` capture, across
   seven runs of the flick. `GL-NOISE (none)`, every time.
2. **Not the glide tail.** The board comes to rest at poll index 3 every run,
   and the drift after `stillBoard`'s rule would have called it still is
   **0.06 to 0.56** — an order of magnitude short of the 3.09–4.11 the
   failures measure. `keepMine` is already stamped on every glide frame, so
   the remembered view tracks the throw to rest; that bug was found and fixed
   once, in this same test's first run.
3. **MY VIEW DOES NOT RESTORE THE ANGLE.** Four clean runs, reloaded between
   each: `data-lean` after pressing MY VIEW was `0,0,0` — flat — in three of
   four, against a remembered `35,0,0.35`. And the run where the angle DID
   come back settled at **1.49**, comfortably inside the bar, while the three
   that stayed flat settled at **2.68, 2.75, 2.95** and once **4.11**. A flat
   board simply sits about three units from a tilted one at this pan and zoom,
   which straddles a threshold of 3.

**So the threshold was never the problem. It was reporting a real defect about
a third of the time**, and the two earlier "fixes" to this test were tightening
a measurement of a bug.

**The mechanism, as far as it is established.** A probe inside `myView()`
printed its own inputs on every call: `mine={tilt:0,yaw:0,relief:0}`,
`now={tilt:0,yaw:0,relief:0}` — **eight calls out of eight.** The remembered
view is already FLAT by the time MY VIEW is pressed, so `sameLean` is true, the
angle branch never runs, and the board flies the pan and stays squared. A
second probe caught `keepMine()` being called while the lean was flat, from a
rig handle method reached through React — the minified frame is
`keepMine ← Object.current ← <react internal>` — and the only handle methods
that call it are `zoomBy` and `panBy`. **That last link is not nailed down**,
because the diagnostic was pulled before decoding a minified stack any further,
and a probe per call site is the next step rather than a guess.

**What this is a bug AGAINST, which is why it matters more than the flake.**
Marc, 2026-09-08: _"Revise all 3 camera modes so the third one is always 'my
own custom view' so that if we toggle with this button we never lose the
camera."_ Losing the camera by toggling is exactly what this does — press FLAT
to check something and MY VIEW gives you back the flat board, not your
arrangement.

**And why it shipped: nothing asserts it.** `board.spec.ts`'s camera test
checks that FLAT is `0,0,0` and that DEFAULT restores the direction's angle. It
never checks MY VIEW's angle. The view-cycle test measures MY VIEW in PIXELS,
against a threshold loose enough to pass three quarters of the time.

**FIXED, and it needed no probe in the end.** R3F renders **on demand**, so a
pan glide the board stopped drawing mid-throw is left sitting in
`glide.current` rather than resting — and the next render, which is the one a
lean change itself causes, resumes it for one frame. That frame calls
`keepMine()`, which reads the lean this very render has just changed. So
pressing FLAT stamped the player's remembered view as FLAT, and MY VIEW then
gave back the stop you had just left.

The glide's own note already had the rule: it is _"cancelled by anything the
player does on purpose — a drag, a pinch, a flight — because a finger outranks
a throw exactly as it outranks a journey."_ **A lean was not on that list.** It
is now, in `Board.tsx`'s lean effect, which is the one place that already knows
the angle is changing.

**The before and after are honest.** With the fix, the view-cycle test passed
four runs out of four where it had been failing about one in three. Without it,
the new assertion below reports `Received: "0,0,0"` — the flat board, by name.

**And the pixel threshold is no longer the only witness.** The view-cycle test
now asserts `data-lean` after MY VIEW, BEFORE the distance check: a wrong angle
is what was actually broken, and a named attribute says so where a distance can
only say "about three". `board.spec.ts`'s two-finger test gained the same claim
for the gesture path — though honestly, that one PASSES without the fix, because
a two-finger lean sets `orbited` and never starts a glide. It is a claim worth
holding, not the witness for this bug.

**The tolerance was never widened**, and it should not be: it was measuring
something true.

---

**THE OTHER SYMPTOM IS STILL OPEN, and it is a different one.**
`board.spec.ts:167` — "takes a placement with the board leaned and turned" —
still fails in a full suite run, on `placeOneTile: no legal hex found in the
search rings`. That is the FIRST symptom this section recorded, back on
2026-09-10's earlier session, and it is the "passes alone" kind:

- **5 runs out of 5 pass in isolation WITH the camera fix, and 5 out of 5
  WITHOUT it.** So the fix neither caused it nor cured it, which is worth
  stating in both directions.
- It has still never appeared on CI, which fits a Linux runner drawing through
  software WebGL.

So the count now: **both were real, both are fixed, and no decision is left
here (2026-09-11).** The second one is worth the paragraphs it cost, because
it was never about that test:

**Reproduced on purpose**, which is what made it a bug rather than a rumour:
`playwright test --project=chromium e2e/board.spec.ts --repeat-each=3` fails
on `placeOneTile: no legal hex found in the search rings`. Ninety-six taps,
all missing.

**The cause is the helper, not the board.** A tap is a RAYCAST, and an
`InstancedMesh` has nothing to raycast against until its instance matrices
are written — the same shape as the bounding-sphere bug `board.spec.ts`
records two tests below it. `placeOneTile` slept 600 ms and then clicked, and
under load (a hundred and thirty WebGL contexts in one process) that write
lands later. It waits for the board to have DRAWN now, and searches twice
before it gives up: the second search costs nothing when the first works and
is the only thing that can help when the board was simply not ready.

**The suite is faster for it.** `board.spec.ts` runs 2.7 minutes where it ran
3.2, because a board that has already drawn answers the check in about 95 ms
and the sleep it replaced always cost 600.

**And a second flake of the same family came out with it**: one test read
`localStorage` immediately after a placement and expected the keeper’s write
to have happened. The keeper runs from an effect, so the write lands after
React commits. It polls now. _A test that reads a side effect immediately
after the action that causes it is a test about scheduling._

**Held, four runs of the reproducer (108 tests) and two full suites per
engine.**

**AND IT HANDED P6.8 A FACT.** Waiting outright for the picture broke three
WebKit tests with _"the board never drew a picture in 15000 ms"_ — while
those same tests place tiles perfectly well. **So on WebKit the scene is
RAYCASTABLE while the capture is still blank**: a tap lands on a board no
screenshot can see. That rules out "the scene is empty" and "the camera is
wrong" as explanations for the blank board, and it is why the helper takes
the picture as a hint and never as a gate. Session A still decides whether a
phone sees what the screenshot sees.

**AND A THIRD SYMPTOM, ON WEBKIT THIS TIME (2026-09-10, P2.2's run).**
`world.spec.ts:33` — "the world remembers the ground a run is walking, before
the run ends" — failed once in a two-project suite on `world?.runs` being 1
where a mid-run write must leave it 0: _"a run in progress counted itself as
finished."_ Chromium passed the same spec in the same run.

**Checked rather than assumed, because that spec's subject is `mergeRun` and
P2.2 was editing the seam `mergeRun` rides:** it passes **3 of 3 alone on
WebKit**, and the **full WebKit project passes 46 of 46 twice in a row**. The
one behaviour change in that commit cannot reach a world's run count either —
the first-pop card now requires a pop to have actually happened.

So: three specs, three symptoms, two engines, one machine, still nothing on CI.
It reads more and more like a machine that loses a race under load rather than
three separate bugs, which is an argument for the retry option and against
chasing each one — but it is still a decision and it is still yours.

**~~A DAILY IN PROGRESS CANNOT BE RESTARTED~~ — RULED AND SHIPPED 2026-09-10.**
Marc, asked where the restart lives: _"restart should restart whats being
played currently (world or daily, one or the other)."_ Which is a better answer
than any of the three readings offered, because it is not about placement at
all — **the control already existed.** MORE's RESTART called `newRun()`
unconditionally, and `newRun` LEAVES the daily by design (its own docblock says
why: a fresh random run played while the shell still thought it was in the
daily would be banked under today's date). So the one button that says "start
this over" took a daily player into their own world, which is exactly the
sentence he wrote from his phone.

It branches now — `openDaily(null)` for a daily, `newRun()` for a world — and
both doors already existed. `openDaily(null)` had exactly one caller, TRY
AGAIN on the end screen, which is why a run in PROGRESS could not reach it.
Pinned by `e2e/daily.spec.ts`, and the pin is worth a sentence: **the tile
count alone cannot catch this bug**, because a world run also starts at a full
purse. Reverting the fix fails the test on its SECOND assertion — that MORE ▸
DAILY still resumes the board RESTART dealt — and not on the count at all.

**ONE CASE YOUR SENTENCE DID NOT NAME, and it is yours if you disagree with
what I did with it.** A shared board is neither a world nor a daily, and it is
now not offered RESTART at all — the button is absent rather than doing
something else. The reason is a hard invariant rather than taste: `MODES.md`
says a detour can only be ENTERED at boot from the URL, every door states
`detour: false`, and that is the check a sixth door cannot forget. A mid-run
RESTART that dealt the same shared seed again would be that sixth door. The
alternative — leaving the button to call `newRun()` — is the bug above wearing
a different mode.

**FIVE THINGS THE HUD WORKS OUT AND NEVER SAYS (2026-09-10, `pnpm sweep`'s
first report, `LOG.md` Session 78).** One question, asked five times, and it
is the one `CLAUDE.md` says not to guess at: **does the HUD say this?** Each
is computed on every frame today and read by nothing, so each is either a
sentence this game is missing or a number that should stop being computed.
They are listed loudest-first.

1. **THE COLOUR LENS ANSWERS WITH A NAME, AND ASHWAKE 1 ANSWERED WITH A
   REPORT.** Long-press a card here and the board dims to that ground and the
   toast says LICHEN. Long-press a card in Ashwake 1 and the line under the
   board said, in the ground's own name: _"N tiles standing · worth W — B from
   its power (ash) · R of it ripe now · pts when popped = worth × pocket size
   × distance"_, plus the colour's power clause. All of it is computed here —
   `HudView.colours`, `HudView.spotlight` and `ColourPotential`'s five
   numbers — and printed nowhere. **`INTERACTIONS.md` calls this gesture ✓**,
   which is right about the gesture and blind to the sentence: exactly the
   limit `CLAUDE.md` names for a gesture matrix.

   It is also the one with a COST. `colourPotentials` tallies every live tile
   on the board TWICE per HUD build — once normally, once with all four colour
   powers switched off — so each colour's own take is measured rather than
   estimated. That is the right way to get the number and it is thrown away on
   every frame of every run.

   **RULED 2026-09-10, and not the way this entry asked.** Offered the toast,
   a shorter line, or cutting `colourPotentials` outright, Marc answered with a
   fourth thing: _"maybe a lens button where we can see actual points of all
   board, check per color, etc."_

   So the direction is a **lens PANEL, not a sentence** — a control that opens
   a view of what the board is actually worth, per colour, with the whole
   board's standing total. Every number it needs is already computed and
   thrown away: `ColourPotential` carries the count, the summed worth, how
   much of that worth the colour's own power earned, and how much is ripe now.
   `colourPotentials` stays, and stops being waste on the day the panel reads
   it.

   **Not built, and deliberately not guessed at.** It is a new SCREEN — layout,
   where the button lives, what it says — and `CLAUDE.md` is explicit that a
   screen is Marc's and an eye's rather than a derivation. It also needs new
   sentences in both languages, and the French artifact (P3) is already with
   him, so the sequence matters: the strings want to go INTO the next French
   pass rather than behind it. What it wants next is a sketch or a sentence
   about the shape, not another session's guess.

2. **A STANDING BOUNTY IS NOT ON THE BUTTON.** `HudView.questPays` — its own
   docblock says _"the points button wears it, because a reason to press a
   button belongs on the button"_ — is read by no screen. Ashwake 1 put the
   SITE glyph on the POP label and a `bounty` class on both buttons. The
   points figure is already correct (the multiplier is inside
   `harvestValue`); what is missing is any sign of WHY it is bigger.
   No new sentence needed — it is a mark, and this body's mark vocabulary
   already has the site icon. **The question is only where it goes**, on the
   most-pressed control on the board, which is the `Ring.width` lesson.

3. **"POP · N READY" DOES NOT EXIST.** `HudView.pocketsReady` counts separate
   ripe POCKETS rather than ripe tiles, and its docblock explains that a big
   pocket is still one decision. Nothing prints it. The POP button shows what
   the priced pocket pays; it never says how many decisions are waiting.

4. **`HudView.tilesSpare`** is the boolean behind _"More tiles than you can
   spend. POP for PTS from here on"_ — the state you found on the board with
   202 tiles and 167 placements left, where the mechanism worked exactly as
   designed and the game never said a word. The SENTENCE exists in both
   languages; it lives in `hud.guide`, and you removed the guide line on
   2026-08-29 (_"remove tips above hand tiles"_). So the fact has no door.

5. **`HudView.guide` itself**, which is that removal. Left computed on
   purpose and recorded here rather than in the report, so a future coaching
   mode finds it built. Nothing to decide unless 4 changes your mind.

Each of the five carries this finding at its declaration in `view/view.ts`,
and `scripts/sweep/allow.ts`'s `HUD_UNSAID` points here so the sweep stops
re-asking. **Answering 1 or 3 changes the first minute**, so both are inside
`CLAUDE.md`'s freeze once Session A declares a clean pass.

**THE STALE-CHUNK LOOP: MOSTLY NOT REACHABLE, AND ONE DECISION LEFT
(2026-09-10, `PASS.md` P8.1).** The question P8 asks is _"is there a state this
game can reach where the only exit is clearing site data?"_ Answered:

**Not on a working line.** `public/sw.js` answers navigations **network-first
with a 2.5 second timeout**, falling back to the cached shell only after that —
so RELOAD fetches the new `index.html` with the new chunk names, and the loop
breaks. P8.1's second option ("the worker's navigation handling is made to
guarantee the mismatch cannot happen") turns out to be substantially already
true, which is why nothing was built for it.

**Reachable on a slow one.** Slower than 2.5s and the cached shell answers,
naming chunks the new build does not serve; the chunk request misses the cache
and 404s; the import rejects; the panel comes up; RELOAD does the same thing
again. Until the network beats the timeout, that is a loop.

**And CONTINUE could never fix it, which IS fixed.** React caches a `lazy`
rejection: the second mount re-throws the stored error **without making a
request**. `ui/staleChunk.test.tsx` counts the loader calls and proves it. So
the panel no longer offers CONTINUE for this class — `Boundary`'s own docblock
already had the rule (_"a button that says CONTINUE has to continue into
something"_) and this was the case that broke it. RELOAD and the report stay.
That needed no ruling from you; a button that provably cannot work is worse
than its absence, because pressing it moves the repeat counter and teaches a
player the game is broken rather than that the page is stale.

**WHAT WAS YOURS: ~~the slow-line case~~ — RULED AND BUILT 2026-09-13.** Marc
took option 2: **tighten the worker**, not a third reload. `public/sw.js` asks
`/version.json` in PARALLEL with every navigation — ninety bytes, never cached,
so it costs no latency of its own — and when the timer fires it declines to
fall back to a shell whose build the site is no longer serving, waiting for the
document instead. The mismatch state stops existing rather than gaining a door
out of it, and `CLAUDE.md`'s two-reload rule is untouched.

**Written to fail towards today's behaviour.** A `/version.json` that fails,
times out or answers nonsense leaves the verdict false and the cached shell
answers exactly as before — which is what keeps offline working. And the
decline still falls back if the NETWORK fails: `network.catch(() => cached)`,
because a dropped connection between the stamp arriving and the document
arriving would otherwise be a white screen on the very devices the precache
exists for.

**One half is tested and the other cannot be, and that is measured rather than
assumed.** `e2e/offline.spec.ts` proves a slow line is still answered from the
cache when the build matches, and all five offline tests still pass. The
converse test — stage a deploy, delay the document, assert the shell is
declined — was written and fails, because **Playwright's `context.route` does
not intercept the service worker's own fetches**: instrumented, the version
route is hit once, by the page, while the worker talks to the real server and
correctly serves the cache. The test would have measured the harness. The
docblock at the end of that file carries it.

**So one line for Session A, or for any real deploy:** after a deploy lands,
open the game on a phone on a slow connection and see that it comes up rather
than looping on the failure panel. That is the only instrument there is.

The original finding and both options follow.

**WHAT IS YOURS: the slow-line case, and it is a reload-policy question.**
`CLAUDE.md` allows exactly two reloads — the service-worker update and the
boot-failure panel — so a third needs your word. Two options, neither built:

1. **A chunk rejection earns a reload, folded into the existing update path.**
   The panel already has RELOAD; this would make it automatic once, on a
   stale-chunk error, rather than waiting for a tap. Cheapest, and it is
   arguably not a third door at all — it is the boot-failure reload firing
   itself. Risk: an automatic reload on a genuinely offline device is a loop of
   its own, so it needs a "once per build" latch.
2. **Tighten the worker instead.** Serve navigations network-only when the
   cached shell's build sha does not match `/version.json` — the worker
   already refuses to cache that file for exactly this kind of reason. No new
   reload, no new door, and the mismatch stops existing. Costs a request on
   every navigation and needs care to stay offline-capable.

I lean to **2**, because it removes the state rather than adding an escape from
it, and because `CLAUDE.md`'s two-reload rule is the sort of thing that erodes
one exception at a time. But it is your rule and this is your call.

**AND A SIXTH, IN A SAVED RUN RATHER THAN ON THE BOARD (2026-09-10,
`PASS.md` P7).** Every finished run stores nine facts about itself and the
hall of fame's expanded row prints **four**: the epitaph, the board's
thumbnail, the pop count and the relics carried out. The five it keeps and
never says are the run's SHAPE —

- **placements** — how many tiles it took;
- **popped** — tiles cashed across every pop;
- **bigPop** and **bigPopAt** — the biggest single pop, and where in the run it
  landed (the arc already draws this and the number is never given);
- **claims** and **quests** — destinations claimed, bounties collected.

`RunDetail`'s own docblock says what it is for, quoting you: _"a 'full detail'
of the run"_, and _"the same facts `summariseRun` put on the screen the night
it happened"_. Four of nine is not that.

**Both costs are measured, so the choice is informed either way.** Keeping
them: they are 24.5% of the timeline blob — 2.4 KB at thirty runs, 23.7 KB at
three hundred, 79 KB at a thousand, which is 0.45% of a 5 MB store at three
hundred runs. Printing them: five more rows in a row that already exists and
already has two, plus five sentences in both languages, which — like the lens
— want to go INTO the next French pass rather than behind it.

**Deleting them was the version of this row I was handed** (P7 inherited it
from the sweep as "eight numbers written into a save and read by nothing") and
it is the wrong way round: reclaiming half a per cent of a quota by throwing
away facts you asked for is a bad trade. So it is a screen decision, and it is
yours.

**THE BOARD'S FIT IGNORES HOW TALL A TILE STANDS (2026-09-10, same report).**
`screenOf` takes a height and every one of its five production call sites
passes `0`, so the camera's fit and extents measure the GROUND plane while
`relief.ts` lifts a hex by up to four contour bands plus a rarity's stand —
about 0.55 hex radii, roughly 20px at a normal zoom, at the top edge only.
Not dead generality: `camera.test.ts` passes a real height, and `0` is
CORRECT for the drag inverse, which maps a finger onto the ground. Whether the
FIT should include lift is a framing change on the first screen anybody sees,
so it is yours. Cheap either way.

**~~THE FONTS SHIP WITH NO LICENCE, AND THEY ARE OFL~~ — DONE 2026-09-09, and
it needed no answer from Marc.** Asked where EB Garamond came from he said
_"not sure?"_ — and the question was aimed at the wrong thing: every OpenType
file carries its own copyright in its `name` table, so the authoritative notice
was inside the bytes already being served. `scripts/notices.ts` reads both
(brotli-decompressing the woff2 to do it), writes `docs/licences/*` and the
SERVED `/third-party.txt`, and is in `pnpm bake`; `verify-deploy` fails if the
file 404s, and one line in SETTINGS says it exists. `LOG.md` Session 73. The
original finding follows.

**THE FONTS SHIP WITH NO LICENCE, AND THEY ARE OFL (2026-09-09, found in the
pre-public review).** `cinzel.ttf/woff2` and `ebgaramond*.woff2` are served to
every visitor from `apps/game/public/fonts/`, and there is **no licence for
either anywhere in the repository**. `docs/licences/` holds one file,
`phosphor-LICENSE` — and `docs/` is not served, so even that notice never
reaches the bundle that carries Phosphor's icon paths.

Both fonts are SIL Open Font License, which requires the copyright notice and
the licence to be distributed WITH the font. Cinzel says so in its own name
table, which is authoritative and readable locally:

> Copyright 2020 The Cinzel Project Authors (https://github.com/NDISCOVER/Cinzel)
> licenseURL: https://scripts.sil.org/OFL

**What is blocked, and it is one fact.** EB Garamond ships only as woff2 in
this repo and in `../tiles`, so its notice cannot be read locally — and a
licence file with a GUESSED copyright line is worse than none, which is why
this is here rather than done. **Marc: where did `ebgaramond*.woff2` come
from** (Google Fonts, the upstream octaviopardo/georgd repo, a Fontsource
package)? With that, all three notices go into `docs/licences/` and a served
`/third-party.txt`, with the OFL 1.1 body copied verbatim rather than retyped.

Not a launch blocker in the sense that anything breaks — a launch blocker in
the sense that it is the one thing on this list somebody outside can notice and
be right about.

**~~A shared run leaves no trace at all, not even a diary row~~ — ANSWERED
2026-09-09: YES, BUILT.** Marc: _"1. yes"_. `SharedEntry` is its own timeline
kind, written by `settle`'s detour branch, drawn in the DIARY tab led by the
seed the way a daily's row is led by its date. Its own kind rather than a
`RunEntry` with a marker, because `runsOf` feeds the TOTALS run count and
`prehistory`'s arithmetic — both about this device's own worlds — and a shared
run inside that filter would inflate every total. The ledgers are untouched:
the guard is still right about the world, the purse and the shelf of bests, and
none of those was ever an argument about a record of what you did. The original
argument follows.

**A shared run leaves no trace at all, not even a diary row (2026-09-09,
`LOG.md` Session 65).** `settle`'s seed guard returns every ledger untouched
for a detour, which is right about the WORLD and possibly wrong about the
diary: a daily gets a row and a try count (`settleDaily`), and a shared board
now plays a daily's economy and ends on a daily's offer, so the one thing it
still does not share is the record that it happened. **The question only Marc
can answer: should a shared run appear in the hall of fame's diary?** It would
need its own row kind (it is not a world run and not a dated daily), and the
argument against is that a link is somebody else's board and the diary is a
record of YOUR worlds. Left alone because it is a taste, not a defect.

**`claim.shrineDetour` and `view.hex.shrineDetour`/`shrineDetourClaimed` are
now unreachable, and deliberately kept for a few weeks (2026-09-09).** A
detour generates no shrines at all under `NO_LEDGER`, so nothing can reach
these three sentences — **except a `?seed=` run saved before today and resumed
after the update**, whose cells already hold shrines the new economy would not
have made. That is a real upgrade path and it is why they stay. **Delete them
once no such save can exist** (a month is generous), or the next dead-text
sweep re-adjudicates them from scratch, which is how a ritual stops being run.

**~~A DETOUR keeps its shrines and its finds, and neither pays this device
anything~~ — ANSWERED 2026-09-09, same day it was written.** Marc answered it
by asking for the flow rather than the rule: _"For a shared world, it should be
able to be played like a daily for a first run, then the same question goes: do
we continue in a world? if yes, we keep the same."_ So a detour plays a daily's
economy (`NO_LEDGER`), and its ending offers KEEP THIS BOARD like a daily's
does. The geography argument that kept it out survives untouched — nothing in
`NO_LEDGER` moves ground, walls, caches, sites or territories, and a shrine
only changes FACE. `LOG.md` Session 64. The original argument follows.

**A DETOUR keeps its shrines and its finds, and neither pays this device
anything (2026-09-09, `LOG.md` Session 63).** A daily's do not: `NO_LEDGER`
in `shell/economy.ts` rewrites a daily's shrines into caches and sites and
zeroes its finds outright, on Marc's own reasoning that a landmark paying into
a ledger the run does not have is a door that opens nothing. A detour — a
shared seed that is not this device's world — gets `NO_RELICS` and nothing
else, so its shrines still read as shrines and its finds still shimmer, and
`App`'s grant refuses both because a perk lives on the world it was found in.
Walking to one costs a placement and pays literally nothing.

**This is deliberate and `economy.test.ts` says so** — "a detour is somebody
else's world, played as it stands", because a replay scored under this device's
economy would not be a replay of anything. So the two rules genuinely conflict
and only Marc can pick: either a detour's board is the SAME board everybody
else played (today's answer, with two landmark kinds inert on it), or a detour
gets `NO_LEDGER` too and plays a board with no dead doors on it, at the cost
of no longer being the same geography the sharer walked. Left alone rather than
changed, because it is a design call and not a defect.

**~~The board still RESIZES when POP appears~~ — RESERVED, 2026-09-08.** Asked
whether 60px of board on every phone for every run was worth a map that never
moves, Marc said yes. The action bar carries a button-shaped spacer whenever it
would otherwise be empty — a spacer rather than a `min-height`, because the
bar’s height is content and a magic number would be right until a label wrapped.
The third instance of this disease and the first with a TEST: `e2e/steady.spec.ts`
measures the board host across the moment POP appears, and was checked to fail
without the spacer. The original argument follows.

**The board still RESIZES when POP appears (2026-09-05, `LOG.md` Session 56).**
Marc's _"the whole screen flashes"_ was measured to its cause: the action bar
grows the first time a pocket ripens — `.controls` 85px to 145px — and
`.board-host` is `flex: 1`, so the WebGL canvas's backing store is reallocated
under it (780x1424 to 780x1304 on a 390pt phone). A reallocated buffer is a
CLEARED one, and under `frameloop="demand"` nothing repainted it until the next
demanded frame, so the whole board composited blank for a frame. **The flash is
fixed** — the board now paints the new buffer in the same task it was resized
in — **but the RESIZE is not.**

That resize is the third instance of one disease: `ui.css` already records the
stat row ("the board resizes because the score went from 99 to 100") and the
purse drawer ("the map resized every time LUCK was tapped"), both fixed by
stopping the resize rather than absorbing it. Stopping it here means reserving
POP's row for the whole run. **The question only Marc can answer: is 60px of
board, on every phone, for every run, worth a map that never moves?** The
alternative is what ships today — the board resizes once when the first pocket
ripens, silently now instead of with a flash.

**And the flash Marc was reporting was a DIFFERENT one, found 2026-09-06**
(`LOG.md` Session 58). He said so by repeating the report against the fix:
_"first/second tile still flashes the screen"_. `.card` had the `rise`
keyframe and `.card-scrim` had none, so every teaching card put a 94% wall over
the whole screen one frame before the card on it became visible — the screen
washing to one flat colour with nothing on it, for the first third of a 140ms
ease-out. Fixed: the scrim fades up with its card. Both flashes were real, one
report covered both, and the second was found only by screencasting every
composited frame and grading it for flatness rather than by reading the code
that had just been changed.

**~~Does WALL and FIELD earn a camera trip?~~ — YES, both, 2026-09-08.** Put
to Marc with the ruling against them stated in full, he chose to fly to both.
The oldest camera ruling is not broken by it and the distinction is kept at
`shell/tourTarget.ts`: what he objected to in 2026-08-29 was the board moving
on EVERY placement, an ambient drift; each of these fires once per device,
ever. They remain the two most worth watching in Session A, because unlike the
other five they speak while a hand is still moving — one line each to take
back out. The original argument follows.

**Does WALL and FIELD earn a camera trip? (2026-09-08, `LOG.md` Session 59.)**
Marc: _"yes do the same for caches, sites and territories and other concepts on
the map"_. Five are wired — RIPE, CACHE, SITE, SHRINE, TERRITORY — and all five
are CARD-class: the trip leaves off a card the player has just read and pressed
GOT IT on, with nothing else happening. WALL and FIELD are places too and are
the two left out, because they are TOAST-class: a line beside a game still in
motion, spoken on the quiet beat after a placement. Flying the board there
breaks the oldest camera ruling in this repository — _"when we place a tile,
make sure the map doesnt move and stays stationary, it always zoom in or zoom
out a bit and its annoying"_ (2026-08-29) — and each one would fire once per
device, ever. **One line each in `shell/tourTarget.ts` if the trade is wrong.**
The declaration there carries the same argument.

**~~SHARPNESS, by looking~~ — ANSWERED 2026-09-05** (`LOG.md` Sessions 50 and
53). The slider went out to a phone with its default reproducing the old
2026-09-02 guess exactly (a dense phone drawing at 1.5 device pixels per CSS
pixel, MSAA off, "a defensible default" nobody had looked at). Marc looked:
_"Crisper (3 or more) was good."_ `DEFAULT_RENDER_SCALE` is
`MAX_RENDER_SCALE` now — the phone's own ratio, capped at 3 — and the slider
stays for the device that would rather spend the battery elsewhere. **Worth
saying plainly: this is a four-times pixel cost on every dense phone, not only
on the one that asked**, which is the trade the note under the slider names and
the slider itself exists to undo. MSAA still could not join the dial: it is a
WebGL context flag fixed at canvas creation and the board may never remount.

**~~`z-index: calc(...)` is dropped by some browser~~ — THE THEORY IS WRONG,
settled 2026-09-08** (`LOG.md` Session 61). Everything below rested on one
untested premise: that `z-index` takes an `<integer>` while `calc()` yields a
`<number>`, so an engine might decline the pair and never make a stacking
context. WebKit was installed and asked directly. It computes
`calc(var(--z-chrome) + 2)` as `12` and honours the order, exactly as Chromium
does. **The construct is fine.** The three latent sites in `.board-menu`,
`.lens-off` and `.directions` need no treatment, the hardening done on this
theory's strength cost nothing but was not the fix it was believed to be, and
whatever Marc saw on his phone is still out there with its best lead gone.
`e2e/stacking.spec.ts` now asks the ENGINE what is on top — `elementFromPoint`
rather than a computed style, which is the very distinction the theory turned
on — on both engines, so the next report has an instrument waiting for it.
The original argument is kept below, unedited, because a retired theory that
is deleted is one somebody re-derives.

**`z-index: calc(...)` in three more places, unverified (2026-09-05, `LOG.md`
Session 53).** The SHARPNESS popup came back from Marc's phone with the camera
buttons drawn ON TOP of it — not reproducible in Chromium at any pixel ratio,
portrait or landscape. The one construct that can fail that way is
`z-index: calc(var(--z-drawer) + 1)`: `z-index` takes an <integer> and
`calc()` yields a <number>, so a browser that declines the pair drops the
declaration and `.camera` never becomes a stacking context. That one is now a
real rung on the ladder (`--z-camera`), which cannot fail that way — **but the
same construct is still in `.board-menu`, `.lens-off` and `.directions`, and
whether it was ever the cause is a thing only Marc's phone can say.**

**Confirmed 2026-09-05, and hardened a second time.** Marc, shown the three
shapes it could take, picked _"buttons drawn on top of it"_ — a true z-order
failure, still not reproducible in Chromium at any pixel ratio. So the row now
carries an explicit `z-index: 1` against the popover's own rung: the order is two
integers a browser has to COMPARE rather than a paint-order rule it has to
honour, since the rule ("a static sibling cannot paint over a positioned one
with a z-index") is true by the spec and was false on the device. If the
popup is fixed, those three are latent and worth the same treatment; if it is
not, the theory was wrong and the real cause is still out there. Do not
"fix" the other three on the strength of this paragraph alone — check the
popup first.

**~~The SHARPNESS popup~~ — the question is MOOT as of 2026-09-08** (`LOG.md`
Session 60). Marc asked for the dial itself to move — _"put netteté button into
settings"_ — so there is no popover on the board any more for anything to be
drawn on top of. **That does not answer the question**, it retires the one
surface that could have answered it: the three latent `z-index: calc(...)` in
`.board-menu`, `.lens-off` and `.directions` are exactly as unverified as they
were, and the next report of a control drawn over another one is still the first
real evidence. Left here rather than deleted for that reason.

**What DID get confirmed the same day, and it was not a stacking bug at all**:
the purse drawer's lockout. `.camera` outranks `.spends` on the ladder by
design, and the drawer's bottom-right corner — its close button and its last
spend rows — sat underneath the cluster. Measured at 44px of overlap and fixed
by moving the box, not the rung, which is the fix that does not depend on being
right about a browser.

**~~The identity-share ceiling~~ — CLOSED 2026-09-04** (`LOG.md` Sessions
48–49). A played run's receipt read matching/power/rarity/native ground — the
four things a player actually PLACED well — at 5% of harvest points against
distance/pocket-size/bounty's 95%. Session 48's `distanceMultiplierCap: 3 -> 2`
trimmed distance alone (44% -> 36% on a 150-seed sweep) but left identity
untouched (16%), because that dial and every other existing one multiply
identity, so shrinking them enough to matter broke `sim.test.ts`'s "rewards
patience" gate. Marc, told this, said find a way rather than accept it.
**`identityBonusRate` (0.4) is a second, ADDITIVE term on the same worth —
paid in full, not multiplied by size, distance or the existing gates — so
identity's share can rise without spending patience's margin at all.**
Then Session 51, on Marc's ordering — placement first, "where am I going"
(landmarks, not raw distance) second, luck/rarity as jackpot odds third,
patience intact, and "don't reintroduce" TREASURE — measured a run's TOTAL
points for the first time and found the end-of-run REACH bonus was 34% of
everything, the largest channel in the game. Shipped: `endReachBonus 40 ->
20`, `endClaimBonus 60 -> 100`, `identityBonusRate 0.4 -> 1.0` (halving reach
is what bought the headroom: it is a constant added to patient and greedy
runs alike, so cutting it widens the patience ratio), and a new
`rareBonusRate: 3` jackpot on magic/unique tiles. Share of a run's points:
identity 12% -> ~22%, reach 34% -> 19%, claims 6% -> 10%, rarity 1.6% -> 7%
of harvest points; a pocket carrying a rare pays ~2.6x a plain one per tile.
The receipt names both new terms in both languages. The gate files' `SEEDS`
went 6 -> 40 — the "cliff" was never the economy. **Landed 2026-09-04 as
`84d5d9c`, CI and deploy green on `23f38c3`, live and verified.** What is left
for Marc here is a played run rather than a number: does a receipt with a
placing row and a jackpot row on it read as the game rewarding where you put
things?

**~~Which story, if any~~ — DECIDED 2026-09-03** (`LOG.md` Session 47). The
Inheritance direction, played subtle: `s.story` is rewritten in both
languages, the loop only implied, never stated. Nothing left open here.

**~~The drip’s toasts~~ — LANDED, and this paragraph was stale (struck
2026-09-08).** Verified against the code rather than trusted: `App`’s
`speakLesson` is the speaker, `shell/teaching.ts#toastLine` is the word table,
and `s.lensHint` is in both languages. Nothing is owed. Kept struck rather
than deleted because the shape of the miss is the point — this file exists
because _a stale open-list is worse than none_, and it was the stale one. The
original text follows.

**The drip’s toasts, by choosing their words (2026-09-03).** The moments and
the ledger are built and armed; what is missing is a speaker in `App` (one
toast per dispatch, through `act`, the same door the receipts use) and a
sentence per moment. Five candidates already exist in the catalogue and
would follow the house rule of one sentence in a second place: `place` →
`s.figure.place` (the caption the EXPEDITION tab now draws), `wall` →
`s.ui.legendWall`, `lastGasp` → `s.lastGaspRule`, `costRise` → the
`statNote('cost')` prose, `field` → `s.view.describe.native(name)`.

**Both open questions answered 2026-09-03** (`LOG.md` Session 47): `lens`'s
words are "Tap remembered fog to light its ground" (goes into both
languages, still to land); `glow` is deleted from `TEACH_IDS` outright
rather than worded — done, in `progress.ts` and `teaching.ts`. What is left
of this item is purely the build: the speaker in `App`, and `lens`'s
sentence added to the catalogue alongside the other five.

**What the manual still does not explain, by writing it (2026-09-03 audit,
manual vs engine).** Everything below is a rule the engine enforces and no
manual surface states; each has core prose behind a tap somewhere, so the
words exist but the editorial call (a new section? which tab? shorter?) is
yours: **the cost curve** — EXPEDITION says placements cost tiles, never
that the cost RISES and never comes back down, the one clock that ends every
run (`statNote('cost')` has the sentence, HUD-tap only); **REACH** — the
distance multiplier is a scoring rule visible only behind the HUD stat tap;
**the fog** — nothing in the manual says the world REMEMBERS across runs,
that destinations glow through it, or that tapping remembered ground turns
the lens (the drip's `glow` and `lens` toasts were its only planned mentions,
and they never spoke); **native ground** — TERRITORY says ground becomes
native and nothing says what native DOES (`describe.native`'s "+1 worth" is
tap-only); **the draw lean** — popping leans your next draws toward that
colour, said only in RIPE's first-contact card, which a manual reader never
sees. Fixed already, no words needed: the `destinations` and `place` figures
existed with pinned bilingual captions and NO lesson carried them, so
nothing drew them — the legend now hangs `destinations` (whose caption is
the manual's only statement of FAINT MEANS SPENT) and EXPEDITION draws
`place`.

**TREASURE (pop for magic/unique) is a real button paying an unreal
price (2026-09-03).** Diagnosed, not fixed. Popping a 10+ pocket as
treasure forfeits BOTH tiles and points for one rare tile — a bank20
harvest averages 1,467 points; the rare tile's whole lifetime payoff is the
+5 to +15 worth an ordinary wild match adds once. Off by roughly two orders
of magnitude, which is presumably why it goes unused. Three directions raised
with Marc, not yet written up or swept: keep the tiles and forfeit only
points, richen what the rare tile itself does, or lower `treasureNeed` —
which of the three is right is a feel question about what the trade should
cost, not a number the harness settles alone.

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

**~~One thing the ruling did NOT carry, and it is an accessibility one.~~
CLOSED 2026-09-03, D12.** `pickForScheme` used to answer a stated preference
with the plane — `torchlit-bright` for more contrast, `daylight` for light —
so the player who needed contrast was the one player who did not get the
fiction the front door just told them. `torchlit` and `torchlit-bright` are
retired, `daylight` is reskinned onto settlement's own names and rules, and
both `prefersLight` and `prefersContrast` answer `daylight` now: the bright
settlement this note asked for, built by reskinning a palette that already
passed every assertion rather than authoring a new one.

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
- **~~The BACK GESTURE on an open panel.~~ SHIPPED 2026-08-30, and this bullet
  was stale for nine days** (struck 2026-09-08). `ui/dialog.tsx` has owned it
  since the day this was written: one history entry per open panel, every
  `pushState` in an event handler, a panel closed from the UI gives its entry
  back, and the stack owns nothing while nothing is open — exactly the design
  this bullet asked for, including "no URL→scene table anywhere". It is pinned
  by `menus.spec.ts` (two `goBack()`s, one panel each, and `history.state`
  checked for an entry the stack no longer owns), and since 2026-09-08 that
  test runs on WebKit as well. The "not before Session A" caution is moot: it
  landed long before.
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

## 5b. ~~The look the directions author and the board does not read~~ — ANSWERED 2026-09-08

**All five are closed, and two of them were already closed when this section
was last read** (`LOG.md` Session 61). Checked against the code before being
acted on, which is this file's own rule and which is what caught it:

| Channel          | What happened                                                               |
| ---------------- | --------------------------------------------------------------------------- |
| `board.seam`     | **Was already wired**, 2026-09-04 — `ground.ts#hexRadiusOf`. Section stale. |
| `Ring.width`     | **Already ruled** left dead on purpose, 2026-09-01. Section stale.          |
| `board.vignette` | Drawn, at 0.30 rather than 0.55, with `?vignette=` to argue with it.        |
| `theme.ghost`    | Drawn as the preview FILL, with `?ghost=` — see `torch.ts#previewTint`.     |
| `Surface.inset`  | Honoured as the DIFFERENCE it expresses; `ground.test.ts` pins why.         |

Marc answered all three live ones on 2026-09-08. The two that needed a number
he did not have carry a dial as well as a default, because the last word on a
look belongs to a phone and not to a default I picked.

The original section follows, unedited.

Found by the third audit pass (2026-09-02, `LOG.md` S37d), which pointed the
consumer-grep at the THEME. **Five authored channels reach no pixel.** Each is
a number a direction author tunes into a void today, so each is now stated at
its own declaration in `theme/tokens.ts` rather than left silent.

All five are LOOK decisions, and none is being taken without Marc — the ring
repaint of the same day is why (`board/rings.ts`, bottom note): a look change
guessed at from a session that cannot see the phone cost a bug report within
the hour.

| Channel          | Authored                                        | Drawn           | Ashwake 1                  |
| ---------------- | ----------------------------------------------- | --------------- | -------------------------- |
| `board.vignette` | **torchlit 0.72**, settlement 0.55, rest `null` | nothing         | `#drawVignette`            |
| `theme.ghost`    | a whole Surface, alpha 0.16–0.34, every one     | nothing         | a sprite under the preview |
| `Surface.inset`  | 0.06 everywhere, **`empty` 0.09** on four       | one constant    | 3 reads + the baker        |
| `board.seam`     | 0.04–0.05, placeholder 0.06                     | hard-coded 0.06 | not read there either      |
| `Ring.width`     | three widths per direction                      | one 0.16 band   | drawn                      |

**The vignette is the one to look at first**, because torchlit is what ships:
the default board is missing atmosphere its own direction asks for. Its rule
travels with it — `strength` is a CEILING, so no in-play tile drops below
`1 − strength` of its own luminance. Darkness hides the space, never the ground
you have built.

**`theme.ghost` is the second**, and it answers a question already asked: it is
where "show me the colour I am holding" belongs. A fill under the preview
number is a PROPOSAL; an outline is a STATE — which is exactly why tinting the
outline made every legal edge repaint on every placement.

`inset`, `seam` and `width` are one decision rather than three: they are the
board's gutter and line weight, all three were tuned by eye against what
renders today, and honouring any one of them is a re-tune of the whole grid
rather than a fix.

**All five are still unwired after the 2026-09-02 improvement pass**
(`IMPROVEMENTS.md`), deliberately and for this section's own reason. That pass
had a ruling from Marc to resolve look findings with a defensible default —
and these five are not findings with defaults, they are a re-tune of the whole
board's atmosphere and line weight. The pass took every look decision that had
one honest answer and left these, which have none until somebody looks.

## 5c. Nothing sets `Said.brief` — DEFERRED by Marc, 2026-09-08

**Asked and answered: leave it dead for now.** Offered the three readings —
cut the path, wire one caller, or leave it — Marc chose to leave it. So it
stays built and unreachable until Session A or the stranger test names a
moment that wants a receipt nobody has to put down. Nothing is owed and
nothing changed.

Left open rather than struck, because the question is deferred rather than
settled: the path is still dead weight if the answer is ever "no".

The original section follows.

Found 2026-09-02 walking the OPTIONAL fields (`IMPROVEMENTS.md` Batch 5), which
is the blind spot `CLAUDE.md`'s newest rule names and the same one `perkAt` hid
in.

A brief card is a receipt the player does not have to dismiss: it takes no
focus, any tap sends it away, and it goes on its own after 4200ms. All of it is
built and none of it is reachable — `.card-scrim.brief` and its `.card` rule in
`ui.css`, `BRIEF_MS` and the pointerdown dismissal in `ui/Card.tsx`,
`SaidCard`'s `brief` prop, and the live region `App` renders for it (which
therefore announces nothing, always). **No caller anywhere writes
`brief: true`.**

The docblock on `Said.brief` names `App`'s harvest branch as the writer, and
that is the branch which STOPPED writing it on 2026-08-30, when Marc asked for
a routine pop to be a line over the board rather than a card: _"i asked
previously to not pop as a card everytime, just show points in the bottom and
we can tap for details or tap out."_

**The question is yours, and it is one sentence:** is there any receipt this
game wants to show and not make the player put down? If no, the whole path is
dead weight and should be cut. If yes, it wants one caller. The pass fixed
what was wrong with the path — it announced from a live region inserted with
its own content, and it held a focusable button that the timer removed out from
under the focus — so whichever way this goes, it goes from a correct starting
point.

## 5d. ~~The French stat row does not fit~~ — ANSWERED 2026-09-08: six marks

**Marc chose all six as marks**, shown the three readings. The screen audit
went from 179 findings to **164, and from fifteen `clipped` to zero** — the
whole category was this one element in French. The glyphs are in
`theme/icons.ts` (a sigma, a compass, a tag, an hourglass beside the clover
and the hex), chosen against the twenty-three already in the set because six
of them are drawn side by side and a confusion at 16px would be permanent.

**What the row gave up, recorded because it is real:** a stat is the one
control on the board that EXPLAINS rather than acts, and a mark is not
self-describing on first sight. Two things stand against that and both were
already true — every stat carries `statLabel` as its accessible name, so a
screen reader still hears TUILES, and a tap still prints that stat's own
sentence. **Worth watching in Session A specifically**: whether a stranger
ever taps one.

The original section follows.

Found 2026-09-08 by re-running the export sweep, which turned up `STAT_ICON` in
`screens/Hud.tsx` — the table naming which stats are drawn as marks — declared,
exported and read by nothing, while the render hard-coded `id === 'luck'`. It
has its consumer now and it draws exactly what it drew before, because it says
exactly what that branch said. **The interesting half is why it only has one
entry.**

`DEFAULT_LOCALE` is `fr-CA`, so the French stat row is the row a player sees
unless they go and change it, and it is the one that does not fit. All fifteen
`clipped` findings in `audit-shots/report.md` are this one element in French:

| width | label    | lost |
| ----- | -------- | ---- |
| 320   | `TUILES` | 20px |
| 320   | `PORTÉE` | 18px |
| 390   | `PORTÉE` | 4px  |
| 390   | `TUILES` | 6px  |

English clips at neither width. 390 is an ordinary phone.

**This is argued, not overlooked.** `IMPROVEMENTS.md` B7.11 ruled the ellipsis
in deliberately — a measured 3px behind a `…` beats an unmeasured word running
into its neighbour — and `.stat-label` in `ui.css` carries the rest: the label
is the half that gives so the number survives, pinned in px so a bigger root
cannot spend the one budget already spent. Every one of those arguments is
about how to LOSE gracefully.

**A mark does not lose.** `luck` has never clipped, in any language, at any
width, because it is not a word. Five more entries in `STAT_ICON` would end
this finding rather than dress it — and the icons already exist, so it is
genuinely a five-line change.

It is not taken, because it is a look decision and this file's own §5b records
what happens when one is guessed at from a session that cannot see the phone.
Six glyphs where six labels are is a different HUD, and a stat is the one
control on the board that EXPLAINS rather than acts, so making it wordless
costs the thing it is for — a player who does not yet know the mark has lost
the row entirely, where a truncated `TUIL…` at least starts with the word.

**The question is one look at a phone, in French:** does the stat row read
better as six marks, as it is, or as some mix — `luck` and `cost` as marks,
say, and the three that fit as words? The table in `Hud.tsx` is where any
answer lands.

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
