import type { CellView } from '@render/Renderer';
import { place, type Layout } from '@render/layout';
import { surfaceFor } from '@render/materials';
import { flatPlan, paintPlan, planKey, type PaintOp } from '@render/paint';
import type { AssetId, Depth, Surface, Theme } from '@theme/tokens';
import { HEIGHT, kindOf, liftOf, type Kind } from './relief';

/**
 * What ground is on the board, where, and what it is made of (Stage 2c,
 * 2026-08-29).
 *
 * Pure: it turns a `BoardView` into batches of positioned instances and says
 * which surface each batch wears, and it never touches three or a GPU buffer.
 * The field writes those batches into instance matrices; this file is what a
 * test can read.
 *
 * **A batch is a kind AND a surface**, not just a kind. An `InstancedMesh`
 * shares one material and therefore one texture, and a landmark wears the
 * wall's ground speckled in the colour of the territory claiming it, a claimed
 * one wears stone, a native field wears its own equalised pattern — so grouping
 * by prism height alone stopped being enough the moment a hex became a material
 * instead of a colour. About twenty batches on a live board, against a renderer
 * that already spends one draw call per LABEL; if a phone ever complains, the
 * next move is a texture array, and this boundary is where it would go.
 */

/** The seam between hexes, as a shrink of the prism's radius. */
export const SEAM = 0.06;

/** The radius a prism is actually built at, once the seam is taken out. */
export const HEX_RADIUS = 1 - SEAM;

export type GroundItem = {
  readonly cell: CellView;
  /** Board coordinates, in hex radii. */
  readonly x: number;
  readonly z: number;
  /** How far the relief lifts this cell's floor. */
  readonly lift: number;
};

export type GroundBatch = {
  /** Stable identity: same kind, same paint, same mesh. */
  readonly key: string;
  readonly kind: Kind;
  readonly surface: Surface;
  readonly plan: readonly PaintOp[];
  /** The direction's own art slot for this batch, where its plan asks for one. */
  readonly asset: AssetId | null;
  readonly items: readonly GroundItem[];
};

export type GroundOpts = {
  readonly theme: Theme;
  readonly layout: Layout;
  readonly relief: number;
  /** 0 paints the ground alone; above 0 paints the whole material. */
  readonly materials: number;
  readonly texturePx: number;
  readonly depth: Depth;
  readonly hasArt: (asset: AssetId) => boolean;
};

/** Every drawn cell, bucketed by the prism it stands as and the paint it wears. */
export function groundBatches(
  cells: readonly CellView[],
  opts: GroundOpts,
): readonly GroundBatch[] {
  const out = new Map<string, { batch: Omit<GroundBatch, 'items'>; items: GroundItem[] }>();

  for (const cell of cells) {
    const kind = kindOf(cell);
    if (kind === null) continue;

    const { surface, ghost } = surfaceFor(cell, opts.theme, opts.hasArt);
    // Asset beats pattern beats fill. A field's ghost goes UNDER its marks at a
    // fraction of a tile's strength; any other surface's own art replaces the
    // procedural layers outright.
    const own = surface.asset !== null && opts.hasArt(surface.asset) ? surface.asset : null;
    const asset = ghost?.asset ?? own;
    const art =
      ghost !== null
        ? { alpha: ghost.alpha, replaces: false }
        : own !== null
          ? { alpha: 1, replaces: true }
          : undefined;

    const plan =
      opts.materials > 0
        ? paintPlan(surface, {
            texturePx: opts.texturePx,
            depth: opts.depth,
            ...(art === undefined ? {} : { art }),
          })
        : flatPlan(surface);

    // Two surfaces with the same plan but different art are different paint —
    // the plan says "art at 1.0", not WHICH art — so the slot joins the key.
    const key = `${kind}|${asset ?? '-'}|${planKey(plan)}`;
    let bucket = out.get(key);
    if (bucket === undefined) {
      bucket = { batch: { key, kind, surface, plan, asset }, items: [] };
      out.set(key, bucket);
    }

    const p = place({ q: cell.q, r: cell.r }, opts.layout);
    bucket.items.push({ cell, x: p.x, z: p.y, lift: liftOf(cell, opts.relief) });
  }

  return [...out.values()].map(({ batch, items }) => ({ ...batch, items }));
}

/**
 * How tall this instance stands and where its middle sits.
 *
 * Relief makes the ground THICKER, not floating: a lifted hex is a column
 * standing on the same floor as its neighbours, so the board reads as terrain
 * with depth rather than as tiles hovering over a hole. The prism is stretched,
 * never moved off the ground — which is why this returns a scale as well as a
 * height.
 */
export function standOf(item: GroundItem, kind: Kind): { height: number; scaleY: number } {
  const base = HEIGHT[kind];
  const height = base + item.lift;
  return { height, scaleY: height / base };
}

/**
 * Round up to a capacity, so the instanced meshes are not rebuilt per
 * placement — a new mesh is a new buffer, and a board grows one hex at a time.
 */
export const capacityFor = (n: number): number => Math.max(64, 1 << Math.ceil(Math.log2(n + 1)));
