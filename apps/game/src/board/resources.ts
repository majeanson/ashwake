import { useEffect, useMemo } from 'react';
import { MeshLambertMaterial, type BufferGeometry, type Material, type Texture } from 'three';
import { sideColour } from '@render/materials';
import type { Orientation } from '@theme/tokens';
import type { GroundBatch } from './ground';
import { HEX_RADIUS } from './ground';
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

export type BatchResources = {
  readonly geometryFor: (kind: Kind) => BufferGeometry | undefined;
  readonly materialsFor: (batch: GroundBatch) => readonly Material[] | undefined;
};

export function useBatchResources(
  batches: readonly GroundBatch[],
  orientation: Orientation,
  textures: SurfaceTextures,
  artFor: (batch: GroundBatch) => CanvasImageSource | null,
): BatchResources {
  const prisms = useMemo(
    () => new Map(KINDS.map((kind) => [kind, hexPrism(HEX_RADIUS, HEIGHT[kind], orientation)])),
    [orientation],
  );
  useEffect(() => () => prisms.forEach((geometry) => geometry.dispose()), [prisms]);

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

  const materials = useMemo(() => {
    const next = new Map<string, readonly Material[]>();
    for (const batch of batches) {
      next.set(batch.key, cache.get(batch.key) ?? build(batch, textures, artFor(batch)));
    }
    return next;
  }, [batches, textures, artFor, cache]);

  // The prune, once the new set is on screen: a material dropped here is one
  // no committed frame is drawing with any more.
  useEffect(() => {
    for (const [key, set] of cache) {
      if (!materials.has(key)) for (const material of set) material.dispose();
    }
    cache.clear();
    for (const [key, set] of materials) cache.set(key, set);
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
