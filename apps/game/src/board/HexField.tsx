import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Object3D, type InstancedMesh } from 'three';
import type { HexKey } from '@engine/hex';
import type { BoardView, CellView } from '@render/Renderer';
import type { Layout } from '@render/layout';
import { cellTint, previewTint } from '@theme/torch';
import { depthOf, type AssetId, type Theme } from '@theme/tokens';
import type { AssetBook } from './assets';
import { breath, BREATH_STEP_MS, STILL_BREATH } from './ambient';
import { TAP_SLOP } from './camera';
import { markerAt } from './cursor';
import { setMarkAnisotropy } from './marks';
import {
  capacityFor,
  groundBatches,
  hexRadiusOf,
  radiusScaleOf,
  standOf,
  type GroundBatch,
} from './ground';
import { commitInstances, tintInto } from './instances';
import { Labels } from './Labels';
import { thetaStartFor } from './prism';
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
 * **A destination is a MARK, not an object** (2026-09-01, `DECISIONS.md` D11).
 * `Props.tsx` and `landmarks.ts` stood a drum, a spire, a ring, a stone and a
 * crystal on the five destination hexes, and the mark that says WHICH of the
 * five it is was drawn flat on the hex underneath — so the object covered the
 * only thing that identified it. Both files are gone; `Labels.tsx` is the
 * whole of what a destination looks like now.
 *
 * Everything is positioned by `render/layout.ts`'s `place()` at size 1, so the
 * scene's unit is one hex radius and the camera decides what a unit is worth in
 * pixels. The engine never learns a pixel exists, and neither does this file —
 * it learns a metre.
 */

const scratchColor = new Color();
const dummy = new Object3D();

export const UNIT: Layout = { size: 1, originX: 0, originY: 0, orientation: 'pointy' };

type HexFieldProps = {
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
  /** Nobody has touched the board for a while, so the breath stops
   *  (`board/resting.ts`). `Board` keeps the one clock, because the rest
   *  screen it draws over the canvas has to agree with the beacons about when. */
  readonly resting: boolean;
  /** The direction's own art, where any has loaded. */
  readonly assets: AssetBook;
  /** The shared texture cache, so the pop layer bakes nothing twice. */
  readonly textures: SurfaceTextures;
  /** Where the keyboard's marker is standing, or null while nobody has
   *  pressed a key. */
  readonly cursor: HexKey | null;
  /** How strongly a legal hex shows the colour you are HOLDING — the
   *  direction's own `ghost.alpha`, or `?ghost=`. Zero draws none. */
  readonly ghostStrength: number;
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
  resting,
  assets,
  textures,
  cursor,
  ghostStrength,
  onTap,
}: HexFieldProps) {
  const layout = useMemo<Layout>(() => ({ ...UNIT, orientation }), [orientation]);
  const hexRadius = hexRadiusOf(theme);
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);

  useLayoutEffect(() => {
    textures.setAnisotropy(gl.capabilities.getMaxAnisotropy());
    // And the marks, from the same capability in the same breath (2026-09-05).
    // `marks.ts` keeps its own texture cache and had never been told this
    // number, so every mark on the board sampled at anisotropy 1 while the
    // ground under it sampled at the renderer's cap. Two caches, one renderer:
    // whoever learns the number tells both.
    setMarkAnisotropy(gl.capabilities.getMaxAnisotropy());
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
  const { geometryFor, materialsFor } = useBatchResources(
    batches,
    orientation,
    theme,
    textures,
    artFor,
  );

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
      /*
       * The surface's OWN gutter, as an instance scale (2026-09-08).
       *
       * `Surface.inset` is authored per surface — every terrain at 0.06 and
       * `empty` at 0.09 — so open ground is meant to read looser than ground
       * you have built, and the board drew one flat value for all of them.
       * An XZ scale rather than a second geometry: the prism is shared by the
       * whole batch and every instance already carries a matrix, so this costs
       * one multiply per hex and no draw calls at all. `radiusScaleOf` carries
       * the argument for why it reads the DIFFERENCE rather than the absolute
       * number.
       */
      const gutter = radiusScaleOf(theme, batch.surface);
      batch.items.forEach((item, i) => {
        const stand = standOf(item, batch.kind);
        dummy.position.set(item.x, stand.height / 2, item.z);
        dummy.scale.set(gutter, stand.scaleY, gutter);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        // The TINT, not the finished colour: the surface itself is in the
        // texture now, and the torch multiplies it in display space on the GPU
        // (`torchShader.ts`). `setRGB` writes into the working space unchanged,
        // which is what lets the shader read the display-space numbers.
        const base = cellTint(theme, item.cell);
        /*
         * And the tile you are HOLDING, on every hex it could go on
         * (2026-09-08). `previewColour` is computed for every legal cell and
         * was read by nothing; `theme.ghost`'s alpha is the strength. The
         * argument for a fill over an outline — and the bug report that
         * settled it — is at `previewTint`.
         */
        const held = item.cell.previewColour;
        const tint = held === null ? base : previewTint(theme, base, held, ghostStrength);
        // A beacon sits at its still value until the breath takes over, so a
        // reduced-motion board is lit rather than merely un-animated.
        const lit = batch.kind === 'beacon' ? STILL_BREATH : 1;
        tintInto(scratchColor, tint, lit);
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
  }, [batches, rings, theme, ghostStrength, invalidate]);

  /**
   * Every beacon's still colour, unpacked once (2026-09-02).
   *
   * The breath below used to call `cellTint` and unpack its bytes **per
   * instance, per frame** — the same answer, recomputed sixty times a second
   * for the whole of a run, because a beacon's tint is a property of the cell
   * and the theme and neither moves between renders. Only the multiplier does.
   *
   * A flat `Float32Array` rather than an array of triples: this is read in a
   * tight loop and the point is to not allocate in it.
   */
  const beaconTints = useMemo(() => {
    const out = new Map<string, Float32Array>();
    for (const batch of batches) {
      if (batch.kind !== 'beacon' || batch.items.length === 0) continue;
      // A claimed beacon is DEACTIVATED, not merely quieter (`materials.ts`'s
      // landmark branch, Marc: "the same as when they are highlighted and
      // active, just grey and look deactivated instead") — and a thing that
      // still pulses with the live beacon's breath reads as alive regardless
      // of what its ring says. `surfaceFor` gives a claimed cell a different
      // pattern ink than an unclaimed one, so the two never share a batch;
      // checking the first item is checking all of them.
      if (batch.items[0]!.cell.claimed) continue;
      const rgb = new Float32Array(batch.items.length * 3);
      batch.items.forEach((item, i) => {
        const tint = cellTint(theme, item.cell);
        rgb[i * 3] = ((tint >> 16) & 0xff) / 255;
        rgb[i * 3 + 1] = ((tint >> 8) & 0xff) / 255;
        rgb[i * 3 + 2] = (tint & 0xff) / 255;
      });
      out.set(batch.key, rgb);
    }
    return out;
  }, [batches, theme]);

  /**
   * The beacons breathe — on a clock of their own (2026-09-02).
   *
   * A beacon is a promise that there is somewhere to go, and the pulse is what
   * keeps the promise visible on a board that is otherwise still. It is the
   * only thing on the board that asks for frames when nothing has happened.
   *
   * It used to ask from inside `useFrame`, which is a loop that only runs
   * because something invalidated — so "animate while any beacon exists" meant
   * **invalidate every frame, for the whole run**, and beacons exist almost
   * always. Every instanced draw and every `<Text>` on the board redrew at
   * 60fps over a game where nothing was happening.
   *
   * A timer instead. It paints and then asks for one frame, thirty times a
   * second (`BREATH_STEP_MS`), and it stops existing the moment there are no
   * beacons — which is the same promise the old comment made and could not
   * keep, because `useFrame` cannot stop asking for frames without stopping
   * being called.
   *
   * Writing GPU buffers outside the render loop is what the layout effect above
   * already does; `invalidate()` is what schedules the frame that shows them.
   */
  /*
   * AND IT RESTS WHEN NOBODY IS PLAYING (2026-09-11, Marc's ruling on P5.4's
   * measurement: *sleep after a pause*).
   *
   * `resting` is what turns the timer off after fifteen untouched seconds and
   * back on at the first touch — the whole idle cost of this board, which
   * `perf/report.md` measured at 28× to 138× a still one. The last paint
   * before it sleeps is `STILL_BREATH`, the same value reduced motion uses,
   * so the board comes to rest at the brightness it is MEANT to rest at
   * rather than freezing wherever the wave happened to be. The clock itself
   * is `Board`'s (`useResting`), shared with the rest screen since 2026-09-16.
   */
  useEffect(() => {
    if (reducedMotion || beaconTints.size === 0) return;
    const settle = (lit: number): void => {
      for (const [key, rgb] of beaconTints) {
        const mesh = meshes.current.get(key);
        if (mesh === undefined) continue;
        for (let i = 0; i < rgb.length / 3; i++) {
          scratchColor.setRGB(rgb[i * 3]! * lit, rgb[i * 3 + 1]! * lit, rgb[i * 3 + 2]! * lit);
          mesh.setColorAt(i, scratchColor);
        }
        if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;
      }
      invalidate();
    };
    if (resting) {
      settle(STILL_BREATH);
      return;
    }
    const paint = (): void => {
      // ONE `breath` for the whole tick. It was computed per BATCH, which is
      // the same number two or three times and a wave that could disagree with
      // itself across two meshes drawn in one frame.
      settle(breath(performance.now()));
    };
    const timer = setInterval(paint, BREATH_STEP_MS);
    return () => clearInterval(timer);
  }, [beaconTints, reducedMotion, resting, invalidate]);

  /**
   * What the finger meant, out of everything the ray went through.
   *
   * The whole ray is considered, nearest first, and the best RANK wins however
   * far behind it stands — see `RAY_RANK` for the ladder and why each rung is
   * where it is. Rank 0 answers immediately, because nothing can outrank it;
   * anything else is held as the best candidate so far and only gets to speak
   * once the ray is exhausted.
   *
   * The handler is attached per batch but resolves GLOBALLY, so whichever mesh
   * R3F reaches first answers for all of them and stops the rest.
   */
  /*
   * ONE HANDLER, not one per mesh per render (2026-09-02).
   *
   * `tap` was a factory — `onClick={tap()}` — so every one of the ~20 meshes
   * got a brand-new function on every render, and R3F re-registers a pointer
   * handler whenever its identity changes. This component re-renders on every
   * half-degree of orbit, so turning the board once rebound fourteen thousand
   * handlers. The handler does not depend on which mesh it is attached to: it
   * resolves GLOBALLY over the whole ray.
   */
  const tap = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      // A tap is a lift that never travelled: R3F reports how far the pointer
      // moved between down and up, and past the slop this was a drag.
      if (event.delta > TAP_SLOP) return;
      // The secondary button and Shift are the desktop's turn-and-lean gesture
      // (`Board`), and a gesture that ends without travelling far enough to
      // register must not fall through into a PLACEMENT — the one action on
      // this board that cannot be undone.
      if (event.button !== 0 || event.shiftKey) return;

      const byMesh = new Map<InstancedMesh, GroundBatch>();
      for (const b of batches) {
        const mesh = meshes.current.get(b.key);
        if (mesh !== undefined) byMesh.set(mesh, b);
      }

      let best: CellView | null = null;
      let bestRank = Number.POSITIVE_INFINITY;
      for (const hit of event.intersections) {
        const batch = byMesh.get(hit.object as InstancedMesh);
        if (batch === undefined) continue;
        const item = hit.instanceId === undefined ? undefined : batch.items[hit.instanceId];
        if (item === undefined) continue;
        const rank = RAY_RANK[batch.kind];
        if (rank === 0) {
          // Nothing behind it can outrank live ground, so the ray stops here.
          event.stopPropagation();
          onTap(item.cell.key, item.cell);
          return;
        }
        // Nearest first, so the first hit at a rank is the nearest at that rank.
        if (rank < bestRank) {
          bestRank = rank;
          best = item.cell;
        }
      }

      // No live ground anywhere along the ray, so the best of what is left is
      // genuinely what was pointed at and gets to say its line.
      if (best !== null) {
        event.stopPropagation();
        onTap(best.key, best);
      }
    },
    [batches, onTap],
  );

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
        /*
         * SIZED FOR ITSELF, not for the whole board (2026-09-02).
         *
         * Every one of the ~20 batches was allocated `capacityFor(cells.length)`
         * — room for every hex on the board, in every mesh — so a 500-cell
         * board built 20 × 512 instances' worth of matrix and colour buffers,
         * about 780 KB on the GPU, of which more than 95% is never drawn. A
         * batch holds the cells that wear ONE paint, and most paints are worn
         * by a handful.
         *
         * The rounding is what keeps this from being a rebuild per placement:
         * `capacityFor` doubles, so a batch grows by allocating twice and then
         * not again for a while. That was the whole reason the total was used,
         * and it works per batch for the same reason.
         *
         * The shared ring mesh below keeps the board-wide capacity: it is one
         * mesh holding every outline there is, so its count really is the
         * board's.
         */
        return (
          <instancedMesh
            key={`${batch.key}-${capacityFor(batch.items.length)}`}
            ref={(mesh) => {
              if (mesh !== null) meshes.current.set(batch.key, mesh);
              else meshes.current.delete(batch.key);
            }}
            args={[geometry, undefined, capacityFor(batch.items.length)]}
            material={material}
            frustumCulled={false}
            onClick={tap}
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
        <ringGeometry args={[hexRadius - 0.16, hexRadius, 6, 1, thetaStart + Math.PI / 2]} />
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

        **AND IT WAS INSIDE ITS NEIGHBOURS** (2026-09-02). It is drawn flat at
        its own cell's top, spanning 1.00 to 1.18 hex radii — which reaches over
        the seam and into the six hexes around it. A tile's near face stands at
        about 0.918, so on any side where the neighbour is as tall or taller,
        the ring is geometrically buried in solid ground and simply does not
        appear. On a real board that is most sides, and it is the one affordance
        the whole keyboard and screen-reader path rests on: if you cannot see
        where the marker is, the arrows are pressing something invisible.

        `depthTest={false}` with a late `renderOrder` draws it over whatever is
        in front of it, which is the honest reading of what it is — a marker
        belonging to the player rather than a thing standing on the plane.
      */}
      {marker !== null && (
        <mesh
          position={[marker.x, marker.top, marker.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={1}
          raycast={() => null}
        >
          <ringGeometry
            args={[hexRadius + 0.06, hexRadius + 0.24, 6, 1, thetaStart + Math.PI / 2]}
          />
          <meshBasicMaterial color={theme.ink.accent} toneMapped={false} depthTest={false} />
        </mesh>
      )}
      <Labels cells={view.cells} theme={theme} layout={layout} relief={relief} yaw={yaw} />
    </group>
  );
}

/**
 * EVERY KIND OF GROUND ANSWERS A TAP (2026-09-01), and there is no longer a
 * function saying so (2026-09-02).
 *
 * `isTappable(batch)` used to refuse beacons and remembered fog, on the
 * argument that neither is a place a tile can go. True, and beside the point:
 * a tap on ground you cannot build on is how this game ANSWERS QUESTIONS, and
 * those two are the ground a player has the most questions about. Marc: *"id
 * like that i can click on any shrine or point in the map that I can see to get
 * information ... is it a good shrine or one i dont need now?"*
 *
 * It also made two documented gestures dead. `INTERACTIONS.md` has listed "tap
 * a beacon" and "tap remembered fog (the biome lens)" as working in this body
 * since the matrix was written; `App`'s `onTap` has a whole branch for the fog
 * that turns the colour lens, and `describeHexOf` has sentences for a beacon,
 * a shimmer, remembered ground and dark ground that nothing could reach. The
 * keyboard could get to all of it — `cursor.ts` walks the fog on purpose — so
 * the finger was the one input that could not. Sixth of this body's signature
 * miss (`CLAUDE.md`): a rule implemented, tested, and reachable from nothing.
 *
 * What was left behind is what this note replaces: a predicate whose body was
 * `return true`, called twice per render per batch, and read by anyone new to
 * the file as though it decided something. **A rule with no exceptions is not a
 * predicate, it is a sentence.** What decides between two hits is `RAY_RANK`
 * below, which is where the reading should go.
 */

/**
 * Which hit along the ray the finger meant, when it went through more than one.
 *
 * Lower wins however far behind it stands; nearest wins inside a rank. The
 * ladder is by what a tap can DO there:
 *
 * 0. **Live ground.** Tiles, empty ground, stone, landmarks — the only hexes a
 *    placement, a price or a claim can happen on. Marc, 2026-08-29: *"if we hit
 *    a wall and a tile underneath, prioritize the tile."* A wall is the tallest
 *    thing on the board, so a leaned camera puts it in front of the hexes
 *    beyond it, and a leaned board quietly refusing placements a flat one
 *    allowed reads as the game ignoring you.
 * 1. **Walls.** Real ground, and the one kind nothing can ever be done with, so
 *    it answers only when nothing else on the ray does.
 * 2. **The map.** Beacons and remembered fog: information about somewhere
 *    else, drawn nearly flat (`relief.ts` stands them 0.05 and 0.04 high) at
 *    hexes no live cell occupies. Last, so a low fog hex in the foreground can
 *    never steal the tap meant for the board behind it.
 */
const RAY_RANK: Readonly<Record<GroundBatch['kind'], number>> = {
  tile: 0,
  empty: 0,
  stone: 0,
  wall: 1,
  beacon: 2,
  remembered: 2,
};
