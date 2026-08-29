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
  clampTilt,
  eyeOf,
  fitCamera,
  frameFor,
  glided,
  glidedBy,
  isFlick,
  isResting,
  LEAN_DEADZONE,
  lerpCamera,
  pannedBy,
  TURN_DEADZONE,
  twoFinger,
  wrapYaw,
  ZOOM_DEADZONE,
  zoomMaxOf,
  zoomedBy,
  type CameraState,
  type Finger,
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
  /** Back to the direction's own angle. The cluster's third control. */
  resetLean(): void;
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
  /** Told when the board is, or stops being, off its default angle — so the
   *  camera cluster can offer a way back only when there is one. */
  readonly onLeanChange?: ((leaned: boolean) => void) | undefined;
};

const FLIGHT_MS = 320;
const TAP_SLOP = 8;

/** How much of each screen edge refuses a touch outright, so iOS Safari's
 *  back/forward swipe cannot take the page mid-drag. Ashwake 1's number. */
const EDGE_SWIPE_PX = 28;
/** How far back the eye stands. Orthographic, so this only has to clear the
 *  near plane and stay inside the far one — it changes nothing on screen. */
const EYE_DISTANCE = 200;

/** Half a degree, which is the finest step worth re-fitting a board for. */
const round2 = (deg: number): number => Math.round(deg * 2) / 2;

export function Board(props: BoardProps) {
  const { theme, tilt = 0, yaw = 0, relief = 0, light = 0, materials = 0, art = false } = props;

  /*
   * The angle the player is holding the board at (2026-08-29, Marc: "anyway we
   * could tilt, drag cameras as we want? 3d style").
   *
   * `tilt` and `yaw` above are the DEFAULT — Marc's 35 and the query dials —
   * and this is where the board actually is. It lives in state rather than in
   * the camera ref, unlike the pan and the zoom, because three things read the
   * angle and only one of them is the camera: the fit reserves sky by the
   * tilt, the light rig turns with the yaw, and the labels turn BACK by it so
   * they stay readable. A ref could not tell any of them.
   *
   * It resets to the default on a new run rather than being remembered, which
   * keeps the opening board one known picture — the shot set, the screen audit
   * and Session C all measure the same first minute for everybody. The reset
   * control in the camera cluster is how you get back mid-run.
   */
  const [lean, setLean] = useState({ tilt, yaw });
  const leaned = lean.tilt !== tilt || lean.yaw !== yaw;
  const resetLean = useCallback(() => setLean({ tilt, yaw }), [tilt, yaw]);
  const leanBy = useCallback(
    (turn: number, back: number) =>
      setLean((was) => ({
        // Quantised to a half degree: two fingers are never still, and a frame
        // that moved the board by a hundredth of a degree is a re-render (and
        // a whole re-fit) bought for something no eye can see.
        tilt: round2(clampTilt(was.tilt + back)),
        yaw: round2(wrapYaw(was.yaw + turn)),
      })),
    [],
  );

  // Told only when the ANSWER changes, not on every degree — the cluster only
  // needs to know whether there is anything to reset.
  const { onLeanChange } = props;
  useEffect(() => {
    onLeanChange?.(leaned);
  }, [leaned, onLeanChange]);
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
          <LightRig rig={rigFor(light)} yaw={lean.yaw} />
          <Rig
            view={props.view}
            theme={theme}
            width={size.width}
            height={size.height}
            tilt={lean.tilt}
            yaw={lean.yaw}
            relief={relief}
            reducedMotion={props.reducedMotion === true}
            handle={props.handle}
            wrapper={wrapper}
            onLeanBy={leanBy}
            onResetLean={resetLean}
          />
          <HexField
            view={props.view}
            theme={theme}
            orientation={theme.orientation}
            relief={relief}
            materials={materials}
            assets={assets}
            textures={textures}
            yaw={lean.yaw}
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
  /** Two fingers turning and leaning: degrees to ADD, not absolutes. */
  readonly onLeanBy: (turn: number, back: number) => void;
  readonly onResetLean: () => void;
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
  onLeanBy,
  onResetLean,
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
      // The angle lives a level up, in `Board` — three things read it and only
      // one of them is this camera — so the handle passes the ask along.
      resetLean: onResetLean,
    }),
    [invalidate, fly, theme.orientation, onResetLean],
  );

  // Gestures, on the wrapper: one finger drags past the slop, two pinch, a
  // wheel zooms. Taps are the meshes' business (R3F reports the delta).
  useEffect(() => {
    const el = wrapper.current;
    if (el === null) return;
    const pointers = new Map<number, { x: number; y: number }>();
    let last: { x: number; y: number } | null = null;
    let moved = false;
    /*
     * The two-finger gesture: pinch, twist and lean, all at once.
     *
     * `pair` is where the two fingers were on the previous move, so every
     * frame reads a DELTA rather than a total — the same shape the pan uses,
     * and for the same reason: a total measured from where the gesture began
     * fights any correction the hand makes halfway through.
     *
     * `since` accumulates the whole gesture, and is only ever compared against
     * the deadzones. Two fingers are never still — a pinch rotates a degree or
     * two and drifts a few pixels — so a channel has to be ASKED for before it
     * engages, and once engaged it stays engaged for the rest of the gesture.
     * A threshold re-tested every frame is a channel that stutters in and out
     * exactly when somebody slows down to be precise.
     */
    let pair: [Finger, Finger] | null = null;
    let since = { scale: 1, turn: 0, lean: 0 };
    let on = { zoom: false, turn: false, lean: false };
    const twoDown = (): [Finger, Finger] | null => {
      const [a, b] = [...pointers.values()];
      return a === undefined || b === undefined ? null : [a, b];
    };
    /*
     * Start the two-finger gesture over from wherever the fingers are NOW.
     *
     * Called every time the SET of pointers changes, which is the whole rule
     * and is the pinch bug's lesson generalised: a gesture's reference point
     * belongs to the fingers that are down, so the moment that set changes the
     * old reference describes a hand that no longer exists. Two fingers, a
     * third landing, then one lifting would otherwise measure the next move
     * against positions several events old — and against a possibly different
     * pair, since the two being read are the first two still down. That is a
     * zoom, a turn and a lean all jumping in a single frame.
     *
     * The accumulator resets with it, because the deadzones describe how far
     * THIS gesture has come and a new set of fingers is a new gesture.
     *
     * **The three-finger path is reasoned, not tested, and that is a gap worth
     * naming.** Chrome's `Input.dispatchTouchEvent` identifies touch points by
     * their INDEX in the array it is handed, not by identity — asking it to
     * end the third point ends the FIRST one and merely reports it at the
     * third one's coordinates (verified 2026-08-29). So "a palm lands and
     * leaves" cannot be expressed faithfully to the driver `e2e/board.spec.ts`
     * drives with, and a test that appeared to cover it would be describing a
     * different gesture. The honest fix, if this ever bites, is the one this
     * repo has reached for twice already: lift the bookkeeping out of the
     * handler into a pure tracker and unit-test it there.
     */
    const seedPair = (): void => {
      pair = pointers.size === 2 ? twoDown() : null;
      since = { scale: 1, turn: 0, lean: 0 };
      on = { zoom: false, turn: false, lean: false };
    };
    // The last few moves, so a flick is measured over a gesture rather than
    // over whatever jitter the final event happened to carry — one sample
    // reads as the board flying off when a finger merely lifted crookedly.
    const recent: { at: number; cx: number; cz: number }[] = [];

    const down = (e: PointerEvent): void => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        last = { x: e.clientX, y: e.clientY };
        moved = false;
      } else {
        // Any second-or-later finger changes the set, so the gesture restarts.
        seedPair();
      }
    };
    const move = (e: PointerEvent): void => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2 && pair !== null) {
        const now = twoDown();
        if (now !== null) {
          const g = twoFinger(pair, now);
          since = {
            scale: since.scale * g.scale,
            turn: since.turn + g.turn,
            lean: since.lean + g.lean,
          };
          if (Math.abs(since.scale - 1) > ZOOM_DEADZONE) on.zoom = true;
          if (Math.abs(since.turn) > TURN_DEADZONE) on.turn = true;
          if (Math.abs(since.lean) > LEAN_DEADZONE) on.lean = true;

          if (on.zoom || on.turn || on.lean) {
            flight.current = null;
            glide.current = null;
          }
          if (on.zoom) {
            wasFit.current = false;
            cam.current = zoomedBy(frameRef.current, cam.current, g.scale);
          }
          // The turn and the lean go OUT to React — three things read the
          // angle and only one of them is the camera. A board that was fitted
          // stays fitted through it: the frame effect re-fits on every lean,
          // which is what keeps a tilting board from walking off its own edge.
          if (on.turn || on.lean) onLeanBy(on.turn ? g.turn : 0, on.lean ? g.lean : 0);
          if (on.zoom) invalidate();
          pair = now;
        }
        // A pinch is not a tap, and it is not a throw either. `moved` stops
        // the lift placing a tile; clearing the samples stops the lift
        // launching a GLIDE built from whatever pan happened before the
        // second finger landed — the board sailing off after the fingers are
        // already gone.
        moved = true;
        recent.length = 0;
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
      // A lift changes the set too — including 3 fingers down to 2, which is
      // the case a `size < 2` check silently left holding a stale pair.
      seedPair();

      if (pointers.size !== 0) {
        /*
         * One finger left of a pinch, and this is the bug that made the map
         * fly away (Marc, on a phone, 2026-08-29).
         *
         * `last` still holds where the FIRST finger was. The surviving
         * finger's next move measured `dx` from there — the distance between
         * two fingers, not the distance that finger travelled — and panned
         * the board that far in a single frame. Lifting one finger of a pinch
         * has to CONTINUE as a pan from where the remaining finger actually
         * is.
         *
         * The velocity samples go with it: they describe a gesture that has
         * just ended, and carrying them into the next one is how a pinch
         * turns into a throw.
         */
        const [remaining] = [...pointers.values()];
        if (remaining !== undefined) last = { x: remaining.x, y: remaining.y };
        recent.length = 0;
        return;
      }
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

    /*
     * iOS Safari's edge swipe is a back/forward navigation, and the board's
     * left and right edges are exactly where a thumb starts a pan. Losing the
     * page mid-run to a gesture aimed at the board is the worst outcome a
     * drag can have — so the first 28px of either edge refuses the touch
     * outright. Ashwake 1's number, and non-passive because refusing is the
     * entire point.
     */
    const edge = (event: TouchEvent): void => {
      const x = event.touches[0]?.clientX;
      if (x === undefined) return;
      if (x < EDGE_SWIPE_PX || x > window.innerWidth - EDGE_SWIPE_PX) event.preventDefault();
    };
    el.addEventListener('touchstart', edge, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('touchstart', edge);
    };
    // `reducedMotion` is read by the flick, so the listeners are rebound when
    // it changes — a phone that turns motion off mid-run should stop throwing
    // the board on the next lift, not the next reload.
  }, [wrapper, invalidate, reducedMotion, onLeanBy]);

  return null;
}
