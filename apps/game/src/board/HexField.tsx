import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Object3D, type InstancedMesh } from 'three';
import type { HexKey } from '@engine/hex';
import type { BoardView, CellView } from '@render/Renderer';
import type { Layout } from '@render/layout';
import { type Theme } from '@theme/tokens';
import {
  capacityFor,
  fillOf,
  groundBatches,
  HEX_RADIUS,
  lightOf,
  standOf,
  type GroundBatches,
} from './ground';
import { Labels } from './Labels';
import { jumpOf, type Leap } from './leap';
import { hexPrism, thetaStartFor } from './prism';
import { HEIGHT, KINDS, type Kind } from './relief';
import { ringsOf } from './rings';

/**
 * The board, as instances (Stage 2, 2026-08-28; split into its parts Stage 2c,
 * 2026-08-29).
 *
 * One `InstancedMesh` per KIND of ground — tiles, empties, stone, walls, the
 * remembered ground and the beacons — because each kind is a different prism
 * and an instanced mesh shares one geometry. Colour is per instance, so the
 * four terrains are four colours on one mesh rather than four meshes.
 *
 * This file is now composition and GPU buffers, and nothing else. What is on
 * the board and where lives in `ground.ts`; which edge a cell wears lives in
 * `rings.ts`; what it prints lives in `Labels.tsx`; how high a popped tile
 * jumps lives in `leap.ts`; the prism itself lives in `prism.ts`. Each of those
 * is testable without a canvas, which is the point of the split — Stage 2c adds
 * materials next, and a file that already did five jobs would have done six.
 *
 * Everything is positioned by `render/layout.ts`'s `place()` at size 1, so the
 * scene's unit is one hex radius and the camera decides what a unit is worth in
 * pixels. The engine never learns a pixel exists, and neither does this file —
 * it learns a metre.
 */

const scratchColor = new Color();
const scratchBg = new Color();
const dummy = new Object3D();

/** The torch: a cell's colour pulled toward the board's background by how dark
 *  it is. `light` is already resolved by the view.
 *
 *  OWED (Stage 2c step 5): Ashwake 1 did this multiply in sRGB space, and
 *  `theme.light.floor` and `MIN_LIT_FIELD_LIFT` were tuned against it. `Color`
 *  interpolates in the linear working space, so this is currently a brighter
 *  falloff than the one the palette was graded for. It moves into the core with
 *  the rig, where the board and the budget test can share one arithmetic. */
function litColour(fill: number, light: number, theme: Theme, into: Color): Color {
  into.set(fill);
  scratchBg.set(theme.board.background);
  return into.lerp(scratchBg, 1 - light);
}

export type { Leap } from './leap';

export const UNIT: Layout = { size: 1, originX: 0, originY: 0, orientation: 'pointy' };

export type HexFieldProps = {
  readonly view: BoardView;
  readonly theme: Theme;
  readonly orientation: Layout['orientation'];
  /** How high the ground itself varies, in hex radii; 0 is the flat board. */
  readonly relief: number;
  /** Degrees the board is turned under the camera. */
  readonly yaw: number;
  /** The pop's leap in flight, if any — the cells that just left, rising. */
  readonly leap: Leap | null;
  readonly onTap: (key: HexKey, cell: CellView) => void;
};

export function HexField({ view, theme, orientation, relief, yaw, leap, onTap }: HexFieldProps) {
  const layout = useMemo<Layout>(() => ({ ...UNIT, orientation }), [orientation]);
  const invalidate = useThree((s) => s.invalidate);

  const groups = useMemo<GroundBatches>(
    () => groundBatches(view.cells, layout, relief),
    [view, layout, relief],
  );
  const rings = useMemo(
    () => ringsOf(view.cells, theme, layout, relief),
    [view, theme, layout, relief],
  );

  const leapRef = useRef<Leap | null>(null);
  leapRef.current = leap;
  const meshes = useRef(new Map<Kind, InstancedMesh>());
  const ringMesh = useRef<InstancedMesh | null>(null);

  // One prism per kind: an instanced attribute lives on the geometry, so the
  // meshes cannot share one. Fifty vertices each — free.
  const prisms = useMemo(
    () =>
      new Map(
        KINDS.map((kind) => [kind, hexPrism(HEX_RADIUS, HEIGHT[kind], orientation)] as const),
      ),
    [orientation],
  );
  useLayoutEffect(() => () => prisms.forEach((geometry) => geometry.dispose()), [prisms]);

  // Write every instance's matrix and colour. Runs after each render of the
  // view; the leap animation only touches the popped tiles' Y.
  useLayoutEffect(() => {
    for (const kind of KINDS) {
      const mesh = meshes.current.get(kind);
      const items = groups.get(kind) ?? [];
      if (mesh === undefined) continue;
      items.forEach((item, i) => {
        const stand = standOf(item, kind);
        dummy.position.set(item.x, stand.height / 2, item.z);
        dummy.scale.set(1, stand.scaleY, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        litColour(fillOf(item.cell, theme), lightOf(item.cell, kind, theme), theme, scratchColor);
        if (item.cell.dimmed) scratchColor.multiplyScalar(0.45);
        mesh.setColorAt(i, scratchColor);
      });
      mesh.count = items.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;
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
      rm.count = rings.length;
      rm.instanceMatrix.needsUpdate = true;
      if (rm.instanceColor !== null) rm.instanceColor.needsUpdate = true;
    }
    invalidate();
  }, [groups, rings, theme, invalidate]);

  useFrame(() => {
    const active = leapRef.current;
    const mesh = meshes.current.get('stone');
    if (active === null || mesh === undefined) return;
    const { lift, done } = jumpOf(theme.motion, active, performance.now());
    const items = groups.get('stone') ?? [];
    let any = false;
    items.forEach((item, i) => {
      if (!active.keys.has(item.cell.key)) return;
      any = true;
      const stand = standOf(item, 'stone');
      dummy.position.set(item.x, stand.height / 2 + lift, item.z);
      dummy.scale.set(1, stand.scaleY, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    if (any) {
      mesh.instanceMatrix.needsUpdate = true;
      if (!done) invalidate();
    }
  });

  const tap = (kind: Kind) => (event: ThreeEvent<MouseEvent>) => {
    // A tap is a lift that never travelled: R3F reports how far the pointer
    // moved between down and up, and past the slop this was a drag.
    if (event.delta > 8) return;
    const id = event.instanceId;
    if (id === undefined) return;
    const item = (groups.get(kind) ?? [])[id];
    if (item === undefined) return;
    event.stopPropagation();
    onTap(item.cell.key, item.cell);
  };

  const capacity = capacityFor(view.cells.length);
  const thetaStart = thetaStartFor(orientation);

  return (
    <group>
      {KINDS.map((kind) => (
        <instancedMesh
          key={`${kind}-${capacity}`}
          ref={(mesh) => {
            if (mesh !== null) meshes.current.set(kind, mesh);
            else meshes.current.delete(kind);
          }}
          args={[prisms.get(kind), undefined, capacity]}
          frustumCulled={false}
          {...(kind === 'beacon' || kind === 'remembered' ? {} : { onClick: tap(kind) })}
        >
          {/* Diffuse only, on purpose: a standard material carries a GGX
              highlight this board does not want, and a view-dependent lobe is
              a term the contrast budget could never predict. */}
          <meshLambertMaterial
            // `cylinderGeometry` shares its torso normals between neighbouring
            // segments, so a six-segment prism shades as a rounded blob. Flat
            // shading is what makes a hex read as six faces and a wall read as
            // a wall.
            flatShading
            transparent={kind === 'remembered' || kind === 'beacon'}
            opacity={kind === 'remembered' ? 0.55 : kind === 'beacon' ? 0.9 : 1}
            emissive={kind === 'beacon' ? theme.ink.lit : 0x000000}
            emissiveIntensity={kind === 'beacon' ? 0.6 : 0}
          />
        </instancedMesh>
      ))}
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
