import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import type { OrthographicCamera } from 'three';
import { parse, type HexKey } from '@engine/hex';
import { place } from '@render/layout';
import type { BoardView, CellView } from '@render/Renderer';
import { hex as cssHex, type Theme } from '@theme/tokens';
import {
  cameraAt,
  fitCamera,
  frameFor,
  lerpCamera,
  pannedBy,
  zoomMaxOf,
  zoomedBy,
  type CameraState,
  type Frame,
} from './camera';
import { HexField, UNIT, type Leap } from './HexField';

/**
 * The board (Stage 2, 2026-08-28): one `<Canvas>`, mounted once, above every
 * scene — losing it loses the WebGL context (`CLAUDE.md`). Rendering is on
 * demand: a frame is drawn when the view changes, when the camera moves, or
 * while a leap or a flight is in the air, and never otherwise, because a
 * phone that draws sixty idle frames a second is a phone that is warm.
 *
 * The camera looks straight down by default. `tilt` leans it back in degrees
 * — offered as a dial so Marc can see both with a screenshot (the open
 * question in `DECISIONS.md`) rather than have one chosen for him.
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
  readonly popped: { readonly keys: readonly HexKey[]; readonly id: number } | null;
  readonly tilt?: number;
  readonly reducedMotion?: boolean;
  readonly onTap: (key: HexKey, cell: CellView) => void;
  readonly handle?: Ref<BoardHandle>;
};

const FLIGHT_MS = 320;
const TAP_SLOP = 8;

export function Board(props: BoardProps) {
  const { theme, tilt = 0 } = props;
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

  const [leap, setLeap] = useState<Leap | null>(null);
  useEffect(() => {
    if (props.popped === null || props.reducedMotion === true) return;
    setLeap({ keys: new Set(props.popped.keys), startedAt: performance.now() });
    const ms = theme.motion.popMs + theme.motion.popStaggerMs * props.popped.keys.length + 50;
    const id = setTimeout(() => setLeap(null), ms);
    return () => clearTimeout(id);
  }, [props.popped, props.reducedMotion, theme.motion.popMs, theme.motion.popStaggerMs]);

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
          gl={{ antialias: true, powerPreference: 'low-power' }}
          camera={{ position: [0, 100, 0], zoom: 30, near: 0.1, far: 1000 }}
          style={{ width: size.width, height: size.height }}
        >
          <color attach="background" args={[theme.board.background]} />
          <ambientLight intensity={0.55} />
          <directionalLight position={[3, 10, 4]} intensity={1.1} />
          <directionalLight position={[-4, 6, -2]} intensity={0.25} />
          <Rig
            view={props.view}
            theme={theme}
            width={size.width}
            height={size.height}
            tilt={tilt}
            reducedMotion={props.reducedMotion === true}
            handle={props.handle}
            wrapper={wrapper}
          />
          <HexField
            view={props.view}
            theme={theme}
            orientation={theme.orientation}
            leap={leap}
            onTap={props.onTap}
          />
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
  readonly reducedMotion: boolean;
  readonly handle: Ref<BoardHandle> | undefined;
  readonly wrapper: React.RefObject<HTMLDivElement | null>;
};

/**
 * Owns the camera: the fit, the clamps, the gestures and the flights. Lives
 * inside the Canvas so it can reach the camera and ask for frames.
 */
function Rig({ view, theme, width, height, tilt, reducedMotion, handle, wrapper }: RigProps) {
  const camera = useThree((s) => s.camera) as OrthographicCamera;
  const invalidate = useThree((s) => s.invalidate);

  // The fit frames the STRUCTURE, never the beacon disc (Ashwake 1's rule).
  const frame = useMemo<Frame>(() => {
    const anchored = view.cells.filter((c) => !c.beacon);
    return frameFor(
      (anchored.length > 0 ? anchored : view.cells).map((c) => ({ q: c.q, r: c.r })),
      width,
      height,
      theme.orientation,
    );
  }, [view, width, height, theme.orientation]);

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
    const px = f.fit.size * c.zoom;
    const rad = (tilt * Math.PI) / 180;
    const dist = 200;
    camera.zoom = px;
    camera.position.set(c.cx, Math.cos(rad) * dist, c.cz + Math.sin(rad) * dist);
    camera.up.set(0, tilt < 0.5 ? -1 : 1, tilt < 0.5 ? 0 : 0);
    if (tilt < 0.5) camera.up.set(0, 0, -1);
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
