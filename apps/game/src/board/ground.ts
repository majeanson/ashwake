import type { CellView } from '@render/Renderer';
import { place, type Layout } from '@render/layout';
import { surfaceFor } from '@render/materials';
import { flatPlan, paintPlan, type PaintOp } from '@render/paint';
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

/**
 * The radius a prism is actually built at, once its direction's seam
 * (`theme.board.seam`) is taken out.
 *
 * Was a flat `1 - 0.06` (found 2026-09-04, Marc, on a phone: *"the contours
 * are too thick"*) — every direction authors a narrower gutter, 0.04 or 0.05,
 * and this ignored it, so the gap between every hex on every board was wider
 * than any direction asked for. `tokens.ts`'s `Board.seam` docblock had this
 * down as a known, deliberately unwired look decision; this is that decision
 * landing.
 */
export function hexRadiusOf(theme: Theme): number {
  return 1 - theme.board.seam;
}

/**
 * How much WIDER a surface's own gutter is than the board's, as a fraction of
 * the hex radius (2026-09-08, Marc: honour `Surface.inset` as authored).
 *
 * ## Two gutters that are the same quantity, and the trap in reading one
 *
 * `board.seam` and `Surface.inset` are both "gap as a fraction of the hex
 * radius", authored in two places. Every terrain sits at `0.06` and **`empty`
 * sits at `0.09`** in both directions, deliberately, so that open ground reads
 * looser than ground you have built. The board drew one flat value, so that
 * distinction had never been visible.
 *
 * **Honouring `inset` literally would have undone a fix Marc asked for by
 * looking.** `seam` is 0.04–0.05; terrain's `inset` is 0.06. Taking the
 * absolute number would widen the gutter under EVERY hex back to what it was
 * before 2026-09-04 — the build he saw on a phone and said *"the contours are
 * too thick"* about. Landing one look decision by silently reverting another
 * is not honouring anything.
 *
 * So what is read is the DIFFERENCE the authoring expresses, not its absolute
 * value: a surface gets the board's seam plus however much its own inset
 * exceeds the terrain baseline. Built ground keeps exactly the weight Marc
 * tuned; empty ground gets the extra 0.03 its direction asks for. **The
 * arithmetic is mine and the intent is the theme's**, which is worth saying
 * plainly — if the looser reading was wanted, this function is where it
 * changes.
 *
 * The baseline is read off a terrain rather than hard-coded, so a direction
 * that re-authors its grid moves both halves together.
 */
export function gutterOf(theme: Theme, surface: Surface): number {
  const base = theme.terrain.green.inset;
  return Math.max(0, surface.inset - base);
}

/** The radius a given SURFACE's prism is built at, as a fraction of the shared
 *  geometry's — an instance scale, so no batch needs its own geometry. */
export function radiusScaleOf(theme: Theme, surface: Surface): number {
  const shared = hexRadiusOf(theme);
  if (shared <= 0) return 1;
  return (shared - gutterOf(theme, surface)) / shared;
}

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

    /*
     * KEYED BY THE SURFACE, AND THE PLAN BUILT ONCE PER BATCH (2026-09-02).
     *
     * The key used to be `${kind}|${asset}|${planKey(plan)}` — which meant
     * `paintPlan` and a `JSON.stringify` of its whole result ran **once per
     * CELL**. On a five-hundred-hex board that is five hundred plan graphs and
     * a few hundred kilobytes of transient JSON, on every view change — every
     * placement, every pop, every flip of what is legal — to discover about
     * twenty distinct answers. The batching was already the answer; it was
     * being computed after the expensive part instead of before it.
     *
     * The surface is what the plan is a pure function OF (with `opts`, which is
     * fixed for the whole call), so keying on the surface groups exactly as
     * finely and the plan can be built when a bucket is opened.
     *
     * **It also closes a real hole.** `surface.alpha` is not in the plan — it
     * reaches the GPU through the material — so two surfaces that differed only
     * in alpha shared a key, shared a batch, and every cell in it drew at
     * whichever alpha arrived first. The ghost/preview surface is the one below
     * 1, which is exactly where it would have shown.
     *
     * `JSON.stringify` rather than a hand-written signature, for the reason
     * `planKey`'s own docblock gives about being generated from the ops: a
     * structural key cannot forget a field, and a hand-written one is one
     * `Surface` field away from silently merging two paints.
     */
    const key = `${kind}|${asset ?? '-'}|${art?.alpha ?? '-'}|${JSON.stringify(surface)}`;
    let bucket = out.get(key);
    if (bucket === undefined) {
      const plan =
        opts.materials > 0
          ? paintPlan(surface, {
              texturePx: opts.texturePx,
              depth: opts.depth,
              ...(art === undefined ? {} : { art }),
            })
          : flatPlan(surface);
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
