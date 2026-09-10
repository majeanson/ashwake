import { useEffect, useMemo } from 'react';
import { MeshLambertMaterial, type BufferGeometry, type Material, type Texture } from 'three';
import { sideColour } from '@render/materials';
import type { Orientation, Theme } from '@theme/tokens';
import type { GroundBatch } from './ground';
import { hexRadiusOf } from './ground';
import { hexPrism, PRISM_BOTTOM, PRISM_SIDE, PRISM_TOP } from './prism';
import { HEIGHT, KINDS, type Kind } from './relief';
import type { SurfaceTextures } from './surfaces';
import { withTorch } from './torchShader';
import { useOnce } from '../shell/useOnce';

/**
 * The GPU objects a board needs, and their disposal (Stage 2c, 2026-08-29).
 *
 * Geometries and materials are the two things on the board that are not garbage
 * collected — three holds them on the GPU until something calls `dispose` — so
 * they live here rather than scattered through the field component, and every
 * one that is created has a line that frees it.
 *
 * **Geometry is per KIND, not per batch.** `instanceMatrix` and `instanceColor`
 * are properties of the `InstancedMesh`, not of its geometry, so twenty meshes
 * standing at six heights need six geometries between them.
 *
 * **Material is per batch**, because the top face carries that batch's baked
 * texture. Three materials go into each mesh — side, top, bottom — in the group
 * order `CylinderGeometry` fixes.
 */

type BatchResources = {
  readonly geometryFor: (kind: Kind) => BufferGeometry | undefined;
  readonly materialsFor: (batch: GroundBatch) => readonly Material[] | undefined;
};

/**
 * THE PRISMS ARE SHARED AND NEVER REBUILT (2026-09-02).
 *
 * There are six kinds and two orientations, so there are twelve prisms that
 * this game can ever need, and every one of them is immutable: a prism is a
 * radius, a height and a rotation, none of which depends on a board.
 *
 * They used to be a `useMemo` inside the hook with a disposal effect — and
 * `useBatchResources` is called by TWO components. `Pop` mounts for the length
 * of a harvest and unmounts, so **every pop built six geometries and threw
 * them away**: buffer churn on the GPU at the exact moment the board has the
 * least to spare, for six objects that were already sitting in `HexField`.
 *
 * Module scope, built on first ask, and not disposed — because "dispose" here
 * would mean freeing something that is about to be asked for again. Twelve
 * small geometries is the whole of what this cache can ever hold PER RADIUS,
 * and a lost WebGL context does not invalidate them: `three` re-uploads from
 * the arrays the geometry still holds (see `board/gl.ts`).
 *
 * Keyed by radius as well as orientation (2026-09-04): a prism's radius comes
 * from its direction's `theme.board.seam` now, not a fixed constant, so a
 * session that ever sees two directions needs a set per radius they actually
 * ask for — never more than the number of directions this game ships.
 */
const PRISMS = new Map<string, Map<Kind, BufferGeometry>>();

function prismsFor(orientation: Orientation, radius: number): Map<Kind, BufferGeometry> {
  const key = `${orientation}|${radius}`;
  let set = PRISMS.get(key);
  if (set === undefined) {
    set = new Map(KINDS.map((kind) => [kind, hexPrism(radius, HEIGHT[kind], orientation)]));
    PRISMS.set(key, set);
  }
  return set;
}

export function useBatchResources(
  batches: readonly GroundBatch[],
  orientation: Orientation,
  theme: Theme,
  textures: SurfaceTextures,
  artFor: (batch: GroundBatch) => CanvasImageSource | null,
): BatchResources {
  const prisms = prismsFor(orientation, hexRadiusOf(theme));

  /*
   * MATERIALS OUTLIVE A RENDER, AND DISPOSING ONE IS NOT A COMPUTATION
   * (rewritten 2026-09-02).
   *
   * The cache was a `useRef`, and the memo below both READ and WROTE
   * `made.current` while rendering, and freed GPU resources on the way past.
   * Three things wrong with that, in increasing order of how much they matter:
   *
   *   - A ref written during render is a value React cannot see change, which
   *     is what `react-hooks/refs` is for. It went unseen because the rules of
   *     hooks were scoped to `*.tsx` and this is a `.ts`.
   *   - Under StrictMode the memo factory runs TWICE. It survived only because
   *     the second pass finds everything already cached and disposes nothing —
   *     survival by luck, not by construction.
   *   - **`dispose()` frees a GPU handle.** React is allowed to throw a memo's
   *     result away and recompute it, and a recompute that disposes the
   *     materials the last committed frame is drawing with is a black board.
   *
   * So: the cache is a plain `Map`, built once by `useOnce` and owned by this
   * hook the way the board owns every other mutable thing it holds — which is
   * the exemption `eslint.config.js` grants `board/` and states the reason for.
   * The memo only BUILDS. Everything that frees anything happens in an effect,
   * after the render that uses the new set has been committed.
   */
  const cache = useOnce(() => new Map<string, readonly Material[]>());

  /*
   * The cache is written HERE, as each material is built, and read back on the
   * very next pass (2026-09-03).
   *
   * The first version of this fix moved the write into the effect below, so
   * the memo only read — and that reintroduced the leak it was meant to
   * remove, one layer down. React double-invokes a memo factory under
   * StrictMode, and with the cache not yet written **both passes see it empty
   * and both build**, orphaning the first set with nothing holding a reference
   * to dispose it. The same window opens in production for any render React
   * starts and throws away.
   *
   * The old ref version got this right by accident of ordering. What was
   * actually wrong with it was never the write — it was the `dispose()` beside
   * the write, freeing GPU handles during a render that might not commit.
   *
   * So: remember immediately, free only after the commit. Mutating a plain Map
   * this hook owns is the exemption `eslint.config.js` grants `board/` and
   * states the reason for; it is not a ref, so nothing about it is invisible
   * to React.
   */
  const materials = useMemo(() => {
    const next = new Map<string, readonly Material[]>();
    for (const batch of batches) {
      const set = cache.get(batch.key) ?? build(batch, textures, artFor(batch));
      cache.set(batch.key, set);
      next.set(batch.key, set);
    }
    return next;
  }, [batches, textures, artFor, cache]);

  // The prune, once the new set is on screen: a material dropped here is one
  // no committed frame is drawing with any more.
  useEffect(() => {
    for (const [key, set] of cache) {
      if (materials.has(key)) continue;
      for (const material of set) material.dispose();
      cache.delete(key);
    }
  }, [materials, cache]);

  useEffect(
    () => () => {
      for (const set of cache.values()) for (const material of set) material.dispose();
      cache.clear();
    },
    [cache],
  );

  return {
    geometryFor: (kind) => prisms.get(kind),
    materialsFor: (batch) => materials.get(batch.key),
  };
}

function build(
  batch: GroundBatch,
  textures: SurfaceTextures,
  art: CanvasImageSource | null,
): readonly Material[] {
  const { surface } = batch;
  const translucent = surface.alpha < 1;
  const common = {
    transparent: translucent,
    opacity: surface.alpha,
    // Flat, because `cylinderGeometry` shares its torso normals between
    // neighbouring segments — a six-sided prism shades as a rounded blob
    // otherwise, which was most of why the board read flat.
    flatShading: true,
    /*
     * And NOT tone mapped, like every other material on this board.
     *
     * The rings, the marks and the marker all pass `toneMapped: false`; the
     * ground — the largest surface on screen and the one the contrast budget is
     * graded against — did not. It is harmless today only because the `<Canvas>`
     * is `flat`, which turns tone mapping off globally, so the invariant
     * `gl.ts` spends a page arguing for is being kept by exactly one thing. A
     * second statement of it costs nothing and means a future `flat` being
     * dropped is a look change somebody notices rather than a palette quietly
     * going through a filmic curve.
     */
    toneMapped: false,
  };

  const top = withTorch(new MeshLambertMaterial(common));
  const texture: Texture | null = textures.get(batch.key, batch.plan, art);
  if (texture !== null) top.map = texture;

  // The sides take the gradient's shaded end rather than the baked texture: a
  // gradient authored for a face seen flat-on, run down a face seen edge-on,
  // reads as a smear. It is also a number the budget can grade.
  const side = withTorch(new MeshLambertMaterial({ ...common, color: sideColour(surface) }));

  const set: Material[] = [];
  set[PRISM_SIDE] = side;
  set[PRISM_TOP] = top;
  set[PRISM_BOTTOM] = side;
  return set;
}
