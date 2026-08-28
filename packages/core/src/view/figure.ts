import { type Colour } from '@content/tuning';
import { place } from '@render/layout';
import type { Orientation } from '@theme/tokens';
import type { Strings } from '@text/Strings';

/**
 * The manual's figures — extracted from `Game` on 2026-08-28, and made pure
 * the same day the core became a package.
 *
 * It left the class for the reason `tips.ts` did the day before: **a second
 * host needs it.** `#figure` was private, so the only surface in the game
 * that could show a picture of a rule was the manual — while the teaching
 * CARD that first states the same rule, at the moment a stranger actually
 * meets it, could show nothing at all. Marc: "the world, the screen, etc.
 * should be from in-game too, not just text."
 *
 * What lives here is the SPEC of each figure and its geometry; drawing it is
 * the app's job (a React `Figure`), because a picture is the one thing in a
 * rule's teaching that has to know what a pixel is. The caption is prose and
 * comes from `text/`, like every other sentence.
 */

/**
 * `hexes` is the whole language: a cell is a ground, optionally a ring, and
 * optionally a mark drawn on it — which between them say everything the
 * figures need to say. Every value maps to something the BOARD already
 * paints, so a figure cannot show a state the game does not have: the grounds
 * are the four terrains plus stone and wall, the rings are the stroke ladder's
 * own (`legal`, `ripe`, `lit`), and a mark is the same glyph or number
 * `labelFor` would put there.
 *
 * `cards` is the one exception, for THE STASH. That section is about the
 * dashed HOLD card, which is chrome rather than board — a hex grid physically
 * cannot say it — so the figure is a row of the real card markup instead.
 */
export type FigureId = 'ripen' | 'destinations' | 'place' | 'pop' | 'rare' | 'stash';

/** What a figure's cell is made of. `ground` is what it is; `ring` is what
 *  the stroke ladder would draw round it; `mark` is what would be printed on
 *  it. All three are the board's own vocabulary. */
export type FigCell = {
  readonly q: number;
  readonly r: number;
  readonly ground: Colour | 'stone' | 'wall';
  readonly ring?: 'legal' | 'ripe' | 'lit' | 'spent';
  readonly mark?: string;
  /** A preview number is faint where a ripe tile's worth is not — the same
   *  distinction `labelFor` makes on the board. */
  readonly faint?: boolean;
  /**
   * The mark's own voice, where it has one.
   *
   * MAGIC and UNIQUE have worn their own colours on the board since
   * 2026-08-20 (Marc: "make sure magic and unique have their own color") —
   * so a figure that drew both stars in the plain ink would be teaching that
   * the two look alike, on the one section whose whole job is telling them
   * apart. The first draft of the rare figure did exactly that and the
   * screenshot caught it.
   */
  readonly tone?: 'magic' | 'unique';
};

/** One card in a `cards` figure. `held` draws the dashed HOLD slot. */
export type FigCard =
  { readonly colour: Colour; readonly held?: boolean } | { readonly slot: 'hold' };

export type FigureSpec = {
  readonly hexes?: readonly FigCell[];
  readonly cards?: readonly FigCard[];
};

/**
 * The figures themselves — data, so adding one is a table edit.
 *
 * Every ring in here is MIXED on purpose wherever the rule is about matching:
 * worth counts neighbours of the same colour, so a picture of six identical
 * tiles would quietly teach a rule the game does not have. That was the
 * original figure's own note and it governs all of them.
 */
export const FIGURES: Record<FigureId, FigureSpec> = {
  // Six around one — the rule the whole game rests on, and the one a sentence
  // has never carried well.
  ripen: {
    hexes: [
      { q: 1, r: 0, ground: 'green' },
      { q: 0, r: 1, ground: 'yellow' },
      { q: -1, r: 1, ground: 'green' },
      { q: -1, r: 0, ground: 'red' },
      { q: 0, r: -1, ground: 'green' },
      { q: 1, r: -1, ground: 'blue' },
      { q: 0, r: 0, ground: 'green', ring: 'ripe', mark: '3' },
    ],
  },

  // What "lights out in the dark are worth walking to" actually looks like —
  // the line START has always carried and never shown. One still-lit
  // destination against one already spent, because the difference between
  // them is the whole navigation rule (`faint means spent`, 2026-08-27).
  destinations: {
    hexes: [
      { q: 0, r: 0, ground: 'wall', ring: 'lit', mark: '✚' },
      { q: 2, r: -1, ground: 'wall', ring: 'lit', mark: '★' },
      { q: 1, r: 1, ground: 'stone', mark: '◈', faint: true },
    ],
  },

  // PLACE: the glowing edge and the promised number, which are two separate
  // claims the section makes in two separate sentences.
  place: {
    hexes: [
      { q: 0, r: 0, ground: 'green' },
      { q: 1, r: -1, ground: 'blue' },
      { q: 1, r: 0, ground: 'green', ring: 'legal', mark: '2', faint: true },
      { q: 0, r: 1, ground: 'green', ring: 'legal', mark: '1', faint: true },
      { q: 2, r: -1, ground: 'wall' },
    ],
  },

  // POP: a pocket is not one tile. Three ripe tiles touching, with the stone
  // a previous pop already left beside them — so the section's two facts
  // ("they pop together" and "popped tiles turn to stone") share one picture.
  pop: {
    hexes: [
      { q: 0, r: 0, ground: 'red', ring: 'ripe', mark: '4' },
      { q: 1, r: 0, ground: 'red', ring: 'ripe', mark: '4' },
      { q: 0, r: 1, ground: 'red', ring: 'ripe', mark: '3' },
      { q: 1, r: -1, ground: 'stone' },
      { q: -1, r: 1, ground: 'yellow' },
    ],
  },

  // RARE: what the section's last line promises — "a placed rare tile wears a
  // star, so its power stays findable on a full map" — which was the only
  // claim in the manual about something you can SEE that showed nothing.
  rare: {
    hexes: [
      { q: 0, r: 0, ground: 'blue', mark: '✦', tone: 'magic' },
      { q: 1, r: 0, ground: 'yellow', mark: '✦', tone: 'unique' },
      { q: 0, r: 1, ground: 'green' },
    ],
  },

  stash: {
    cards: [{ colour: 'green' }, { colour: 'red' }, { slot: 'hold' }],
  },
};

/** The one line that says what a figure shows, in the language asked for. */
export const figureCaption = (id: FigureId, s: Strings): string => s.figure[id];

/** A figure's cell, positioned. `x`/`y` are the centre in the figure's own
 *  pixel space, already shifted so the top-left of the drawing is 0,0. */
export type PlacedCell = FigCell & { readonly x: number; readonly y: number };

export type FigureLayout = {
  readonly cells: readonly PlacedCell[];
  readonly width: number;
  readonly height: number;
  /** Half the drawn width and height of one hex at this size and facing. */
  readonly halfW: number;
  readonly halfH: number;
};

/**
 * A figure's hexes laid out on the same axial grid the board uses (`place`,
 * from `render/layout.ts`) at the same orientation the theme chose. So the
 * picture is not an illustration OF the game — it is the game's own
 * geometry, and it follows a facing change without anybody redrawing it.
 * Pure: the host turns these numbers into whatever it draws with.
 */
export function figureLayout(spec: FigureSpec, orientation: Orientation, size = 21): FigureLayout {
  const layout = { size, originX: 0, originY: 0, orientation };
  const cells = spec.hexes ?? [];
  const halfW = orientation === 'pointy' ? (Math.sqrt(3) / 2) * size : size;
  const halfH = orientation === 'pointy' ? size : (Math.sqrt(3) / 2) * size;
  const placed = cells.map((cell) => ({ cell, ...place({ q: cell.q, r: cell.r }, layout) }));
  if (placed.length === 0) return { cells: [], width: 0, height: 0, halfW, halfH };
  const minX = Math.min(...placed.map((p) => p.x)) - halfW;
  const minY = Math.min(...placed.map((p) => p.y)) - halfH;
  const width = Math.max(...placed.map((p) => p.x)) + halfW - minX;
  const height = Math.max(...placed.map((p) => p.y)) + halfH - minY;
  return {
    cells: placed.map((p) => ({ ...p.cell, x: p.x - minX, y: p.y - minY })),
    width,
    height,
    halfW,
    halfH,
  };
}
