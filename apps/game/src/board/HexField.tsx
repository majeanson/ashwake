import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Object3D, type InstancedMesh } from 'three';
import type { HexKey } from '@engine/hex';
import type { BoardView, CellView } from '@render/Renderer';
import type { Layout } from '@render/layout';
import { cellTint } from '@theme/torch';
import { depthOf, type AssetId, type Theme } from '@theme/tokens';
import type { AssetBook } from './assets';
import { breath, STILL_BREATH } from './ambient';
import { TAP_SLOP } from './camera';
import { markerAt } from './cursor';
import { capacityFor, groundBatches, HEX_RADIUS, standOf, type GroundBatch } from './ground';
import { commitInstances } from './instances';
import { Labels } from './Labels';
import { thetaStartFor } from './prism';
import { Props } from './Props';
import { useBatchResources } from './resources';
import { ringsOf } from './rings';
import { TEXTURE_PX, type SurfaceTextures } from './surfaces';

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
  /** Still light, no pulse, no drift. */
  readonly reducedMotion: boolean;
  /** The direction's own art, where any has loaded. */
  readonly assets: AssetBook;
  /** The shared texture cache, so the pop layer bakes nothing twice. */
  readonly textures: SurfaceTextures;
  /** Where the keyboard's marker is standing, or null while nobody has
   *  pressed a key. */
  readonly cursor: HexKey | null;
  readonly onTap: (key: HexKey, cell: CellView) => void;
};

export function HexField({
  view,
  theme,
  orientation,
  relief,
  materials,
  yaw,
  reducedMotion,
  assets,
  textures,
  cursor,
  onTap,
}: HexFieldProps) {
  const layout = useMemo<Layout>(() => ({ ...UNIT, orientation }), [orientation]);
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);

  useLayoutEffect(() => {
    textures.setAnisotropy(gl.capabilities.getMaxAnisotropy());
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
        // A beacon sits at its still value until the breath takes over, so a
        // reduced-motion board is lit rather than merely un-animated.
        const lit = batch.kind === 'beacon' ? STILL_BREATH : 1;
        scratchColor.setRGB(
          (((tint >> 16) & 0xff) / 255) * lit,
          (((tint >> 8) & 0xff) / 255) * lit,
          ((tint & 0xff) / 255) * lit,
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

  /**
   * The beacons breathe.
   *
   * A beacon is a promise that there is somewhere to go, and the pulse is what
   * keeps the promise visible on a board that is otherwise still. It is the
   * only thing on the board that asks for frames when nothing has happened, so
   * it stops asking the moment there are no beacons — an empty board should
   * draw nothing at all.
   */
  useFrame(() => {
    if (reducedMotion) return;
    let breathing = false;
    for (const batch of batches) {
      if (batch.kind !== 'beacon' || batch.items.length === 0) continue;
      const mesh = meshes.current.get(batch.key);
      if (mesh === undefined) continue;
      breathing = true;
      const lit = breath(performance.now());
      batch.items.forEach((item, i) => {
        const tint = cellTint(theme, item.cell);
        scratchColor.setRGB(
          (((tint >> 16) & 0xff) / 255) * lit,
          (((tint >> 8) & 0xff) / 255) * lit,
          ((tint & 0xff) / 255) * lit,
        );
        mesh.setColorAt(i, scratchColor);
      });
      if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;
    }
    if (breathing) invalidate();
  });

  /**
   * What the finger meant, out of everything the ray went through.
   *
   * **A wall never wins over ground behind it** (Marc, 2026-08-29: "if we hit
   * a wall and a tile underneath, prioritize the tile"). A wall is the tallest
   * thing on the board, so the moment the camera leans it stands in front of
   * the hexes beyond it and the ray reaches it first — and a wall is the one
   * kind of ground you can never do anything with. Taking the nearest hit
   * meant a leaned board quietly refusing placements that a flat one allowed,
   * which reads as the game ignoring you.
   *
   * So the whole ray is considered, nearest first, and anything that is not a
   * wall outranks a wall however far behind it stands. Walls stay tappable —
   * `describeHexOf` has a sentence for them — they just go last.
   *
   * The handler is attached per batch but resolves GLOBALLY, so whichever mesh
   * R3F reaches first answers for all of them and stops the rest.
   */
  const tap = () => (event: ThreeEvent<MouseEvent>) => {
    // A tap is a lift that never travelled: R3F reports how far the pointer
    // moved between down and up, and past the slop this was a drag.
    if (event.delta > TAP_SLOP) return;
    // The secondary button and Shift are the desktop's turn-and-lean gesture
    // (`Board`), and a gesture that ends without travelling far enough to
    // register must not fall through into a PLACEMENT — the one action on this
    // board that cannot be undone.
    if (event.button !== 0 || event.shiftKey) return;

    const byMesh = new Map<InstancedMesh, GroundBatch>();
    for (const b of batches) {
      const mesh = meshes.current.get(b.key);
      if (mesh !== undefined) byMesh.set(mesh, b);
    }

    let wall: CellView | null = null;
    for (const hit of event.intersections) {
      const batch = byMesh.get(hit.object as InstancedMesh);
      if (batch === undefined || !isTappable(batch)) continue;
      const item = hit.instanceId === undefined ? undefined : batch.items[hit.instanceId];
      if (item === undefined) continue;
      if (batch.kind === 'wall') {
        wall ??= item.cell;
        continue;
      }
      event.stopPropagation();
      onTap(item.cell.key, item.cell);
      return;
    }

    // Nothing but wall along the whole ray, so the wall is genuinely what was
    // pointed at and gets to say its line.
    if (wall !== null) {
      event.stopPropagation();
      onTap(wall.key, wall);
    }
  };

  const capacity = capacityFor(view.cells.length);
  const thetaStart = thetaStartFor(orientation);
  const marker = useMemo(
    () => (cursor === null ? null : markerAt(view.cells, cursor, layout, relief)),
    [cursor, view.cells, layout, relief],
  );

  return (
    <group>
      {batches.map((batch) => {
        const geometry = geometryFor(batch.kind);
        const material = materialsFor(batch);
        if (geometry === undefined || material === undefined) return null;
        const tappable = isTappable(batch);
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
            {...(tappable ? { onClick: tap() } : {})}
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
      {/*
        The keyboard's marker (2026-08-29).

        OUTSIDE the hex, where no other mark ever goes. Every stroke the board
        already draws is on the hex's own edge and each one means something
        about the ground — ripe, legal, rare, home, targeted — so a marker
        drawn there would either be mistaken for one of them or take the edge
        away from whichever one was there. A ring standing just clear of the
        outline belongs to the player rather than to the ground, which is
        exactly what it is.

        One mesh, not an instanced one: there is at most a single marker, and
        it costs a draw call only while somebody is using a keyboard.
      */}
      {marker !== null && (
        <mesh
          position={[marker.x, marker.top, marker.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          raycast={() => null}
        >
          <ringGeometry
            args={[HEX_RADIUS + 0.06, HEX_RADIUS + 0.24, 6, 1, thetaStart + Math.PI / 2]}
          />
          <meshBasicMaterial color={theme.ink.accent} toneMapped={false} />
        </mesh>
      )}
      <Props cells={view.cells} theme={theme} layout={layout} relief={relief} />
      <Labels cells={view.cells} theme={theme} layout={layout} relief={relief} yaw={yaw} />
    </group>
  );
}

/**
 * Which kinds of ground answer a tap.
 *
 * Beacons and remembered fog are drawn but not asked: a beacon is a promise
 * about somewhere else and remembered ground is a memory, and neither is a
 * place a tile can go. One predicate, because the raycast and the render both
 * need the same answer and two copies of it is how they come to disagree.
 */
function isTappable(batch: GroundBatch): boolean {
  return batch.kind !== 'beacon' && batch.kind !== 'remembered';
}
