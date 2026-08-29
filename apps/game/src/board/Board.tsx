import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { markBoardAlive } from '../shell/failure';
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref,
} from 'react';
import type { OrthographicCamera } from 'three';
import { parse, type HexKey } from '@engine/hex';
import { place } from '@render/layout';
import type { BoardView, CellView } from '@render/Renderer';
import type { Popped } from '../shell/store';
import { rigFor } from '@theme/rig';
import { hex as cssHex, type Theme } from '@theme/tokens';
import {
  cameraAt,
  eyeOf,
  fitCamera,
  frameFor,
  glided,
  glidedBy,
  isFlick,
  isResting,
  lerpCamera,
  pannedBy,
  zoomMaxOf,
  zoomedBy,
  type CameraState,
  type Frame,
  type Glide,
  type Lean,
} from './camera';
import { GL_PROPS } from './gl';
import { useAssets } from './assets';
import { HexField, UNIT } from './HexField';
import { Pop } from './Pop';
import { SurfaceTextures } from './surfaces';
import { LightRig } from './LightRig';
import { tallestOf } from './relief';

/**
 * The board (Stage 2, 2026-08-28): one `<Canvas>`, mounted once, above every
 * scene — losing it loses the WebGL context (`CLAUDE.md`). Rendering is on
 * demand: a frame is drawn when the view changes, when the camera moves, or
 * while a leap or a flight is in the air, and never otherwise, because a
 * phone that draws sixty idle frames a second is a phone that is warm.
 *
 * The camera leans back by `tilt` degrees — 35, Marc's answer to Stage 2's
 * open question, chosen from `docs/shots/` — and the board may be turned under
 * it by `yaw`. `relief` is how much the ground itself rises and falls, and
 * `light` how hard the rig shades it. All four are dials whose zero is the flat
 * map the board shipped as, and all four are look and never rule: the reducer,
 * the view and the golden sim cannot tell which angle the board is being
 * watched from or how brightly it is lit.
 */

export type BoardHandle = {
  zoomBy(factor: number): void;
  flyToHex(hex: HexKey, zoom: number): void;
  flyToFit(): void;
  zoomLevel(): number;
  zoomMax(): number;
};

export type BoardProps = {
  readonly view: BoardView;
  readonly theme: Theme;
  /** The last pop — the store's counter and keys — so the leap can play. */
  readonly popped: Popped | null;
  /** Degrees the camera leans back from straight down. */
  readonly tilt?: number;
  /** Degrees the board is turned under it. */
  readonly yaw?: number;
  /** How high the ground varies, in hex radii; 0 is a flat board. */
  readonly relief?: number;
  /** How hard the rig lights the board, 0..1; 0 renders every face as authored. */
  readonly light?: number;
  /** 0 paints the ground alone; above 0 paints the whole material. */
  readonly materials?: number;
  /** Whether to load the direction own art. */
  readonly art?: boolean;
  readonly reducedMotion?: boolean;
  readonly onTap: (key: HexKey, cell: CellView) => void;
  readonly handle?: Ref<BoardHandle>;
};

const FLIGHT_MS = 320;
const TAP_SLOP = 8;
/** How far back the eye stands. Orthographic, so this only has to clear the
 *  near plane and stay inside the far one — it changes nothing on screen. */
const EYE_DISTANCE = 200;

export function Board(props: BoardProps) {
  const { theme, tilt = 0, yaw = 0, relief = 0, light = 0, materials = 0, art = false } = props;
  const assets = useAssets(theme.id, art);
  // One cache for both layers, so a leaping ASH tile is painted by the very
  // texture that was under it a frame ago rather than by a second bake of it.
  const textures = useMemo(() => new SurfaceTextures(), []);
  useEffect(() => () => textures.dispose(), [textures]);
  const layout = useMemo(() => ({ ...UNIT, orientation: theme.orientation }), [theme.orientation]);
  const wrapper = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = wrapper.current;
    if (el === null) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry === undefined) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The pop plays in its own layer, over a board that has already turned the
  // popped cells to stone.
  //
  // DERIVED, not mirrored. Copying `props.popped` into state through an effect
  // means every harvest renders twice and the second render is the one that
  // shows the leap — a cascading render, and a frame of latency on the one
  // animation that has to feel immediate. The store already stamps each pop
  // with an id, so remembering which id has FINISHED is enough.
  const [finished, setFinished] = useState<number | null>(null);
  const pop = props.popped !== null && props.popped.id !== finished ? props.popped : null;
  const donePopping = useCallback(() => {
    if (props.popped !== null) setFinished(props.popped.id);
  }, [props.popped]);

  return (
    <div
      ref={wrapper}
      style={{
        position: 'absolute',
        inset: 0,
        background: cssHex(theme.board.background),
        touchAction: 'none',
      }}
    >
      {size.width > 0 && (
        <Canvas
          frameloop="demand"
          orthographic
          dpr={[1, 2]}
          // `flat` turns OFF tone mapping. R3F applies ACES otherwise, which
          // would sit between the graded palette and the screen — see `gl.ts`
          // for why that made the contrast budget describe a board that did
          // not exist.
          flat
          gl={GL_PROPS}
          // The board says when it is up, so the failure panel never blames a
          // crash on "this browser has no WebGL" while WebGL is plainly
          // working — and never probes for a context while three holds one,
          // which on a phone at its context limit drops the oldest: the board.
          onCreated={markBoardAlive}
          camera={{ position: [0, 100, 0], zoom: 30, near: 0.1, far: 1000 }}
          style={{ width: size.width, height: size.height }}
        >
          <color attach="background" args={[theme.board.background]} />
          <LightRig rig={rigFor(light)} yaw={yaw} />
          <Rig
            view={props.view}
            theme={theme}
            width={size.width}
            height={size.height}
            tilt={tilt}
            yaw={yaw}
            relief={relief}
            reducedMotion={props.reducedMotion === true}
            handle={props.handle}
            wrapper={wrapper}
          />
          <HexField
            view={props.view}
            theme={theme}
            orientation={theme.orientation}
            relief={relief}
            materials={materials}
            assets={assets}
            textures={textures}
            yaw={yaw}
            reducedMotion={props.reducedMotion === true}
            onTap={props.onTap}
          />
          {pop !== null && (
            <Pop
              cells={pop.cells}
              at={pop.at}
              id={pop.id}
              theme={theme}
              layout={layout}
              relief={relief}
              materials={materials}
              assets={assets}
              textures={textures}
              reducedMotion={props.reducedMotion === true}
              onDone={donePopping}
            />
          )}
        </Canvas>
      )}
    </div>
  );
}

type RigProps = {
  readonly view: BoardView;
  readonly theme: Theme;
  readonly width: number;
  readonly height: number;
  readonly tilt: number;
  readonly yaw: number;
  readonly relief: number;
  readonly reducedMotion: boolean;
  readonly handle: Ref<BoardHandle> | undefined;
  readonly wrapper: React.RefObject<HTMLDivElement | null>;
};

/**
 * Owns the camera: the fit, the clamps, the gestures and the flights. Lives
 * inside the Canvas so it can reach the camera and ask for frames.
 */
function Rig({
  view,
  theme,
  width,
  height,
  tilt,
  yaw,
  relief,
  reducedMotion,
  handle,
  wrapper,
}: RigProps) {
  const camera = useThree((s) => s.camera) as OrthographicCamera;
  const invalidate = useThree((s) => s.invalidate);

  // The fit frames the STRUCTURE, never the beacon disc (Ashwake 1's rule).
  const frame = useMemo<Frame>(() => {
    const anchored = view.cells.filter((c) => !c.beacon);
    const framed = anchored.length > 0 ? anchored : view.cells;
    // A leaning camera has to be told how tall the board is: what stands on
    // the far ground leans into the top of the frame and would be cropped by
    // a fit that only measured floors.
    const lean: Lean = { tilt, yaw, tallest: tallestOf(framed, relief) };
    return frameFor(
      framed.map((c) => ({ q: c.q, r: c.r })),
      width,
      height,
      theme.orientation,
      lean,
    );
  }, [view, width, height, theme.orientation, tilt, yaw, relief]);

  // Camera state lives in a ref: gestures write it many times a second and
  // React must not re-render for any of them.
  const cam = useRef<CameraState>(fitCamera(frame));
  const flight = useRef<{ from: CameraState; to: CameraState; startedAt: number } | null>(null);
  /** A thrown board, still travelling. Cleared by any deliberate move. */
  const glide = useRef<Glide | null>(null);
  const glidedAt = useRef(0);
  const frameRef = useRef(frame);
  const wasFit = useRef(true);

  // A board that grew while at zoom 1 re-fits, so the frontier stays in view.
  useEffect(() => {
    frameRef.current = frame;
    if (wasFit.current) cam.current = fitCamera(frame);
    else cam.current = { ...cam.current, zoom: Math.min(cam.current.zoom, zoomMaxOf(frame)) };
    invalidate();
  }, [frame, invalidate]);

  /**
   * Write the camera for this frame.
   *
   * The camera is a three.js object owned by the renderer and this runs from
   * `useFrame`, which is not render. Mutating it in place is the entire point
   * of an imperative camera: gestures write it many times a second and React
   * must never re-render for one. See `eslint.config.js` for why the purity
   * rules are scoped off for `board/` and loud everywhere else.
   */
  const apply = (): void => {
    const c = cam.current;
    const f = frameRef.current;
    const eye = eyeOf(f.lean, EYE_DISTANCE);
    camera.zoom = f.fit.size * c.zoom;
    camera.position.set(c.cx + eye.x, eye.y, c.cz + eye.z);
    camera.up.set(eye.upX, eye.upY, eye.upZ);
    camera.lookAt(c.cx, 0, c.cz);
    camera.updateProjectionMatrix();
  };

  useFrame(() => {
    // A flick carries the board after the finger has gone. It is cancelled by
    // anything the player does on purpose — a drag, a pinch, a flight — because
    // a finger outranks a throw exactly as it outranks a journey.
    const g = glide.current;
    if (g !== null) {
      const now = performance.now();
      const step = glided(g, Math.min(64, now - glidedAt.current || 16));
      glidedAt.current = now;
      cam.current = glidedBy(cam.current, step.dx, step.dz);
      glide.current = isResting(step.next) ? null : step.next;
      if (glide.current !== null) invalidate();
    }

    const fl = flight.current;
    if (fl !== null) {
      const t = (performance.now() - fl.startedAt) / FLIGHT_MS;
      cam.current = lerpCamera(fl.from, fl.to, t);
      if (t >= 1) {
        cam.current = fl.to;
        flight.current = null;
      } else invalidate();
    }
    apply();
  });

  const fly = useCallback(
    (to: CameraState): void => {
      wasFit.current = to.zoom <= 1.0001;
      if (reducedMotion) {
        cam.current = to;
        flight.current = null;
      } else {
        flight.current = { from: cam.current, to, startedAt: performance.now() };
      }
      invalidate();
    },
    [reducedMotion, invalidate],
  );

  useImperativeHandle(
    handle,
    () => ({
      zoomBy(factor) {
        wasFit.current = false;
        cam.current = zoomedBy(frameRef.current, cam.current, factor);
        flight.current = null;
        invalidate();
      },
      flyToHex(hex, zoom) {
        const { q, r } = parse(hex);
        const p = place({ q, r }, { ...UNIT, orientation: theme.orientation });
        fly(cameraAt(frameRef.current, zoom, p.x, p.y));
      },
      flyToFit() {
        fly(fitCamera(frameRef.current));
      },
      zoomLevel: () => flight.current?.to.zoom ?? cam.current.zoom,
      zoomMax: () => zoomMaxOf(frameRef.current),
    }),
    [invalidate, fly, theme.orientation],
  );

  // Gestures, on the wrapper: one finger drags past the slop, two pinch, a
  // wheel zooms. Taps are the meshes' business (R3F reports the delta).
  useEffect(() => {
    const el = wrapper.current;
    if (el === null) return;
    const pointers = new Map<number, { x: number; y: number }>();
    let last: { x: number; y: number } | null = null;
    let moved = false;
    let pinch: number | null = null;
    // The last few moves, so a flick is measured over a gesture rather than
    // over whatever jitter the final event happened to carry — one sample
    // reads as the board flying off when a finger merely lifted crookedly.
    const recent: { at: number; cx: number; cz: number }[] = [];

    const down = (e: PointerEvent): void => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        last = { x: e.clientX, y: e.clientY };
        moved = false;
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      }
    };
    const move = (e: PointerEvent): void => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2 && pinch !== null) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        if (d > 0 && pinch > 0) {
          wasFit.current = false;
          flight.current = null;
          glide.current = null;
          cam.current = zoomedBy(frameRef.current, cam.current, d / pinch);
          invalidate();
        }
        pinch = d;
        return;
      }
      if (pointers.size !== 1 || last === null) return;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      if (!moved && Math.hypot(dx, dy) < TAP_SLOP) return;
      moved = true;
      wasFit.current = false;
      flight.current = null;
      glide.current = null;
      const before = cam.current;
      cam.current = pannedBy(frameRef.current, cam.current, dx, dy);
      recent.push({
        at: e.timeStamp,
        cx: cam.current.cx - before.cx,
        cz: cam.current.cz - before.cz,
      });
      if (recent.length > 5) recent.shift();
      last = { x: e.clientX, y: e.clientY };
      invalidate();
    };
    const up = (e: PointerEvent): void => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pointers.size !== 0) return;
      last = null;

      // A lift is a throw if the board was still moving when the finger left.
      // Reduced motion keeps the acknowledgement and drops the travel.
      const first = recent[0];
      const span = first === undefined ? 0 : e.timeStamp - first.at;
      if (!reducedMotion && moved && first !== undefined && span > 0) {
        const sum = recent.reduce((a, r) => ({ cx: a.cx + r.cx, cz: a.cz + r.cz }), {
          cx: 0,
          cz: 0,
        });
        // The centre moved WITH the drag, so the glide carries it the same
        // way — `glidedBy` subtracts, which is why these are negated.
        const flick = { vx: -sum.cx / span, vz: -sum.cz / span };
        glide.current = isFlick(flick) ? flick : null;
        if (glide.current !== null) invalidate();
      }
      recent.length = 0;
      moved = false;
    };
    const wheel = (e: WheelEvent): void => {
      e.preventDefault();
      wasFit.current = false;
      flight.current = null;
      glide.current = null;
      cam.current = zoomedBy(frameRef.current, cam.current, e.deltaY < 0 ? 1.15 : 1 / 1.15);
      invalidate();
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
    };
    // `reducedMotion` is read by the flick, so the listeners are rebound when
    // it changes — a phone that turns motion off mid-run should stop throwing
    // the board on the next lift, not the next reload.
  }, [wrapper, invalidate, reducedMotion]);

  return null;
}
