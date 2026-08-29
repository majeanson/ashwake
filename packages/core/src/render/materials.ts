import { fieldGround, type AssetId, type Rgb, type Surface, type Theme } from '@theme/tokens';
import type { CellView } from './Renderer';

/**
 * Which surface a cell wears (Stage 2c, 2026-08-29).
 *
 * Lifted from Ashwake 1's `PixiRenderer#surfaceFor`, which is where it should
 * never have lived: "a claimed destination goes quiet and wears stone" is a
 * statement about what the game means, not about a rendering library, and the
 * moment a second renderer existed it either re-derived the answer or disagreed
 * with the first. The values are unchanged and the arguments travel with them.
 *
 * Pure, and no DOM: this says which `Surface` and which ghost, `paint.ts` turns
 * that into layers, and the app turns the layers into a texture.
 */

/** A surface, plus the direction's own art ghosted into it where there is any. */
export type CellSurface = {
  readonly surface: Surface;
  /** A native field's ghost — the terrain slot's art, under its own pattern. */
  readonly ghost: { readonly asset: AssetId; readonly alpha: number } | null;
};

const plain = (surface: Surface): CellSurface => ({ surface, ghost: null });

/**
 * The dots a destination and a shimmer both wear. One radius and one pitch,
 * two alphas: a destination says "come here" and a shimmer says only
 * "something is here", and the difference between those two sentences is the
 * alpha and the glyph the label rule withholds.
 */
const speckle = (ink: Rgb, alpha: number) =>
  ({ kind: 'dots', ink, alpha, radius: 1.6, pitch: 5 }) as const;

/**
 * @param hasArt whether the direction's art for an asset slot has actually
 *   loaded. A manifest that names a file the server will not serve is stale,
 *   not fatal, so this is asked per slot rather than assumed per direction.
 */
export function surfaceFor(
  cell: CellView,
  theme: Theme,
  hasArt: (asset: AssetId) => boolean,
): CellSurface {
  switch (cell.kind) {
    case 'wall':
      return plain(theme.wall);

    case 'stone':
      return plain(theme.stone);

    case 'landmark': {
      // A hidden find's shimmer: the same glow vocabulary, quieter, and saying
      // strictly less — accent dots at low alpha, no glyph, no outline. The
      // player learns that SOMETHING is near, and that is the whole message
      // the sense upgrade sells.
      if (cell.shimmer) {
        return plain({ ...theme.wall, pattern: speckle(theme.ink.accent, 0.22), alpha: 0.3 });
      }
      // A destination wears the wall's ground — it is solid, and should read as
      // a THING standing on the plane — lit with the direction's own `lit`
      // while unclaimed, gone quiet once reached. A territory glows in the
      // colour of the field claiming it unfurls, so the walk is toward a known
      // reward. A beacon is the same surface faded, glowing through ground that
      // is not drawn yet.
      const base: Surface = cell.claimed
        ? theme.stone
        : {
            ...theme.wall,
            pattern: speckle(
              cell.colour !== null ? theme.terrain[cell.colour].fill : theme.ink.lit,
              0.45,
            ),
          };
      return plain(cell.beacon ? { ...base, alpha: theme.board.beaconFade } : base);
    }

    case 'empty': {
      // Native ground: `fieldGround` owns the WHOLE decision, not just the
      // pattern, so a workbench and the board cannot disagree. With the terrain
      // slot's own art loaded the ground is the empty fill plus that art
      // ghosted over it; without, the procedural texture fields have always
      // worn, carrying the terrain's overlay too.
      if (cell.native === null) return plain(theme.empty);
      const asset = theme.terrain[cell.native].asset;
      const ground = fieldGround(theme, cell.native, asset !== null && hasArt(asset));
      return ground.kind === 'art'
        ? { surface: ground.base, ghost: { asset: ground.asset, alpha: ground.ghostAlpha } }
        : plain(ground.surface);
    }

    case 'tile':
      // A tile with no colour cannot happen — `view.ts` sets colour on every
      // tile — but the view type permits it, and a board that silently vanishes
      // is worse than one that shows stone.
      return plain(cell.colour === null ? theme.stone : theme.terrain[cell.colour]);
  }
}

/**
 * The colour a hex's SIDES take.
 *
 * Ashwake 1 had no sides. A prism does, and painting the baked top texture down
 * them would run a gradient authored for a face seen flat-on down a face seen
 * edge-on, which reads as a smear. The shaded end of the fill instead, so a
 * column reads continuous from its top to the floor — and it is a number the
 * budget can grade, which a texture's average would not be.
 */
export const sideColour = (surface: Surface): Rgb => surface.fillTo ?? surface.fill;
