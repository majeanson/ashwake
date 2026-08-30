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
  | 'wall'
  | 'stone'
  | 'fame'
  | 'met'
  | 'notYet'
  // The chrome's own affordances, which say something about the SCREEN rather
  // than about the plane. Nothing on the board may ever be one of these.
  | 'back'
  | 'close'
  | 'more'
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

  relic: 'fill/coins-fill.svg',
  luck: 'fill/clover-fill.svg',
  wall: 'fill/wall-fill.svg',
  stone: 'fill/stack-fill.svg',
  fame: 'fill/trophy-fill.svg',
  met: 'fill/check-fat-fill.svg',
  notYet: 'regular/circle-dashed.svg',

  back: 'bold/arrow-left-bold.svg',
  close: 'bold/x-bold.svg',
  more: 'bold/caret-down-bold.svg',
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

/** Cross-screen CONCEPTS, as distinct from the grounds, the destinations and
 *  the game's own voice. Marks only for ideas that recur across screens;
 *  stats stay words. */
export const CONCEPT_ICON = {
  relic: 'relic',
  luck: 'luck',
  wall: 'wall',
  stone: 'stone',
  fame: 'fame',
  met: 'met',
  notYet: 'notYet',
} as const satisfies Readonly<
  Record<'relic' | 'luck' | 'wall' | 'stone' | 'fame' | 'met' | 'notYet', IconName>
>;

/**
 * The chrome's own marks, and deliberately NOT part of the game's vocabulary:
 * these say something about the SCREEN rather than about the plane, which is
 * why they are exempt from the no-collision rule that binds the other four
 * registries — and why nothing on the board may ever be one of them.
 */
export const CHROME_ICON = {
  back: 'back',
  close: 'close',
  more: 'more',
  help: 'help',
  soundOn: 'soundOn',
  soundOff: 'soundOff',
} as const satisfies Readonly<
  Record<'back' | 'close' | 'more' | 'help' | 'soundOn' | 'soundOff', IconName>
>;
