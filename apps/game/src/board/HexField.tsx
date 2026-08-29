import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Object3D, type InstancedMesh } from 'three';
import type { HexKey } from '@engine/hex';
import type { BoardView, CellView } from '@render/Renderer';
import type { Layout } from '@render/layout';
import { cellTint } from '@theme/torch';
import { depthOf, type AssetId, type Theme } from '@theme/tokens';
import type { AssetBook } from './assets';
import { capacityFor, groundBatches, HEX_RADIUS, standOf, type GroundBatch } from './ground';
import { commitInstances } from './instances';
import { Labels } from './Labels';
import { jumpOf, type Leap } from './leap';
import { thetaStartFor } from './prism';
import { useBatchResources } from './resources';
import { ringsOf } from './rings';
import { SurfaceTextures, TEXTURE_PX } from './surfaces';

/**
 * The board, as instances (Stage 2, 2026-08-28; split into its parts and given
 * its materials in Stage 2c, 2026-08-29).
 *
 * One `InstancedMesh` per batch — a kind of prism wearing one surface — with the
 * baked material on its top face, the shaded end of its own fill down its sides,
 * and the torch as a per-instance tint.
 *
 * This file is composition and GPU buffers, and nothing else. What is on the
 * board and what it is made of lives in `ground.ts` over the core's
 * `surfaceFor`/`paintPlan`; which edge a cell wears in `rings.ts`; what it
 * prints in `Labels.tsx`; how high a popped tile jumps in `leap.ts`; the prism
 * in `prism.ts`; the GPU objects and their disposal in `resources.ts`. Each is
 * testable without a canvas, which is why materials could land without this
 * file growing.
 *
 * Everything is positioned by `render/layout.ts`'s `place()` at size 1, so the
 * scene's unit is one hex radius and the camera decides what a unit is worth in
 * pixels. The engine never learns a pixel exists, and neither does this file —
 * it learns a metre.
 */

const scratchColor = new Color();
const dummy = new Object3D();

export type { Leap } from './leap';

export const UNIT: Layout = { size: 1, originX: 0, originY: 0, orientation: 'pointy' };

export type HexFieldProps = {
  readonly view: BoardView;
  readonly theme: Theme;
  readonly orientation: Layout['orientation'];
  /** How high the ground itself varies, in hex radii; 0 is the flat board. */
  readonly relief: number;
  /** 0 paints the ground alone; above 0 paints the whole material. */
  readonly materials: number;
  /** Degrees the board is turned under the camera. */
  readonly yaw: number;
  /** The direction's own art, where any has loaded. */
  readonly assets: AssetBook;
  /** The pop's leap in flight, if any — the cells that just left, rising. */
  readonly leap: Leap | null;
  readonly onTap: (key: HexKey, cell: CellView) => void;
};

export function HexField({
  view,
  theme,
  orientation,
  relief,
  materials,
  yaw,
  assets,
  leap,
  onTap,
}: HexFieldProps) {
  const layout = useMemo<Layout>(() => ({ ...UNIT, orientation }), [orientation]);
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);

  const textures = useMemo(() => new SurfaceTextures(), []);
  useLayoutEffect(() => {
    textures.setAnisotropy(gl.capabilities.getMaxAnisotropy());
    return () => textures.dispose();
  }, [textures, gl]);

  const hasArt = useCallback((asset: AssetId) => assets.has(asset), [assets]);
  const batches = useMemo(
    () =>
      groundBatches(view.cells, {
        theme,
        layout,
        relief,
        materials,
        texturePx: TEXTURE_PX,
        depth: depthOf(theme),
        hasArt,
      }),
    [view, theme, layout, relief, materials, hasArt],
  );

  const artFor = useCallback(
    (batch: GroundBatch) => (batch.asset === null ? null : assets.image(batch.asset)),
    [assets],
  );
  const { geometryFor, materialsFor } = useBatchResources(batches, orientation, textures, artFor);

  const rings = useMemo(
    () => ringsOf(view.cells, theme, layout, relief),
    [view, theme, layout, relief],
  );

  const leapRef = useRef<Leap | null>(null);
  leapRef.current = leap;
  const meshes = useRef(new Map<string, InstancedMesh>());
  const ringMesh = useRef<InstancedMesh | null>(null);

  // Write every instance's matrix and tint. Runs after each render of the view;
  // the leap animation only touches the popped tiles' Y.
  useLayoutEffect(() => {
    for (const batch of batches) {
      const mesh = meshes.current.get(batch.key);
      if (mesh === undefined) continue;
      batch.items.forEach((item, i) => {
        const stand = standOf(item, batch.kind);
        dummy.position.set(item.x, stand.height / 2, item.z);
        dummy.scale.set(1, stand.scaleY, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        // The TINT, not the finished colour: the surface itself is in the
        // texture now, and the torch multiplies it in display space on the GPU
        // (`torchShader.ts`). `setRGB` writes into the working space unchanged,
        // which is what lets the shader read the display-space numbers.
        const tint = cellTint(theme, item.cell);
        scratchColor.setRGB(
          ((tint >> 16) & 0xff) / 255,
          ((tint >> 8) & 0xff) / 255,
          (tint & 0xff) / 255,
        );
        mesh.setColorAt(i, scratchColor);
      });
      commitInstances(mesh, batch.items.length);
    }

    const rm = ringMesh.current;
    if (rm !== null) {
      rings.forEach((ring, i) => {
        dummy.position.set(ring.x, ring.top, ring.z);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        dummy.rotation.set(0, 0, 0);
        rm.setMatrixAt(i, dummy.matrix);
        scratchColor.set(ring.colour);
        rm.setColorAt(i, scratchColor);
      });
      commitInstances(rm, rings.length);
    }
    invalidate();
  }, [batches, rings, theme, invalidate]);

  useFrame(() => {
    const active = leapRef.current;
    if (active === null) return;
    const { lift, done } = jumpOf(theme.motion, active, performance.now());
    let moved = false;
    for (const batch of batches) {
      if (batch.kind !== 'stone') continue;
      const mesh = meshes.current.get(batch.key);
      if (mesh === undefined) continue;
      let any = false;
      batch.items.forEach((item, i) => {
        if (!active.keys.has(item.cell.key)) return;
        any = true;
        const stand = standOf(item, batch.kind);
        dummy.position.set(item.x, stand.height / 2 + lift, item.z);
        dummy.scale.set(1, stand.scaleY, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      // A leap moves instances, so the cached bounds go stale here too — a tap
      // during a harvest is still a tap.
      if (any) commitInstances(mesh, batch.items.length);
      moved ||= any;
    }
    if (moved && !done) invalidate();
  });

  const tap = (batch: GroundBatch) => (event: ThreeEvent<MouseEvent>) => {
    // A tap is a lift that never travelled: R3F reports how far the pointer
    // moved between down and up, and past the slop this was a drag.
    if (event.delta > 8) return;
    const id = event.instanceId;
    if (id === undefined) return;
    const item = batch.items[id];
    if (item === undefined) return;
    event.stopPropagation();
    onTap(item.cell.key, item.cell);
  };

  const capacity = capacityFor(view.cells.length);
  const thetaStart = thetaStartFor(orientation);

  return (
    <group>
      {batches.map((batch) => {
        const geometry = geometryFor(batch.kind);
        const material = materialsFor(batch);
        if (geometry === undefined || material === undefined) return null;
        const tappable = batch.kind !== 'beacon' && batch.kind !== 'remembered';
        return (
          <instancedMesh
            key={`${batch.key}-${capacity}`}
            ref={(mesh) => {
              if (mesh !== null) meshes.current.set(batch.key, mesh);
              else meshes.current.delete(batch.key);
            }}
            args={[geometry, undefined, capacity]}
            material={material}
            frustumCulled={false}
            {...(tappable ? { onClick: tap(batch) } : {})}
          />
        );
      })}
      <instancedMesh
        key={`rings-${capacity}`}
        ref={(mesh) => {
          ringMesh.current = mesh;
        }}
        args={[undefined, undefined, capacity]}
        frustumCulled={false}
        raycast={() => null}
      >
        <ringGeometry args={[HEX_RADIUS - 0.16, HEX_RADIUS, 6, 1, thetaStart + Math.PI / 2]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <Labels cells={view.cells} theme={theme} layout={layout} relief={relief} yaw={yaw} />
    </group>
  );
}
