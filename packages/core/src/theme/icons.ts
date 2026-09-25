/**
 * The game's symbol language, as ICONS (2026-08-30).
 *
 * Marc: *"no emojis only phosphor icons or assets."*
 *
 * Every mark in this game used to be a Unicode character — `✚ ★ ◈ ❖ ✦ ▲ ◆ ■ ●
 * ⬢ ◉ ✤ ▦ ▨ ❋ ✓ ◇ ← ✕ ▾ ♪`. That is a set of decisions each phone's font stack
 * gets to overrule: a character is a REQUEST for a shape, and the answer
 * differs by platform, by font, by whether the glyph exists at all. Three of
 * them were already being drawn by a font (`cinzel.ttf`) chosen for a
 * wordmark rather than for symbols.
 *
 * An icon is the shape itself. The registries below are unchanged in every
 * other respect: the same four grounds, five destinations, one game voice,
 * seven concepts and two chrome marks, in the same four registries, with the
 * same no-collision rule — `tokens.test.ts` still checks that no two of them
 * draw the same thing, because a symbol language with a homonym in it is a
 * language nobody learns.
 *
 * ## Why a NAME lives in the core and a path does not
 *
 * `packages/core` has no DOM and no React (`CLAUDE.md`), and an SVG path is
 * neither — but it is a fact about how a thing is DRAWN, and the core's job
 * is what a thing MEANS. So the core names the icon and every host draws it:
 * `apps/game/src/ui/Icon.tsx` for the chrome, `board/marks.ts` for the board's
 * own textures, and `scripts/phosphor.ts` vendors the paths for both. The
 * alternative — paths in the core — would put a rendering decision behind the
 * lint that exists to keep them out.
 *
 * `ICON_SOURCE` is the one place that says which Phosphor file each name is
 * cut from, so the WEIGHT is a reviewable decision rather than a habit.
 */

/** Every icon this game draws. A closed set, deliberately: the argument for a
 *  symbol language is that it is small enough to learn. */
export type IconName =
  // The four grounds. The shapes are the ones this game has taught since
  // 2026-08-18 — a triangle, a diamond, a square and a disc — because the
  // point of the swap is the RENDERING, not the vocabulary.
  | 'ground.green'
  | 'ground.yellow'
  | 'ground.red'
  | 'ground.blue'
  // The game's own voice, on a card that is about the game rather than about
  // one landmark or colour.
  | 'tile'
  // The five destinations.
  | 'cache'
  | 'site'
  | 'shrine'
  | 'territory'
  | 'find'
  // The cross-screen concepts.
  | 'relic'
  | 'luck'
  // The HUD's own row. Five joined `luck` on 2026-09-08, when Marc chose the
  // stat row as six marks rather than six words — see `screens/Hud`'s
  // `STAT_ICON`. There is no `tiles` here: `tile` already draws one.
  | 'points'
  | 'reach'
  | 'cost'
  | 'left'
  | 'wall'
  | 'stone'
  | 'fame'
  | 'met'
  | 'notYet'
  // The two things a ripe pocket can be spent ON. They are concepts rather
  // than chrome: the same pair names a button, a manual section and the
  // receipt the pop leaves behind.
  | 'pop'
  | 'sacrifice'
  // The lens panel's rows (2026-09-24, Marc: "give symbols … to each stat").
  // Each names a quantity the receipts already speak — a share, a hand, the
  // size bonus, the rare jackpot, the placing — so a row and the sentence
  // that prices the same thing can wear one mark.
  | 'share'
  | 'hand'
  | 'size'
  | 'jackpot'
  | 'placing'
  // The chrome's own affordances, which say something about the SCREEN rather
  // than about the plane. Nothing on the board may ever be one of these.
  | 'back'
  | 'close'
  | 'more'
  | 'menu'
  | 'help'
  | 'soundOn'
  | 'soundOff';

/**
 * Which Phosphor file each name is cut from.
 *
 * FILL for the game's own vocabulary: those marks are read at 16px on a card
 * and at hex size on a leaning board, and a hairline survives neither — the
 * lesson the heavy `✚` was chosen for on 2026-08-26 (Marc, from the phone:
 * *"I can clearly see the stars one, the + cache not so much"*).
 *
 * BOLD for the chrome, because a back arrow and a close cross are read at
 * button size, where an outline is clearer than a slab and where a filled
 * square around an X would read as a second control.
 *
 * `notYet` is the one REGULAR: a dashed ring is a shape that has to stay open
 * to mean "not yet", and there is no filled form of an absence.
 */
export const ICON_SOURCE: Readonly<Record<IconName, string>> = {
  'ground.green': 'fill/triangle-fill.svg',
  'ground.yellow': 'fill/diamond-fill.svg',
  'ground.red': 'fill/square-fill.svg',
  'ground.blue': 'fill/circle-fill.svg',
  tile: 'fill/hexagon-fill.svg',

  // A cache is supplies you open; a site is the thing you can see from far
  // away; a shrine UNLOCKS a system for the world, permanently; a territory
  // is ground claimed; a find is a shimmer.
  cache: 'fill/package-fill.svg',
  site: 'fill/star-fill.svg',
  shrine: 'fill/key-fill.svg',
  territory: 'fill/flag-banner-fill.svg',
  find: 'fill/sparkle-fill.svg',

  /*
   * The two ways to spend a pocket (2026-08-30, Marc: *"make em icons,
   * associate in how to play and cards too"*).
   *
   * A HAND TAKING and a FLAME, and the pair is the point: one keeps what the
   * pocket is worth, the other burns it for what the next run is worth. Chosen
   * for being the two silhouettes furthest from everything already in the set
   * — there is no other hand and no other fire here, and a mark is only worth
   * having if it cannot be mistaken at 16px for one of the twenty beside it.
   * `site` is a star and `find` a sparkle, which is why neither of these is a
   * burst.
   */
  pop: 'fill/hand-grabbing-fill.svg',
  sacrifice: 'fill/flame-fill.svg',

  // The lens panel's rows (2026-09-24). A pie for a share of the whole, an
  // open hand for what is held (`pop` is a hand TAKING), outward arrows for
  // a bonus that grows with size, a pin for where a tile was placed. The
  // jackpot is a SPARKLE of four points and `find` is `sparkle` too, so it
  // takes the star-four instead — no two marks here may share a silhouette.
  share: 'fill/chart-pie-fill.svg',
  hand: 'fill/hand-fill.svg',
  size: 'fill/arrows-out-fill.svg',
  jackpot: 'fill/star-four-fill.svg',
  placing: 'fill/push-pin-fill.svg',

  relic: 'fill/coins-fill.svg',
  luck: 'fill/clover-fill.svg',

  /*
   * THE STAT ROW, as marks (2026-09-08).
   *
   * Chosen against the twenty-three already here rather than for their own
   * sake: a mark is only worth having if it cannot be mistaken at 16px for one
   * of the others, and this row draws all six side by side at the top of the
   * screen, where a confusion is permanent.
   *
   * `points` is a SIGMA — a running total, and the only shape in the set that
   * is a letter rather than an object, which is what keeps it clear of `relic`
   * (coins) and `fame` (a trophy). `reach` is a COMPASS: how far out you have
   * got, where `site`'s star and `find`'s sparkle are things on the ground.
   * `cost` is a TAG, the price of the next placement. `left` is an HOURGLASS,
   * the only clock this game has.
   */
  points: 'fill/sigma-fill.svg',
  reach: 'fill/compass-fill.svg',
  cost: 'fill/tag-fill.svg',
  left: 'fill/hourglass-fill.svg',
  wall: 'fill/wall-fill.svg',
  stone: 'fill/stack-fill.svg',
  fame: 'fill/trophy-fill.svg',
  met: 'fill/check-fat-fill.svg',
  notYet: 'regular/circle-dashed.svg',

  back: 'bold/arrow-left-bold.svg',
  close: 'bold/x-bold.svg',
  more: 'bold/caret-down-bold.svg',
  menu: 'bold/list-bold.svg',
  help: 'bold/question-bold.svg',
  soundOn: 'bold/speaker-high-bold.svg',
  soundOff: 'bold/speaker-slash-bold.svg',
};

/** The four grounds, by the colour the rules call them. */
export const COLOUR_ICON = {
  green: 'ground.green',
  yellow: 'ground.yellow',
  red: 'ground.red',
  blue: 'ground.blue',
} as const satisfies Readonly<Record<'green' | 'yellow' | 'red' | 'blue', IconName>>;

/** The five destinations. Fixed across directions, for the same reason the
 *  grounds are: a symbol language that changes with the art direction is a
 *  language nobody learns. */
export const LANDMARK_ICON = {
  cache: 'cache',
  site: 'site',
  shrine: 'shrine',
  territory: 'territory',
  find: 'find',
} as const satisfies Readonly<Record<'cache' | 'site' | 'shrine' | 'territory' | 'find', IconName>>;

/** The game's own voice — a hex, because the game is hexes. */
export const TILE_ICON: IconName = 'tile';

/**
 * THE HUD'S SIX, as marks (2026-09-08).
 *
 * "Stats stay words" was this file's rule until Marc overturned it. The reason
 * is in `screens/Hud`'s own `STAT_ICON` note and it is not aesthetic: French is
 * the default locale, `TUILES` and `PORTÉE` clipped at 390 and lost most of
 * themselves at 320, and every fix available to a WORD is a way of losing
 * gracefully. `luck` had been a mark since the row was built and had never
 * clipped in any language at any width. So all six are marks.
 *
 * **Here rather than in the screen, and that is the point of moving it.** The
 * symbol language belongs to the core — `tokens.test.ts` walks every registry
 * in this file and fails if a vendored icon is drawn by nothing or a named one
 * was never vendored, which is the check that keeps twenty-nine marks honest.
 * A table of marks living in `apps/` is a table that check cannot see.
 *
 * `tiles` reuses `tile`: the stat is tiles, and the game's own voice is
 * already a hex.
 */
/**
 * THE LENS PANEL'S MARKS (2026-09-24, Marc: "give symbols … to each stat").
 * One per row of a held ground's sheet and of its price table, picked here so
 * the registry stays the only thing that picks a mark. Where a row prices a
 * thing the game already has a mark for — a tile, a pop, the reach, a site's
 * bounty, the points sum — it wears that one.
 */
export const LENS_ICON = {
  share: 'share',
  perTile: 'tile',
  pockets: 'pop',
  best: 'fame',
  inHand: 'hand',
  worth: 'tile',
  size: 'size',
  distance: 'reach',
  placing: 'placing',
  jackpot: 'jackpot',
  bounty: 'site',
  perPop: 'pop',
  points: 'points',
} as const satisfies Readonly<Record<string, IconName>>;

export const STAT_ICON = {
  tiles: 'tile',
  points: 'points',
  luck: 'luck',
  map: 'reach',
  cost: 'cost',
  left: 'left',
} as const satisfies Readonly<
  Record<'tiles' | 'points' | 'luck' | 'map' | 'cost' | 'left', IconName>
>;

/** Cross-screen CONCEPTS, as distinct from the grounds, the destinations and
 *  the game's own voice. Marks only for ideas that recur across screens; the
 *  HUD's own row is `STAT_ICON` above. */
export const CONCEPT_ICON = {
  relic: 'relic',
  luck: 'luck',
  wall: 'wall',
  stone: 'stone',
  fame: 'fame',
  met: 'met',
  notYet: 'notYet',
  // Both earn a place by the registry's own rule — a mark only for an idea
  // that RECURS across screens. POP is the action bar, the manual's own POP
  // section and the receipt every harvest leaves; SACRIFICE is the bar, its
  // manual section, and the receipt a burn leaves.
  pop: 'pop',
  sacrifice: 'sacrifice',
} as const satisfies Readonly<
  Record<
    'relic' | 'luck' | 'wall' | 'stone' | 'fame' | 'met' | 'notYet' | 'pop' | 'sacrifice',
    IconName
  >
>;

/**
 * The chrome's own marks, and deliberately NOT part of the game's vocabulary:
 * these say something about the SCREEN rather than about the plane, which is
 * why they are exempt from the no-collision rule that binds the other four
 * registries — and why nothing on the board may ever be one of them.
 *
 * **AND EVERY SCREEN WENT ROUND IT UNTIL 2026-09-10.** `pnpm sweep` found this
 * table read only by `tokens.test.ts`: `MENU`, the fold, the panel's BACK and
 * CLOSE, and MORE's speaker each wrote `<Icon name="menu" />` as a literal,
 * while their neighbours on the same screens went through `CONCEPT_ICON`. It
 * is `STAT_ICON`'s shape exactly — the table that says WHICH, with a test, and
 * a render that hard-codes past it (`CLAUDE.md`, 2026-09-08).
 *
 * It matters here more than it looks: the test asserts nothing on the board may
 * be one of these seven, and a screen holding the string rather than the key
 * would keep drawing a renamed icon's old name while the test went on passing
 * about a table nobody used. The five call sites read the table now.
 */
export const CHROME_ICON = {
  back: 'back',
  close: 'close',
  more: 'more',
  menu: 'menu',
  help: 'help',
  soundOn: 'soundOn',
  soundOff: 'soundOff',
} as const satisfies Readonly<
  Record<'back' | 'close' | 'more' | 'menu' | 'help' | 'soundOn' | 'soundOff', IconName>
>;
