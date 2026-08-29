import { useEffect, useMemo, useRef } from 'react';
import { MeshLambertMaterial, type BufferGeometry, type Material, type Texture } from 'three';
import { sideColour } from '@render/materials';
import type { Orientation } from '@theme/tokens';
import type { GroundBatch } from './ground';
import { HEX_RADIUS } from './ground';
import { hexPrism, PRISM_BOTTOM, PRISM_SIDE, PRISM_TOP } from './prism';
import { HEIGHT, KINDS, type Kind } from './relief';
import type { SurfaceTextures } from './surfaces';
import { withTorch } from './torchShader';

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

  // Materials outlive a render, so they are kept in a ref and pruned when the
  // batch set changes — a board that grew a new kind of ground should not leak
  // the material of ground it no longer has.
  const made = useRef(new Map<string, readonly Material[]>());

  const materials = useMemo(() => {
    const next = new Map<string, readonly Material[]>();
    for (const batch of batches) {
      const existing = made.current.get(batch.key);
      next.set(batch.key, existing ?? build(batch, textures, artFor(batch)));
    }
    for (const [key, set] of made.current) {
      if (!next.has(key)) for (const material of set) material.dispose();
    }
    made.current = next;
    return next;
  }, [batches, textures, artFor]);

  useEffect(() => {
    const held = made.current;
    return () => {
      for (const set of held.values()) for (const material of set) material.dispose();
      held.clear();
    };
  }, []);

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
