/**
 * The whole balance surface, in one file.
 *
 * If a number that affects balance appears under `src/engine/`, that is a bug —
 * the point is that the harness can sweep these without touching game logic.
 * Which is why `Tuning` is a TYPE with a default value rather than a frozen
 * import: a run carries its tuning in its state, so the harness can play the
 * same seed under twenty different economies, and a saved replay still knows
 * which economy it was recorded under.
 *
 * Every value here is a STARTING POINT, not a claim. Income per placement is
 * (pops per placement) x (tiles per pop), and pops-per-placement swings roughly
 * 0.3 to 1.0 on packing skill alone, so these cannot be settled on paper. See
 * DESIGN.md — the harness moves `costRisesEvery` and `worthPerExtraTile` until
 * competent play reaches map 6-8 and careless play dies on map 2.
 */

export type Tuning = {
  /**
   * Endless only: the points multiplier rises by 1 for every `distanceStep`
   * hexes a harvest happens from the origin. The continuous replacement for the
   * bounded game's map number — depth becomes distance, priced in placements,
   * because every hex of the journey out is a placement at ever-rising cost.
   */
  readonly distanceStep: number;

  /**
   * The distance multiplier's ceiling; 0 for no cap. Unlike the size bonus,
   * distance compounds every future harvest for the rest of the run, so
   * "go as far as the run allows, cash in once" is the same arithmetic that
   * `harvestSizeCap` was added to kill on the pocket-size axis (see there —
   * the mega-bank exploit the hard clock resurrected). Off by default until
   * the harness sweeps a value.
   */
  readonly distanceMultiplierCap: number;

  /**
   * Endless terrain (P2 of `ideas/endless-world.md`). All of it is a pure
   * function of the world seed, computed as ground is revealed — never stored,
   * never rolled. The bare skeleton zeroes all of these.
   *
   * `worldWalls` — fraction of revealed ground that is wall. Walls surround
   * (ripen things faster) but never match (pay less), and cannot be built on:
   * the trade every obstacle makes: cheaper to ripen against, worth nothing.
   *
   * Native fields: the plane is tiled into blocks of `fieldSize` hexes;
   * `fieldChance` of them are native to one colour. A tile placed on its own
   * native ground counts the ground as one extra match — placement context you
   * can read before you commit, and the first thing fog will be hiding.
   */
  readonly worldWalls: number;
  readonly fieldSize: number;
  readonly fieldChance: number;

  /**
   * Destinations (P3b of `ideas/endless-world.md`): landmarks seeded by the
   * same pure world hash, one per `destinationEvery`-hex block of the plane
   * (`destinationChance` of blocks hold one; 0 for either switches the system
   * off, which is the bare default). Reaching one — placing a tile against
   * it — claims it, once:
   *
   *   cache     — pays `cachePays` tiles on the spot. A lifeline out there.
   *   site      — pays `sitePays` × the distance multiplier at its hex, so a
   *               farther site is worth the longer walk, same as rule 6.
   *   territory — Marc's "key territories" (2026-08-13): claiming one turns
   *               the ground within `territoryRadius` into a native field of
   *               its colour. Conquest, paid in the field mechanic P2 built.
   */
  readonly destinationEvery: number;
  readonly destinationChance: number;
  readonly cachePays: number;
  readonly sitePays: number;
  readonly territoryRadius: number;

  /**
   * Quests (M1 of `ROADMAP.md`, Gate B's structural fix). Claiming a scoring
   * site opens a bounty: pop a pocket of `questNeed`+ within `questRadius` of
   * it AS POINTS, and that harvest pays `questBonus` times.
   *
   * Not a second income stream — a multiplier on the one channel, at a named
   * place, collectable only by pressing the points button. That is the whole
   * design intent: a human who takes tiles nine times in ten needs a moment
   * where points is obviously right, and this manufactures one per site.
   * `questNeed` 0 switches quests off (the bare default).
   */
  readonly questNeed: number;
  readonly questRadius: number;
  readonly questBonus: number;
  /**
   * How far past the built frontier a destination shows as a beacon.
   *
   * Halved 8 -> 4, 2026-09-03 (Marc, from a screenshot of a fresh run: "I
   * shouldn't be able to see that far with no tile put"). A WORLD'S richness
   * at a glance is mostly `remembered` ground from earlier runs layered on
   * top of this — a returning player only ever sees this exact "several
   * lights at reach 0" moment once, on their very first run. A DAILY has no
   * memory at all, so it showed the same wide live horizon fresh every single
   * day. The fix is here, not in the daily's own economy, because the
   * horizon was too generous for both — a world was simply hiding it behind
   * accumulated fog.
   */
  readonly beaconHorizon: number;

  /**
   * Gradual formulas (Marc, 2026-08-18: "gradual formulas instead of
   * constants"). Each turns a flat constant into a curve over distance from
   * home, so the world can be lean at the doorstep and rich in the deep — a
   * difficulty ramp that lives inside the run instead of only between runs.
   * All zeros = the constants stay flat, which is every earlier economy, and
   * what a save written before these existed decodes to.
   *
   * `cachePaysPerRing` — extra tiles a cache pays per distance ring (rule 6's
   * rings: floor(distance / distanceStep)). A cache met three rings out is
   * worth the walk; one beside home is a snack.
   *
   * `popTilesPerRing` — extra tiles a harvest pays per popped tile per ring
   * beyond the first, floored once per harvest. Survival income itself grows
   * with depth, so the lean early game is paid back by pushing outward.
   *
   * `destinationRampBlocks` — blocks of the plane over which destination
   * density climbs from nothing at home to the full `destinationChance`.
   * Near home the world is sparse; the horizon is where the lights are.
   */
  readonly cachePaysPerRing: number;
  readonly popTilesPerRing: number;
  readonly destinationRampBlocks: number;

  /**
   * The reward mix near home, before deep water tilts anything — cache,
   * site, territory; shrine is always the remainder, never a fourth scaled
   * number, so the three below stay float-drift-proof by summing to under 1
   * with room for it. Balance numbers, so they live here rather than as
   * bare literals beside the split that reads them (`world.ts`).
   */
  readonly cacheShareNear: number;
  readonly siteShareNear: number;
  readonly territoryShareNear: number;

  /**
   * Deep water (2026-08-18): the destination reward MIX tilts with distance,
   * not just its density. Near home the split is `cacheShareNear` /
   * `siteShareNear` / `territoryShareNear` above (40% cache, 35% site, 17%
   * territory, 8% shrine in the shipped economy) — because caches carry
   * survival and the near world has to stay a lifeline. Past
   * `deepWaterRampBlocks` blocks the cache share has fully tilted to
   * `cacheShareFar`, with site, territory and shrine THICKENING — each
   * keeping its own ratio to the other two, just scaled up to fill what
   * cache gave up. `deepWaterRampBlocks` 0 (the bare default, and every save
   * from before this dial existed) keeps the flat original split exactly —
   * guarded with `> 0` rather than reading `cacheShareFar` unconditionally,
   * so an old save's `undefined` cannot reach the arithmetic at all.
   */
  readonly deepWaterRampBlocks: number;
  readonly cacheShareFar: number;

  /**
   * Hidden finds (Marc, 2026-08-18, resolving `ideas/uniques.md`): a rare
   * landmark that grants an unowned PERK when growing ground reveals it. It
   * never beacons — no glow through the dark, no atlas entry, no hint. "Theyre
   * often hidden from plain sight, you need to stumble on it."
   *
   * Same pure-hash trick as destinations, on its own salts and its own block
   * scale, so switching finds on cannot move a single existing destination.
   * One find per `findEvery`-hex block, `findChance` of blocks holding one;
   * 0 for either switches the system off (the bare default). Where a find and
   * a destination would share a hex, the destination wins and the find does
   * not exist there — deterministic precedence, not a coin flip.
   *
   * `findSense` is the one exception to the darkness, and it is SOLD, never
   * given: hexes of range at which an unrevealed find shimmers when your
   * ground grows near. 0 — pure surprise — everywhere except under the shop's
   * KEEN NOSE upgrade, which raises it via `applyProgress`. It is capped well
   * under `beaconHorizon` so a shimmer can never become a beacon.
   */
  readonly findEvery: number;
  readonly findChance: number;
  readonly findSense: number;

  /**
   * Perk dials (2026-08-18). All zero here and in every shipped tuning —
   * these are set by `applyProgress` ONLY while the perk is equipped, the
   * same contract as `rootboundOnly` below. Old saves decode them as
   * `undefined`, so every reader guards with `> 0`.
   *
   * `stoneDiscount` — STONEWALKER: tiles off a placement's cost when at least
   * one neighbour of the placement hex is stone, floored at a free placement.
   * Hug your own wake to stay solvent, in tension with fleeing it for fresh
   * matches.
   *
   * `wallBuildCostMult` — WALLBREAKER: 0 keeps rule 7 (walls cannot be built
   * on); above 0, placing on a wall REPLACES it with the tile at that
   * multiple of the normal cost. Straight lines through terrain that used to
   * divert you, and an answer to the `walled` death.
   *
   * OPEN HAND needs no dial of its own — it is `draftWidth` 5 with
   * `holdSlots` 0, both of which already exist.
   */
  readonly stoneDiscount: number;
  readonly wallBuildCostMult: number;

  /**
   * Rarity on the draft (P3b's second half, shaped by Marc 2026-08-13): every
   * drawn tile rolls common / magic / unique on its own stream, so the bounded
   * game's sequences never move. Magic is WILD — it matches every neighbouring
   * tile. Unique is wild and HEAVY — its matches count double, both ways.
   *
   * Luck is the count of tiles popped in TILES-harvests, capped at `luckCap`;
   * each point adds `luckMagicPerPop` / `luckUniquePerPop` to the odds. Cashing
   * big pockets as tiles is what raises your odds — survival finally pays in
   * excitement, and it couples loot to the same timing decision points have.
   * All zeros = the system does not exist, which is the bare default.
   */
  readonly magicChance: number;
  readonly uniqueChance: number;
  readonly luckMagicPerPop: number;
  readonly luckUniquePerPop: number;
  readonly luckCap: number;

  /**
   * Colour personalities (Session 8, Marc's "why would I take THIS tile").
   * Every colour earns its own placement logic, all through the one worth
   * channel so the preview numbers stay the whole truth:
   *
   *   green  — crowds:  +`greenCrowdBonus` worth per green neighbour past the
   *            first. Mono-clusters snowball.
   *   yellow — company: +`yellowCompanyBonus` worth per DIFFERENT colour
   *            among its neighbours. The glue tile in mixed pockets.
   *   red    — ash:     stone neighbours count as matches. Your spent wake
   *            becomes red's soil, so red builds where nothing else pays.
   *   blue   — tide:    +1 worth per `blueTideEvery` hexes from home. The
   *            colour you carry outward.
   *
   * Zeros (and false) switch the personalities off — the bare default.
   */
  readonly greenCrowdBonus: number;
  readonly yellowCompanyBonus: number;
  readonly redAshMatches: boolean;
  readonly blueTideEvery: number;

  /**
   * Worth per stone/wall neighbour under ash — the magnitude green, yellow
   * and blue each already had a number for and red never did; `redAshMatches`
   * was a toggle, not a dial. Doubled for a unique tile, same as an ordinary
   * match. Default 1 reproduces every red behaviour before this field
   * existed.
   */
  readonly redAshBonus: number;

  /**
   * Tide's ceiling, in tide-steps; 0 for no cap. Unique among the four
   * personalities: green/yellow/red pay for local geometry, capped by how
   * many neighbours a hex has — six, always. Tide pays for DISTANCE, which
   * has no such ceiling, so a blue tile far from home outgrows every other
   * colour's power by construction, then gets multiplied again by the SAME
   * `distanceMultiplierCap` every colour in the harvest shares. Same fix as
   * that dial, one level lower: cap the ingredient, not just the recipe.
   */
  readonly blueTideCap: number;

  /**
   * Power experiments from the first colour-balance report (LOG addendum 5):
   * red was an era colour competent play barely placed before stone existed,
   * and yellow was the most-placed, least-valuable tile on the board.
   *
   * `redAshWalls` — ash counts WALLS as well as stone, giving red a little
   * soil from the first placement instead of none until the first harvest.
   * `yellowCompanyAll` — company counts every differently-coloured NEIGHBOUR
   * rather than every distinct colour, lifting its cap from 3 to 6 so a
   * well-surrounded yellow can actually compete with a well-crowded green.
   */
  readonly redAshWalls: boolean;
  readonly yellowCompanyAll: boolean;

  /**
   * Biomes: broad regions of the plane, `biomeEvery` hexes to a block,
   * `biomeChance` of blocks native to one colour. Inside a biome every field
   * takes the biome's colour, so regions read as one colour's country and
   * chasing a colour means walking to it. 0 switches the layer off.
   */
  readonly biomeEvery: number;
  readonly biomeChance: number;

  /**
   * The shape of the land (2026-08-16). One height per hex, hashed from the
   * world seed like every other terrain layer, rounded into
   * `elevationBands` steps so the ground reads as contours rather than as a
   * gradient. `elevationEvery` is the coarse block size in hexes; 0 flattens
   * the world.
   *
   * Cosmetic by decision, not by accident: Marc chose purely cosmetic when
   * asked, so nothing in the rules may ever read these. They live here rather
   * than in the theme because the shape of the land belongs to the WORLD — two
   * art directions must not disagree about where the hills are.
   */
  readonly elevationEvery: number;
  readonly elevationBands: number;

  /**
   * Hold slots: pockets that keep a drafted tile for later. One tap swaps the
   * selected card with the stash, so every draft becomes "use it or save it".
   * 0 — no stash, the bare default.
   */
  readonly holdSlots: number;

  /**
   * Territory perks (P4b, M3 of `ROADMAP.md`): every territory this world
   * holds adds `territoryTiles` to the next run's purse, up to
   * `territoryTilesCap` in total.
   *
   * This is the roguelite answer Marc asked for by name, aimed at the thing
   * his first debrief actually described — "I never felt SAFE enough to take
   * points". A softer start is safety that compounds with exploration rather
   * than with luck, and it is bounded so a well-held world cannot buy its way
   * out of the clock. 0 switches it off.
   */
  readonly territoryTiles: number;
  readonly territoryTilesCap: number;

  /**
   * The third payout (declared in Session 0 as the `pop.treasure` flag,
   * wired in M3, a shrine unlock since the registry was cleaned): a harvest
   * of `treasureNeed`+ may be taken as TREASURE instead —
   * neither tiles nor points, but a guaranteed rare tile straight into the
   * stash, magic below `treasureUnique` tiles and unique at or above it.
   *
   * It earns its place by being a third answer to the same question rather
   * than a bonus on top: taking it forfeits both the tiles and the points, so
   * it is a real cost every time, and it is the only way to CHOOSE a rare
   * tile rather than wait for one. 0 leaves the option unbuilt, which is
   * what every pre-M3 build had.
   */
  readonly treasureNeed: number;
  readonly treasureUnique: number;

  readonly startingTiles: number;

  /**
   * cost = baseCost + floor(max(0, placements - costGrace) / costRisesEvery),
   * all run, never reset.
   *
   * `costGrace` is the KNEE, and it exists because of what M1's
   * instrumentation found (2026-08-15). With a curve that rises from the
   * first placement, income and cost converge across the whole back half of a
   * run — and at the margin a harvest MUST be taken as tiles, because that
   * convergence is what "the run is ending" means. Measured: 94-98% tiles for
   * every policy, including one that prices both sides and takes the better.
   * No amount of content fixes that; the shape of the curve does.
   *
   * A flat grace, then a sharper rise, gives a run two eras: a long one where
   * survival is handled and a harvest is a scoring DECISION, and a short
   * desperate one where it is not. That is also the arc Gate D asks for.
   */
  readonly baseCost: number;
  readonly costGrace: number;
  readonly costRisesEvery: number;

  /**
   * The hard clock: placements a run gets, or 0 for none — the shipped game: the cost curve is its clock.
   *
   * The deepest thing M1's instrumentation found. An economy whose ONLY end
   * is bankruptcy always converges — income meets cost, that convergence IS
   * the ending, and so the last harvests of every run must be taken as tiles.
   * Measured at 94-98% tiles for every policy, including one that prices both
   * sides. No content and no curve shape fixes it, because the fixed point is
   * the ending itself.
   *
   * A hard budget breaks the fixed point: tiles you never get to spend are
   * worth nothing, so a run with runway to spare should cash pockets as
   * POINTS — and the closer the end, the more obviously so. Survival stops
   * being infinitely valuable, which is precisely what made the choice fake.
   *
   * It is also the constraint Marc asked for in as many words ("I'd like the
   * time to be constrained yet points become more important"), and it makes
   * the run's length a promise the game can print rather than a mystery.
   */
  readonly runLength: number;

  /**
   * Tiles returned per popped tile: tilesPerPop + floor(worth / worthPerExtraTile).
   * Linear in harvest size — deliberately, so survival cannot explode the way
   * points can. Cost climbs forever while this is capped by geometry at one pop
   * per placement, which is what guarantees the curves cross.
   */
  readonly tilesPerPop: number;
  readonly worthPerExtraTile: number;

  /**
   * How much a BIGGER harvest is worth per tile in it.
   *
   *   points = sumWorth * (1 + harvestSizeBonus * (count - 1)) * mapNumber
   *
   * This is the dial that decides whether harvest timing is a real decision,
   * and it runs continuously between two fake games:
   *
   *   0 — points are linear in harvest size. Splitting a harvest costs nothing,
   *       so timing is free and rule 5 is a formality.
   *   1 — points are quadratic (the original `sumWorth * count`). Banking every
   *       pop until the map is finished dominates by a factor of forty, which
   *       the harness measured, so rule 5 is a formality the other way.
   *
   * Somewhere between the two, the fact that stone accelerates ripening should
   * make an early harvest pay for itself. Finding that number is what the
   * harness is for.
   */
  readonly harvestSizeBonus: number;

  /**
   * Pocket size past which the size bonus stops growing; 0 for no cap.
   *
   * The quadratic is what makes a big pocket worth more than two small ones,
   * and that is the tension rule 5 lives on. Unbounded, though, it means ONE
   * pocket grown as large as the run allows beats every other line — and once
   * the run has a hard clock (`runLength`), timing that single cash-in stops
   * being a gamble and becomes arithmetic. Measured: with the clock and no
   * cap, the bank-everything line scored 150k against the next line's 63k,
   * with its risk removed.
   *
   * The cap keeps "bigger is better" and removes "biggest is everything":
   * past it, a pocket still pays more worth but no more multiplier, so
   * cashing well and often competes with hoarding. It is the smallest change
   * that restores the cliff the clock flattened.
   */
  readonly harvestSizeCap: number;

  /**
   * A second, ADDITIVE reward on `sumWorth` — matches, colour power, rarity
   * and native ground, together `PointSource`'s "identity" — paid straight,
   * with none of `harvestSizeBonus`, `distanceMultiplierCap` or a bounty
   * multiplying it. `points` becomes:
   *
   *   sumWorth * sizeBonus * distanceMult * bounty  +  sumWorth * identityBonusRate
   *
   * Session 48 (2026-09-04): identity's SHARE of the score used to be
   * `1 / (sizeBonus * distanceMult * bounty)` by construction, because it was
   * the only base and every multiplier applied to it — so shrinking that
   * share needed shrinking the multipliers, the same axis `sim.test.ts`'s
   * "rewards patience" gate needs LARGE (tried, broke the gate). Adding a
   * second, flat term keyed to the SAME `sumWorth` raises identity's absolute
   * and relative weight without touching the multiplied term at all: a
   * harvest that already had good worth (matching well, on native ground,
   * with a rarity) is paid for it twice — once amplified by how it was
   * cashed, once not — while a harvest that leaned entirely on size or
   * distance for a mediocre pocket gets nothing extra. 0 is a true no-op:
   * the added term is exactly zero, so every pre-existing profile,
   * `sim.golden.txt` row and test is unaffected until a direction sets it.
   */
  readonly identityBonusRate: number;

  /**
   * The jackpot: an extra flat reward on the worth of every MAGIC or UNIQUE
   * tile in a cashed pocket — `rareWorth * rareBonusRate`, added beside
   * `identityBonusRate`'s term, so neither `sizeBonus` nor `distanceMult`
   * touch it (a bounty still multiplies the whole catch).
   *
   * Session 51 (2026-09-04), Marc: luck and magic/unique should read as
   * "gambling-style odds". The odds themselves (`magicChance`,
   * `uniqueChance`) stay rare on purpose — a jackpot is rare-and-big, not
   * frequent-and-small — and the matching rule ("UNIQUE counts DOUBLE, both
   * ways") is untouched, because it is written into both catalogues. What
   * changes is the PAYOUT when one lands: a pocket carrying a rare spikes on
   * the receipt in a way the doubling alone (+1 per match, on a 2.5%/0.5%
   * draw) never did. 0 is a byte-for-byte no-op.
   */
  readonly rareBonusRate: number;

  /**
   * The tiles-only run (Marc's pivot, 2026-08-15). One currency to live on,
   * and points as the SCORE rather than a payout you must trade your life
   * for: "start with 30 tiles, get tiles along the way if you're good or
   * lucky, die when you run dry, and go farther over time."
   *
   * `singlePayout` — a pop pays TILES, always, with no choice to make. This
   * is Gate B's own prescribed fallback ("fix it, or cut it to a single
   * automatic payout"), reached after the gate failed twice in a row for
   * opposite reasons: tiles dominating early, then tiles going SPARE and the
   * button dying for the back half of a run.
   *
   * `pointsPerPop` — what a pop adds to the score automatically, as a
   * fraction of what the old points payout would have been. Score becomes
   * something you accumulate by playing well rather than something you buy
   * with survival.
   *
   * `burnLuck` — a pop can instead be BURNED: no tiles, no points, but
   * `burnLuck` luck per tile in it, which is Marc's "sacrifice the run for
   * better tiles". The sacrifice is real because tiles are now the only
   * thing keeping you alive.
   *
   * `endReachBonus` / `endClaimBonus` — what the run is worth for having
   * gone far and reached things, added once when it ends. Points as the
   * final state.
   */
  /**
   * What a pop does to your NEXT draws (2026-08-15, Marc: "odds for better
   * colours depending? or magic/unique" + "early pops pay luck").
   *
   * This is the answer to "why would you ever pop early": popping is not only
   * income, it STEERS the draft. Every pop biases the next `colourBiasDraws`
   * draws toward the colour it was made of, and luck — the rare-tile odds —
   * arrives mostly as a FLAT `luckPerPop` rather than per tile, so many small
   * pops out-earn one monster in luck while the monster out-earns them in
   * tiles and score. Two strategies, both live, and which is right depends on
   * what you need right now: the situational timing rule 5 always wanted.
   */
  readonly luckPerPop: number;
  readonly luckPerTile: number;
  readonly colourBiasDraws: number;
  readonly colourBiasWeight: number;

  /**
   * What luck is SPENT on (2026-08-15, Marc played and reported the flaw:
   * "popping often gave more luck than burning anyway", and the harness
   * confirmed worse — luck hit `luckCap` about fifteen pops into a
   * hundred-and-forty-pop run, so for nine tenths of the game popping early
   * bought nothing at all).
   *
   * The fix is that luck stops being a bar that fills and becomes a purse.
   * Where these are nonzero, luck no longer raises the odds passively at all
   * (`luckMagicPerPop` and friends go to zero and permanent odds are bought
   * with POINTS between runs instead) — it is a currency with three prices:
   *
   *   reroll — a fresh hand. The cheap, constant one.
   *   steer  — name a colour: it runs hot for `colourBiasDraws` draws AND
   *            your hand is redrawn under it immediately, so it is "buy a
   *            hand of this colour" rather than a bet on later.
   *   forge  — turn the selected card unique. The expensive one, and the
   *            only deterministic source of a rare.
   *
   * One number doing one job. Zeros = no shop, which is every other game.
   */
  /**
   * Hide the score while the run is alive (Marc, 2026-08-15: he never once
   * thought about points mid-run, reasoning that going further would earn
   * them anyway — which is correct, so the number was furniture). Points
   * become purely the between-runs payout, revealed on the end screen, and
   * the HUD slot they held goes to LUCK, which is now the live currency.
   */
  /**
   * RELICS — the between-runs currency (Marc, 2026-08-15: "a new currency so
   * you need to decide vs a good point game vs advancing roguelite").
   *
   * Deliberately NOT points. Points are the score you chase; relics are what
   * buys permanent upgrades, and the two compete for the same pockets, so
   * every ripe pocket asks whether this run is for the record book or for the
   * next run. Three sources, all of them chosen by Marc:
   *
   *   `burnRelics` — per tile in a pocket you sacrifice. No tiles and no
   *   score, which is what makes it a decision rather than a bonus.
   *   `claimRelics` — per landmark reached for the first time. Exploring pays
   *   the meta without asking you to give anything up.
   *   `luckToRelics` — the fraction of UNSPENT luck banked when the run ends,
   *   so hoarding the purse is a real alternative to spending it.
   *
   * Zeros = no meta economy, which is every game but the tiles-only one.
   */
  /**
   * PERKS (Marc chose two of ten in the brainstorm, and parked the four big
   * rule-breakers as "not convinced" — they stay in ideas/uniques.md,
   * unbuilt). This line used to read "bought with relics and carried into
   * every world"; both halves have since been ruled away — FOUND, never
   * bought (2026-08-18), and per-world since 2026-08-26, which is why the
   * shelf lives on `WorldMemory` and not in `Progress`. The DIALS below are
   * unaffected: a perk has always worked by zeroing or moving a number
   * here, whoever is holding it.
   *
   * ROOTBOUND (`rootboundOnly` plus the three grip dials below) — native
   * ground pays MORE and off-native ground pays less, and how much of each
   * rides your luck: it starts at x1.35 / x0.5 and reaches x2 / x0 as the
   * purse fills. Not a bonus: a rewrite of where you are allowed to build
   * well, which makes reading the terrain before placing the whole game for
   * that run. Repriced 2026-08-27 — see `PERK_DIALS` for the why.
   *
   * SECOND WIND (`secondWindTiles`, `secondWindChance`) — the first time the
   * run would die broke, a coin is flipped: on `secondWindChance` you refill
   * to `secondWindTiles` and carry on, otherwise you die anyway. Marc
   * amended the guaranteed version to this himself, and the amendment is
   * what makes it interesting — a floor tells you how much risk is correct,
   * a coin flip only tells you whether you dared.
   *
   * Zeros and false = the perk is not owned, which is where every run starts.
   */
  readonly rootboundOnly: boolean;
  /**
   * ROOTBOUND's grip, at empty luck and at full (2026-08-27). Set by
   * `applyProgress` only while the perk is worn, like every dial above.
   * Zero — or `undefined`, which is what a save written before today
   * decodes to — means "the grip this perk shipped with", so an old run
   * reloads as the flat double-or-nothing it was played as rather than
   * silently scoring everything at zero. See `rootboundGrip`.
   */
  readonly rootboundNative: number;
  readonly rootboundNativeMax: number;
  readonly rootboundStray: number;
  readonly secondWindTiles: number;
  readonly secondWindChance: number;

  readonly burnRelics: number;
  readonly claimRelics: number;
  readonly luckToRelics: number;

  readonly hidePoints: boolean;

  readonly luckRerollCost: number;
  readonly luckSteerCost: number;
  readonly luckForgeCost: number;

  /**
   * TITHE (2026-08-18): a fourth luck price, and the only one that does not
   * buy the draft. Converts the WHOLE purse to relics, on the spot, at
   * `titheRate` — a multiple of what dying with luck still in the purse
   * pays (`luckToRelics`), so tithing is a live alternative to hoarding
   * rather than a strictly worse version of the same thing. The RATIO is
   * the decision; the absolute rates are the relic economy's faucet and
   * moved together in the 2026-08-20 tightening.
   *
   * `titheMin` is the floor: below it, tithing would convert a few luck into
   * a fraction of a relic, which is a trap dressed as an option rather than
   * a real one, so the row simply refuses. Both 0 in the bare skeleton and
   * every old save — the same "the whole cluster is gated by one dial" shape
   * `stoneDiscount`/`wallBuildCostMult` already keep.
   */
  readonly titheRate: number;
  readonly titheMin: number;

  readonly singlePayout: boolean;
  /**
   * Every shrine on the plane reveals as a cache or a site instead (Marc,
   * Day 2 of launch week: 'in dailies, shrines have no meaning') — a world
   * with no unlock ledger has no use for a door to one. The daily flips
   * this at the edge (`shell/economy.ts`); home worlds and shared replays keep
   * their shrines. Applied at the bottom of `blockDestination`, which is the
   * one place BOTH generators come through, so every surface agrees — it said
   * `destinationAt` here until 2026-09-02 and the beacons never came through
   * that at all (see `reborn`).
   */
  readonly shrinesReborn: boolean;
  readonly pointsPerPop: number;
  readonly burnLuck: number;
  readonly endReachBonus: number;
  readonly endClaimBonus: number;

  /** Draft width. Three is the base game; more is an unlock. */
  readonly draftWidth: number;

  /**
   * Whether a ripe tile still counts as a matching neighbour.
   *
   * This is the dial against DESIGN.md's "what is fragile". Points scale with
   * the square of harvest size, so banking every pop until the map is finished
   * looks strictly better and the timing decision may be fake. Turning this OFF
   * makes banking cost you worth: a tile sitting ripe stops feeding its
   * neighbours' scores, so leaving it there has a price.
   *
   * Kept ON by default so the harness measures the honest, unfixed game first.
   */
  readonly ripeTilesMatch: boolean;
};

/**
 * The zeroed skeleton: every system off, every personality flat.
 *
 * NOT a playable economy and never shipped — it is the baseline the one
 * economy is layered on, and the fixture every rule test isolates against.
 * A test that wants to prove "green crowds" has to start somewhere where
 * green does not crowd, and building that by hand in nine files is how the
 * fixtures drift apart.
 */
export const BARE_TUNING: Tuning = {
  distanceStep: 4,
  distanceMultiplierCap: 0,

  worldWalls: 0.06,
  fieldSize: 4,
  fieldChance: 0.55,

  // Off in the bare skeleton — the shipped tuning below switches them on and
  // the harness sweeps them.
  destinationEvery: 0,
  destinationChance: 0,
  cachePays: 12,
  sitePays: 25,
  territoryRadius: 2,
  beaconHorizon: 4,

  cachePaysPerRing: 0,
  popTilesPerRing: 0,
  destinationRampBlocks: 0,
  cacheShareNear: 0,
  siteShareNear: 0,
  territoryShareNear: 0,
  deepWaterRampBlocks: 0,
  cacheShareFar: 0,

  findEvery: 0,
  findChance: 0,
  findSense: 0,

  stoneDiscount: 0,
  wallBuildCostMult: 0,

  questNeed: 0,
  questRadius: 6,
  questBonus: 3,

  magicChance: 0,
  uniqueChance: 0,
  luckMagicPerPop: 0,
  luckUniquePerPop: 0,
  luckCap: 150,

  greenCrowdBonus: 0,
  yellowCompanyBonus: 0,
  redAshMatches: false,
  redAshBonus: 1,
  blueTideEvery: 0,
  blueTideCap: 0,
  redAshWalls: false,
  yellowCompanyAll: false,

  biomeEvery: 0,
  biomeChance: 0,
  elevationEvery: 0,
  elevationBands: 0,

  holdSlots: 0,

  territoryTiles: 0,
  territoryTilesCap: 0,

  treasureNeed: 0,
  treasureUnique: 0,

  // 40/100 let the first human session bank 134 tiles without ever feeling
  // the curve (2026-08-04). Swept to 30/70: random-legal dies on map 1,
  // survivor caps ~325 placements, and the endless timing optimum moves from
  // a 40-pocket to a 15-pocket — closer, which is more pressure sooner. The
  // "map 6-8 for competent play" depth target is still unmet (farm reaches 4)
  // and stays an open tuning job; these numbers fix the FELT problem first.
  startingTiles: 30,

  baseCost: 1,
  // The bare skeleton keeps the original straight line — the curve the
  // earliest Gate C evidence was gathered on.
  costGrace: 0,
  costRisesEvery: 70,
  runLength: 0,

  tilesPerPop: 1,
  worthPerExtraTile: 2,

  harvestSizeBonus: 1,
  harvestSizeCap: 0,
  identityBonusRate: 0,
  rareBonusRate: 0,

  luckPerPop: 0,
  luckPerTile: 1,
  rootboundOnly: false,
  rootboundNative: 0,
  rootboundNativeMax: 0,
  rootboundStray: 0,
  secondWindTiles: 0,
  secondWindChance: 0,
  burnRelics: 0,
  claimRelics: 0,
  luckToRelics: 0,
  hidePoints: false,
  luckRerollCost: 0,
  luckSteerCost: 0,
  luckForgeCost: 0,
  titheRate: 0,
  titheMin: 0,
  colourBiasDraws: 0,
  colourBiasWeight: 0,

  singlePayout: false,
  shrinesReborn: false,
  pointsPerPop: 0,
  burnLuck: 0,
  endReachBonus: 0,
  endClaimBonus: 0,

  draftWidth: 3,

  ripeTilesMatch: true,
};

/**
 * The endless world's economy: the shipped tuning with the world swapped and
 * the plane's own systems switched on. One object so the UI flag, the harness
 * and the tests all mean the same thing by "endless". Shared balance numbers
 * stay identical on purpose — the worlds differ by structure, and a number
 * that must differ earns its own entry here.
 *
 * The destination and rarity numbers are FIRST VALUES, not claims: swept once
 * for "nothing stalls, nothing explodes" (Session 6) and awaiting a human.
 */
const PLANE: Tuning = {
  ...BARE_TUNING,

  // 2026-08-14, Marc: "time constrained, yet points become more important."
  // Swept at 40 seeds. The cost curve tightens 70 -> 50: the longest possible
  // run (pure survival stalling) drops 523 -> ~337 placements — roughly a
  // 15-20 minute ceiling at a human pace — while the bank-40 optimum and the
  // bank-80 cliff survive intact. The multiplier steps every 3 hexes instead
  // of 4: every scoring line gains ~40% points in the SAME number of
  // placements (bank15 5,034 -> 7,112 · seeker 3,019 -> 4,320), so a minute
  // spent scoring is worth more and a minute spent stalling still pays ~0.
  // (The bounded game kept its own 70/4 until it was deleted, 2026-08-16.)
  // 2026-08-15 (M1): the knee. See `costGrace` — a straight curve made every
  // late harvest a forced tiles-harvest and Gate B unpassable at any content
  // setting. Swept in Session 11: grace 120 placements at cost 1, then +1
  // every 25. Clock preserved, choice restored.
  costGrace: 120,
  costRisesEvery: 25,
  distanceStep: 3,

  // The hard clock, and the three numbers M1 moved with it (Session 11).
  // Together they are one change, not four: a run is a fixed expedition of
  // 260 placements (~15 minutes), survival is funded mostly by CACHES rather
  // than by emergency harvests, and the size bonus stops paying past 20 so
  // hoarding one monster pocket cannot out-score cashing well and often.
  // Measured effect on Gate B: the tiles share of harvests fell from 94-98%
  // (every policy, unfixable by content) to 59-63% for lines that harvest as
  // they go. See LOG.md, Session 11.
  runLength: 260,
  harvestSizeCap: 20,

  // Destinations went from a landmark you might meet to the plane's SURVIVAL
  // ENGINE (Session 11): one per ~6-hex block, a cache paying 40 tiles. That
  // is the change that lets a harvest be a scoring decision — with survival
  // funded by walking, the tiles button stops being the only safe answer.
  // The block around home is still kept empty, so the first glow is a journey.
  destinationEvery: 6,
  destinationChance: 0.7,
  cachePays: 40,

  // A pocket of 8 is a real but reachable ask — bank15's line clears it
  // routinely and bank3's never does, so the bounty asks the player to grow
  // something rather than cash reflexively. ×3 is loud enough to be worth
  // changing your mind for; swept in Session 11.
  questNeed: 8,

  // Halved 2026-08-19 (Marc, after three runs with the luck shrine and one
  // KEENER EYE level: "magic 12% and unique 2.5% feels like a lot — tone down
  // the initial values"; his pick on the option set was halve-the-base). A
  // rare tile should be an event, and the shrine's ×2 and the shop's
  // +2%/+0.5% a level only feel like growth if the floor is low — his own
  // setup now reads 7% / 1.5% instead of 12% / 2.5%.
  magicChance: 0.025,
  uniqueChance: 0.005,
  luckMagicPerPop: 0.0008,
  luckUniquePerPop: 0.0002,

  // The personalities, at their first values: every bonus worth exactly one
  // ordinary match, so no colour's power outranks plain good packing.
  greenCrowdBonus: 1,
  yellowCompanyBonus: 1,
  redAshMatches: true,
  blueTideEvery: 6,

  // 2026-08-15, from the colour-balance report (LOG addendum 5) and measured
  // before shipping: walls give red soil before the first harvest (placed
  // +43%, worth share 13% → 16-18%, still the late-game riser), and counting
  // every differently-coloured neighbour lifts yellow from worst-per-tile to
  // the middle (5.70 → 6.23 avg). Per-tile spread across the four colours
  // halved; every power now earns 25-31% of its colour's worth; the timing
  // optimum, cliff, clock and seeker all held at 40 seeds.
  redAshWalls: true,
  yellowCompanyAll: true,

  // Biomes twice the size of destination blocks: a country per two beacons,
  // so walking somewhere changes what the ground grows.
  biomeEvery: 24,
  biomeChance: 0.65,
  // Blocks of 9 hexes across five bands: big enough that a slope takes a few
  // placements to climb, banded enough that two neighbours can visibly differ.
  elevationEvery: 9,
  elevationBands: 5,

  holdSlots: 1,

  // Six tiles a territory, capped at 24 — four territories' worth. That is
  // about a fifth of the starting purse per territory and never more than
  // four-fifths of it in total: felt on the first placements of a run,
  // powerless to change how it ends. Swept in Session 13 against runs 0-8 of
  // a world; the clock and the optimum are unmoved.
  territoryTiles: 6,
  territoryTilesCap: 24,

  // A treasure needs a pocket of 10 — bigger than the bounty's 8, so the two
  // goals pull in the same direction without collapsing into one — and pays
  // unique at 20, the size cap, where points are at their best. Choosing
  // treasure there is giving up the best points harvest in the game for a
  // tile, which is exactly the weight this option should carry.
  treasureNeed: 10,
  treasureUnique: 20,
};

/** The four tile colours. Named for what they are — art direction is undecided. */
export const COLOURS = ['green', 'yellow', 'red', 'blue'] as const;
export type Colour = (typeof COLOURS)[number];

/**
 * The three rarities, and the seven ways a point can be earned.
 *
 * Both lived in `engine/state.ts` until 2026-08-29 and both are content: the
 * dials above already argue about magic and unique by name, and the seven
 * sources are the names of the scoring rules rather than of any state. They
 * moved so `text/` can NAME them — the catalogue may read `content/` and not
 * the engine, and Ashwake 1's end screen wrote all seven straight into the
 * screen in English for want of exactly this. `engine/state.ts` re-exports
 * both, so nothing that imported them from there had to change.
 */
export const RARITIES = ['common', 'magic', 'unique'] as const;
export type Rarity = (typeof RARITIES)[number];

/**
 *   matches   neighbouring tiles of the same colour
 *   power     what the colour's own power added
 *   rare      what magic and unique added over common
 *   native    the tile standing on its own colour's ground
 *   pocket    what harvesting many at once multiplied it by
 *   distance  what cashing it far from home multiplied it by
 *   bounty    what a collected bounty multiplied it by
 */
export const POINT_SOURCES = [
  'matches',
  'power',
  'rare',
  'native',
  'pocket',
  'distance',
  'bounty',
] as const;
export type PointSource = (typeof POINT_SOURCES)[number];

/** Uniform for now. A weighted table is where biome character will come from. */
export const COLOUR_WEIGHTS: readonly (readonly [Colour, number])[] = COLOURS.map((c) => [c, 1]);

/**
 * The tiles-only run — Marc's pivot, 2026-08-15, behind `run.tilesonly`.
 *
 * "Start with 30 tiles, get tiles along the way if you're good or lucky,
 * die when you run dry, and go farther over time." One currency to live on,
 * points as the score rather than a payout, and the roguelite carrying the
 * reach across runs.
 *
 * What changes from the endless economy, and why:
 *
 * - `singlePayout` — a pop pays tiles, always. Gate B failed twice for
 *   opposite reasons (tiles dominating, then tiles going spare); this is the
 *   gate's own written fallback rather than a third attempt to balance it.
 * - `runLength: 0` — no clock. Marc: no infinite runs, but the ending should
 *   be running DRY, so a good or lucky run genuinely goes farther. The cost
 *   curve is what guarantees it ends: income is capped by geometry at about
 *   one pop per placement while cost climbs forever.
 * - `costGrace: 0` and a steeper curve — with no clock, the curve IS the
 *   clock, so it starts working immediately rather than after 120 free
 *   placements.
 * - `cachePays` down to 26 — caches still fund the expedition, but a purse
 *   that outgrows what the run can spend was the exact state Marc hit at 202
 *   tiles, and without a clock the only cure is charging more for a
 *   placement than a cache hands over.
 * - `pointsPerPop`, `endReachBonus`, `endClaimBonus` — score from playing
 *   (a fraction of the old points formula), from sites and bounties as
 *   before, and from the expedition itself when it ends.
 * - `burnLuck: 3` — a burned pocket pays three luck a tile instead of its
 *   tiles: sacrifice the run to draw better.
 */
export const TUNING: Tuning = {
  ...PLANE,

  // Distance was paying 72% of a live player's lifetime points (a lifetime
  // stats screen, Marc, 2026-09-03) against 2% for matches/power/rare/native
  // combined — the same "one line beats everything" shape `harvestSizeCap`
  // was built to kill, just on the other multiplier. Swept at 200 seeds:
  // `distanceMultiplierCap` >= 5 is a no-op today (no policy's typical
  // harvest distance even reaches it) and <= 2 flattens near-home play that
  // never chased distance (farm/hoard -12%). 3 is the chosen middle: it
  // costs `rush` (built to chase it) -13-29% while farm/bank stay within a
  // few per cent, same shape as the cap-20 pocket bonus. `harvestSizeBonus`
  // came down with it (0.5, was 1 — full quadratic): bank3 was scoring only
  // 47.6% of bank15 on size alone; halving the exponent narrows that to
  // 58.5% without an interior optimum moving. Neither changes %tiles or the
  // relic economy — both measured unchanged across every sweep.
  //
  // Second pass, 2026-09-04 — a played run's own receipt still read distance
  // 43% / pocket 27% / bounty 25% / identity (matches+power+rare+native) 5%,
  // and Marc, asked directly: distance still too dominant, and identity too
  // invisible. A pointsSplit sweep across farm/bank20/rush/hoard/chooser/
  // seeker at 150 seeds confirms the algebra: `points = sumWorth * sizeBonus *
  // distanceMult * bounty`, and identity's SHARE is `1 / (sizeBonus *
  // distanceMult * bounty)` regardless of the worth numbers themselves — so
  // no per-tile value (`matchValue`, `greenCrowdBonus`, rarity, native) can
  // move this share even one point; only shrinking a multiplier can. Under
  // the shipped 3/0.5 pair the sweep's aggregate is identity 14.3% / pocket
  // 33.5% / distance 43.7% — worse than one player's screenshot only because
  // Marc's run chased bounty harder than any scripted policy does (25% vs
  // 8.4% average).
  //
  // Two candidates were tried and rejected on the same gate.
  // `distanceMultiplierCap: 1` zeroes distance's share outright, but pocket
  // absorbs every point of it (64%, identity only 27%) and it deletes
  // DESIGN.md's "leave — deeper maps pay more per point" pillar along with
  // it, rather than sizing it. `harvestSizeBonus: 0.25` (paired with cap 2)
  // reads best on the sweep — identity 14.3% -> 25.0% — but fails
  // `sim.test.ts`'s "rewards patience" gate (bank40 stops beating bank3x1.5)
  // and `profiles.test.ts`'s "veteran beats naive" gate (`chooser` stops
  // beating `tourist`/`timid`): identity's share and "a big patient pocket
  // clearly outscores a small greedy one" are the SAME axis by construction
  // (`sizeBonus`), so pushing the first any further starts spending the
  // second, which is a load-bearing invariant, not a free knob.
  //
  // Shipped: `distanceMultiplierCap: 2` alone, `harvestSizeBonus` left at
  // 0.5. Distance 43.7% -> 35.8%, no longer the run's single largest line
  // (pocket's 39.2% edges it, by construction — patience still has to pay).
  // Identity only moves 14.3% -> 16.3% from this dial alone — see
  // `identityBonusRate` below for the rest of the ask.
  distanceMultiplierCap: 2,
  harvestSizeBonus: 0.5,

  // The rest of the same ask, same session: Marc, told identity had only
  // moved 14.3% -> 16.3%, said find a way rather than leave it. Shrinking
  // the multipliers further was tried and rejected above — `identityBonusRate`
  // is the way: a SECOND, additive term on `sumWorth` (see the field's own
  // doc), so identity is paid in full AND still gets its usual multiplied
  // share, instead of the two fighting over one number. Swept 0 to 4 on the
  // same 150-seed harness: identity share climbs smoothly (16.3% at 0, 22.7%
  // at 0.5, 44.3% at 3) but the real gate is `sim.test.ts`'s six-per-policy
  // 200-seed "rewards patience" test, not the sweep's own rough median check
  // — which read PASS at every value tried and was simply wrong, caught only
  // by running `pnpm vitest` for real rather than trusting the throwaway
  // script (this file's own Session 42 lesson, paid again). The real gate
  // holds a comfortable, roughly constant ~12% margin from 0 to 0.4 and then
  // fails outright at 0.5 (1265 vs a 1266.75 floor). Session 51 found out
  // why the two disagreed: the gate ran on SIX seeds and the sweep on 200,
  // so the "cliff" was six dice rolls crossing a line, not the economy.
  // 0.4 was the largest value the six-seed sample happened to pass; see
  // below for where it went once the gate measured the economy instead.
  //
  // `quest.test.ts`'s bounty invariant needed a rounding tolerance once a
  // non-integer term entered the floor (see its own comment) — the formula
  // was corrected first (`harvestValue`: bounty multiplies the WHOLE catch,
  // identity's bonus included) rather than loosened to hide a real mismatch.
  //
  // Session 51, same day: 0.4 -> 1.0. Marc's ordering, in his words —
  // placement first, "where am I going" (landmarks, not raw distance)
  // second, luck/rarity as jackpot odds third, patience intact. Measured
  // against TOTAL run points for the first time (harvest split + site
  // payouts + the end-of-run reach/claim bonuses, `scripts/` throwaway,
  // 120 seeds x 6 policies): identity was 12% of a run, the end-of-run
  // REACH bonus alone 34% — the largest single channel in the game, and a
  // third distance reward on top of the harvest multiplier and site pay.
  // Cutting `endReachBonus` (below) is what bought this headroom: ~400 pts
  // of reach is a constant added to patient and greedy runs alike, so
  // removing half of it WIDENS the patience ratio (x1.12 -> x1.20 at 200
  // seeds) instead of spending it. At reach 20 / claim 100 / this at 1.0:
  // identity 19.4%, pocket 22.8%, distance 20.7%, reach 18.6%, claim
  // 10.0%, bounty 5.1%, site 3.4% — placement a top-tier channel, raw
  // reach halved, landmarks reached doubled, patience x1.15.
  identityBonusRate: 1.0,

  // The jackpot (Session 51, see the field). Swept 0..8 at 120 seeds:
  // `rare`'s share of harvest points 1.6% -> 3.6 / 5.5 / 7.3 / 10.6 /
  // 15.3% at 1 / 2 / 3 / 5 / 8, and a pocket carrying a magic or unique
  // pays x2.1 -> x2.3 / 2.5 / 2.6 / 3.0 / 3.6 a plain pocket per tile.
  // Patience barely notices (x1.118 -> x1.103 at 3) because a rare is a
  // 3% draw — that rarity is exactly what makes it a jackpot rather than
  // a strategy. 3: a rare pocket pays two-and-a-half plain ones, and
  // rarity reads as a real row on the receipt without deciding a run.
  rareBonusRate: 3,

  // Blue's tide is the one personality with no geometric ceiling — green,
  // yellow and red are all capped by a hex having six neighbours, tide pays
  // per hex of distance forever. Measured: `rush` (a policy that chases
  // depth, not blue specifically) already banks 41-49% of its points in
  // blue against 15-23% for the other three; a player who actually optimises
  // for it, per the screenshot above, can push that further with no ceiling
  // in the way. Capped at the SAME real distance `distanceMultiplierCap`
  // stops paying at (`distanceMultiplierCap x distanceStep` / `blueTideEvery`
  // = 2x3/6 = 1, unchanged by the 2026-09-04 cap drop from 3) rather than
  // picking a second, unrelated number: past that, tide stops climbing
  // exactly where the harvest multiplier already does.
  // Only closes part of the gap (rush's blue share 41% -> 33%, still the
  // largest of the four) — the rest was `greenCrowdBonus`, below.
  blueTideCap: 1,

  // Green was earning 43-46% of every near-home policy's points against
  // 15-23% each for the other three — not a runaway like tide (six
  // neighbours caps it by construction) but plainly too strong at 1, the
  // original quadratic-era value. It double-dips where the others don't:
  // a green neighbour already scores as an ordinary match (every colour's
  // do), and THEN scores again as one more crowd. 0.5 flattened it best
  // (farm/bank20 within four points of an even split) but took `sim.test.ts`'s
  // "rewards patience" gate with it — bank40/bank3's ratio holds at 1.6-1.7x
  // over 200 seeds at every value tried, but the gate's fixed six-seed sample
  // sits on a knife edge and reads 1.47 at 0.5, under its 1.5 floor. 0.7 keeps
  // that gate at 1.57 and still lands farm/bank20/chooser within a couple of
  // points of even (27/27/22/24, 29/27/21/24, 29/28/23/19). `rush` (a policy
  // that chases distance, not crowding) stays blue-heavy regardless at any
  // value — that's the colour's own niche ("the colour you carry outward")
  // working as intended, not this dial's job to flatten.
  greenCrowdBonus: 0.7,

  // Bounties were 0 in the same lifetime screen, and the harness explains
  // why without it being a bug: `state.quest` only arms on claiming a
  // 'site'-kind landmark (36% of destinations) and never expires once armed,
  // but only ~35% of ordinary (non-destination-seeking) runs ever see one
  // arm at all, and of those only half land the required pocket in range —
  // a ~17% chance per run under farm/bank20, versus `seeker`'s majority.
  // Widening the radius doesn't touch the arming rate (unaffected by
  // `questRadius` at all) but does convert some already-armed runs that
  // radius 6 was missing: measured 34/68 -> 37/68 collected for farm,
  // 40/75 -> 46/75 for bank20 at radius=12, with no further gain past it.
  // Left `questNeed` and the site/cache/territory split alone — those trade
  // against the survival economy `cacheShareNear` was tuned for, and this
  // pass only had evidence for the geometry, not for reweighting that.
  questRadius: 12,

  // Small and often is the LUCK line, big and late is the score line: a flat
  // 9 luck a pop against half a point per tile means three 4-pockets pay 33
  // luck where one 12-pocket pays 15. And every pop steers the next six draws
  // toward its own colour, so cashing a green pocket is how you get more
  // green to build the next one with.
  luckPerPop: 9,
  luckPerTile: 0.5,
  colourBiasDraws: 6,
  colourBiasWeight: 2,

  // Luck is a PURSE, not a bar (Marc played it, 2026-08-15). It buys nothing
  // passively here — permanent odds are bought with points between runs — so
  // these three prices are the whole of what popping early is for. Income is
  // about 10 a pop and a good run pops ~140 times, so a reroll is small
  // change, a steered hand is a real decision, and a unique costs six pops.
  luckMagicPerPop: 0,
  luckUniquePerPop: 0,
  luckCap: 99999,
  // The score is on screen again (Marc, 2026-08-20: "we could show current
  // points too now that I think about it longer"). It was hidden on
  // 2026-08-15, when POINTS and LUCK shared one HUD slot and the purse was
  // the number a live run was actually played against. Since the single
  // payout every pop scores, so the score moves constantly and is worth
  // watching — and the slot is no longer shared, so showing it costs LUCK
  // nothing. The world's REACH record left the header the same day, in the
  // other direction: live numbers here, records in the MENU tab.
  hidePoints: false,
  luckRerollCost: 12,
  luckSteerCost: 30,
  luckForgeCost: 75,
  // TITHE existed 2026-08-18 through 2026-09-03: a clean 3x what death pays
  // on unspent luck, so cashing out mid-run was a real alternative to
  // hoarding. Cut the same session and for the same reason as `burnRelics`
  // above — an active mid-run relics choice nobody's scripted policy ever
  // took, replaced by leaning on the passive `luckToRelics` conversion
  // alone. 0/0 is also `tilesonly.test.ts`'s own "the dial is off" case,
  // which is what the shipped economy now always is.
  titheRate: 0,
  titheMin: 0,

  singlePayout: true,
  shrinesReborn: false,
  pointsPerPop: 0.35,
  // Burning pays RELICS now, not luck. That was the open question, and the
  // answer arrived with the meta economy: a burn gives up the tiles keeping
  // you alive AND the score, and buys the next run instead. Luck was the
  // wrong price because popping paid luck too, so the sacrifice bought
  // nothing the safe move did not.
  burnLuck: 0,
  // The 2026-08-20 tightening (Marc: "make sure its harder overall to get
  // relics"): every per-run faucet came down together — burn halved (a
  // 20-pocket burned paid 40 relics, two shop levels for one sacrifice),
  // claims 3 → 2, and the ending luck conversion halved (see the tithe
  // note above — it was the widest faucet). Measured at 200 seeds × 18
  // policies: median relics a run fell ~26-35 → ~13-18, so a 20-50-relic
  // shop rung is one-to-three runs of earning instead of one run of
  // existing. The survey and crossing (content/goals.ts) tightened the
  // same day, same ratio.
  //
  // Cut entirely, 2026-09-03 (Marc: "scrap sacrifice on pop, focus on
  // passive + relics per game"): the harness has never modelled either —
  // no scripted policy ever chose `burn` or `tithe`, so the sim table
  // (and every relics number above) moved zero when this was measured.
  // What is left is `claimRelics` and `luckToRelics`, both already
  // passive — exploring and however much luck a run ends with, no
  // mid-run sacrifice required. See `LOG.md` for the reachable-behaviour
  // tests this took with it.
  burnRelics: 0,
  claimRelics: 2,
  luckToRelics: 0.05,
  // Session 51 (2026-09-04): 40/60 -> 20/100. Measured for the first time
  // against TOTAL run points, `endReachBonus` was 34% of everything a run
  // scores — more than any harvest row — and it pays for the same walk the
  // harvest multiplier and every site already pay for, while `endClaimBonus`
  // (5.6%) was the only end-of-run number that cared WHAT you reached.
  // Marc: "where am I going? shrines? biomes?" should matter, raw distance
  // less so. Half the reach, nearly double the claim: reach 34% -> 19%,
  // claims 6% -> 10%, and the wanderer profile still scores (reach 0 was
  // swept and rejected — `tourist`, whose whole score is the horizon,
  // scored 0 and the PORTÉE line on the ending would have gone blank).
  // Side effect that paid for the rest of the session: reach is a near-
  // constant added to every run, so halving it widened the patience ratio
  // rather than spending it — see `identityBonusRate`.
  endReachBonus: 20,
  endClaimBonus: 100,

  runLength: 0,
  costGrace: 0,
  // Swept: 22 gave ~140-placement runs (8 min), 38 gave ~270 (16). 30 lands
  // a good run near 200 placements — about twelve minutes — with careless
  // play dead at 111 and random play at 32, which is the skill spread Gate C
  // asks for.
  //
  // 2026-08-18 (Marc: "too easy, I want it to become easier gradually with
  // relics, not at the start"): the curve came down to 22 — and became the
  // thing STEADY PACE buys back, +2 a level to the old 30. Last session's
  // sweep rejected a steeper curve because it sank the maxed ceiling; making
  // the curve itself purchasable removes that objection, and the harness
  // agrees: run one falls to ~121 placements · reach 12 · ~3,000 pts while
  // maxed climbs to ~248 · 18 · ~23,000 — the widest ladder of every
  // candidate swept (see LOG, 2026-08-18).
  costRisesEvery: 22,

  /**
   * RUN ONE IS SMALLER THAN IT WAS (Marc, 2026-08-16, mid-run at 166 tiles on
   * placement 61: "feels like early on we can advance alot with only 30 tiles
   * with all the caches and stuff, maybe we can tone it down and balance a bit
   * so after a few runs with bought relics item its back to what it is now").
   *
   * He was right, and the harness said something worse: run one was already
   * where a MAXED run should be. Every upgrade in the shop bought +2 reach and
   * a quarter more placements between them, because a fresh run was already
   * near the ceiling the plane allows. A roguelite whose first run is its best
   * run has a shop for decoration.
   *
   * So the floor came down and the ladder got longer. Measured at 40 seeds a
   * rung, on bank20:
   *
   *   run 1            reach 14 · 166 placements · 7,795 pts
   *   +4 purse, eye, world   reach 15 · 187 · 12,211   (~today's run one)
   *   +6 purse, 3 eye, 2 world  reach 16 · 209 · 17,305
   *   maxed            reach 15 · 228 · 21,906
   *
   * Today's run one was reach 16 · 186 · 14,153, so the shop climbs back
   * through it around the middle rung — a few hundred relics, which is a few
   * runs — and goes past it after. Exactly the shape he asked for.
   *
   * The cost curve was deliberately NOT touched. Steepening it as well (24
   * rather than 30) put the MAXED ceiling below today's floor, which is not
   * toning down, it is a different, smaller game.
   */
  startingTiles: 22,
  destinationChance: 0.45,

  /**
   * THE WORLD IS GRADUAL NOW (Marc, 2026-08-18: "check for gradual formulas
   * instead of constants for our distance, pop/tiles, shrine density").
   *
   * Three constants became curves over distance from home, so the run is lean
   * at the doorstep and rich in the deep — the difficulty ramp lives inside
   * the run as well as between runs:
   *
   * - a cache pays 6 at the doorstep and +4 per ring out, so the cache worth
   *   walking to is the far one. RICHER WORLDS still raises the base +3 a
   *   level, so a maxed ring-2 cache pays 26 — the pre-rebalance number.
   * - a harvest pays a quarter-tile extra per pop per ring, so survival
   *   income grows with depth instead of being flat everywhere.
   * - destination density ramps in over 2 blocks, so the near world is
   *   sparse but run one still meets its first claim (~1 median, swept).
   *
   * Swept together with the 22-curve at 40 seeds a rung: no stalls, skill
   * spread intact (random dead at 23 placements, pop-early at 102, competent
   * at 121), and reach — the point of the game — grows 12 → 18 across the
   * shop ladder where the flat world managed 14 → 16.
   */
  cachePays: 6,
  cachePaysPerRing: 4,
  popTilesPerRing: 0.25,
  destinationRampBlocks: 2,

  // 42% cache, 36% site, 17% territory near home — caches carry survival so
  // they lead close in; shrine is always the remainder (5%), never a fourth
  // scaled number. Shrines thinned 8% → 5% on 2026-08-19 (Marc, after waking
  // all four in three games: stretch them out "a bit") — the ledger should
  // pace a world's first week, not its first evening; the freed points went
  // to cache and site so the near world got slightly kinder, not thinner.
  cacheShareNear: 0.42,
  siteShareNear: 0.36,
  territoryShareNear: 0.17,

  /**
   * DEEP WATER (2026-08-18, first values): the mix, not just the density,
   * tilts with distance. `deepWaterRampBlocks` 10 keeps the tilt behind the
   * existing density ramp (2 blocks) on purpose — by the time destinations
   * are at full density the mix has barely moved (20% of the way at block
   * distance 2), so the near world plays exactly as it did before this
   * dial existed, and the tilt is a DEEP-run fact rather than an early one.
   * `cacheShareFar` 0.2 (down from 0.42 near home) hands its points to
   * site/territory/shrine in their near-mix ratio to each other — a
   * maxed-out deep block runs roughly 20% cache / 50% site / 23%
   * territory / 7% shrine, so a pushed run meets more of the interesting
   * things and fewer plain lifelines exactly where survival is least in
   * question. Swept at 40 seeds against bank20/spender/seeker on the
   * original split: no stalls, skill spread and the clock held; re-swept
   * 2026-08-19 with the thinned shrines (see LOG).
   */
  deepWaterRampBlocks: 10,
  cacheShareFar: 0.2,

  /**
   * HIDDEN FINDS EXIST, AND ARE RARER THAN SHRINES (2026-08-18, first
   * values; rescaled 2026-08-19 when the shrine share thinned 8% → 5%). The
   * yardstick is the rarest thing already out there: shrines at 5% of
   * destinations, one per ~6-hex block at 0.45 chance, are
   * 0.45 × 0.05 / 36 ≈ 0.000625 shrines per hex at full ramp. A find block
   * of 12 hexes at 0.085 is 0.085 / 144 ≈ 0.00059 per hex BEFORE the
   * deep-world exclusion (nothing within a block-width of home) carves out
   * the whole ground a short run ever sees — so where runs actually happen,
   * finds stay rarer than shrines, the same just-under margin the original
   * 0.14-against-8% pair kept (its whole sweep record lives in git). The
   * ratio moved with the shrines ON PURPOSE: Marc asked for the unlock
   * ledger stretched "a bit", and the perk shelf is the same kind of ladder
   * — both slow together or the brief ("the rarest thing out there")
   * silently inverts, which is exactly what the finds test caught when only
   * the shrines thinned. `findSense` stays 0 — the shop sells the nose.
   */
  findEvery: 12,
  findChance: 0.085,
};
