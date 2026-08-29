import { PERK_DIALS, UPGRADE_STEPS } from '@content/goals';
import { CONCEPT_MARK, LANDMARK_GLYPH } from '@theme/tokens';
import { ordinal, plural } from './format';
import type { Strings } from './Strings';

/**
 * English — every sentence exactly as it read before `text/` existed
 * (2026-08-28). Moved, not rewritten: this is Marc's own 2026-08-27
 * concision pass on the manual and the cards, and the pins in
 * `view/teaching.pin.test.ts` and `view/prose.pin.test.ts` were recorded
 * BEFORE the move so that an unchanged snapshot is the proof it was a move.
 *
 * Each function takes the facts its caller already worked out and returns
 * words. The conditions — which sentence, and whether to say one at all —
 * are the caller's, so the French catalogue beside this one can differ in
 * wording and never in when it speaks.
 */

const LUCK_CORE = 'LUCK — a purse, not a score.';
const RARE_STAR = 'A placed rare tile wears a star, so its power stays findable on a full map.';
const LAST_GASP_RULE =
  'You may place while ANY tiles remain — the difference is forgiven at zero, and it cannot chain: only a pop can lift you back above zero.';

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
        'Tap it to price its pocket, then choose: POP now (pays sooner, and your next draws lean toward the colour you popped) or keep growing it (a bigger pocket pays more than its pieces).',
      cardPlain:
        'Tap it to price its pocket, then choose: POP now, or keep growing it — a bigger pocket pays more than its pieces.',
    },
    pop: {
      name: 'POP',
      terms: ['POP'],
      core: 'POP cashes a ripe pocket: it pays tiles to keep you placing, and points as your score. Waiting lets a pocket grow and pays more, but every placement still costs tiles, so waiting too long can end a run before it pops.',
    },
    pocket: {
      name: 'POCKET',
      terms: ['POCKET'],
      core: 'A POCKET is a ripe tile and every ripe tile touching it — they pop together, as one. Tap any ripe tile to price its pocket; the buttons show what it pays.',
    },
    worth: {
      name: 'WORTH',
      terms: ['WORTH'],
      core: 'WORTH counts how many of a tile’s six sides touch a match — the same colour, or a wild rare tile. A pop scores the pocket’s summed worth, so the more that ripen together, the more it pays.',
    },
    cache: {
      name: 'CACHE',
      terms: ['CACHE'],
      coreRing: (pays, perRing) =>
        `A CACHE pays ${pays} tiles on the spot, +${perRing} per ring out the moment you build a tile touching it. Caches re-arm every run, so ground you already know stays worth walking to.`,
      core: (pays) =>
        `A CACHE pays ${pays} tiles on the spot the moment you build a tile touching it. Caches re-arm every run, so ground you already know stays worth walking to.`,
    },
    site: {
      name: 'SITE',
      terms: ['SITE'],
      core: (pays) =>
        `A SITE pays ${pays} points, × its distance from home, the moment you claim it — and it opens a BOUNTY. Sites re-arm every run, so a claimed one is worth returning to.`,
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
    },
    stone: {
      name: 'STONE',
      terms: ['STONE'],
      coreAsh: (red) =>
        `STONE is spent ground — what a tile becomes after it pops. It still surrounds neighbours, helping them ripen, but only ${red} counts it as a match.`,
      core: 'STONE is spent ground — what a tile becomes after it pops. It still surrounds neighbours, helping them ripen, but it never matches.',
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
      core: 'Relics are not points — they buy the NEXT run. They follow you out when a run ends, and THE SHOP on the end screen spends them: every run makes the next one start stronger.',
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
        `The dashed HOLD cards keep ${slots} tiles for later. Tap one to stash the selected card; tap a held card to trade that tile back.`,
      coreOne:
        'The dashed HOLD card keeps one tile for later. Tap to stash the selected card; tap it again to trade that tile back.',
      more: 'Held tiles survive a redraw — save a rare, or the colour a pocket is waiting for.',
    },
    sizeBonus: {
      name: 'SIZE BONUS',
      terms: ['SIZE BONUS'],
      coreCapped: (cap) =>
        `The SIZE BONUS is one point of multiplier per tile in a pocket, up to ${cap}: a bigger pocket pays more worth, but past that only more worth, no more multiplier.`,
      core: 'The SIZE BONUS is one point of multiplier per tile in a pocket — the more that pops together, the more its worth is multiplied.',
    },
  },
  luckCore: LUCK_CORE,
  rareStar: RARE_STAR,
  rareCard: 'Spend it where many tiles touch.',
  lastGaspRule: LAST_GASP_RULE,

  view: {
    arc: {
      late: 'The run built to it — your biggest pop landed in the final stretch.',
      mid: 'Your biggest pop came mid-run; the tail never topped it.',
      early: 'Your biggest pop came early — everything after grew in its shadow.',
    },
    guide: {
      lowPopNow: 'Low on tiles — POP a pocket now',
      lowPopTiles: 'Low on tiles — POP a pocket for tiles',
      lowRipen: 'Low on tiles — ripen something to POP',
      bountyReady: 'BOUNTY READY — POP this pocket as pts',
      tilesSpare: 'More tiles than you can spend — POP for PTS from here on',
      pockets: (n) => (n > 1 ? `${n} pockets ready` : 'Pocket ready'),
      readySingle: (pockets) => `${pockets} — tap one to price it, then POP or sacrifice it`,
      readyFork: (pockets) => `${pockets} — tap one, then POP for tiles or pts`,
    },
    destination: {
      cache: (tiles) => `a cache of ${tiles} tiles`,
      site: 'a scoring site',
      shrine: 'a shrine',
      territory: 'a territory to claim',
    },
    hint: (destination, dist) => `${capitalize(destination)} glows ${dist} out`,
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
          `The purse ran dry after ${p} placements — ${cost} a tile at the end, and nothing left to pay it.`,
        (p, cost) =>
          `${p} placements, and the last tile went down alone. The next would have cost ${cost}.`,
        (p, cost) => `The expedition spent itself: ${p} placements, the price risen to ${cost}.`,
        (p, cost) =>
          `No tiles left after ${p} placements. The plane was charging ${cost} each by then.`,
        (p, cost) =>
          `The torch carried ${p} placements out. At ${cost} a tile, the dark had the last one.`,
        (p, cost) =>
          `Every tile spent — ${p} placements, with the cost at ${cost} and the purse at nothing.`,
        (p, cost) =>
          `${p} placements, then the hand came up empty. Tiles were ${cost} apiece at the end.`,
      ],
      walled: [
        (p) => `Walled in after ${p} placements — nowhere left to build, nothing left to pop.`,
        (p) => `The stone closed in at ${p} placements. Every open hex was spoken for.`,
        (p) => `${p} placements, and the walls had the last word.`,
        (p) => `Nowhere left to stand after ${p} placements — the plane walled the run in.`,
        (p) =>
          `The run built itself into a corner: ${p} placements, and no ground a tile could take.`,
        (p) => `Stone on every side after ${p} placements. The way out never opened.`,
      ],
      spent: (placements, unripe) =>
        `The expedition is over — ${placements} placements spent. ` +
        (unripe > 0
          ? `${unripe} tile${plural(unripe, '', 's')} left standing, never popped.`
          : `Everything you built was popped.`),
    },
    rarity: {
      magic:
        'MAGIC — wild: it matches every neighbouring tile, whatever the colour, and they match it back.',
      unique: 'UNIQUE — wild and heavy: every match it is part of counts DOUBLE, for both sides.',
    },
    pocket: {
      head: (count, worth) => `POCKET OF ${count} — total worth ${worth}.`,
      pays: (tiles, pts) => `POP pays +${tiles} tiles and ${pts} pts.`,
      score: (worth, pocket, multiplier, bounty) =>
        `The score: worth ${worth} × pocket ${pocket} × distance ${multiplier}${bounty === null ? '' : ` × bounty ${bounty}`}.`,
      bar: (count, cap) => `POCKET ${count}/${cap}`,
      treasure: (rarity) => `POP for treasure: a ${rarity.toUpperCase()} tile.`,
      bounty: (bonus) =>
        `${LANDMARK_GLYPH.site} This pocket collects the bounty: ×${bonus} on its score.`,
      rares: (n) => `${n} rare tile${plural(n, '', 's')} in here will be spent by popping it.`,
    },
    harvest: {
      head: (count, worth) => `POPPED ${count} — total worth ${worth}`,
      bountyCollected: (bonus) => `${LANDMARK_GLYPH.site} Bounty ×${bonus} — COLLECTED.`,
      bountyMissed: (bonus, need, radius) =>
        `${LANDMARK_GLYPH.site} Bounty ×${bonus} — missed (+0). Pop ${need}+ tiles within ${radius} of the ${LANDMARK_GLYPH.site}.`,
      tiles: (tiles, perTile, worthPerExtra, depthRings) =>
        `+${tiles} tiles: ${perTile} per tile, +1 more per ${worthPerExtra} worth${depthRings === null ? '' : `, +${depthRings} for the depth`}.`,
      scored: (pts) => `+${pts} pts.`,
      luck: (gained, oddsRose) =>
        `Luck +${gained}.${oddsRose ? ' Your rare-tile odds just rose.' : ''}`,
      treasure: (rarity) =>
        `A ${rarity.toUpperCase()} tile goes to your stash — no tiles, no points.`,
      points: (pts, worth, counted, cap, multiplier, bounty) =>
        `+${pts} pts = worth ${worth} × pocket ${counted}${cap === null ? '' : ` (the size bonus stops at ${cap})`} × distance ${multiplier}` +
        (bounty === null ? '' : ` × BOUNTY ${bounty}`),
    },
    purse: {
      redraw: (cost) => `REDRAW · ${cost} — throw this hand away for a new one.`,
      steer: (mark, name, cost, draws) =>
        `${mark} ${name} · ${cost} — a hand leaning ${name}, and the next ${draws} draws with it.`,
      forge: (cost) => `FORGE · ${cost} — turn the card you have selected UNIQUE.`,
      sacrifice: (pct) =>
        `SACRIFICE LUCK — the WHOLE purse traded for relics at ${pct}%, better than dying on it.`,
      lostPartly: (pct) =>
        `the run's end pays back only ${pct}% of whatever is left, so a full purse you die on is mostly gone`,
      lostAll: 'whatever is left when the run ends is lost outright',
      lead: (lost) =>
        `${CONCEPT_MARK.luck}  LUCK IS FOR SPENDING\n` +
        `Every button under your hand is priced in luck — and you CAN lose it all: ${lost}. Spend it.`,
    },
    stat: {
      tiles:
        'TILES — what keeps you alive. Every placement spends them; pops, caches and territories pay them back. At zero with nothing ripe to pop, the run ends.',
      points:
        'POINTS — the score. A pocket popped for points pays its worth × its size × its distance from home.',
      luck: (rate) =>
        `${LUCK_CORE} The row under your hand spends it` +
        (rate === null
          ? '.'
          : `; whatever is left when the run ends comes home as relics, at ${rate}%.`),
      reach: (step) =>
        `REACH — how far from home you have built. Every ${step} hexes out raises the distance multiplier by 1, so the same pocket scores more the deeper it pops.`,
      costCurveGrace: (base, grace, every) =>
        `It stays ${base} for the first ${grace} placements, then rises +1 every ${every} placed`,
      costCurvePlain: (every) => `It rises +1 every ${every} placed`,
      cost: (cost, curve) =>
        `COST — the next placement's price: ${cost}. ${curve}, and it never comes back down — the clock that ends every run. ${LAST_GASP_RULE}`,
      left: 'LEFT — placements remaining in the expedition. At zero it ends; anything already ripe can still be popped.',
    },
    colourWord: { green: 'CROWDS', yellow: 'COMPANY', red: 'ASH', blue: 'TIDE' },
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
      green: (bonus) => ` · crowds: +${bonus} worth per green neighbour past the first`,
      yellow: (bonus, all) =>
        ` · company: +${bonus} worth per ${all ? 'differently-coloured neighbour' : 'different colour beside it'}`,
      red: (walls) => ` · ash: stone${walls ? ' and walls' : ''} beside red count as matches`,
      blue: (every) => ` · tide: +1 worth per ${every} hexes from home`,
    },
    hex: {
      cacheClaimed: `${LANDMARK_GLYPH.cache} CACHE — already claimed. It gave its tiles.`,
      cache: (tiles) =>
        `${LANDMARK_GLYPH.cache} CACHE — build a tile touching it to claim ${tiles} tiles on the spot.`,
      siteClaimed: `${LANDMARK_GLYPH.site} SITE — already claimed.`,
      site: (pays, bonus) =>
        `${LANDMARK_GLYPH.site} SITE — claim it for ${pays} pts × its distance, and it opens a bounty worth ×${bonus}.`,
      shrineDetourClaimed: `${LANDMARK_GLYPH.shrine} SHRINE — woken. On your own world, this switches a system on for good.`,
      shrineDetour: `${LANDMARK_GLYPH.shrine} SHRINE — touch it with a tile. On your own world, waking one switches a system on for good.`,
      shrineClaimed: `${LANDMARK_GLYPH.shrine} SHRINE — woken. It switched a system on for this world.`,
      shrineCrossing: (dowry) =>
        `${LANDMARK_GLYPH.shrine} SHRINE — this world is fully awake, so reaching it offers the crossing: a NEW WORLD, with ${dowry} relics carried for what you leave.`,
      shrine: (next) =>
        `${LANDMARK_GLYPH.shrine} SHRINE — claim it to unlock ${next ?? 'a system'} for this world, permanently.`,
      findClaimed: `${LANDMARK_GLYPH.find} A hidden find — spent. It gave what it had.`,
      find: `${LANDMARK_GLYPH.find} Something is here. Touch it with a tile.`,
      territoryClaimed: (radius, owns) =>
        `${LANDMARK_GLYPH.territory} TERRITORY — yours. The ground within ${radius} hexes is native to ${owns}.`,
      territory: (radius, owns) =>
        `${LANDMARK_GLYPH.territory} TERRITORY — claim it and the ground within ${radius} hexes becomes native to ${owns}, for good.`,
      someColour: 'a colour',
      chainOut: (sentence) => `${sentence} Build your chain out to it.`,
      shimmers: 'Something shimmers here. Grow your ground to it.',
      remembered: 'Remembered from an earlier run — this run has not grown here yet.',
      dark: 'Dark ground — nothing any run has seen yet. Grow toward it.',
      wallBuildable: (mult) =>
        `${CONCEPT_MARK.wall} Wall — you can build on it, at ${mult}× the placement cost.`,
      wall: `${CONCEPT_MARK.wall} Wall — cannot be built on.`,
      wallAsh: (standing, red) =>
        `${standing} It surrounds (so it helps things ripen) but never matches, except for ${red}, which counts it as one.`,
      wallPlain: (standing) =>
        `${standing} It surrounds (so it helps things ripen) but never matches.`,
      stone: (red) =>
        `${CONCEPT_MARK.stone} Spent ground — a popped tile. It surrounds but never matches, except for ${red}, which feeds on it.`,
      tile: (name, worth) =>
        `${name} tile, worth ${worth}. It ripens when all six sides are covered.`,
      open: 'Open ground — you can build here once something of yours touches it.',
      native: (name) => `Ground native to ${name} — a ${name} tile here is worth one more.`,
    },
  },

  perkRow: {
    gain: (text) => `YOU GAIN — ${text}`,
    lose: (text) => `YOU LOSE — ${text}`,
    play: (text) => `PLAY IT — ${text}`,
  },
  figure: {
    ripen: 'Six sides covered: the middle tile is ripe, and worth what matches it.',
    destinations: 'Lit is unclaimed and still pays. Faint means you have already spent it.',
    place: 'Glowing edges are where a tile may go. The faint number is what it would pay.',
    pop: 'Ripe tiles that touch are ONE pocket — they pop together, and leave stone.',
    rare: 'A placed rare wears a star in its own colour: magic, then unique.',
    stash: 'The dashed slot is the stash. Tap it to keep the selected card for later.',
    hold: 'HOLD',
    held: 'HELD',
  },

  perk: {
    rootbound: {
      name: 'ROOTBOUND',
      note: `Native ground pays up to ${PERK_DIALS.rootboundNativeMax}×, and ground that is not yours pays less — both sharpen as your luck fills.`,
      gain: `Your own ground pays ${PERK_DIALS.rootboundNative}× to start and ${PERK_DIALS.rootboundNativeMax}× at full luck — the ground’s own bonus is counted in first, then the lot multiplies.`,
      lose: `Ground that is not yours pays ${PERK_DIALS.rootboundStray}× to start, and NOTHING once your luck is full. The better your odds get, the less the plane forgives.`,
      play: 'Grow along ONE colour’s field and pop inside it. Early on a strayed pocket still pays something; bank enough luck and it stops paying at all, so the rule gets stricter exactly as you get richer.',
    },
    secondwind: {
      name: 'SECOND WIND',
      note: `The first time a run would end broke, a coin is flipped: ${Math.round(PERK_DIALS.secondWindChance * 100)}% of the time you carry on with ${PERK_DIALS.secondWindTiles} tiles, and the rest of the time you do not.`,
      gain: `The first time a run would end BROKE, a coin is flipped: ${Math.round(PERK_DIALS.secondWindChance * 100)}% of the time you carry on with ${PERK_DIALS.secondWindTiles} tiles.`,
      lose: 'Nothing you had — but the coin is flipped once a run, and only for running BROKE. Any other ending is still an ending.',
      play: `A reprieve you cannot count on, so it is worth one placement more than you would dare, not ten. If the coin lands, reach a pocket and POP before the ${PERK_DIALS.secondWindTiles} tiles are gone.`,
    },
    stonewalker: {
      name: 'STONEWALKER',
      note: `Placements beside stone cost ${PERK_DIALS.stoneDiscount} less.`,
      gain: `Placements next to stone cost ${PERK_DIALS.stoneDiscount} less — down to free, never below it.`,
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
      lose: 'NO STASH. The shelf disappears while this is worn — nothing can be put by for later.',
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
      note: 'More caches, sites and territories out there to find — and richer caches when you reach them.',
    },
    pace: {
      name: 'STEADY PACE',
      note: 'Placements stay cheap for longer, on every run, for good.',
    },
    sense: {
      name: 'KEEN NOSE',
      note: `Hidden finds shimmer when your ground grows near — +${UPGRADE_STEPS.sense} hexes farther each level.`,
    },
  },
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
    camp: 'Camps — later runs may begin at your farthest territory',
  },
  shed: {
    lastError: 'Storage was full — a diagnostic record was cleared so your run could be saved.',
    otherReceipts:
      'Storage was full — some notes from your other worlds were cleared so your run could be saved.',
    timeline:
      'Storage was full — your diary was cleared so your run could be saved. Your worlds, relics and perks are untouched.',
    otherWorlds:
      'Storage was full — your OTHER worlds were forgotten so this run could be saved. The world you are in is untouched.',
  },
  feature: {
    'debug.overlay': {
      label: 'Debug overlay',
      note: 'Prints the run’s raw numbers under the board, for reporting a bug.',
    },
    'ui.sound': {
      label: 'Sound',
      note: 'A few quiet notes as you pop and claim. The ♪ button on the board is this switch.',
    },
  },
  tagline: 'An expedition into a dark plane. Place, ripen, pop, and push on.',

  share: {
    run: (name, pts, placements, arc) =>
      `${name}: ${pts} pts in ${placements} placements${arc === '' ? '' : ` · ${arc}`}. Beat my run:`,
    daily: (name, day, pts, reach, arc, tries) =>
      `${name} ${day} · ${pts} pts · reach ${reach}${arc === '' ? '' : ` · ${arc}`} · ${ordinal(tries, 'en')} try · beat it:`,
  },
  daily: {
    badge: (day, record) =>
      `DAILY ${day}` +
      (record === null
        ? ''
        : ` · best ${record.best} · ${record.tries} ${plural(record.tries, 'try', 'tries')}`),
  },
  backup: {
    describe: (worlds, relics, date) =>
      `${worlds} world${plural(worlds, '', 's')} · ${relics} relics${date === null ? '' : ` · ${date}`}`,
  },

  ui: {
    begin: 'BEGIN',
    newRun: 'NEW RUN',
    mainMenu: 'MAIN MENU',
    settings: 'SETTINGS',
    restart: 'RESTART',
    newWorld: 'NEW WORLD',
    back: 'BACK',
    more: 'MORE',
    daily: 'DAILY',
    shop: 'THE SHOP',
    hold: 'HOLD',
    holdEmpty: 'Hold the selected tile for later',
    holdSwap: (ground) => `Swap the held ${ground} tile back into the hand`,
    holdNothing: 'Nothing in hand to stash — tap a card first.',
    holdTrades: 'Tap a card in your hand first — the stash trades, it does not deal.',
    pop: 'POP',
    redraw: 'REDRAW',
    forge: 'FORGE',
    sacrificeLuck: 'SACRIFICE LUCK',
    tabs: { menu: 'MENU', start: 'START', play: 'PLAY', hand: 'HAND', after: 'AFTER' },
    language: 'LANGUAGE',
    languages: { 'fr-CA': 'FRANÇAIS', en: 'ENGLISH' },
    appearance: 'APPEARANCE',
    auto: 'AUTO',
    sound: 'SOUND',
    resetTeaching: 'RESET TEACHING',
    details: 'DETAILS',
    howToPlay: 'HOW TO PLAY',
    resume: 'RESUME',
    gotIt: 'GOT IT',
    thisDevice: 'THIS DEVICE',
    noStorage: 'This browser is not keeping anything: your run will not survive closing the tab.',
    backUp: 'BACK UP MY WORLDS',
    restore: 'RESTORE A BACKUP',
    restoreArmed: 'REPLACE EVERYTHING ON THIS DEVICE?',
    resetAll: 'RESET ALL',
    resetAllArmed: 'ERASE EVERY WORLD?',
    worlds: 'MY WORLDS',
    worldN: (n) => `WORLD ${n}`,
    emptyWorld: 'begin new',
    worn: 'WORN',
    wear: 'WEAR',
    maxed: 'MAXED',
    handEmpty: 'Your hand is empty — tap a card below to pick one up.',
    lensOn: (ground) =>
      `Remembered ${ground} ground — every known patch of it is lit. Tap the fog again to let go.`,
    lensOff: 'The lens is off.',
    newVersion: 'NEW VERSION — TAP TO LOAD',
    share: 'SHARE',
    copied: 'COPIED',
    crash: {
      broke:
        'Something broke. Your run is saved — CONTINUE if the game still works underneath, RELOAD if it does not.',
      noWebgl:
        'Ashwake needs WebGL to draw its board, and this browser has it missing or switched off. Try Safari or Chrome — or turn hardware acceleration back on.',
      seen: (n) => `seen ×${n}`,
      continue: 'CONTINUE',
      reload: 'RELOAD',
      send: 'SEND REPORT',
      sending: 'SENDING…',
      sent: 'SENT — thank you',
      sendFailed: 'NO CONNECTION — try again or copy',
      copy: 'COPY REPORT',
      selectAbove: 'SELECT THE TEXT ABOVE',
      lastError: 'LAST ERROR',
      noError: 'Nothing has broken on this device.',
    },
    privacy:
      'Nothing leaves your phone: no account, no analytics, no server. Sharing sends only what you see in the share sheet, and a crash report only if you tap SEND REPORT.',
  },
  payout: {
    heading: 'WHERE THE POINTS CAME FROM',
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
  },
};

const capitalize = (s: string): string => `${s[0]!.toUpperCase()}${s.slice(1)}`;
