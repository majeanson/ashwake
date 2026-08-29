import { Canvas, useFrame, useThree } from '@react-three/fiber';
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
  lerpCamera,
  pannedBy,
  zoomMaxOf,
  zoomedBy,
  type CameraState,
  type Frame,
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
  // popped cells to stone. It clears itself when its cascade is over.
  const [pop, setPop] = useState<Popped | null>(null);
  useEffect(() => {
    if (props.popped !== null) setPop(props.popped);
  }, [props.popped]);
  const donePopping = useCallback(() => setPop(null), []);

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
  const frameRef = useRef(frame);
  const wasFit = useRef(true);

  // A board that grew while at zoom 1 re-fits, so the frontier stays in view.
  useEffect(() => {
    frameRef.current = frame;
    if (wasFit.current) cam.current = fitCamera(frame);
    else cam.current = { ...cam.current, zoom: Math.min(cam.current.zoom, zoomMaxOf(frame)) };
    invalidate();
  }, [frame, invalidate]);

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

  const fly = (to: CameraState): void => {
    wasFit.current = to.zoom <= 1.0001;
    if (reducedMotion) {
      cam.current = to;
      flight.current = null;
    } else {
      flight.current = { from: cam.current, to, startedAt: performance.now() };
    }
    invalidate();
  };

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
    [invalidate, reducedMotion, theme.orientation],
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
      cam.current = pannedBy(frameRef.current, cam.current, dx, dy);
      last = { x: e.clientX, y: e.clientY };
      invalidate();
    };
    const up = (e: PointerEvent): void => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pointers.size === 0) last = null;
    };
    const wheel = (e: WheelEvent): void => {
      e.preventDefault();
      wasFit.current = false;
      flight.current = null;
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
  }, [wrapper, invalidate]);

  return null;
}
