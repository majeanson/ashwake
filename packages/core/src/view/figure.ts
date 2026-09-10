import { type Colour } from '@content/tuning';
import type { IconName } from '@theme/icons';
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
 * optionally a number or an icon drawn on it — which between them say everything the
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
 *  the stroke ladder would draw round it; `mark` is the NUMBER printed on it
 *  and `icon` the mark drawn on it. All four are the board's own vocabulary,
 *  and `icon` is a registry name rather than a character since 2026-08-30. */
type FigCell = {
  readonly q: number;
  readonly r: number;
  readonly ground: Colour | 'stone' | 'wall';
  /**
   * MAGIC and UNIQUE are rings here, and that is where the rarity's own
   * colour lives (Marc, 2026-08-20: "make sure magic and unique have their
   * own color").
   *
   * There was a `tone` beside `mark` for exactly that job — the MARK's voice,
   * so a figure would not draw both STARS in the plain ink and teach that the
   * two look alike. Cut 2026-09-10, when `pnpm sweep` found it set by no
   * figure and read by nothing: the stars themselves went on 2026-08-30, when
   * the `rare` figure below was rewritten to draw what this board actually
   * draws. There is no star anywhere in the 3D body, so there is no mark left
   * to have a voice. The distinction it protected is alive, one field up.
   */
  readonly ring?: 'legal' | 'ripe' | 'lit' | 'spent' | 'magic' | 'unique';
  readonly mark?: string;
  readonly icon?: IconName;
  /** A preview number is faint where a ripe tile's worth is not — the same
   *  distinction `labelFor` makes on the board. */
  readonly faint?: boolean;
};

/** One card in a `cards` figure. `slot: 'hold'` draws the dashed HOLD slot. */
type FigCard = { readonly colour: Colour } | { readonly slot: 'hold' };

type FigureSpec = {
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
      { q: 0, r: 0, ground: 'wall', ring: 'lit', icon: 'cache' },
      { q: 2, r: -1, ground: 'wall', ring: 'lit', icon: 'site' },
      { q: 1, r: 1, ground: 'stone', icon: 'shrine', faint: true },
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

  /*
   * RARE: what a placed rare actually looks like ON THIS BOARD (2026-08-30).
   *
   * It drew two stars, because Ashwake 1's 2D board printed a star on a placed
   * rare and the figure was carried over with the rule. **This board has never
   * done that.** `board/rings.ts` gives a rare tile a RING in its own rarity's
   * colour and `board/relief.ts` stands it taller than its neighbours; there is
   * no star anywhere in the 3D body, and the manual, the figure and
   * `s.rareStar` all promised one for five stages.
   *
   * Found while replacing the symbol language with icons (Marc: "no emojis
   * only phosphor icons or assets") — a figure whose mark had to be looked up
   * is a figure whose claim gets read. The same class as the ♪ button the
   * catalogue promised and the board did not have.
   */
  rare: {
    hexes: [
      { q: 0, r: 0, ground: 'blue', ring: 'magic' },
      { q: 1, r: 0, ground: 'yellow', ring: 'unique' },
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

type FigureLayout = {
  readonly cells: readonly PlacedCell[];
  readonly width: number;
  readonly height: number;
  /*
   * There were a `halfW` and a `halfH` here, cut 2026-09-10 — half the drawn
   * width and height of one hex at this size and facing.
   *
   * `pnpm sweep` found both written on every layout and read by nothing.
   * `Figure.tsx` draws a hex from `corners`, which measures its own six
   * points, and the two numbers are still computed INSIDE `layoutOf` where the
   * bounding box needs them. What was dead was handing them back out.
   */
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
  if (placed.length === 0) return { cells: [], width: 0, height: 0 };
  const minX = Math.min(...placed.map((p) => p.x)) - halfW;
  const minY = Math.min(...placed.map((p) => p.y)) - halfH;
  const width = Math.max(...placed.map((p) => p.x)) + halfW - minX;
  const height = Math.max(...placed.map((p) => p.y)) + halfH - minY;
  return {
    cells: placed.map((p) => ({ ...p.cell, x: p.x - minX, y: p.y - minY })),
    width,
    height,
  };
}
