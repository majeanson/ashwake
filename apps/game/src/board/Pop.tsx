import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, Color, Object3D, type InstancedMesh } from 'three';
import { place, type Layout } from '@render/layout';
import type { CellView } from '@render/Renderer';
import type { HexKey } from '@engine/hex';
import { depthOf, type AssetId, type Theme } from '@theme/tokens';
import { cellTint } from '@theme/torch';
import type { AssetBook } from './assets';
import { glowTexture } from './glow';
import { capacityFor, groundBatches, HEX_RADIUS, standOf, type GroundBatch } from './ground';
import { commitInstances } from './instances';
import { cascadeDelays, cascadeMs, glowPhase, leapPhase, REDUCED_MS } from './leap';
import { useBatchResources } from './resources';
import { topOf } from './relief';
import type { SurfaceTextures } from './surfaces';

/**
 * The harvest, leaping (Stage 2d, 2026-08-29).
 *
 * A separate layer from `HexField` on purpose, and the reason is the whole
 * effect: **the board has already turned these cells to stone.** What rises is
 * not the board's hexes — those are grey now — but a copy of the cells AS THEY
 * WERE, in their own colour, standing where they stood, over ground that has
 * moved on. Marc: *"the colour pops up in the air while the grey happens."*
 *
 * It reuses `groundBatches` and `useBatchResources`, so a leaping ASH tile is
 * painted by the same plan and the same cached texture as the one that was
 * sitting there a frame ago. Nothing about a pop is a second description of
 * what a tile looks like.
 */

export type PopProps = {
  readonly cells: readonly CellView[];
  readonly at: HexKey | null;
  /** Restarts the animation when the same cells pop twice. */
  readonly id: number;
  readonly theme: Theme;
  readonly layout: Layout;
  readonly relief: number;
  readonly materials: number;
  readonly assets: AssetBook;
  readonly textures: SurfaceTextures;
  readonly reducedMotion: boolean;
  readonly onDone: () => void;
};

const dummy = new Object3D();
const scratch = new Color();

/** How much wider than a hex the light pool spreads, before its own swell. */
const GLOW_SPREAD = 2.6;

/**
 * How hard the light pool burns, over the direction's own `popAlpha`.
 *
 * The first version used `popAlpha` alone and the glow was invisible — not
 * missing, INVISIBLE. `popColour` is a pale gold, the board it blooms over is
 * tan ground inside gold rings, and pale gold on gold at half strength is a
 * bloom nobody can see. Swapping the colour for red proved the mesh, the
 * matrix and the additive blend were all working perfectly and the effect was
 * simply too quiet to notice, which is its own kind of bug and a reminder that
 * "it does not appear" and "it does not draw" are different findings.
 *
 * Additive light on a dark board can afford to go past 1: it clips toward
 * white at the centre, which is what a burst looks like.
 */
const GLOW_BURN = 2.4;

export function Pop({
  cells,
  at,
  id,
  theme,
  layout,
  relief,
  materials,
  assets,
  textures,
  reducedMotion,
  onDone,
}: PopProps) {
  const invalidate = useThree((s) => s.invalidate);
  const startedAt = useRef(performance.now());
  const meshes = useRef(new Map<string, InstancedMesh>());
  const glowMesh = useRef<InstancedMesh | null>(null);

  // A new pop is a new clock, even for the same cells.
  useEffect(() => {
    startedAt.current = performance.now();
    invalidate();
    const ms = reducedMotion ? REDUCED_MS : cascadeMs(theme.motion, cells.length);
    const timer = setTimeout(onDone, ms);
    return () => clearTimeout(timer);
  }, [id, cells.length, theme.motion, reducedMotion, onDone, invalidate]);

  const hasArt = useCallback((asset: AssetId) => assets.has(asset), [assets]);
  const batches = useMemo(
    () =>
      groundBatches(cells, {
        theme,
        layout,
        relief,
        materials,
        texturePx: 256,
        depth: depthOf(theme),
        hasArt,
      }),
    [cells, theme, layout, relief, materials, hasArt],
  );

  const artFor = useCallback(
    (batch: GroundBatch) => (batch.asset === null ? null : assets.image(batch.asset)),
    [assets],
  );
  const { geometryFor, materialsFor } = useBatchResources(
    batches,
    layout.orientation,
    textures,
    artFor,
  );

  // Delays are per CELL, and the batches reorder them, so the lookup is by key.
  const delays = useMemo(() => {
    const out = new Map<HexKey, number>();
    const list = cascadeDelays(cells, at, theme.motion);
    cells.forEach((cell, i) => out.set(cell.key, reducedMotion ? 0 : (list[i] ?? 0)));
    return out;
  }, [cells, at, theme.motion, reducedMotion]);

  /** Where each popped cell stood, and how high its light sits. Precomputed:
   *  a per-frame scan of the batches would be quadratic in the pocket size,
   *  and a pocket is exactly the moment the board is busiest. */
  const spots = useMemo(() => {
    const out = new Map<HexKey, { x: number; z: number; top: number }>();
    for (const cell of cells) {
      const at = place({ q: cell.q, r: cell.r }, layout);
      out.set(cell.key, { x: at.x, z: at.y, top: topOf(cell, relief) });
    }
    return out;
  }, [cells, layout, relief]);

  const glowColour = useMemo(() => new Color(theme.motion.popColour), [theme.motion.popColour]);

  useFrame(() => {
    const elapsed = performance.now() - startedAt.current;
    let alive = false;

    for (const batch of batches) {
      const mesh = meshes.current.get(batch.key);
      if (mesh === undefined) continue;
      batch.items.forEach((item, i) => {
        const delay = delays.get(item.cell.key) ?? 0;
        const stand = standOf(item, batch.kind);
        const phase = reducedMotion
          ? { lift: 0, scale: elapsed < REDUCED_MS ? 1 : 0, spin: 0, gone: elapsed >= REDUCED_MS }
          : leapPhase(theme.motion, elapsed, delay);
        if (!phase.gone) alive = true;
        dummy.position.set(item.x, stand.height / 2 + phase.lift, item.z);
        dummy.rotation.set(0, phase.spin, 0);
        dummy.scale.set(phase.scale, stand.scaleY * phase.scale, phase.scale);
        dummy.updateMatrix();
        dummy.rotation.set(0, 0, 0);
        mesh.setMatrixAt(i, dummy.matrix);
        const tint = cellTint(theme, item.cell);
        scratch.setRGB(
          ((tint >> 16) & 0xff) / 255,
          ((tint >> 8) & 0xff) / 255,
          (tint & 0xff) / 255,
        );
        mesh.setColorAt(i, scratch);
      });
      commitInstances(mesh, batch.items.length);
    }

    const gm = glowMesh.current;
    if (gm !== null) {
      cells.forEach((cell, i) => {
        const delay = delays.get(cell.key) ?? 0;
        const phase = reducedMotion
          ? {
              scale: 1,
              strength: elapsed < REDUCED_MS ? theme.motion.popAlpha : 0,
              gone: elapsed >= REDUCED_MS,
            }
          : glowPhase(theme.motion, elapsed, delay);
        if (!phase.gone) alive = true;
        const spread = HEX_RADIUS * GLOW_SPREAD * phase.scale * theme.motion.popGlowScale * 0.5;
        const spot = spots.get(cell.key);
        dummy.position.set(spot?.x ?? 0, (spot?.top ?? 0) + 0.02, spot?.z ?? 0);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.scale.set(spread, spread, 1);
        dummy.updateMatrix();
        dummy.rotation.set(0, 0, 0);
        gm.setMatrixAt(i, dummy.matrix);
        // ADDITIVE: a dark tint is a dim one, so per-instance colour carries
        // the whole fade with no transparency and no sorting.
        scratch.copy(glowColour).multiplyScalar(phase.strength * GLOW_BURN);
        gm.setColorAt(i, scratch);
      });
      commitInstances(gm, cells.length);
    }

    if (alive) invalidate();
  });

  const capacity = capacityFor(cells.length);
  const texture = glowTexture();

  return (
    <group>
      {batches.map((batch) => {
        const geometry = geometryFor(batch.kind);
        const material = materialsFor(batch);
        if (geometry === undefined || material === undefined) return null;
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
            raycast={() => null}
          />
        );
      })}
      <instancedMesh
        key={`pop-glow-${capacity}`}
        ref={(mesh) => {
          glowMesh.current = mesh;
        }}
        args={[undefined, undefined, capacity]}
        frustumCulled={false}
        raycast={() => null}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          {...(texture === null ? {} : { map: texture })}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}
