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
  dragOrbit,
  eyeOf,
  fitCamera,
  frameFor,
  glided,
  glidedBy,
  isFlick,
  isResting,
  LEAN_DEADZONE,
  TAP_SLOP,
  lerpCamera,
  nudgeInto,
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
import {
  cellAt,
  firstCursor,
  markerAt,
  reanchor,
  stepCursor,
  type Cursor,
  type Direction,
} from './cursor';
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

/**
 * The camera, as the rig exposes it. Internal: it is what `Board` composes its
 * own handle out of, and the only part of the board that lives inside the
 * Canvas. Split from `BoardHandle` because the two halves genuinely live in
 * different places now — the angle and the marker are React state a level up,
 * and a single `useImperativeHandle` down here could not reach them.
 */
type RigHandle = {
  zoomBy(factor: number): void;
  /** Slide the board by screen pixels, exactly as a drag does. */
  panBy(dx: number, dy: number): void;
  flyToHex(hex: HexKey, zoom: number): void;
  flyToFit(): void;
  zoomLevel(): number;
  zoomMax(): number;
};

/** Where the keyboard is pointing, and what is there. */
export type Aim = { readonly key: HexKey; readonly cell: CellView };

export type BoardHandle = {
  zoomBy(factor: number): void;
  panBy(dx: number, dy: number): void;
  flyToHex(hex: HexKey, zoom: number): void;
  flyToFit(): void;
  zoomLevel(): number;
  zoomMax(): number;
  /** Back to the direction's own angle — the cycle's DEFAULT. */
  resetLean(): void;
  /** Straight down at the map, however the board was leaned — the cycle's FLAT. */
  flatten(): void;
  /** Degrees to ADD to the turn and the lean — the keyboard's half of the
   *  two-finger gesture. */
  turnBy(deg: number): void;
  leanBy(deg: number): void;
  /**
   * Walk the keyboard's marker one hex, and say where it ended up.
   *
   * `null` asks only for the marker to APPEAR, which is also what the first
   * arrow press does: a key that both revealed the marker and moved it would
   * put it somewhere the player has not looked at yet, and the one thing on
   * this board that cannot be undone is a tile placed on the wrong hex.
   */
  moveCursor(dir: Direction | null): Aim | null;
  /** What the marker is on, or null while there is no marker. */
  cursorCell(): Aim | null;
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
  /** The board's accessible name, and the sentence that tells a screen reader
   *  it can be walked. Both the catalogue's — see `s.ui.board`. */
  readonly label?: string;
  readonly keyHelp?: string;
};

const FLIGHT_MS = 320;

/** How much of each screen edge refuses a touch outright, so iOS Safari's
 *  back/forward swipe cannot take the page mid-drag. Ashwake 1's number. */
const EDGE_SWIPE_PX = 28;
/** How far back the eye stands. Orthographic, so this only has to clear the
 *  near plane and stay inside the far one — it changes nothing on screen. */
const EYE_DISTANCE = 200;

/** How far inside the viewport the keyboard's marker is kept, in CSS pixels.
 *  Wide enough that a hex arrives whole rather than sliced by the edge, and
 *  clear of the chrome the board is drawn under. */
const CURSOR_MARGIN = 72;

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
   * **It lives for the SESSION and is never written to storage**, which is the
   * whole of the persistence decision: a fresh page — the shot set, the screen
   * audit, and a stranger arriving — always opens at the direction's own angle,
   * so the first minute stays one known picture for everybody. Within a
   * session it is the player's and survives a new run, because `Board` never
   * remounts (the canvas must not) and there is no reason a run boundary should
   * take an angle away from the hands that chose it. The camera cluster's cycle
   * carries FLAT and DEFAULT, which are the two ways back.
   */
  const [lean, setLean] = useState({ tilt, yaw, relief });
  const resetLean = useCallback(() => setLean({ tilt, yaw, relief }), [tilt, yaw, relief]);
  /**
   * 2D: the map the rules are written on.
   *
   * Marc, 2026-08-29: "add in the toggle a 2d mode too". All THREE go to zero
   * rather than the tilt alone — a board seen from straight down with its
   * relief still on is a board whose hexes are different heights and whose
   * shading says so, which is a 3D board photographed from above and not a map.
   *
   * None of the three has ever been a rule (they are look, and the golden sim
   * cannot see them), so this is a change of picture and never of game.
   */
  const flatten = useCallback(() => setLean({ tilt: 0, yaw: 0, relief: 0 }), []);
  const leanBy = useCallback(
    (turn: number, back: number) =>
      setLean((was) => ({
        ...was,
        // Quantised to a half degree: two fingers are never still, and a frame
        // that moved the board by a hundredth of a degree is a re-render (and
        // a whole re-fit) bought for something no eye can see.
        tilt: round2(clampTilt(was.tilt + back)),
        yaw: round2(wrapYaw(was.yaw + turn)),
      })),
    [],
  );

  /*
   * The keyboard's marker (2026-08-29).
   *
   * State rather than a ref, and up HERE rather than in the rig, for the same
   * reason the angle is: three things read it and only one of them draws it —
   * the field paints its ring, the rig keeps it on screen, and the handle
   * answers the shell with what it is standing on.
   *
   * **Null is the ordinary state**, and it means "nobody has touched a key".
   * A board that opens with a marker on it is a board that has told a phone
   * player about a keyboard they do not have; the first arrow press is what
   * brings it into existence, and it appears without moving.
   */
  const [cursor, setCursor] = useState<Cursor | null>(null);

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

  /** The angle, as the marker's arithmetic wants it. Height is irrelevant to
   *  where a hex lands on screen, so the tallest is not asked for. */
  const leanFor = useMemo<Lean>(
    () => ({ tilt: lean.tilt, yaw: lean.yaw, tallest: 0 }),
    [lean.tilt, lean.yaw],
  );

  /*
   * Two repairs, and they are the same one.
   *
   * The marker's anchor is a SCREEN coordinate, so a turn or a lean changes
   * what it means; and a board that grew — or a run that restarted — may no
   * longer have the ground the marker was standing on. Both are answered by
   * re-deriving the anchor from the cell, which reports `null` when the cell
   * has gone and puts the marker away.
   *
   * Returns the previous cursor UNCHANGED where nothing moved, because this
   * runs after every placement and a fresh object each time is a re-render of
   * the whole board for a number that did not change.
   */
  useEffect(() => {
    setCursor((was) => {
      if (was === null) return null;
      const next = reanchor(props.view.cells, was, layout, leanFor);
      if (next === null) return null;
      return next.ax === was.ax && next.ay === was.ay ? was : next;
    });
  }, [props.view, layout, leanFor]);

  const rig = useRef<RigHandle | null>(null);

  const aimAt = useCallback(
    (key: HexKey): Aim | null => {
      const cell = cellAt(props.view.cells, key);
      return cell === null ? null : { key, cell };
    },
    [props.view.cells],
  );

  const moveCursor = useCallback(
    (dir: Direction | null): Aim | null => {
      const cells = props.view.cells;
      const start = cursor ?? firstCursor(cells, layout, leanFor);
      if (start === null) return null;
      // A marker that did not exist a moment ago only APPEARS — see
      // `BoardHandle.moveCursor` for why a first press must not also move.
      const next =
        cursor === null || dir === null ? start : stepCursor(cells, start, dir, layout, leanFor);
      if (next === null) return null;
      setCursor(next);
      return aimAt(next.key);
    },
    [cursor, props.view.cells, layout, leanFor, aimAt],
  );

  /*
   * The public handle is assembled HERE, out of the rig's camera and the two
   * things that are React state at this level — the angle and the marker. It
   * used to be `useImperativeHandle` inside the rig, which stopped being
   * possible the moment the handle had to answer "what is the marker on".
   */
  useImperativeHandle(
    props.handle,
    () => ({
      zoomBy: (factor) => rig.current?.zoomBy(factor),
      panBy: (dx, dy) => rig.current?.panBy(dx, dy),
      flyToHex: (hex, zoom) => rig.current?.flyToHex(hex, zoom),
      flyToFit: () => rig.current?.flyToFit(),
      zoomLevel: () => rig.current?.zoomLevel() ?? 1,
      zoomMax: () => rig.current?.zoomMax() ?? 1,
      resetLean,
      flatten,
      turnBy: (deg) => leanBy(deg, 0),
      leanBy: (deg) => leanBy(0, deg),
      moveCursor,
      cursorCell: () => (cursor === null ? null : aimAt(cursor.key)),
    }),
    [resetLean, flatten, leanBy, moveCursor, cursor, aimAt],
  );

  return (
    <div
      ref={wrapper}
      /*
       * The board is a CONTROL, not a picture (2026-08-29).
       *
       * `tabIndex` puts it in the tab order — it was a canvas nothing could
       * reach — and `role="application"` is what tells a screen reader to hand
       * the arrow keys through instead of using them to read the page, which
       * is the whole contract the marker rests on. The role is on this element
       * rather than on `.board-host` on purpose: the camera cluster and the
       * help button live in that host too, and they are ordinary buttons that
       * must keep ordinary behaviour.
       *
       * `keyHelp` is the description a screen reader reads on arrival, because
       * a marker nobody has been told about is a marker nobody presses an
       * arrow to find.
       */
      className="board-view"
      tabIndex={0}
      role="application"
      {...(props.label === undefined ? {} : { 'aria-label': props.label })}
      {...(props.keyHelp === undefined ? {} : { 'aria-describedby': 'board-keys' })}
      /*
       * The angle the board is actually at, on the DOM.
       *
       * A test-shaped affordance, and it earns its place: the camera's only
       * other witness is the canvas, and a canvas is not a stable one — the
       * board is never still (embers, beacons) so two screenshots of an
       * unchanged board differ anyway. An e2e that compared pixels here passed
       * against a gesture doing nothing at all before this existed. Three
       * numbers, describing real state the rules cannot see, in the same
       * `data-` idiom the stat row and the hand already use.
       */
      data-lean={`${lean.tilt},${lean.yaw},${lean.relief}`}
      style={{
        position: 'absolute',
        inset: 0,
        background: cssHex(theme.board.background),
        touchAction: 'none',
      }}
    >
      {props.keyHelp !== undefined && (
        <p id="board-keys" className="visually-hidden">
          {props.keyHelp}
        </p>
      )}
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
            relief={lean.relief}
            reducedMotion={props.reducedMotion === true}
            handle={rig}
            wrapper={wrapper}
            cursor={cursor?.key ?? null}
            onLeanBy={leanBy}
          />
          <HexField
            view={props.view}
            theme={theme}
            orientation={theme.orientation}
            relief={lean.relief}
            materials={materials}
            assets={assets}
            textures={textures}
            yaw={lean.yaw}
            reducedMotion={props.reducedMotion === true}
            cursor={cursor?.key ?? null}
            onTap={props.onTap}
          />
          {pop !== null && (
            <Pop
              cells={pop.cells}
              at={pop.at}
              id={pop.id}
              theme={theme}
              layout={layout}
              relief={lean.relief}
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
  readonly handle: Ref<RigHandle>;
  readonly wrapper: React.RefObject<HTMLDivElement | null>;
  /** Where the keyboard's marker is, so the camera can keep it on screen. */
  readonly cursor: HexKey | null;
  /** Two fingers turning and leaning: degrees to ADD, not absolutes. */
  readonly onLeanBy: (turn: number, back: number) => void;
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
  cursor,
  onLeanBy,
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
      panBy(dx, dy) {
        wasFit.current = false;
        flight.current = null;
        glide.current = null;
        cam.current = pannedBy(frameRef.current, cam.current, dx, dy);
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

  /*
   * The marker never walks off the screen.
   *
   * Only as far as it has to (`nudgeInto`), and written straight into the
   * camera rather than flown: an arrow press is a small deliberate step and a
   * 320ms flight behind every one of them would make a held-down arrow feel
   * like the board was swimming. It also has to be a PAN and not a re-centre,
   * so that walking the marker around the middle of the board moves nothing at
   * all — which is what makes the board feel still while it is being read.
   */
  useEffect(() => {
    if (cursor === null) return;
    const { q, r } = parse(cursor);
    const p = place({ q, r }, { ...UNIT, orientation: theme.orientation });
    const next = nudgeInto(frameRef.current, cam.current, p.x, p.y, CURSOR_MARGIN);
    if (next === cam.current) return;
    wasFit.current = false;
    flight.current = null;
    glide.current = null;
    cam.current = next;
    invalidate();
  }, [cursor, theme.orientation, invalidate]);

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
      if (queued !== 0) cancelAnimationFrame(queued);
      queued = 0;
    };

    /*
     * The two-finger gesture is read ONCE A FRAME, not once an event.
     *
     * A browser delivers one `pointermove` per pointer, so a two-finger drag
     * arrives as "A moved" and then "B moved" — and in between, the pair is
     * skewed: one finger has travelled and the other has not. Reading a delta
     * off that intermediate state reports a TURN for a gesture that was purely
     * a drag. The two halves cancel out over the pair of events, but the
     * deadzone does not: the first half alone clears eight degrees on a normal
     * drag, the turn channel latches, and the board wobbles for the rest of the
     * gesture. `e2e/board.spec.ts` caught exactly this, and it is a real
     * phone's behaviour rather than an artefact of the driver.
     *
     * Coalescing to an animation frame fixes it at the source — by the time
     * this runs, both fingers are where they actually are — and it is also
     * what keeps a gesture to one React render per frame instead of two.
     */
    let queued = 0;
    const readPair = (): void => {
      queued = 0;
      const now = twoDown();
      if (pair === null || now === null) return;
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
        invalidate();
      }
      // The turn and the lean go OUT to React — three things read the angle and
      // only one of them is the camera. A board that was fitted stays fitted
      // through it: the frame effect re-fits on every lean, which is what keeps
      // a tilting board from walking off its own edge.
      if (on.turn || on.lean) onLeanBy(on.turn ? g.turn : 0, on.lean ? g.lean : 0);
      pair = now;
    };
    // The last few moves, so a flick is measured over a gesture rather than
    // over whatever jitter the final event happened to carry — one sample
    // reads as the board flying off when a finger merely lifted crookedly.
    const recent: { at: number; cx: number; cz: number }[] = [];
    /*
     * The desktop's second finger: a drag with the secondary button, or with
     * Shift held, turns and leans instead of panning (2026-08-29).
     *
     * A mouse has one pointer, so every one of Stage 2d's two-finger channels
     * was unreachable on a desktop — the board could be panned and zoomed and
     * never angled at all. Shift as well as the right button because a
     * trackpad's secondary click is a modifier chord already, and neither
     * costs the page anything: the board eats its own context menu below.
     *
     * Latched at pointerdown and never re-tested, exactly as the two-finger
     * channels are: a gesture that changed meaning halfway through because a
     * thumb came off Shift is a board that jumps.
     */
    let orbiting = false;

    const down = (e: PointerEvent): void => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        last = { x: e.clientX, y: e.clientY };
        moved = false;
        orbiting = e.pointerType !== 'touch' && (e.button === 2 || e.shiftKey);
      } else {
        // Any second-or-later finger changes the set, so the gesture restarts.
        seedPair();
      }
    };
    const move = (e: PointerEvent): void => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2 && pair !== null) {
        // Both fingers report separately; the gesture is read once a frame,
        // when both of them are where they actually are. See `readPair`.
        if (queued === 0) queued = requestAnimationFrame(readPair);
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
      flight.current = null;
      glide.current = null;
      if (orbiting) {
        // Out to React, like the two fingers': the angle is read by the fit,
        // the light rig and the labels, and only one of them is this camera.
        const spun = dragOrbit(dx, dy);
        onLeanBy(spun.turn, spun.lean);
        last = { x: e.clientX, y: e.clientY };
        return;
      }
      wasFit.current = false;
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
      orbiting = false;
    };
    /** The board eats its own context menu, because the right button is how a
     *  desktop turns it. Cards keep theirs — that is the colour lens — and
     *  they are not in here. */
    const menu = (e: MouseEvent): void => e.preventDefault();
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
    el.addEventListener('contextmenu', menu);

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
      if (queued !== 0) cancelAnimationFrame(queued);
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('contextmenu', menu);
      el.removeEventListener('touchstart', edge);
    };
    // `reducedMotion` is read by the flick, so the listeners are rebound when
    // it changes — a phone that turns motion off mid-run should stop throwing
    // the board on the next lift, not the next reload.
  }, [wrapper, invalidate, reducedMotion, onLeanBy]);

  return null;
}
