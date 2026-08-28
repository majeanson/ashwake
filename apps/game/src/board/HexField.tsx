import { Text } from '@react-three/drei';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Matrix4, Object3D, type InstancedMesh } from 'three';
import type { HexKey } from '@engine/hex';
import type { BoardView, CellView } from '@render/Renderer';
import { labelFor } from '@render/labels';
import { place, type Layout } from '@render/layout';
import { type Theme } from '@theme/tokens';

/**
 * The board, as instances (Stage 2, 2026-08-28).
 *
 * One `InstancedMesh` per KIND of ground — tiles, empties, stone, walls, the
 * remembered ground and the beacons — because each kind is a different prism
 * (a tile stands, an empty is a slab, a wall is a block) and an instanced mesh
 * shares one geometry. Colour is per instance, so the four terrains are four
 * colours on one mesh rather than four meshes. The rings the stroke ladder
 * draws (legal, ripe, lit, targeted, home) are a second family of instances:
 * flat hexagonal rings sitting a hair above the ground they mark.
 *
 * Everything here is positioned by `render/layout.ts`'s `place()` at size 1,
 * so the scene's unit is one hex radius and the camera decides what a unit is
 * worth in pixels. The engine never learns a pixel exists, and neither does
 * this file — it learns a metre.
 *
 * `labelFor` (core) says what a cell prints; `Text` prints it. The font is
 * self-hosted (`/fonts/cinzel.ttf`), because a default font would fetch from
 * a CDN and make "nothing leaves your phone" a lie — the same trap Ashwake 1
 * fell into on 2026-08-20 and climbed out of.
 */

export const UNIT: Layout = { size: 1, originX: 0, originY: 0, orientation: 'pointy' };

/** How tall each kind of ground stands, in hex radii. */
const HEIGHT = { tile: 0.34, empty: 0.06, stone: 0.16, wall: 0.7, remembered: 0.04, beacon: 0.05 };
/** The seam between hexes, as a shrink of the prism's radius. */
const SEAM = 0.06;

type Kind = keyof typeof HEIGHT;

const KINDS: readonly Kind[] = ['tile', 'empty', 'stone', 'wall', 'remembered', 'beacon'];

function kindOf(cell: CellView): Kind | null {
  if (cell.beacon) return 'beacon';
  if (cell.remembered) return 'remembered';
  switch (cell.kind) {
    case 'tile':
      return 'tile';
    case 'landmark':
      return 'empty';
    case 'empty':
      return 'empty';
    case 'stone':
      return 'stone';
    case 'wall':
      return 'wall';
  }
}

/** A cell's base colour under the direction, before the torch. */
function fillOf(cell: CellView, theme: Theme): number {
  if (cell.kind === 'tile' && cell.colour !== null) return theme.terrain[cell.colour].fill;
  if (cell.kind === 'wall') return theme.wall.fill;
  if (cell.kind === 'stone') return theme.stone.fill;
  if (cell.native !== null) return theme.terrain[cell.native].fill;
  return theme.empty.fill;
}

const scratchColor = new Color();
const scratchBg = new Color();
const scratchMatrix = new Matrix4();
const dummy = new Object3D();

/** The torch: a cell's colour pulled toward the board's background by how
 *  dark it is. `light` is already resolved by the view. */
function litColour(fill: number, light: number, theme: Theme, into: Color): Color {
  into.set(fill);
  scratchBg.set(theme.board.background);
  return into.lerp(scratchBg, 1 - light);
}

type Ring = { readonly cell: CellView; readonly colour: number; readonly width: number };

/**
 * The stroke ladder, top rung first — the same priority Ashwake 1's
 * `PixiRenderer` kept: a live state always wins the edge, and home is asked
 * last.
 */
function ringOf(cell: CellView, theme: Theme): Ring | null {
  const b = theme.board;
  if (cell.targeted) return { cell, colour: theme.ink.accent, width: b.ripeEdgeWidth };
  if (cell.ripe) return { cell, colour: b.ripeEdge, width: b.ripeEdgeWidth };
  if (cell.kind === 'landmark' && !cell.claimed) {
    return { cell, colour: theme.ink.lit, width: b.ripeEdgeWidth * 0.8 };
  }
  if (cell.rarity !== null && cell.kind === 'tile') {
    return {
      cell,
      colour: cell.rarity === 'magic' ? theme.ink.magic : theme.ink.unique,
      width: b.edgeWidth * 2.5,
    };
  }
  if (cell.legal) return { cell, colour: b.legalEdge, width: b.edgeWidth * 2.5 };
  if (cell.lensed) return { cell, colour: theme.ink.accent, width: b.edgeWidth * 2 };
  if (cell.home) return { cell, colour: b.home.ring, width: b.home.ringWidth };
  return null;
}

export type Leap = { readonly keys: ReadonlySet<HexKey>; readonly startedAt: number };

export type HexFieldProps = {
  readonly view: BoardView;
  readonly theme: Theme;
  readonly orientation: Layout['orientation'];
  /** The pop's leap in flight, if any — the cells that just left, rising. */
  readonly leap: Leap | null;
  readonly onTap: (key: HexKey, cell: CellView) => void;
};

/** Round up to a capacity, so the instanced meshes are not rebuilt per placement. */
const capacityFor = (n: number): number => Math.max(64, 1 << Math.ceil(Math.log2(n + 1)));

export function HexField({ view, theme, orientation, leap, onTap }: HexFieldProps) {
  const layout = useMemo<Layout>(() => ({ ...UNIT, orientation }), [orientation]);
  const invalidate = useThree((s) => s.invalidate);

  // Cells by kind, positioned once per view.
  const groups = useMemo(() => {
    const out = new Map<Kind, { cell: CellView; x: number; z: number }[]>();
    for (const kind of KINDS) out.set(kind, []);
    for (const cell of view.cells) {
      const kind = kindOf(cell);
      if (kind === null) continue;
      const p = place({ q: cell.q, r: cell.r }, layout);
      out.get(kind)!.push({ cell, x: p.x, z: p.y });
    }
    return out;
  }, [view, layout]);

  const rings = useMemo(() => {
    const out: (Ring & { x: number; z: number; top: number })[] = [];
    for (const cell of view.cells) {
      const ring = ringOf(cell, theme);
      if (ring === null) continue;
      const kind = kindOf(cell);
      if (kind === null) continue;
      const p = place({ q: cell.q, r: cell.r }, layout);
      out.push({ ...ring, x: p.x, z: p.y, top: HEIGHT[kind] });
    }
    return out;
  }, [view, theme, layout]);

  const labels = useMemo(() => {
    const out: { key: HexKey; text: string; faint: boolean; x: number; z: number; top: number }[] =
      [];
    for (const cell of view.cells) {
      if (cell.dimmed) continue;
      const label = labelFor(cell);
      if (label === null) continue;
      const kind = kindOf(cell);
      if (kind === null) continue;
      const p = place({ q: cell.q, r: cell.r }, layout);
      out.push({
        key: cell.key,
        text: label.text,
        faint: label.faint,
        x: p.x,
        z: p.y,
        top: HEIGHT[kind],
      });
    }
    return out;
  }, [view, layout]);

  // The pop's leap: while one is in flight, the tiles that popped rise and
  // fall (`popLift` per direction) and the field asks for frames.
  const leapRef = useRef<Leap | null>(null);
  leapRef.current = leap;
  const meshes = useRef(new Map<Kind, InstancedMesh>());
  const ringMesh = useRef<InstancedMesh | null>(null);

  const thetaStart = orientation === 'pointy' ? 0 : Math.PI / 6;

  // Write every instance's matrix and colour. Runs after each render of the
  // view; the leap animation only touches the popped tiles' Y.
  useLayoutEffect(() => {
    for (const kind of KINDS) {
      const mesh = meshes.current.get(kind);
      const items = groups.get(kind) ?? [];
      if (mesh === undefined) continue;
      items.forEach((item, i) => {
        const h = HEIGHT[kind];
        dummy.position.set(item.x, h / 2, item.z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        const light = kind === 'beacon' ? 1 - theme.board.beaconFade : item.cell.light;
        litColour(fillOf(item.cell, theme), light, theme, scratchColor);
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
        dummy.position.set(ring.x, ring.top + 0.012, ring.z);
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
    const ms = theme.motion.popMs + theme.motion.popStaggerMs * active.keys.size;
    const t = (performance.now() - active.startedAt) / ms;
    const items = groups.get('stone') ?? [];
    let any = false;
    items.forEach((item, i) => {
      if (!active.keys.has(item.cell.key)) return;
      any = true;
      const k = Math.min(1, Math.max(0, t));
      const lift = theme.motion.popLift * Math.sin(Math.PI * k);
      mesh.getMatrixAt(i, scratchMatrix);
      dummy.matrix.copy(scratchMatrix);
      dummy.position.set(item.x, HEIGHT.stone / 2 + lift, item.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    if (any) {
      mesh.instanceMatrix.needsUpdate = true;
      if (t < 1) invalidate();
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

  return (
    <group>
      {KINDS.map((kind) => (
        <instancedMesh
          key={`${kind}-${capacity}`}
          ref={(mesh) => {
            if (mesh !== null) meshes.current.set(kind, mesh);
            else meshes.current.delete(kind);
          }}
          args={[undefined, undefined, capacity]}
          frustumCulled={false}
          {...(kind === 'beacon' || kind === 'remembered' ? {} : { onClick: tap(kind) })}
        >
          <cylinderGeometry args={[1 - SEAM, 1 - SEAM, HEIGHT[kind], 6, 1, false, thetaStart]} />
          <meshStandardMaterial
            roughness={kind === 'wall' ? 0.95 : 0.8}
            metalness={0}
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
        <ringGeometry args={[1 - SEAM - 0.16, 1 - SEAM, 6, 1, thetaStart + Math.PI / 2]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {labels.map((label) => (
        <Text
          key={label.key}
          font="/fonts/cinzel.ttf"
          fontSize={0.62}
          color={label.faint ? theme.ink.inkFaint : theme.ink.ink}
          outlineWidth={theme.ink.haloWidth * 0.4}
          outlineColor={theme.ink.halo}
          anchorX="center"
          anchorY="middle"
          position={[label.x, label.top + 0.02, label.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          raycast={() => null}
        >
          {label.text}
        </Text>
      ))}
    </group>
  );
}
