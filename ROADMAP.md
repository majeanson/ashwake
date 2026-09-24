# ROADMAP.md — the six stages to v2.0

Set 2026-08-28 (`DECISIONS.md` D1). Each stage is one session or so and carries
one written question, answered in `LOG.md` after the work. Estimate: 8–13
sessions; S2 and S3 are the fat ones.

- [x] **S1 — the core is a package, and the rules did not move.** Lifted
      verbatim; 646 tests; `pnpm sim` byte-identical to `tiles@42d4da3`, diffed
      by CI. _Question: can the core be lifted without editing a rule? Yes —
      two findings, no rules (`LOG.md` Session 1)._
- [x] **S1b — the core speaks two languages, and English did not move.**
      : one typed catalogue per language, facts computed in view/meta and
      words looked up; the 15 pre-move snapshots byte-identical after the move;
      Québec French written under Marc's glossary (D4) and its typography held by
      a test; the DOM left the core. _Question: can the prose move without a
      single English string changing? Yes ( Session 2). Marc has not
      read the French yet._
- [x] **S2 — the board exists in 3D, and a tap means what it means today.**
      Shipped 2026-08-28 (`LOG.md` Session 3): instanced prisms, the stroke
      ladder as rings, labels in the self-hosted font, the leap, the camera
      contract, gestures, the WebGL smoke in CI. `?tilt=` is the open question,
      with two screenshots in `docs/shots/`. The plan for it, kept below:
      R3F `<Canvas frameloop="demand">`; one `InstancedMesh` per material
      (four terrains, stone, wall, empty, remembered); `layout.ts`'s `place()`
      positions instances (pointy-top axial, unchanged); raycast to the board
      plane → hex → `SELECT`/`PLACE` through the same reducer; ripe/legal/lit
      rings as emissive; the pop as the JUMP (`popLift` per theme); fog as
      darkness + lower height; beacons as point lights; the camera contract
      (fit, fly, zoom 1–4×, pinch, drag past 8px slop). Playwright WebGL smoke
      from day one. _Question: does a 3D board stay readable at 390×844 with
      the contrast budget applied to lit materials?_
- [x] **S2b — the board has depth, and no rule can see it.** Shipped
      2026-08-28 (`LOG.md` Session 4), on Marc's answer to S2's question: tilt
      35 as the default, a yaw beside it, and elevation with no rule moved.
      `Lean` in `camera.ts` (a fit that reserves sky for what stands on the far
      ground, a pan inverted through the same screen mapping, `eyeOf` as one
      expression for every angle); `board/relief.ts` stretches a hex's prism
      rather than lifting it, off at zero; labels turn back by the yaw;
      `shell/walk.ts` (`?place=n`) plays a fixed opening so eight shots are
      eight pictures of one board. _Question: can the board lean, turn and
      stand at different heights without any of it reaching a rule — and does a
      leaned board still fit, still drag with the thumb, and still take a tap
      on the hex under the finger? Yes; three of the four were arithmetic that
      had to move (`LOG.md` Session 4). The yaw and the relief numbers are
      Marc's, by looking._
- [x] **S2c — the board earns its third dimension.** Shipped 2026-08-29
      (`LOG.md` Session 5): the lighting is data, normalised so a lit hex top
      renders exactly the colour the direction authored; Ashwake 1's baker
      split into a pure plan in the core and a canvas in the app; the torch
      multiplies in display space; the contrast budget now grades the colours a
      hex ACTUALLY contains, and failed on three of four directions the first
      time it ran. Ashwake 1's terrain art ships behind `?art=1`. _Question: can
      the colour a hex renders in be computed by a pure function in the core,
      and does every direction still pass? Yes, once the samples split into
      where a label sits and where a mark can land — and the shaded-side margin
      is thin enough to be Marc's, by looking._
- [x] **S2d — the board moves, and things stand in the world.** Shipped
      2026-08-29 (`LOG.md` Sessions 5–6): the arcade pop and its cascade, drag
      momentum, beacons breathing, embers off spent ground, and a built prop
      standing on every destination with `LANDMARK_GLYPH` still the authority
      on meaning. _Question: does motion make the board easier to read, or only
      busier? Marc's, by looking — the dials are all live._
- [x] **S3 — the chrome, in React, bilingual from the first component.**
      Shipped 2026-08-29 (`LOG.md` Session 6): the whole first minute, over a
      shared system built before any screen. A run can be started, played,
      finished and started again. _Question: does the manual / card / term trio
      still say one sentence one way? Yes, by construction — they are one
      component over one `lessonDefine`, and `Prose` inks every string the
      chrome renders._ Original plan, kept: Components
      over `HudView`/`SpendView`/`toBoardView`/`LESSONS`: front door, HUD, one
      hand + one action bar, teaching cards with figures, the `?` manual, shop,
      end screen, settings. The DRY pass lives here: one `Panel`, one `Card`,
      one `TipRows`, one `Confirming` two-tap control, one `Door`. Testing
      Library over props; no id selectors; every label from , and SETTINGS
      gains LANGUE / LANGUAGE above APPEARANCE. _Question: does the manual / card /
      term trio still say one sentence one way? (`teaching.pin` snapshots are
      the pin.)_
- [x] **S4 — one page, many sessions, offline, shareable.** Shipped
      2026-08-29 (`LOG.md` Session 7), except the History router — see below.
      Store + session, keeper with `alive`/`dropped` guards, save/resume, three
      world slots, the daily (epoch 2026-08-25) as a PLACE rather than a fourth
      world (D5), `?seed=` links, PWA + stamped service worker, backup/restore
      as the v1 → v2 bridge, and `settle.ts` making a finished run COUNT. The
      rooms came back with it: shop, hall of fame, MORE, worlds, and the end
      screen's payout breakdown and arc. _Question: does the relic-farm class
      stay structurally impossible? Yes, and it grew a second case: a keeper
      now knows its PLACE, so a daily cannot write a world's memory either —
      the rule lives in the one thing that writes._ **Left:** the History-API
      router, which `NEXT.md` argues may not be wanted at all.
- [x] **S5 — the look. DONE: settlement is the direction.** Materials and
      lighting landed in S2c; the DIRECTION was chosen on 2026-08-29 (D7, `LOG.md`
      Session 10) — Marc, on seeing it drawn in its own figures: _"i want to go
      this way since its a strong theme and i feael like names of eahc color
      reveal what they do too."_ FARM · MARKET · QUARRY · ROADS, the names carrying
      the rules, shot into `docs/shots/s5-settlement*.png`. _Question: does it pass
      the budgets without relaxing one? **Yes** — all 152 palette assertions, with
      three colours moved and no threshold._

  **And the registry closed on 2026-09-03 (D12):** two directions, not four.
  `torchlit`, `torchlit-bright` and `placeholder` are deleted; `daylight` is
  reskinned onto settlement, so it is not a rival fiction but settlement's
  LIGHT FACE — same four names, same motif, same rules — handed automatically
  to a phone set to light or to high contrast (`pickForScheme`). There is no
  second choice to make, and the device makes the one that is left.

  **This line said "what is left is the choosing" until 2026-09-09**, four days
  after D12 closed it and eleven after D7 made it. It sent at least one session
  to tell Marc a settled question was still open, which is the exact hazard
  `NEXT.md` opens by warning about — **a stale open-list is worse than none.**

- [~] **S6 — the console, Session A on v2, then the stranger.** **The console
  is BUILT** (2026-09-08, `LOG.md` Session 61): `?playtest=1` rather than a
  `/playtest` route, because D9 ruled out a router and this is the `?ff=`
  class of surface — no row on anybody's screen, which matters most here,
  since the one person who must never find it is the stranger holding the
  phone. Three of Session C's four facts record themselves off the `act`
  seam with the elapsed time the paper form leaves blank; the fourth is the
  gate, and its "a first run does not count" rule lives in the model where
  it is tested. COPY SHEET puts the sheet on the clipboard in
  `PLAYTEST.md`'s own layout. Rehearsed rather than trusted — 19 unit tests
  and four in a browser, one placing a tile by TAP because `?place=n` walks
  the reducer and never travels `act`. _Question: can the sheet be a
  transcript rather than a memory? Yes for three facts of four, and the
  fourth needed a rule rather than an observation._ **What is left is the
  part no code can do:** ~~Session A re-run against the deployed v2, the
  fixes it names~~ — **clean on 2026-09-24**, and its six fixes landed the
  same day (`LOG.md` Session 115); the first minute is frozen from there.
  Then Session C.

## Deploy

A second assets-only Cloudflare Worker, `ashwake`, on **ashwake.marcportal.com**
during the build (same narrow token as Ashwake 1: Workers Scripts + Routes on
the zone; no KV/D1/R2). `verify-deploy` ported from Ashwake 1 when the first
deploy lands (S2). At the v2.0 tag, tiles.marcportal.com cuts over to this
worker; v1 stays reachable on its workers.dev host and by tag.

## v2.0 — the definition of done

- [ ] **Ashwake 2 is playable end to end on a phone**, with the same rules
      (the golden sim diff green) and its own look.
- [ ] **A stranger finished a run and chose to start another** — on v2
      (`DECISIONS.md` D1 ruling 3; Ashwake 1's D4).
- [ ] **Ashwake 1's D22 and D23 answered.**

## Parking lot

Everything in Ashwake 1's parking lot carries over unchanged (Tier-1 uniques,
sound's written question, a leaderboard, store wrappers, the waypoint-perk earn,
world mood, ground-feeds-draft, storage compaction).
