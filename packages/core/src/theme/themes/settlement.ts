import { surface, type Theme } from '../tokens';

/**
 * Settlement. "The plane, once somebody stayed."
 *
 * Marc's own reading of the four colours, given while naming them
 * (`DECISIONS.md` D4.4): **FARM · MARKET · QUARRY · ROADS**. It was parked as a
 * candidate direction rather than a translation, because it is not another word
 * for the same fiction — it is a different one.
 *
 * Torchlit is being in the dark plane with a torch. Daylight is the survey you
 * draw when you get back. This is the third thing that can happen to a place:
 * somebody **stayed**. The board is a settlement at dusk, lit by its own lamps
 * rather than by the thing in your hand, and every ground names what it is FOR
 * instead of what it is made of.
 *
 * The names still name their powers, which is the rule a direction may not
 * break (D4.2) — the four grounds keep their rules and only their fiction
 * moves:
 *
 *   FARM    green — the crowd. Fields cluster; so does the bonus.
 *   MARKET  yellow — the trade. Where things are worth more than they cost.
 *   QUARRY  red — what feeds on stone. Spent ground is the quarry's whole
 *           supply, which is the only one of the four where the new name says
 *           the rule BETTER than the old one did.
 *   ROADS   blue — what pays far from home. A road is distance, priced.
 *
 * **The torch survives here.** Daylight gave up the falloff to be readable in
 * the sun and said so; this direction has no such excuse, so `light.floor`
 * stays low and a lamp-lit street still fades into the dark it was built in.
 * That is the argument for the board being dark at all: a settlement you can
 * see the edges of is not a frontier.
 *
 * **The ladder was chosen as VALUES first and coloured second.** `theme.test`
 * asks a direction to separate its terrains by value rather than by hue, so
 * the four L* stops (0.34 · 0.43 · 0.53 · 0.70) were placed before a single
 * hue was picked, and spent ground was then put in the widest gap left
 * (0.615, between ROADS and MARKET). Nothing here was nudged to make a test
 * pass; the test's shape is what the palette was built on.
 */
export const SETTLEMENT: Theme = {
  id: 'settlement',
  name: { en: 'Settlement', 'fr-CA': 'Établissement' },
  note: {
    en: 'The plane once somebody stayed: a village at dusk, lit by its own lamps. Farm, market, quarry and roads: the same four grounds, named for what they are for. The dark is still out there past the last house.',
    'fr-CA':
      'Le plan une fois que quelqu’un est resté : un village au crépuscule, éclairé par ses propres lampes. Ferme, marché, carrière et chemins : les quatre mêmes sols, nommés pour ce qu’ils servent. Le noir est encore là, passé la dernière maison.',
  },
  source: 'Authored 2026-08-29 from Marc’s own reading of the colours (D4.4).',

  // Flat-top, like the two directions that ship. A settlement reads as built
  // rather than grown, and a flat top is the side a wall can stand on.
  orientation: 'flat',

  /*
   * The one direction whose art is not weather.
   *
   * Every ground here was made by a hand, and until 2026-08-29 the baked art
   * did not know that: `scripts/terrain.ts` drew moss tufts, dry grass, ember
   * glints and tide ripples in settlement's colours, because it had one set of
   * figures and recoloured them per direction. Recolouring is the right answer
   * for three directions that are the same place at three exposures. It is the
   * wrong answer for a place that is a different place.
   *
   * Worse than wrong, as it turned out: the baker chose its drawing off each
   * slot's declared pattern KIND, and this direction is the only one that
   * departs from the plane's kinds — so MARKET, whose stripes are a hatch
   * where the plane's brightest ground is dots, matched nothing and baked with
   * no texture at all, and QUARRY lost its cut-face overlay the same way. The
   * live procedural painter drew both correctly the whole time, which means
   * the ART path was worse than the fallback it supersedes.
   */
  motif: 'settlement',

  board: {
    // Dusk, not night. Warm because everything here is lamplight and earth,
    // and dark enough that the falloff below still has somewhere to fall to.
    background: 0x14100c,
    seam: 0.05,
    // The seam between two plots reads as a boundary rather than a shadow —
    // this is a place with property lines.
    edge: 0x3a2f24,
    edgeWidth: 0.05,
    legalEdge: 0xd8a24a,
    ripeEdge: 0xffd98a,
    ripeEdgeWidth: 0.16,
    /*
     * A settlement's dark is the country outside it, not the walls of a cave —
     * it should suggest a horizon rather than close one in.
     *
     * **0.55 → 0.30 on 2026-09-08, and the number is Marc's.** The board had
     * never drawn this at all: the channel was authored against Ashwake 1's
     * flat Pixi board and nothing in this body read it, so 0.55 was a value
     * nobody had ever seen applied to a LIT, three-dimensional board that
     * already falls off at its own edges. Shown the choice, Marc took a little
     * over half. `?vignette=` overrides it without a rebuild, which is how the
     * last word on it gets said — on a phone, by looking.
     */
    vignette: { colour: 0x080604, strength: 0.3 },
    home: { ring: 0xd8a24a, ringWidth: 0.07 },
    beaconFade: 0.72,
    sheen: 0.05,
    shade: 0.08,
  },

  ink: {
    bg: 0x14100c,
    ink: 0xf2e6cf,
    inkDim: 0xbfae92,
    // Lifted from 0x8e8069 while the direction was being built: the faint ink
    // is the one that has to survive BOTH the panel it sits on and the fogged
    // ground a remembered glyph is drawn over, and at the darker value it
    // cleared neither (4.31:1 on the panel, 2.36:1 over a remembered MARKET).
    // The floors did not move; this did.
    inkFaint: 0xa29278,
    accent: 0xd8a24a,
    lit: 0xffd98a,
    magic: 0x9b7fd4,
    unique: 0xf0913e,
    // Lifted from 0xe0523f, which read at 4.32:1 on the panel. DANGER is the
    // ink on the one control a player must never mis-tap, so it is the last
    // place to accept a number that only nearly clears.
    danger: 0xeb5642,
    panel: 0x241d16,
    panelEdge: 0x453729,
    panelEdgeActive: 0xd8a24a,
    // Dark halo, like every dark direction: the pale grounds are read by the
    // halo and the deep ones by the ink, which is why MARKET and QUARRY can sit
    // three stops apart and both stay legible.
    halo: 0x0b0906,
    haloWidth: 0.12,
  },

  type: {
    display: "Cinzel, 'Trajan Pro', Georgia, serif",
    label: "Cinzel, 'Trajan Pro', Georgia, serif",
    body: "'EB Garamond', Garamond, Georgia, serif",
    labelTracking: '0.16em',
    webfontHref: null,
  },

  motion: {
    popMs: 320,
    popStaggerMs: 70,
    // A harvest here is a delivery, not a burst of embers: the pool is
    // lamplight-gold rather than fire-orange.
    popColour: 0xffd98a,
    popAlpha: 0.72,
    popLift: 0.9,
    popGlowScale: 3.4,
    emberGravity: 0.6,
    emberLifeMs: 540,
  },

  voice: {
    pop: { baseHz: 349, stepHz: 24, decay: 0.22, wave: 'triangle' as const },
    claim: { cache: 262, site: 523, territory: 175, shrine: 440, find: 784 },
    claimDecay: 0.65,
    claimWave: 'triangle' as const,
    dry: { hz: 87, decay: 1.5 },
    gain: 0.18,
  },

  terrain: {
    // FARM. Planted rows, read as a hatch running with the furrow.
    green: surface(0x3f562f, {
      fillTo: 0x334726,
      pattern: { kind: 'hatch', angleDeg: 60, ink: 0x1e2b16, alpha: 0.24, bar: 2, gap: 5 },
      overlay: { kind: 'dots', ink: 0x6f8a52, alpha: 0.12, radius: 1.2, pitch: 12 },
      asset: 'terrain.green',
    }),
    // MARKET. Awning stripes and brass — the brightest ground, because it is
    // the one with lamps of its own.
    //
    // Striped with a wide HATCH rather than with `bands`, and that is a rule
    // rather than a preference: bands are opaque and reach the middle of the
    // face, so a banded terrain puts a third colour under a centred label and
    // `paint.test` says so. Every terrain in every shipped direction uses a
    // translucent ink for the same reason; bands are for the wall, which
    // carries no label.
    yellow: surface(0xcda54c, {
      fillTo: 0xb08a36,
      pattern: { kind: 'hatch', angleDeg: 90, ink: 0xf0d79a, alpha: 0.22, bar: 3, gap: 6 },
      overlay: { kind: 'dots', ink: 0x7a5a1c, alpha: 0.14, radius: 1.4, pitch: 13 },
      asset: 'terrain.yellow',
    }),
    // QUARRY. Cut faces and rubble. The dots are stone, and the rule they
    // stand for is the one that eats it.
    red: surface(0xa04e2e, {
      fillTo: 0x83391f,
      pattern: { kind: 'dots', ink: 0x3f1a0e, alpha: 0.24, radius: 1.6, pitch: 9 },
      overlay: { kind: 'hatch', angleDeg: 30, ink: 0x51230f, alpha: 0.12, bar: 1, gap: 6 },
      asset: 'terrain.red',
    }),
    // ROADS. Paving, running straight, wet enough to hold the lamplight.
    // A hatch, for the reason MARKET is one — see there.
    blue: surface(0x5f839b, {
      fillTo: 0x466478,
      pattern: { kind: 'hatch', angleDeg: 0, ink: 0x9dbccf, alpha: 0.2, bar: 2, gap: 7 },
      overlay: { kind: 'hatch', angleDeg: 0, ink: 0x2b4353, alpha: 0.14, bar: 1, gap: 8 },
      asset: 'terrain.blue',
    }),
  },

  terrainNames: {
    en: { green: 'FARM', yellow: 'MARKET', red: 'QUARRY', blue: 'ROADS' },
    // Québec French, and each still names its power the way D4.2 requires.
    // CARRIÈRE for the quarry rather than MINE: a quarry is cut from the
    // surface, which is what red does to spent ground.
    'fr-CA': { green: 'FERME', yellow: 'MARCHÉ', red: 'CARRIÈRE', blue: 'CHEMINS' },
  },

  /*
   * The power words ARE the ground names here, and that is the direction's
   * whole argument (D7, Marc: "names of each color reveal what they do").
   *
   * A farm is a crowd, a market is where difference pays, a quarry eats stone,
   * a road prices distance. There is no second word to add — so both places
   * that print one drop it rather than stutter: the card says "QUARRY."
   * instead of "QUARRY — ash." and the tip says "· stone and walls beside
   * QUARRY count as matches" instead of leading with a word already on the
   * card. The rule is `groundHead`'s, written for torchlit's own ASH and TIDE
   * in 2026-08-27 and now doing the job it was shaped for.
   */
  powerNames: {
    en: { green: 'FARM', yellow: 'MARKET', red: 'QUARRY', blue: 'ROADS' },
    'fr-CA': { green: 'FERME', yellow: 'MARCHÉ', red: 'CARRIÈRE', blue: 'CHEMINS' },
  },

  // Blocked ground is unbuilt rock: the darkest thing on the board, and the one
  // surface here that nobody made.
  wall: surface(0x2a2420, {
    pattern: { kind: 'bands', angleDeg: 135, a: 0x2a2420, b: 0x332c26, width: 10 },
    asset: 'terrain.wall',
  }),

  // Spent ground is worked-out ground: pale, dusty, and sitting between ROADS
  // and MARKET in the ladder — the widest gap the four colours left.
  stone: surface(0x9f9383, {
    fillTo: 0x877c6d,
    pattern: { kind: 'dots', ink: 0x5f574c, alpha: 0.2, radius: 1.1, pitch: 6 },
    overlay: { kind: 'hatch', angleDeg: 25, ink: 0x5f574c, alpha: 0.14, bar: 1, gap: 9 },
    scorch: true,
    asset: 'terrain.stone',
  }),

  empty: surface(0x1c1710, { inset: 0.09 }),
  ghost: surface(0xd8a24a, { fillTo: 0x8a6323, alpha: 0.26, asset: 'terrain.ghost' }),

  // The lamps reach about as far as torchlit's torch does. A settlement is
  // brighter at its centre than a camp and just as dark past the last house.
  light: { radius: 6, fade: 10, floor: 0.4 },

  /*
   * What the town has forgotten: still there, gone quiet.
   *
   * Deepened 0.34 → 0.45 for the same failure the faint ink was lifted for.
   * MARKET is the brightest ground here, so its REMEMBERED form was the one
   * landing in the dead band where neither a light glyph nor a dark one
   * reads — and pulling memory further toward the dark board is the fix that
   * is also the truer sentence. A settlement forgets more completely than a
   * survey does.
   */
  fog: { veil: 0.45, alpha: 0.55 },
};
