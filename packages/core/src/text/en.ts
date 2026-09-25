import { PERK_DIALS, UPGRADE_STEPS } from '@content/goals';
import { fmt1, fmtPct, ordinal, plural } from './format';
import type { Strings } from './Strings';

/**
 * English — every sentence a player reads (2026-08-28; restyled 2026-08-30).
 *
 * Each function takes the facts its caller already worked out and returns
 * words. The conditions (which sentence, and whether to say one at all) are
 * the caller's, so the French catalogue beside this one can differ in wording
 * and never in when it speaks.
 *
 * ## The house style, set 2026-08-30
 *
 * Marc: *"review help and text content so it's not AI-like (no em dashes,
 * etc.), be concise and simple in all content."* Three rules, and they are
 * checkable rather than tasteful:
 *
 *   1. **No em dash anywhere a player can read.** It was the punctuation of
 *      124 sentences in this file, doing the work of four different marks at
 *      once, and a reader cannot tell which one is meant. A colon introduces,
 *      a full stop separates, a comma joins, and `·` divides the parts of a
 *      label. `text.test.ts` pins it, in both languages.
 *   2. **One idea per sentence.** A clause bolted on after a dash was almost
 *      always a second sentence that had not been given its full stop.
 *   3. **Say the thing, then stop.** No restating the rule in the next clause
 *      with different words.
 *
 * The facts did not move: every number, name and condition is the one that was
 * there before. `view/prose.pin.test.ts` and `view/teaching.pin.test.ts` were
 * re-recorded in the same commit, deliberately and for this reason (`LOG.md`).
 */

/**
 * The power word and its colon, or nothing at all.
 *
 * `view#powerHead` hands over the word or an empty string (a direction whose
 * ground name already says its power has nothing to add), and the punctuation
 * is set here rather than there because English puts no space before a colon
 * and Québec French puts a narrow no-break one. That is a fact about a
 * language, not about a power (D4).
 */
const pw = (word: string): string => (word === '' ? '' : `${word}: `);
/** A value that can carry one decimal, rounded to the nearest tenth. */
const d1 = (n: number): string => fmt1(n, 'en');
/** A percentage, which in English is just the number and a sign. */
const pc = (n: number): string => fmtPct(n, 'en');

const LUCK_CORE = 'LUCK is a purse, not a score.';
const RARE_STAR =
  'A placed rare tile wears a ring in its own colour and stands taller, so its power stays findable on a full map.';
const LAST_GASP_RULE =
  'You may place while ANY tiles remain. The difference is forgiven at zero, and it cannot chain: only a pop lifts you back above zero.';
/** The cost curve and the reach rule, shared between the stat note and the
 *  manual's own sections (2026-09-03) — the `LUCK_CORE` pattern: one clause,
 *  two doors, no second wording to drift. */
const COST_CURVE_GRACE = (base: number, grace: number, every: number): string =>
  `It stays ${base} for the first ${grace} placements, then rises +1 every ${every} placed`;
const COST_CURVE_PLAIN = (every: number): string => `It rises +1 every ${every} placed`;
const REACH_RULE = (step: number): string =>
  `Every ${step} hexes out raises the distance multiplier by 1, so the same pocket scores more the deeper it pops.`;

export const STRINGS_EN: Strings = {
  locale: 'en',
  typography: { sentenceEnd: /[.!?]$/ },

  lesson: {
    ripe: {
      name: 'RIPE',
      terms: ['RIPENS'],
      core: 'Surrounded on all six sides, a tile RIPENS and shows its WORTH: how many neighbours match it.',
      stoneAsh: (red) =>
        `Stone, walls and the map’s edge all surround. Only ${red} counts stone as a match.`,
      stone: 'Stone, walls and the map’s edge all surround; none of them match.',
      cardLean:
        'Tap it to price its pocket, then choose. POP now pays sooner and leans your next draws toward the colour you popped. Wait, and the pocket grows: a bigger one pays more than its pieces.',
      cardPlain:
        'Tap it to price its pocket, then choose: POP now, or keep growing it. A bigger pocket pays more than its pieces.',
    },
    pop: {
      name: 'POP',
      terms: ['POP'],
      core: 'POP cashes a ripe pocket. It pays tiles to keep you placing, and points as your score. Waiting grows the pocket and pays more, but every placement still costs tiles, so waiting too long can end a run before it pops.',
      lean: 'POP also leans your next draws toward the colour you popped.',
      when: 'Small and often buys LUCK and steers your draws. Big and late buys tiles and score.',
    },
    sacrifice: {
      name: 'SACRIFICE',
      terms: ['SACRIFICE'],
      core: 'SACRIFICE burns a ripe pocket instead of cashing it: no tiles, no points, nothing back into this run.',
      pays: 'What it pays instead is RELICS, which follow you out when the run ends. A pocket you cannot afford to wait on buys the next run.',
    },
    pocket: {
      name: 'POCKET',
      terms: ['POCKET'],
      core: 'A POCKET is a ripe tile and every ripe tile touching it. They pop together, as one. Tap any ripe tile to price its pocket; the buttons show what it pays.',
    },
    worth: {
      name: 'WORTH',
      terms: ['WORTH'],
      core: 'WORTH counts how many of a tile’s six sides touch a match: the same colour, or a wild rare tile. A pop scores the pocket’s worth added up, so the more that ripen together, the more it pays.',
    },
    cache: {
      name: 'CACHE',
      terms: ['CACHE'],
      coreRing: (pays, perRing) =>
        `A CACHE pays ${pays} tiles on the spot, +${perRing} per ring out, the moment you build a tile touching it. Caches re-arm every run, so ground you already know stays worth walking to.`,
      core: (pays) =>
        `A CACHE pays ${pays} tiles on the spot, the moment you build a tile touching it. Caches re-arm every run, so ground you already know stays worth walking to.`,
    },
    site: {
      name: 'SITE',
      terms: ['SITE'],
      core: (pays) =>
        `A SITE pays ${pays} points × its distance from home the moment you claim it, and it opens a BOUNTY. Sites re-arm every run, so a claimed one is worth returning to.`,
    },
    shrine: {
      name: 'SHRINE',
      terms: ['SHRINE'],
      core: 'A SHRINE switches a system on for your world, permanently, the moment you claim it. Once every shrine unlock is woken, the next one offers a crossing to a new world instead.',
    },
    territory: {
      name: 'TERRITORY',
      terms: ['TERRITORY'],
      core: (radius, tiles, cap) =>
        `A TERRITORY claims the ground within ${radius} hexes as native to its colour, for good.${
          tiles > 0
            ? ` Each one held starts your later runs with +${tiles} tiles, up to +${cap}.`
            : ''
        }`,
      pays: (radius, tiles) =>
        `A TERRITORY hands you +${tiles} tiles and claims the ground within ${radius} hexes as native to its colour. On this board it lasts the run, unless you keep the board as one of your worlds.`,
    },
    find: {
      name: 'FIND',
      terms: ['FINDS', 'FIND'],
      core: 'A FIND is buried treasure. Touch it with a tile and it gives you a PERK, yours for good in this world. Finds do not come back, and each one grants only something you do not already carry.',
    },
    stone: {
      name: 'STONE',
      terms: ['STONE'],
      coreAsh: (red) =>
        `STONE is spent ground: what a tile becomes after it pops. It still surrounds neighbours, so it helps them ripen, but only ${red} counts it as a match.`,
      core: 'STONE is spent ground: what a tile becomes after it pops. It still surrounds neighbours, so it helps them ripen, but it never matches.',
    },
    rare: {
      name: 'MAGIC',
      terms: ['MAGIC'],
      core: 'MAGIC is wild: it matches every neighbour whatever the colour, and they match it back.',
    },
    rareUnique: {
      name: 'UNIQUE',
      terms: ['UNIQUE'],
      core: 'UNIQUE is wild and heavy: every match it makes counts DOUBLE, for both sides.',
    },
    luck: {
      name: 'LUCK',
      terms: ['LUCK'],
      core: `${LUCK_CORE} Every pop pays a little of it, and the row under your hand spends it: a fresh draw, a colour called, a rare tile forged.`,
    },
    relic: {
      name: 'RELICS',
      terms: ['RELICS', 'RELIC'],
      core: 'Relics are not points. They buy the NEXT run: they follow you out when a run ends, and THE SHOP on the end screen spends them, so every run starts stronger than the last.',
    },
    bounty: {
      name: 'BOUNTY',
      terms: ['BOUNTY'],
      core: (need, radius, bonus) =>
        `A BOUNTY is a site’s second payout: pop ${need}+ tiles within ${radius} hexes of its star and that pop scores ×${bonus}. It is live the moment you claim the site, and any pop in range can collect it.`,
    },
    stash: {
      name: 'STASH',
      terms: ['STASH'],
      coreMany: (slots) =>
        `The dashed STASH cards keep ${slots} tiles for later. Tap one to stash the selected card; tap a stashed card to trade that tile back.`,
      coreOne:
        'The dashed STASH card keeps one tile for later. Tap to stash the selected card; tap it again to trade that tile back.',
      more: 'Stashed tiles survive a redraw. Save a rare, or the colour a pocket is waiting for.',
    },
    sizeBonus: {
      name: 'SIZE BONUS',
      terms: ['SIZE BONUS'],
      coreCapped: (cap) =>
        `The SIZE BONUS is one point of multiplier per tile in a pocket, up to ${cap}. Past that a bigger pocket still pays more worth, but no more multiplier.`,
      core: 'The SIZE BONUS is one point of multiplier per tile in a pocket. The more that pops together, the more its worth is multiplied.',
    },
    costRise: {
      name: 'THE COST',
      terms: [],
      core: 'Every placement spends tiles; the COST stat is the next one’s price.',
      rises: 'The price only rises; it never comes back down. It is the clock that ends every run.',
      curveGrace: (base, grace, every) => `${COST_CURVE_GRACE(base, grace, every)}.`,
      curvePlain: (every) => `${COST_CURVE_PLAIN(every)}.`,
    },
    reach: {
      name: 'REACH',
      terms: [],
      core: 'REACH is how far from home you have built.',
      multiplier: (step) => REACH_RULE(step),
    },
    field: {
      name: 'NATIVE GROUND',
      terms: [],
      core: 'Ground a TERRITORY holds is native to its colour: a tile of that colour placed there is worth one more.',
    },
    lens: {
      name: 'THE FOG',
      terms: [],
      core: 'The world remembers. Ground you have walked stays on the map between runs, dimmed under the fog, and unclaimed destinations glow through it.',
    },
  },
  luckCore: LUCK_CORE,
  rareStar: RARE_STAR,
  rareCard: 'Spend it where many tiles touch.',
  lastGaspRule: LAST_GASP_RULE,
  lensHint: 'Tap remembered fog to light its ground.',

  view: {
    groundHead: (name, word) => `${name}: ${word}.`,
    arc: {
      late: 'The run built to it: your biggest pop landed in the final stretch.',
      mid: 'Your biggest pop came mid-run; the tail never topped it.',
      early: 'Your biggest pop came early, and everything after grew in its shadow.',
    },
    guide: {
      tilesSpare: 'More tiles than you can spend. POP for PTS from here on',
      tilesSpareSingle: 'More tiles than you can spend. Only the points count from here on',
      pockets: (n) => (n > 1 ? `${n} pockets ready` : 'Pocket ready'),
    },
    destination: {
      cache: (tiles) => `a cache of ${tiles} tiles`,
      site: 'a scoring site',
      shrine: 'a shrine',
      territory: 'a territory to claim',
    },
    hint: (destination, dist) => `${capitalize(destination)} glows ${dist} out.`,
    glows: {
      atEdge: (destination) => `${capitalize(destination)} still glows right at your edge.`,
      past: (destination, beyond) =>
        `${capitalize(destination)} still glows ${beyond} past your edge.`,
    },
    odds: (magic, unique) => `magic ${magic}% · unique ${unique}%`,
    epitaph: {
      broke: [
        (p, cost) =>
          `Out of tiles on the plane, after ${p} placements. They cost ${cost} each by the end.`,
        (p, cost) =>
          `The purse ran dry after ${p} placements. Tiles were ${cost} apiece, and nothing was left to pay it.`,
        (p, cost) =>
          `${p} placements, and the last tile went down alone. The next would have cost ${cost}.`,
        (p, cost) => `The expedition spent itself: ${p} placements, the price risen to ${cost}.`,
        (p, cost) =>
          `No tiles left after ${p} placements. The plane was charging ${cost} each by then.`,
        (p, cost) =>
          `The lamps carried ${p} placements out. At ${cost} a tile, the dark had the last one.`,
        (p, cost) =>
          `Every tile spent: ${p} placements, the cost at ${cost} and the purse at nothing.`,
        (p, cost) =>
          `${p} placements, then the hand came up empty. Tiles were ${cost} apiece at the end.`,
      ],
      walled: [
        (p) => `Walled in after ${p} placements. Nowhere left to build, nothing left to pop.`,
        (p) => `The stone closed in at ${p} placements. Every open hex was spoken for.`,
        (p) => `${p} placements, and the walls had the last word.`,
        (p) => `Nowhere left to stand after ${p} placements. The plane walled the run in.`,
        (p) =>
          `The run built itself into a corner: ${p} placements, and no ground a tile could take.`,
        (p) => `Stone on every side after ${p} placements. The way out never opened.`,
      ],
      spent: (placements, unripe) =>
        `The expedition is over: ${placements} placements spent. ` +
        (unripe > 0
          ? `${unripe} tile${plural(unripe, '', 's')} left standing, never popped.`
          : `Everything you built was popped.`),
    },
    rarity: {
      magic:
        'MAGIC is wild: it matches every neighbouring tile, whatever the colour, and they match it back.',
      unique: 'UNIQUE is wild and heavy: every match it is part of counts DOUBLE, for both sides.',
    },
    pocket: {
      head: (count, worth) => `POCKET OF ${count}, total worth ${d1(worth)}.`,
      pays: (tiles, pts) => `POP pays +${tiles} tiles and ${pts} pts.`,
      score: (worth, sizeBonus, multiplier, bounty, placedRate, rare) => {
        const added =
          (placedRate === null ? '' : ` + worth ${d1(worth)} × ${d1(placedRate)} for the placing`) +
          (rare === null ? '' : ` + rare worth ${d1(rare.worth)} × ${d1(rare.rate)} as jackpot`);
        const product = `worth ${d1(worth)} × size bonus ${d1(sizeBonus)} × distance ${multiplier}${added}`;
        return `The score: ${bounty === null ? product : added === '' ? `${product} × bounty ${bounty}` : `(${product}) × bounty ${bounty}`}.`;
      },
      bar: (count, cap) => `POCKET ${count}/${cap}`,
      bounty: (bonus) => `This pocket collects the bounty: ×${bonus} on its score.`,
      rares: (n) => `${n} rare tile${plural(n, '', 's')} in here will be spent by popping it.`,
    },
    harvest: {
      firstPop: `YOUR FIRST POP
The pocket turned to STONE. It still surrounds, but never matches. Ground you have cashed grows poorer; the world stays rich farther out.`,

      head: (count, worth) => `POPPED ${count}, total worth ${d1(worth)}`,
      bountyCollected: (bonus) => `Bounty ×${bonus}: COLLECTED.`,
      bountyMissed: (bonus, need, radius) =>
        `Bounty ×${bonus}: missed (+0). Pop ${need}+ tiles within ${radius} of the site.`,
      tiles: (tiles, perTile, worthPerExtra, depthRings) =>
        `+${tiles} tiles: ${perTile} per tile, +1 more per ${worthPerExtra} worth${depthRings === null ? '' : `, +${depthRings} for the depth`}.`,
      scored: (pts) => `+${pts} pts`,
      luck: (gained, oddsRose) =>
        `Luck +${gained}.${oddsRose ? ' Your rare-tile odds just rose.' : ''}`,
      points: (pts, worth, count, sizeBonus, cap, multiplier, bounty, placedRate, rare) => {
        const added =
          (placedRate === null ? '' : ` + worth ${d1(worth)} × ${d1(placedRate)} for the placing`) +
          (rare === null ? '' : ` + rare worth ${d1(rare.worth)} × ${d1(rare.rate)} as jackpot`);
        const product = `worth ${d1(worth)} × size bonus ${d1(sizeBonus)} for ${count} tile${plural(count, '', 's')}${cap === null ? '' : ` (capped at ${cap})`} × distance ${multiplier}${added}`;
        return `+${pts} pts = ${bounty === null ? product : added === '' ? `${product} × BOUNTY ${bounty}` : `(${product}) × BOUNTY ${bounty}`}`;
      },
    },
    purse: {
      redraw: (cost) => `REDRAW · ${cost}. Throw this hand away for a new one.`,
      steer: (name, cost, draws) =>
        `${name} · ${cost}. A hand leaning ${name}, and the next ${draws} draws with it.`,
      forge: (cost) => `FORGE · ${cost}. Turn the selected card UNIQUE.`,
      sacrifice: (pct) =>
        `SACRIFICE LUCK: the WHOLE purse traded for relics at ${pct}%. Better than dying on it.`,
      lostPartly: (pct) =>
        `the run’s end pays back only ${pct}% of whatever is left, so a full purse you die on is mostly gone`,
      lostAll: 'whatever is left when the run ends is lost outright',
      lead: (lost) =>
        `LUCK IS FOR SPENDING\n` +
        `Every button under your hand is priced in luck, and you CAN lose it all: ${lost}. Spend it.`,
    },
    stat: {
      tiles:
        'TILES: what keeps you alive. Every placement spends them; pops, caches and territories pay them back. At zero with nothing ripe to pop, the run ends.',
      points:
        'POINTS: the score. A pocket popped for points pays its worth × its size × its distance from home.',
      luck: (rate) =>
        `${LUCK_CORE} The row under your hand spends it` +
        (rate === null
          ? '.'
          : `; whatever is left when the run ends comes home as relics, at ${rate}%.`),
      reach: (step) => `REACH: how far from home you have built. ${REACH_RULE(step)}`,
      costCurveGrace: COST_CURVE_GRACE,
      costCurvePlain: COST_CURVE_PLAIN,
      cost: (cost, curve) =>
        `COST: the next placement’s price, ${cost}. ${curve}, and it never comes back down. It is the clock that ends every run. ${LAST_GASP_RULE}`,
      left: 'LEFT: placements remaining in the expedition. At zero it ends; anything already ripe can still be popped.',
    },
    colour: {
      green: (head, name, bonus) =>
        `${head} Wants one big mob of its own colour: +${bonus} worth per ${name} neighbour past the first.`,
      yellow: (head, bonus, all) =>
        `${head} Scores in messy mixed ground: +${bonus} worth per ${all ? 'differently-coloured neighbour' : 'different colour beside it'}.`,
      red: (head, walls) =>
        `${head} Stone${walls ? ' and walls' : ''} count as matches for it: it feeds on the spent ground everyone else abandons.`,
      blue: (head, every) =>
        `${head} Worth little at home, a lot on the frontier: +1 worth per ${every} hexes from home.`,
    },
    power: {
      green: (head, name, bonus) =>
        ` · ${pw(head)}+${bonus} worth per ${name} neighbour past the first`,
      yellow: (head, bonus, all) =>
        ` · ${pw(head)}+${bonus} worth per ${all ? 'differently-coloured neighbour' : 'different colour beside it'}`,
      red: (head, name, walls) =>
        ` · ${pw(head)}stone${walls ? ' and walls' : ''} beside ${name} count as matches`,
      blue: (head, every) => ` · ${pw(head)}+1 worth per ${every} hexes from home`,
    },
    hex: {
      cacheClaimed: 'CACHE: already claimed. It gave its tiles.',
      cache: (tiles) => `CACHE: build a tile touching it to claim ${tiles} tiles on the spot.`,
      siteClaimed: 'SITE: already claimed.',
      site: (pays, bonus) =>
        `SITE: claim it for ${pays} pts × its distance. It opens a bounty worth ×${bonus}.`,
      shrineDetourClaimed: 'SHRINE: woken. On your own world, this switches a system on for good.',
      shrineDetour:
        'SHRINE: touch it with a tile. On your own world, waking one switches a system on for good.',
      shrineClaimed: 'SHRINE: woken. It switched a system on for this world.',
      shrineCrossing: (dowry) =>
        `SHRINE: this world is fully awake, so reaching it offers the crossing. A NEW WORLD, with ${dowry} relics carried for what you leave.`,
      shrineAwake:
        'SHRINE: this world is fully awake. There is nothing left for one to unlock, so this is a walk you do not need.',
      shrine: (next) =>
        `SHRINE: claim it to unlock ${next ?? 'a system'} for this world, permanently.`,
      findClaimed: 'A hidden find, spent. It gave what it had.',
      find: 'Something is here. Touch it with a tile.',
      territoryClaimed: (radius, owns) =>
        `TERRITORY: yours. The ground within ${radius} hexes is native to ${owns}.`,
      territory: (radius, owns) =>
        `TERRITORY: claim it and the ground within ${radius} hexes becomes native to ${owns}, for good.`,
      territoryPays: (radius, owns, tiles) =>
        `TERRITORY: claim it for +${tiles} tiles, and the ground within ${radius} hexes becomes native to ${owns} for this run.`,
      someColour: 'a colour',
      chainOut: (sentence) => `${sentence} Build your chain out to it.`,
      shimmers: 'Something shimmers here. Grow your ground to it.',
      remembered: 'Remembered from an earlier run. This run has not grown here yet.',
      dark: 'Dark ground: nothing any run has seen yet. Grow toward it.',
      wallBuildable: (mult) => `Wall: you can build on it, at ${mult}× the placement cost.`,
      wall: 'Wall: cannot be built on.',
      wallAsh: (standing, red) =>
        `${standing} It surrounds, so it helps things ripen, but it never matches, except for ${red}, which counts it as one.`,
      wallPlain: (standing) =>
        `${standing} It surrounds, so it helps things ripen, but it never matches.`,
      stone: (red) =>
        `Spent ground, a popped tile. It surrounds but never matches, except for ${red}, which feeds on it.`,
      tile: (name, worth) =>
        `${name} tile, worth ${worth}. It ripens when all six sides are covered.`,
      open: 'Open ground: you can build here once something of yours touches it.',
      native: (name) => `Ground native to ${name}: a ${name} tile here is worth one more.`,
    },
  },

  perkRow: {
    gain: (text) => `YOU GAIN: ${text}`,
    lose: (text) => `YOU LOSE: ${text}`,
    play: (text) => `PLAY IT: ${text}`,
  },
  figure: {
    ripen: 'Six sides covered: the middle tile is ripe, and worth what matches it.',
    destinations: 'Lit is unclaimed and still pays. Faint means you have already spent it.',
    place: 'Glowing edges are where a tile may go. The faint number is what it would pay.',
    pop: 'Ripe tiles that touch are ONE pocket. They pop together, and leave stone.',
    rare: 'A placed rare wears a ring in its own colour: magic, then unique.',
    stash: 'The dashed slot is the stash. Tap it to stash the selected card for later.',
  },

  perk: {
    rootbound: {
      name: 'ROOTBOUND',
      note: `Native ground pays up to ${PERK_DIALS.rootboundNativeMax}×, and ground that is not yours pays less. Both sharpen as your luck fills.`,
      gain: `Your own ground pays ${PERK_DIALS.rootboundNative}× to start and ${PERK_DIALS.rootboundNativeMax}× at full luck. The ground’s own bonus is counted first, then the whole lot multiplies.`,
      lose: `Ground that is not yours pays ${PERK_DIALS.rootboundStray}× to start, and NOTHING once your luck is full. The better your odds get, the less the plane forgives.`,
      play: 'Grow along ONE colour’s field and pop inside it. Early on a strayed pocket still pays something; bank enough luck and it stops paying at all, so the rule gets stricter exactly as you get richer.',
    },
    secondwind: {
      name: 'SECOND WIND',
      note: `The first time a run would end broke, a coin is flipped: ${Math.round(PERK_DIALS.secondWindChance * 100)}% of the time you carry on with ${PERK_DIALS.secondWindTiles} tiles, and the rest of the time you do not.`,
      gain: `The first time a run would end BROKE, a coin is flipped: ${Math.round(PERK_DIALS.secondWindChance * 100)}% of the time you carry on with ${PERK_DIALS.secondWindTiles} tiles.`,
      lose: 'Nothing you had. The coin is flipped once a run, and only for running BROKE; any other ending is still an ending.',
      play: `A reprieve you cannot count on, so it is worth one placement more than you would dare, not ten. If the coin lands, reach a pocket and POP before the ${PERK_DIALS.secondWindTiles} tiles are gone.`,
    },
    stonewalker: {
      name: 'STONEWALKER',
      note: `Placements beside stone cost ${PERK_DIALS.stoneDiscount} less.`,
      gain: `Placements next to stone cost ${PERK_DIALS.stoneDiscount} less, down to free and never below it.`,
      lose: 'Nothing. This one is pure discount.',
      play: 'Stone stops being ground to route around and becomes the cheapest ground there is. Build ALONG a ridge rather than away from one.',
    },
    wallbreaker: {
      name: 'WALLBREAKER',
      note: `Walls can be built on, at ${PERK_DIALS.wallBuildCostMult}× cost.`,
      gain: 'Walls can be built ON, which nothing else in the game can do.',
      lose: `A wall placement costs ${PERK_DIALS.wallBuildCostMult}× a normal one, and the tiles are spent whether or not the pocket ever ripens.`,
      play: 'A wall surrounds without ever matching, so breaking one JOINS two pockets that could never have touched. Worth it to close a big pocket; never worth it to save a step.',
    },
    openhand: {
      name: 'OPEN HAND',
      note: `Draft ${PERK_DIALS.openHandDraft} tiles. No stash.`,
      gain: `You draft ${PERK_DIALS.openHandDraft} tiles every hand instead of the usual deal.`,
      lose: 'NO STASH. The shelf disappears while this is worn, so nothing can be put by for later.',
      play: `More choice now, none saved. Take the best of ${PERK_DIALS.openHandDraft} every single turn instead of banking a tile for a pocket two moves away.`,
    },
  },
  upgrade: {
    tiles: { name: 'DEEPER PURSE', note: `+${UPGRADE_STEPS.tiles} tiles to start every run.` },
    odds: {
      name: 'KEENER EYE',
      note: 'Magic and unique tiles turn up more often, on every run, for good.',
    },
    world: {
      name: 'RICHER WORLDS',
      note: 'More caches, sites and territories to find, and richer caches when you reach them.',
    },
    pace: {
      name: 'STEADY PACE',
      note: 'Placements stay cheap for longer, on every run, for good.',
    },
    sense: {
      name: 'KEEN NOSE',
      note: `Hidden finds shimmer when your ground grows near, +${UPGRADE_STEPS.sense} hexes farther each level.`,
    },
  },
  onceARun: {
    newGround: 'NEW GROUND: farther than this world has ever reached.',
    unique: 'UNIQUE: every match counts double, both ways.',
  },
  goalMet: (goal, relics) => `GOAL MET: ${goal} · +${relics} relics`,
  goal: {
    reach20: 'Reach 20 hexes from home',
    territories4: 'Hold 4 territories',
    known40: 'Know 40% of the world',
    shrinesAll: 'Wake every shrine',
    perksAll: 'Find every perk',
  },
  unlock: {
    draft: 'A fourth draft card',
    hold: 'A second stash slot',
    luck: 'Twice the rare-tile odds',
    reach: 'Destinations glow from twice as far',
    camp: 'Camps: later runs may begin at your farthest territory',
  },
  shed: {
    lastError: 'Storage was full. A diagnostic record was cleared so your run could be saved.',
    otherReceipts:
      'Storage was full. Some notes from your other worlds were cleared so your run could be saved.',
    replays:
      'Storage was full. Your saved replays were cleared so your run could be saved; your diary still holds what every run did.',
    timeline:
      'Storage was full. Your diary was cleared so your run could be saved; your worlds, relics and perks are untouched.',
    otherWorlds:
      'Storage was full. Your OTHER worlds were forgotten so this run could be saved; the world you are in is untouched.',
    lost: 'Storage is full and this run cannot be saved. Free some space on your device, or finish the run in this tab.',
  },
  feature: {
    'debug.overlay': {
      label: 'Debug overlay',
      note: 'Prints the run’s raw numbers under the board, for reporting a bug.',
    },
    'ui.sound': {
      label: 'Sound',
      note: 'A few quiet notes as you pop and claim.',
    },
    'ui.haptics': {
      label: 'Vibration',
      note: 'A short buzz as you place, pop and claim.',
    },
    // TEMPORARY (2026-09-11) — see `meta/features.ts`.
    'board.awake': {
      label: 'Board always awake',
      note: 'Normally the board stops breathing after fifteen untouched seconds, to spare the battery. On, it never sleeps.',
    },
  },
  // The frame moves, the verbs do not: those are the glossary's (D4).
  story: [
    'A settlement at the edge of a dark plain. The ground already knows your step.',
    'Nobody remembers who stayed here first. Some nights it feels like you did.',
    'You go out at dusk with a lamp and a handful of ground: a field, a stall, a cut in the rock, a road. You lay it down where it will pay, on ground that seems to already expect it.',
    'What you carry home is never much. This place has more than it had yesterday, some nights more than you remember leaving it.',
  ],

  share: {
    run: (name, pts, placements, arc) =>
      `${name}: ${pts} pts in ${placements} placements${arc === '' ? '' : ` · ${arc}`}. Beat my run:`,
    daily: (name, day, pts, reach, arc, tries) =>
      `${name} ${day} · ${pts} pts · reach ${reach}${arc === '' ? '' : ` · ${arc}`} · ${ordinal(tries, 'en')} try · beat it:`,
    cardScore: (points) => `${points} pts`,
    cardReach: (reach) => `REACH ${reach}`,
    cardSeed: (seed) => `SEED ${seed}`,
  },
  daily: {
    badge: (day, record, streak) =>
      `DAILY ${day}` +
      (record === null
        ? ''
        : ` · best ${record.best} · ${record.tries} ${plural(record.tries, 'try', 'tries')}`) +
      (streak > 1 ? ` · ${streak} days in a row` : ''),
  },
  claim: {
    cache: (tiles) => `CACHE CLAIMED
+${tiles} tiles, on the spot.`,
    site: (pts, need, radius, bonus) =>
      `SITE CLAIMED
+${pts} pts banked, and this star has set a BOUNTY: pop a pocket of ${need}+ within ${radius} hexes of it for ×${bonus}.`,
    territory: (radius, owns) =>
      `TERRITORY CLAIMED
Ground within ${radius} hexes is native to ${owns} now, and it stays yours between runs.`,
    territoryPays: (radius, owns, tiles) =>
      `TERRITORY CLAIMED
+${tiles} tiles, and the ground within ${radius} hexes is native to ${owns}. Continue this board in a world to keep it.`,
    shrine: (unlock) => `SHRINE WOKEN
${unlock}
Yours from your next run on, in this world for good.`,
    shrineCrossing: (dowry, carried) =>
      `THE WORLD IS AWAKE
Every unlock is yours, and this shrine is a way onward. Cross to a NEW WORLD carrying ${dowry} relics for what you leave${carried > dowry ? `, plus ${carried - dowry} from this run` : ''}. Your relics and the perks you have found come with you. The ground, the territories, the shrines you woke here and everything you have BOUGHT stay behind. Or stay, and keep building this world.`,
    crossLabel: (carried) => `CROSS · CARRY ${carried} RELICS`,
    crossArmed: 'TAP AGAIN: THIS WORLD IS FORGOTTEN',
    stay: 'STAY',
    shrineAwake: `SHRINE WOKEN
This world is fully awake. Every unlock is yours.`,
    shrineDetour: `SHRINE WOKEN
On your own world a shrine switches a system on, for good. A shared run keeps nothing, but it still counts the claim.`,
    found: (perk, worn) =>
      `FOUND: ${perk}
${worn ? 'Already worn, so it works from here on.' : 'Yours for good, in THIS world. WEAR it here to run under it from this placement on.'}`,
    findNothing: `A HIDDEN FIND
Nothing new inside. A find grants only what you do not already carry, and only on your own world.`,
  },

  spent: {
    reroll: (paid) => `A fresh hand, for ${paid} luck.`,
    steer: (name, draws, paid) =>
      `${name} runs hot: a new hand drawn under it, and the next ${draws} draws lean its way. ${paid} luck.`,
    forge: (paid) =>
      `Forged UNIQUE: wild, and every match it makes counts double, both ways. ${paid} luck.`,
    tithe: (paid, relics) =>
      `Sacrificed ${paid} luck for ${relics} relic${plural(relics, '', 's')}.`,
  },

  backup: {
    describe: (worlds, relics, date) =>
      `${worlds} world${plural(worlds, '', 's')} · ${relics} relics${date === null ? '' : ` · ${date}`}`,
    fromV1: 'From Ashwake 1. These worlds will be carried across.',
    refused:
      'That is not an Ashwake backup. Paste the whole thing, from the first brace to the last.',
    paste: 'Paste a backup here',
    saved: (how) =>
      how === 'shared'
        ? 'Backup handed to the share sheet.'
        : how === 'downloaded'
          ? 'Backup saved as a file.'
          : 'Backup copied. Paste it somewhere you will still have next month.',
    failed: 'This device would not let the backup out. Nothing was lost. Try an ordinary tab.',
  },

  ui: {
    begin: 'BEGIN',
    newRun: 'NEW RUN',
    mainMenu: 'MAIN MENU',
    settings: 'SETTINGS',
    restart: 'RESTART',
    newWorld: 'NEW WORLD',
    back: 'BACK',
    closeAll: 'CLOSE ALL',
    daily: 'DAILY',
    shop: 'THE SHOP',
    hold: 'STASH',
    holdEmpty: 'Stash the selected tile for later',
    holdSwap: (ground) => `Take the stashed ${ground} tile back into the hand`,
    holdNothing: 'Nothing in hand to stash. Tap a card first.',
    holdTrades: 'Tap a card in your hand first: the stash trades, it does not deal.',
    pop: 'POP',
    sacrifice: 'SACRIFICE',
    relicsPaid: (n) => `${n} relic${plural(n, '', 's')}`,
    luckPaid: (n) => `+${n} luck`,
    redraw: 'REDRAW',
    forge: 'FORGE',
    sacrificeLuck: 'SACRIFICE LUCK',
    sacrificeLuckFor: (relics) => `SACRIFICE LUCK FOR ${relics}`,
    tabs: { start: 'EXPEDITION', play: 'PLAY', hand: 'HAND' },
    fame: {
      title: 'HALL OF FAME',
      diary: 'DIARY',
      totals: 'TOTALS',
      shared: (seed) => `SHARED BOARD ${seed}`,
      marks: (n) => `${n} highlight${plural(n, '', 's')}`,
      mark: {
        bestScore: (score) => `NEW BEST · ${score} pts`,
        bestReach: (reach) => `FARTHEST YET · reach ${reach}`,
        shrine: (n) => (n === 1 ? 'A shrine woken' : `${n} shrines woken`),
        perk: (n) => (n === 1 ? 'A perk found' : `${n} perks found`),
        goal: (n) => (n === 1 ? 'A survey goal met' : `${n} survey goals met`),
        territory: (n) => (n === 1 ? 'A territory claimed' : `${n} territories claimed`),
        camp: 'Began at camp',
      },
      atlas: 'ATLAS',
      atlasNote: 'The world you are in, across every run played on it.',
      /** The run's SHAPE — five facts every finished run kept and no screen
       *  printed, until Marc ruled to print them (2026-09-13, `PASS.md`
       *  P7.7). `bigPop` carries two numbers because the biggest pop without
       *  its moment is half the fact: the arc already draws it and the number
       *  was never given. */
      detail: {
        placements: 'TILES PLACED',
        popped: 'TILES POPPED',
        bigPop: 'BIGGEST POP',
        bigPopAt: (points, at) => `${points} · at ${pc(Math.round(at * 100))}`,
        claims: 'DESTINATIONS',
        quests: 'BOUNTIES',
      },
    },
    tabGrows: 'more to come here as you play',
    language: 'LANGUAGE',
    languages: { 'fr-CA': 'FRANÇAIS', en: 'ENGLISH' },
    appearance: 'APPEARANCE',
    auto: 'AUTO',
    sound: 'SOUND',
    soundOn: 'Sound is on. Tap to mute.',
    soundOff: 'Sound is off. Tap for sound.',
    menu: 'MENU',
    menuGroups: { play: 'PLAY', record: 'YOUR RECORD', device: 'THIS DEVICE' },
    luckPurse: (luck) => `LUCK: ${luck}. Open the purse.`,
    resetTeaching: 'RESET TEACHING',
    details: 'DETAILS',
    theStory: 'THE STORY',
    howToPlay: 'HOW TO PLAY',
    perkFound: (name) => `A FIND: you carry ${name} now.`,
    woke: (what) => `WOKE: ${what}`,
    theMap: 'THE GROUND YOU WALKED',
    walkTheMap: 'Move around the board you left.',
    backToEnding: 'BACK TO THE ENDING',
    watchRun: 'REPLAY',
    replayNote: 'Every placement and every pop, again.',
    watchSkip: 'SKIP',
    watching: (step, of) => `Replay · ${step} / ${of}`,
    expedition: {
      title: 'THE EXPEDITION',
      lines: [
        'You are walking out into a dark plane. You place tiles, they ripen, you pop them, and you push on.',
        'Every placement costs tiles. Popping pays them back. A run ends when you run out, and that is the shape of the game, not a mistake you made.',
        'Relics come home with you. The shop spends them, so the next expedition starts stronger than this one.',
      ],
    },
    /** The camera cluster. `home` is its third control, shown only once the
     *  board has been turned or leaned away from the angle it opens at. */
    camera: { flat: 'FLAT', home: 'DEFAULT', mine: 'MY VIEW' },
    sharpness: {
      label: 'SHARPNESS',
      note: 'How much of the screen the board actually draws. Higher looks crisper and uses more battery.',
    },
    board: {
      label: 'The board',
      reach:
        'Arrow keys walk a marker across the board and say what it lands on. Enter does what a tap on that hex would do.',
      keys: {
        title: 'KEYBOARD',
        move: 'Arrows: walk the marker, and hear what it lands on.',
        act: 'Enter or Space: do what a tap on that hex would do.',
        pan: 'Shift and an arrow: slide the board.',
        zoom: '+ and −: closer, further.',
        turn: 'Q and E, or Home and End: turn the board.',
        lean: 'R and F, or Page Up and Page Down: lean the camera back and forward.',
        view: '0: the view button, without reaching for it.',
        cards: '1 to 8: pick up that card from the hand.',
        hold: 'H: stash the card you are holding, or take the stashed one back.',
        mouse: 'Drag with the right button, or with Shift held, to turn and lean. The wheel zooms.',
      },
    },
    resume: 'RESUME',
    fromTerritories: (tiles) => `+${tiles} tiles from the territories you hold.`,
    gotIt: 'GOT IT',
    thisDevice: 'THIS DEVICE',
    noStorage: 'This browser is not keeping anything: your run will not survive closing the tab.',
    backUp: 'BACK UP MY WORLDS',
    restore: 'RESTORE A BACKUP',
    restoreArmed: 'REPLACE EVERYTHING ON THIS DEVICE?',
    resetAll: 'RESET ALL',
    resetAllArmed: 'ERASE EVERY WORLD?',
    restartArmed: 'END THIS RUN AND START OVER?',
    resetTeachingArmed: 'SHOW EVERY LESSON AGAIN?',
    newWorldArmed: (n) => `ABANDON WORLD ${n} AND ALL OF ITS GROUND?`,
    worlds: 'MY WORLDS',
    worldN: (n) => `WORLD ${n}`,
    perksFound: 'PERKS FOUND',
    noPerksYet: 'None yet. Hidden finds are out there.',
    atlasRuns: 'RUNS',
    atlasBest: 'BEST',
    atlasFarthest: 'FARTHEST',
    atlasKnown: 'KNOWN',
    atlasTerritories: 'TERRITORIES',
    atlasShrines: 'SHRINES',
    atlasFinds: 'FINDS',
    atlasUnlocked: 'UNLOCKED',
    survey: 'THE SURVEY',
    thisWorld: 'THIS WORLD',
    emptyWorld: 'begin new',
    /** The world this run is being played on — see `screens/Worlds`. */
    hereNow: 'you are here',
    which: {
      title: 'WHICH GAME',
      nowWorld: 'RIGHT NOW: YOUR OWN WORLD. Everything in this manual applies.',
      nowShared: 'RIGHT NOW: A SHARED RUN. Nothing below about buying applies here.',
      nowDaily: 'RIGHT NOW: THE DAILY. Nothing below about buying applies here.',
      world:
        'YOUR WORLD is one of three this device keeps. It is remembered between runs, and played with everything you have bought and found.',
      shared:
        'A SHARED RUN is a link with a seed in it. Somebody else’s world, played plain: no upgrades, no perk. At the end you can keep the board as one of your worlds.',
      daily:
        'THE DAILY is one world everybody gets for that date. Played plain, your tries counted, your own world untouched. At the end you can keep the board as one of your worlds.',
      howToShare: 'SHARE, on the end screen, turns your run into such a link.',
      doorShared: 'Somebody else’s board, played plain.',
      doorDaily: 'One board, everybody, today. Played plain.',
    },
    beginShared: 'BEGIN · SHARED RUN',
    beginDaily: (day) => `BEGIN DAILY ${day}`,
    cameByLink: 'This world reached you by a link. It travels the same way out.',
    ending: {
      scored: (n) => `Run over: ${n} point${plural(n, '', 's')}`,
      newBest: 'NEW BEST',
      shortOfBest: (n) => `${n} short of best`,
      run: (n) => `RUN ${n}`,
      try: (n) => `TRY ${n}`,
      streak: (days) => `${days} DAYS IN A ROW. A new board tomorrow.`,
      comeBack: 'A new board tomorrow.',
      tryAgain: 'TRY AGAIN',
      continueInWorld: 'CONTINUE IN MY WORLD',
      importInto: 'KEEP THIS BOARD AS ONE OF YOUR WORLDS:',
      importKeeps:
        'The ground you walked and the territories you claimed come with it. The score and the relics stay behind, and the shrines wake up.',
      relicsBanked: (n) => `${n} relics banked`,
      placements: 'PLACEMENTS',
      popped: 'POPPED',
      biggestPop: 'BIGGEST POP',
      biggestPopAt: (points, pct) => `${points} at ${pct}%`,
      destinations: 'DESTINATIONS',
      bounties: 'BOUNTIES',
      none: '0',
    },
    camp: (ring) => `BEGIN AT CAMP · your farthest territory, ring ${ring}`,
    stats: { tiles: 'TILES', points: 'PTS', map: 'REACH', cost: 'COST', left: 'LEFT' },
    flag: { on: 'ON', off: 'OFF', notBuilt: 'NOT BUILT' },
    worn: 'WORN',
    wear: 'WEAR',
    takeOff: 'TAKE OFF',
    maxed: 'MAXED',
    buy: (name, price) => `Buy ${name} for ${price} relics`,
    /* `1 relics` until 2026-09-10, found by the plural rule in `text.test.ts`
     * rather than by anyone reading it: this is the shop's accessible name for
     * the relic balance, so the only person it was wrong for was the one
     * listening to it. French had the branch all along. */
    relicsHeld: (n) => `${n} relic${plural(n, '', 's')}`,
    perksTally: (found, all) => `${found} of ${all} perks found`,
    handEmpty: 'Your hand is empty. Tap a card below to pick one up.',
    lensOn: (ground) =>
      `Remembered ${ground} ground: every known patch of it is lit. Tap the fog again to let go.`,
    lensOff: 'The lens is off.',
    lensClear: 'LENS OFF',
    lensClearLabel: (ground) => `Turn the ${ground} lens off`,
    lensPanel: {
      button: 'LENS',
      buttonLabel: 'What the board is worth, per ground',
      standing: 'STANDING',
      worth: (n) => `worth ${d1(n)}`,
      tiles: (n) => `${n} tile${plural(n, '', 's')}`,
      power: (n) => `power +${d1(n)}`,
      ripe: (count, worth) => `${count} ripe tile${plural(count, '', 's')} (${d1(worth)})`,
      ripeNone: 'nothing ripe',
      foot: 'Tap a ground to hold the lens on it. Tap it again to let go.',
      rows: {
        share: 'Share of the board',
        perTile: 'Worth a tile',
        pockets: 'Ripe pockets',
        best: 'Best pocket',
        inHand: 'In your hand',
      },
      hints: {
        share: 'How much of everything standing on the board this ground is.',
        perTile: 'Its worth, spread over its tiles: what one of them adds to a pocket.',
        pockets: 'Ripe pockets with this ground in them. A pocket can mix grounds.',
        best: 'The best of those pockets, whole, priced as POP would pay it now.',
        inHand: 'Tiles of this ground in your hand and stash, not placed yet.',
      },
      share: (pct) => pc(pct),
      best: (count, points) =>
        `${count} tile${plural(count, '', 's')}${points === null ? '' : ` · ${points} pts`}`,
      why: 'HOW IT ADDS UP',
      sum: {
        title: 'The best pocket, if you pop it now',
        worth: 'Worth',
        size: (count) => `Size bonus, ${count} tile${plural(count, '', 's')}`,
        distance: 'Distance',
        placing: 'For the placing',
        jackpot: 'Rare jackpot',
        bounty: 'Bounty',
        perPop: 'Paid per pop',
        points: 'Points',
      },
      equals: (n) => `= ${n} pts`,
    },
    newVersion: 'NEW VERSION · TAP TO LOAD',
    install: 'INSTALL ASHWAKE',
    handInstall: 'Ashwake on your home screen: tap Share in Safari, then Add to Home Screen.',
    backUpNote: 'Your worlds live on this phone only. BACK UP, in SETTINGS, saves them.',
    inApp:
      'You are in an in-app browser, and your world may not be kept here. Open this page in Safari or Chrome to keep it.',
    share: 'SHARE',
    copied: 'COPIED',
    shareFailed: 'COULD NOT SHARE',
    crash: {
      broke:
        'Something broke. Your run is saved. CONTINUE if the game still works underneath, RELOAD if it does not.',
      boardLost:
        'The board stopped drawing. This device took its graphics memory back and did not give it up again. Your run is saved. Reload the page to get the board back.',
      noWebgl:
        'Ashwake needs WebGL to draw its board, and this browser has it missing or switched off. Try Safari or Chrome, or turn hardware acceleration back on.',
      seen: (n) => `seen ×${n}`,
      continue: 'CONTINUE',
      reload: 'RELOAD',
      send: 'SEND REPORT',
      sending: 'SENDING…',
      sent: 'SENT, thank you',
      sendFailed: 'NO CONNECTION, try again or copy',
      copy: 'COPY REPORT',
      selectAbove: 'SELECT THE TEXT ABOVE',
      lastError: 'LAST ERROR',
      noError: 'Nothing has broken on this device.',
    },
    legendGrounds: 'THE GROUNDS',
    legendPlaces: 'THE DESTINATIONS',
    legendMarks: 'THE OTHER MARKS',
    legendRare: 'A placed rare tile wears a ring in its own colour, and stands taller.',
    legendWall: 'Wall: cannot be built on. It still surrounds.',
    legendRipe: 'RIPE edge: that tile is ready to harvest.',
    legendLegal: 'Legal edge: you may place here.',
    privacy:
      'Nothing leaves your phone: no account, no analytics, no server. Sharing sends only what you see in the share sheet, and a crash report only if you tap SEND REPORT.',
    notices: 'Fonts and icons: the notices',
  },
  payout: {
    byColour: 'BY COLOUR',
    byRarity: 'BY RARITY',
    bySource: 'BY SOURCE',
    rarity: { common: 'COMMON', magic: 'MAGIC', unique: 'UNIQUE' },
    source: {
      matches: 'MATCHES',
      power: 'COLOUR POWER',
      rare: 'RARE TILES',
      native: 'NATIVE GROUND',
      pocket: 'POCKET SIZE',
      distance: 'DISTANCE',
      bounty: 'BOUNTIES',
    },
    sites: 'SITES CLAIMED',
    arc: 'THE SHAPE OF THE RUN',
    pops: 'POPS',
    reachBonus: (reach, per) => `REACH ${reach} × ${per}`,
    claimBonus: (claims, per) => `CLAIMS ${claims} × ${per}`,
    total: 'TOTAL',
  },
};

const capitalize = (s: string): string => `${s[0]!.toUpperCase()}${s.slice(1)}`;
