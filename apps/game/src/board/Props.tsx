import { useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, MeshLambertMaterial, Object3D, type InstancedMesh } from 'three';
import type { LandmarkReward } from '@engine/state';
import type { CellView } from '@render/Renderer';
import { place, type Layout } from '@render/layout';
import { cellTint, torched } from '@theme/torch';
import type { Theme } from '@theme/tokens';
import { commitInstances } from './instances';
import { propGeometry, propRise, REWARDS } from './landmarks';
import { topOf } from './relief';

/**
 * The destinations, standing up (Stage 2d, 2026-08-29).
 *
 * One instanced mesh per landmark KIND — five at most, and only for the kinds
 * actually on the board — drawn over the ground rather than instead of it. The
 * hex underneath keeps its own surface and its own ring; the prop is what is
 * built on top.
 *
 * **A claimed destination goes quiet.** It keeps its prop, because the thing
 * is still there and a world you have walked through should look walked
 * through, but it takes the spent colour rather than the lit one. That is the
 * same sentence `surfaceFor` says about its ground, said again in geometry.
 *
 * A beacon gets no prop at all: it is a glow through ground that does not
 * exist yet, and putting a building on ground that is not there would promise
 * something the board cannot keep.
 */

const dummy = new Object3D();
const scratch = new Color();

export type PropsProps = {
  readonly cells: readonly CellView[];
  readonly theme: Theme;
  readonly layout: Layout;
  readonly relief: number;
};

type Standing = {
  readonly cell: CellView;
  readonly x: number;
  readonly z: number;
  readonly top: number;
};

export function Props({ cells, theme, layout, relief }: PropsProps) {
  const invalidate = useThree((s) => s.invalidate);
  const groups = useMemo(() => {
    const out = new Map<LandmarkReward, Standing[]>();
    for (const cell of cells) {
      // Not a beacon: a building on ground that does not exist yet is a
      // promise the board cannot keep.
      if (cell.kind !== 'landmark' || cell.beacon || cell.shimmer) continue;
      if (cell.landmark === null) continue;
      const at = place({ q: cell.q, r: cell.r }, layout);
      const list = out.get(cell.landmark) ?? [];
      list.push({ cell, x: at.x, z: at.y, top: topOf(cell, relief) });
      out.set(cell.landmark, list);
    }
    return out;
  }, [cells, layout, relief]);

  const geometries = useMemo(
    () => new Map(REWARDS.map((r) => [r, propGeometry(r, theme.motif)])),
    [theme.motif],
  );
  useLayoutEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);

  const materials = useMemo(
    () =>
      new Map(
        REWARDS.map((r) => [
          r,
          new MeshLambertMaterial({
            // Flat, like the ground: a prop shaded smooth beside a board of
            // facets reads as belonging to a different game.
            flatShading: true,
          }),
        ]),
      ),
    [],
  );
  useLayoutEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);

  const meshes = useRef(new Map<LandmarkReward, InstancedMesh>());

  useLayoutEffect(() => {
    for (const reward of REWARDS) {
      const mesh = meshes.current.get(reward);
      const standing = groups.get(reward) ?? [];
      if (mesh === undefined) continue;
      const rise = propRise(reward, theme.motif);
      standing.forEach((item, i) => {
        dummy.position.set(item.x, item.top + rise, item.z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        /*
         * Lit while unclaimed, DIMMED once reached — not turned to stone.
         *
         * Marc, 2026-08-29: *"make sure when popped, caches, shrines, stars,
         * etc. are still recognizable."* A claimed prop was painted
         * `stone.fill`, which is the colour of spent GROUND — so on a board
         * that fills with spent ground as a run goes on, the thing you walked
         * all that way to reach became the same colour as everything around
         * it. It read as gone rather than as done.
         *
         * `inkDim` is the palette's middle voice and what the claimed glyph
         * above it now uses, so the prop and its mark say the same thing in
         * the same tone: still here, still what it was, already spent.
         */
        const base = item.cell.claimed ? theme.ink.inkDim : theme.ink.lit;
        const shown = torched(base, cellTint(theme, item.cell));
        scratch.setRGB(
          ((shown >> 16) & 0xff) / 255,
          ((shown >> 8) & 0xff) / 255,
          (shown & 0xff) / 255,
        );
        mesh.setColorAt(i, scratch);
      });
      commitInstances(mesh, standing.length);
    }
    // Rendering is on demand, so writing instances is not the same as drawing
    // them: without this the props are correct in memory and absent on screen,
    // which is exactly how they spent their first hour.
    invalidate();
  }, [groups, theme, invalidate]);

  return (
    <group>
      {REWARDS.map((reward) => {
        const standing = groups.get(reward) ?? [];
        if (standing.length === 0) return null;
        const geometry = geometries.get(reward);
        const material = materials.get(reward);
        if (geometry === undefined || material === undefined) return null;
        return (
          <instancedMesh
            key={`${reward}-${capacityFor(standing.length)}`}
            ref={(mesh) => {
              if (mesh !== null) meshes.current.set(reward, mesh);
              else meshes.current.delete(reward);
            }}
            args={[geometry, material, capacityFor(standing.length)]}
            frustumCulled={false}
            // A prop is scenery: the tap belongs to the hex under it, and a
            // building that swallowed taps would make its own cell unplayable.
            raycast={() => null}
          />
        );
      })}
    </group>
  );
}

/** Round up, so a world that grows one destination does not rebuild a buffer. */
const capacityFor = (n: number): number => Math.max(8, 1 << Math.ceil(Math.log2(n + 1)));
