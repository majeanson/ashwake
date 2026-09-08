import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { markBoardAlive } from '../shell/failure';
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
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
import { SHOT_CHAR_MAX } from '@meta/timeline';
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
  NEAR_ZOOM,
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
import { cellAt, firstCursor, refreshed, stepCursor, type Cursor, type Direction } from './cursor';
import { GL_PROPS, watchContext } from './gl';
import { DEFAULT_RENDER_SCALE } from './quality';
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
  /** Look at a hex, hold, then return to where the camera was. */
  visit(hex: HexKey, holdMs: number): void;
  /** Out to the whole board, in on a hex, then back to where the camera was. */
  tour(hex: HexKey, holdMs: number): void;
  /** End a tour early and come home — see the implementation. */
  endTour(): void;
  /** A small picture of the board as it stands, or null. */
  snapshot(): string | null;
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
  /**
   * Go and look at a hex, then come back to where the camera was.
   *
   * Marc, 2026-08-29: a claim is the board answering something you did several
   * hexes away, and the place it happened was staying off screen.
   */
  visit(hex: HexKey, holdMs: number): void;
  /**
   * Show a hex the player has never been told about: out, in, back.
   *
   * Marc, 2026-09-06: *"when a shrine is first described, zoom on it then zoom
   * back where the user was (same view) so its clearer"* — and, asked whether
   * that meant closer or merely centred, *"zoom out then zoom in then back"*.
   * Widened 2026-09-08 to every concept the drip teaches that stands on the
   * map: *"yes do the same for caches, sites and territories"*. Which hexes
   * those are is `shell/tourTarget.ts`; this only knows how to go and look.
   *
   * A `visit` shows where something HAPPENED and keeps the player's zoom on
   * purpose. This one answers a different question — "which of these is the
   * thing the card just named" — and the answer needs the board whole before
   * it needs the hex close, or the dive lands somewhere with no context around
   * it. So it is three legs, not one, and it is its own method rather than a
   * flag on `visit`: a claim's trip has an argued shape and nothing here
   * should change it.
   *
   * It takes exactly `tourMs(holdMs)` and never reports back. The caller that
   * needs to know when the board is its own again runs that clock itself — see
   * `App`'s `touring`, and see below for why a callback would be the worse
   * shape here.
   */
  tour(hex: HexKey, holdMs: number): void;
  /**
   * End a tour early and put the board back where the player left it.
   *
   * What a TAP on a touring board means. The board stays live through a trip on
   * purpose — a finger outranks a journey — and a tap that placed a tile on
   * whatever hex the camera was passing over would be the one mistake this
   * board cannot undo. Safe to call when nothing is touring, and silent if the
   * player has already steered somewhere themselves.
   */
  endTour(): void;
  /** A small picture of the board as it stands — the end screen and the diary. */
  snapshot(): string | null;
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
  /**
   * Put keyboard focus on the board.
   *
   * Walking the marker is a player saying 'I am working on the board now',
   * and focus has to follow the statement — see `App`'s key handler.
   */
  focus(): void;
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
  /** Device pixels per CSS pixel the canvas actually draws at — the SHARPNESS
   *  slider's own number. Defaults to `board/quality.ts`'s per-phone guess. */
  readonly renderScale?: number;
  readonly reducedMotion?: boolean;
  readonly onTap: (key: HexKey, cell: CellView) => void;
  readonly handle?: Ref<BoardHandle>;
  /** The board's accessible name, and the sentence that tells a screen reader
   *  it can be walked. Both the catalogue's — see `s.ui.board`. */
  readonly label?: string;
  readonly keyHelp?: string;
};

const FLIGHT_MS = 320;

/** How long the tour sits at the wide shot before it dives, in ms. Shorter
 *  than the hold at the hex: the wide shot is context, not the subject. */
const TOUR_WIDE_HOLD_MS = 320;

/**
 * How long a `tour` takes end to end, for a caller that has to wait it out.
 *
 * Three flights and two holds, stated once here rather than reassembled by
 * whoever needs the number. **A clock rather than a callback, deliberately.**
 * `tour` has four exits — reduced motion, either leg abandoned by a finger, and
 * the ordinary end — and a `done` that any one of them forgot to call would
 * leave `App`'s `touring` latched true, which is the teaching drip silently
 * stopping for the rest of the run. A duration cannot be forgotten: the worst a
 * trip cut short by a drag costs is that the next card waits out a journey
 * nobody is on any more, and every path converges within this many ms whatever
 * happened.
 */
export const tourMs = (holdMs: number): number => FLIGHT_MS * 3 + TOUR_WIDE_HOLD_MS + holdMs;

/**
 * The camera is still where an excursion's last leg put it.
 *
 * Which is how a journey knows it may carry on: a drag, a pinch or a flick all
 * move the camera, and any of them means the player would rather be here than
 * wherever the trip was going next. One copy for both `visit` and `tour`,
 * because a tolerance written twice is a tolerance that drifts.
 */
const stillAt = (c: CameraState, to: CameraState): boolean =>
  Math.abs(c.cx - to.cx) < 0.02 &&
  Math.abs(c.cz - to.cz) < 0.02 &&
  Math.abs(c.zoom - to.zoom) < 0.001;

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

/**
 * The antialiasing half of the pixel budget — see the `<Canvas>` below for the
 * argument. Read once: a phone's `devicePixelRatio` is fixed for the life of
 * the page, and this decides how the renderer is BUILT. Unlike the resolution
 * half (`props.renderScale`, `board/quality.ts`), this cannot become a player
 * dial — it is a WebGL context flag, fixed at creation, and the canvas may
 * never remount to pick up a new one.
 */
const DENSE = typeof devicePixelRatio === 'number' && devicePixelRatio > 2;
const GL = DENSE ? { ...GL_PROPS, antialias: false } : GL_PROPS;

export function Board(props: BoardProps) {
  const {
    theme,
    tilt = 0,
    yaw = 0,
    relief = 0,
    light = 0,
    materials = 0,
    art = false,
    renderScale = DEFAULT_RENDER_SCALE,
  } = props;
  const dpr: [number, number] = [1, renderScale];

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

  /**
   * A tick the rig re-frames on (2026-08-30).
   *
   * Marc: *"when pressing FLAT, FIT, etc. make sure we recenter the map."*
   * Changing the ANGLE changes where every hex lands on screen — a flattened
   * board is a differently shaped board — so a camera left exactly where it
   * was is looking at a place that has moved, and on a big board it was
   * looking off the edge of it. FIT re-frames because it is a flight; FLAT and
   * DEFAULT only set an angle, and had no way to ask for one.
   *
   * A counter rather than a call into the handle: the new angle is state, so
   * the frame the rig would fit to does not exist until the render after this
   * one. The rig watches the number and fits once the frame it needs is the
   * current one.
   */
  const [refit, setRefit] = useState(0);
  const reframe = useCallback(() => setRefit((n) => n + 1), []);

  const resetLean = useCallback(() => {
    setLean({ tilt, yaw, relief });
    reframe();
  }, [tilt, yaw, relief, reframe]);
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
  const flatten = useCallback(() => {
    setLean({ tilt: 0, yaw: 0, relief: 0 });
    reframe();
  }, [reframe]);
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
      /*
       * Rounded, latched, and only when it MOVED (2026-09-02).
       *
       * Three things, all one observer's business.
       *
       * **Rounded**, because `contentRect` is fractional and a phone's URL bar
       * collapsing walks it through a dozen sub-pixel steps. The canvas is
       * sized in whole device pixels either way.
       *
       * **Only when it moved**, because each of those steps was a `setSize`,
       * and every `setSize` re-renders the entire Canvas subtree.
       *
       * **Latched**, and this is the load-bearing one. The canvas below is
       * gated on `size.width > 0`, and that gate was reading a LIVE
       * measurement — so any transient zero UNMOUNTED the `<Canvas>` and took
       * the WebGL context with it, along with every geometry, material and
       * texture hanging off it. `CLAUDE.md` makes "the board host never
       * remounts" a hard rule and this was the hole in it: a `display: none`
       * on an ancestor, a layout transition, a host observed before it is laid
       * out — any of them, and the board comes back blank. The gate exists to
       * stop the canvas being CREATED at 0×0; a zero after that is not a size,
       * it is the absence of a measurement, and the last real one still holds.
       */
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      setSize((was) => {
        if (width === 0 || height === 0) return was;
        if (was.width === width && was.height === height) return was;
        return { width, height };
      });
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
      // Asked, not synchronised: the angle may have moved since the last press
      // and the ground under the marker may be gone. Either way `refreshed`
      // says so here, where the answer is used, rather than through an effect
      // that would re-render the whole board to keep two states agreeing.
      const held = cursor === null ? null : refreshed(cells, cursor, layout, leanFor);
      const start = held ?? firstCursor(cells, layout, leanFor);
      if (start === null) return null;
      // A marker that did not exist a moment ago only APPEARS — see
      // `BoardHandle.moveCursor` for why a first press must not also move.
      const next =
        held === null || dir === null ? start : stepCursor(cells, start, dir, layout, leanFor);
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
      visit: (hex, holdMs) => rig.current?.visit(hex, holdMs),
      tour: (hex, holdMs) => rig.current?.tour(hex, holdMs),
      endTour: () => rig.current?.endTour(),
      snapshot: () => rig.current?.snapshot() ?? null,
      zoomLevel: () => rig.current?.zoomLevel() ?? 1,
      zoomMax: () => rig.current?.zoomMax() ?? 1,
      resetLean,
      flatten,
      turnBy: (deg) => leanBy(deg, 0),
      leanBy: (deg) => leanBy(0, deg),
      moveCursor,
      cursorCell: () => (cursor === null ? null : aimAt(cursor.key)),
      focus: () => wrapper.current?.focus(),
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
      {/* Once, and then never again: `size` never returns to zero — see the
          observer above for why that is a hard rule and not an optimisation. */}
      {size.width > 0 && (
        <Canvas
          frameloop="demand"
          orthographic
          /*
            HOW MANY PIXELS THIS PHONE ACTUALLY HAS TO DRAW (2026-09-02, made a
            player dial 2026-09-04 — see `board/quality.ts`).

            A dpr-3 phone renders 9× the fragments of a dpr-1 one, and a hex at
            34 CSS pixels is already carrying a 256px texture: past about 1.5
            device pixels per CSS pixel there is nothing left in the source for
            the extra samples to resolve — which was the whole argument for
            guessing 1.5 as the default on a dense phone. It was still a guess,
            landed with nobody having looked, and looking is what found it
            soft. `props.renderScale` is that same number with the guess made
            undoable: the SHARPNESS slider by the camera button writes it, and
            `DEFAULT_RENDER_SCALE` reproduces the untouched guess exactly so a
            player who never opens the slider sees no change.

            MSAA is a separate axis and stays where `GL` puts it, fixed for the
            canvas's life — antialiasing is a cure for a stair-step a pixel
            wide, and at three device pixels per CSS pixel the stair-step is
            already a third of one, but it is a WebGL context flag rather than
            a sampler setting and cannot be re-picked without a new canvas.
          */
          dpr={dpr}
          // `flat` turns OFF tone mapping. R3F applies ACES otherwise, which
          // would sit between the graded palette and the screen — see `gl.ts`
          // for why that made the contrast budget describe a board that did
          // not exist.
          flat
          gl={GL}
          /*
            The board says when it is up, and asks for its context back if the
            browser takes it (2026-09-02) — see `gl.ts`. Nothing in this
            repository handled a lost context, and with `frameloop="demand"` a
            context that came back would have drawn nothing at all.

            The subscription hangs off the renderer for the life of the page,
            which is exactly the `<Canvas>`'s own life: it is never unmounted
            (`CLAUDE.md`), so there is nowhere to hang a cleanup that would ever
            run, and the listeners die with the canvas they are on.
          */
          onCreated={(state) => {
            markBoardAlive();
            watchContext(state.gl.domElement, state.invalidate);
          }}
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
            refit={refit}
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
  /** Bumped when the board's angle was changed on purpose: re-frame. */
  readonly refit: number;
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
  refit,
  reducedMotion,
  handle,
  wrapper,
  cursor,
  onLeanBy,
}: RigProps) {
  const camera = useThree((s) => s.camera) as OrthographicCamera;
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const size = useThree((s) => s.size);

  /**
   * PAINT THE NEW BUFFER IN THE SAME TASK IT WAS RESIZED IN (2026-09-05, Marc:
   * *"the second tile we put the whole screen flashes (recurrent bug never
   * fixed)"*).
   *
   * Measured rather than guessed. The action bar GROWS the first time a pocket
   * ripens — POP appears, `.controls` goes 85px to 145px — and `.board-host`
   * is `flex: 1`, so the canvas's backing store is reallocated with it (780x1424
   * to 780x1304 on a 390pt phone). **A reallocated WebGL buffer is a CLEARED
   * one**, and with `frameloop="demand"` nothing repaints it until something
   * asks — so the whole board composites blank for a frame. That is the flash,
   * and it is the whole screen because the board IS the whole screen.
   *
   * A layout effect rather than `invalidate()` alone: invalidate schedules a
   * frame, and a scheduled frame is one composite too late. This renders
   * before the browser paints, so the resized buffer is never shown empty.
   * `invalidate()` still follows, because the demand loop should also know the
   * view changed.
   *
   * **This fixes the FLASH, not the RESIZE.** The board changing size because a
   * button appeared under it is the third instance of one disease in this file's
   * neighbourhood — `ui.css` already records the stat row ("the board resizes
   * because the score went from 99 to 100") and the purse drawer ("the map
   * resized every time LUCK was tapped"), both fixed by stopping the resize
   * rather than by absorbing it. Doing that here means reserving POP's row for
   * a whole run, which costs 60px of board on every phone whether or not
   * anything is ripe — a screen decision, so it is stated in `NEXT.md` and left
   * to Marc rather than guessed at here.
   */
  const sized = useRef(false);
  useLayoutEffect(() => {
    /*
     * Not on the first layout, only on a RESIZE.
     *
     * Rendering at mount draws a scene whose instanced meshes have not been
     * given their colour attributes yet, so three compiles a program without
     * `USE_INSTANCING_COLOR` while the injected chunk still reads `vColor` —
     * "'vColor' : undeclared identifier", the whole board's shaders failing to
     * validate. Caught by `watchErrors` in the Playwright suite on the first
     * run of this fix, which is exactly the renderer-crash class that suite
     * exists to catch.
     *
     * The first size is not a resize anyway: the demand loop already draws it.
     */
    if (!sized.current) {
      sized.current = true;
      return;
    }
    gl.render(scene, camera);
    invalidate();
  }, [size.width, size.height, gl, scene, camera, invalidate]);

  /**
   * WHAT THE FIT MEASURES, AND HOW TALL IT IS — separately from the ANGLE
   * (2026-09-02).
   *
   * The fit frames the STRUCTURE, never the beacon disc (Ashwake 1's rule).
   *
   * All of it used to live in one memo keyed on the lean, so **every half
   * degree of turn re-filtered every cell, re-mapped every cell into a fresh
   * `{q, r}`, and re-walked every cell for the tallest thing on the board** —
   * two arrays of five hundred objects and three passes, up to 720 times in a
   * full rotation of the board, to recompute three answers that cannot change
   * when the camera moves. A turn is a camera fact; which cells exist and how
   * tall they stand are board facts.
   *
   * Split, so the angle recomputes only what the angle decides.
   */
  const framed = useMemo(() => {
    const anchored = view.cells.filter((c) => !c.beacon);
    return (anchored.length > 0 ? anchored : view.cells).map((c) => ({ q: c.q, r: c.r }));
  }, [view]);

  /** How tall the board stands, for the sky a leaning camera has to reserve:
   *  what is on the far ground leans into the top of the frame and would be
   *  cropped by a fit that only measured floors. */
  const tallest = useMemo(() => {
    const anchored = view.cells.filter((c) => !c.beacon);
    return tallestOf(anchored.length > 0 ? anchored : view.cells, relief);
  }, [view, relief]);

  const frame = useMemo<Frame>(() => {
    const lean: Lean = { tilt, yaw, tallest };
    return frameFor(framed, width, height, theme.orientation, lean);
  }, [framed, tallest, width, height, theme.orientation, tilt, yaw]);

  /**
   * Where the game is still being played, for a FIT that has had to crop.
   *
   * The frame above measures every anchored cell, because that is what "show
   * me the board" means while the board still fits. Once it does not —
   * `fitCamera` stops shrinking at `FIT_HEX_PX_MIN` — something has to say
   * which part to keep, and the honest answer is not the geometric middle: a
   * grown board is mostly stone, and stone is ground already spent. Live
   * tiles, unclaimed destinations and the legal edge are the frontier, and the
   * frontier is where the player is.
   *
   * Its own `frameFor` rather than a centroid: a bounding box centre is what
   * framing means, and averaging cell positions would pull the camera toward
   * whichever side happens to hold more of them.
   */
  /** The frontier's cells, kept out of the memo below for the same reason
   *  `framed` is: which hexes are live is a board fact, not a camera one. */
  const live = useMemo(
    () =>
      view.cells
        .filter(
          (c) =>
            !c.beacon &&
            !c.remembered &&
            (c.legal || c.kind === 'tile' || (c.kind === 'landmark' && !c.claimed)),
        )
        .map((c) => ({ q: c.q, r: c.r })),
    [view],
  );

  const focus = useMemo<{ readonly cx: number; readonly cz: number }>(() => {
    if (live.length === 0) return frame.centre;
    return frameFor(live, width, height, theme.orientation, frame.lean).centre;
  }, [live, width, height, theme.orientation, frame]);

  // Camera state lives in a ref: gestures write it many times a second and
  // React must not re-render for any of them.
  const cam = useRef<CameraState>(fitCamera(frame));
  const flight = useRef<{ from: CameraState; to: CameraState; startedAt: number } | null>(null);
  /** A thrown board, still travelling. Cleared by any deliberate move. */
  const glide = useRef<Glide | null>(null);
  const glidedAt = useRef(0);
  /** The pending return of an EXCURSION, so a second claim replaces the first
   *  rather than racing it home. */
  const visiting = useRef<ReturnType<typeof setTimeout> | 0>(0);
  /** A `tour` in the air: where it began, and which leg it is on — so a tap can
   *  end it and put the board back. Null while nothing is touring. */
  const trip = useRef<{
    readonly back: CameraState;
    readonly fitBefore: boolean;
    readonly leg: CameraState;
  } | null>(null);
  const frameRef = useRef(frame);
  const focusRef = useRef(focus);
  const wasFit = useRef(true);

  /** True until the board has been framed once. The first frame must fit; no
   *  frame after it may re-fit on its own. */
  const framedOnce = useRef(false);

  /*
   * A placement does not move the board (2026-08-29).
   *
   * Marc: *"when we place a tile, make sure the map doesnt move and stays
   * stationary, it always zoom in or zoom out a bit and its annoying."*
   *
   * It re-fitted on every frame the board was still at zoom 1 — which is most
   * of a run — so each placement grew the structure, recomputed the fit, and
   * rescaled everything by a percent or two. Under a thumb that is the whole
   * board breathing every time you put a tile down, and it is worst exactly
   * where a player is being careful: placing several tiles in a row, watching
   * one spot.
   *
   * The behaviour it was bought for — "the frontier stays in view as the board
   * grows" — is real, and it is now a BUTTON rather than something that
   * happens to you: FIT is the first stop on the camera cycle and one tap
   * away. A camera that only moves when asked is the rule everywhere else on
   * this board (a drag, a pinch, a flight), and this was the one exception.
   *
   * The zoom clamp stays: a board that grew past what this zoom can show is
   * not a preference, it is arithmetic that no longer holds.
   */
  useEffect(() => {
    frameRef.current = frame;
    focusRef.current = focus;
    if (!framedOnce.current) {
      framedOnce.current = true;
      cam.current = fitCamera(frame);
    } else {
      cam.current = { ...cam.current, zoom: Math.min(cam.current.zoom, zoomMaxOf(frame)) };
    }
    invalidate();
  }, [frame, focus, invalidate]);

  /**
   * Write the camera for this frame.
   *
   * The camera is a three.js object owned by the renderer and this runs from
   * `useFrame`, which is not render. Mutating it in place is the entire point
   * of an imperative camera: gestures write it many times a second and React
   * must never re-render for one. See `eslint.config.js` for why the purity
   * rules are scoped off for `board/` and loud everywhere else.
   */
  /**
   * The eye, and what the camera was last set to (2026-09-02).
   *
   * `apply` ran unconditionally on every frame, and `eyeOf` allocates — so a
   * beacon breathing or a pocket leaping, neither of which moves the camera,
   * still rebuilt the eye, rewrote three vectors and recomputed the projection
   * matrix sixty times a second. The camera is the one thing on this board that
   * is genuinely cheap to know about: five numbers, and it either moved or it
   * did not.
   *
   * `lean` is compared by IDENTITY on purpose. It comes out of the `frame` memo
   * as a fresh object exactly when the angle changes, which makes the object
   * itself the change stamp — and comparing three numbers instead would be
   * re-deriving what the memo already decided.
   */
  const eye = useRef<{ lean: Lean; at: ReturnType<typeof eyeOf> } | null>(null);
  const applied = useRef<{ zoom: number; cx: number; cz: number; size: number; lean: Lean } | null>(
    null,
  );

  const apply = (): void => {
    const c = cam.current;
    const f = frameRef.current;
    const was = applied.current;
    if (
      was !== null &&
      was.zoom === c.zoom &&
      was.cx === c.cx &&
      was.cz === c.cz &&
      was.size === f.fit.size &&
      was.lean === f.lean
    ) {
      return;
    }
    if (eye.current === null || eye.current.lean !== f.lean) {
      eye.current = { lean: f.lean, at: eyeOf(f.lean, EYE_DISTANCE) };
    }
    const at = eye.current.at;
    camera.zoom = f.fit.size * c.zoom;
    camera.position.set(c.cx + at.x, at.y, c.cz + at.z);
    camera.up.set(at.upX, at.upY, at.upZ);
    camera.lookAt(c.cx, 0, c.cz);
    camera.updateProjectionMatrix();
    applied.current = { zoom: c.zoom, cx: c.cx, cz: c.cz, size: f.fit.size, lean: f.lean };
  };

  useFrame(() => {
    // A flick carries the board after the finger has gone. It is cancelled by
    // anything the player does on purpose — a drag, a pinch, a flight — because
    // a finger outranks a throw exactly as it outranks a journey.
    const g = glide.current;
    if (g !== null) {
      const now = performance.now();
      const step = glided(g, Math.min(64, Math.max(1, now - glidedAt.current)));
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

  /*
   * The board's angle changed on purpose, so the board is re-framed.
   *
   * Declared after `fly` and after the frame effect above, which is the whole
   * of the ordering it needs: the frame for the NEW angle has already been
   * computed by the memo and written to `frameRef` by the time this runs.
   *
   * A gesture that leans the board does NOT come through here — a camera that
   * re-centred itself under a thumb mid-drag would be the board fighting the
   * hand. Only FLAT and DEFAULT bump the tick.
   */
  const refitted = useRef(refit);
  useEffect(() => {
    if (refitted.current === refit) return;
    refitted.current = refit;
    fly(fitCamera(frameRef.current, focusRef.current));
  }, [refit, fly]);

  /* An excursion's return is a timer, and a timer outlives the thing that set
     it. It writes `cam` and calls `invalidate` on a rig that may be gone. */
  useEffect(
    () => () => {
      if (visiting.current !== 0) clearTimeout(visiting.current);
    },
    [],
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
        fly(fitCamera(frameRef.current, focusRef.current));
      },
      /*
       * Go and look at a hex, then come back.
       *
       * Marc, 2026-08-29: *"when the card the shrine, points, cache, etc.
       * happen, make sure we focus the camera on it, then briefly snap back to
       * where they were before, animated."* A claim is the board answering
       * something you did several hexes away — the sentence arrives, and until
       * now the PLACE it happened stayed off screen.
       *
       * At the zoom the player is already at, like the pop's glide: a claim is
       * worth showing where it happened, not worth changing how close they had
       * chosen to stand.
       *
       * **The return is abandoned if the player took the camera back.** A
       * journey that yanks the board out from under a finger is worse than one
       * that never returns, so the timer checks whether the camera is still
       * where the excursion put it — a drag, a pinch or a flick all move it,
       * and any of them means the player would rather be here.
       *
       * **AND UNDER REDUCED MOTION THERE IS NO EXCURSION AT ALL** (2026-09-02).
       * `fly` honours the preference by dropping the tween — which is right for
       * a flight, and turns THIS into two hard cuts: the board teleports to the
       * hex, sits there, and teleports back. A person who has asked for less
       * motion has asked for less of exactly that; a cut is the most jarring
       * thing a camera can do, not the least.
       *
       * The look decision (Marc's ruling for this pass: pick a defensible
       * default and state it): **skip it entirely.** The claim's own sentence
       * still arrives, the receipt still names the place, and the board stays
       * where the player put it — which is what "reduce motion" asks for. It is
       * the only camera move in this file that exists purely to show something
       * off, so it is the only one that can honestly be dropped rather than
       * shortened.
       */
      visit(hex, holdMs) {
        if (reducedMotion) return;
        const back = cam.current;
        const fitBefore = wasFit.current;
        const { q, r } = parse(hex);
        const p = place({ q, r }, { ...UNIT, orientation: theme.orientation });
        const there = cameraAt(frameRef.current, cam.current.zoom, p.x, p.y);
        fly(there);
        if (visiting.current !== 0) clearTimeout(visiting.current);
        visiting.current = setTimeout(() => {
          visiting.current = 0;
          if (!stillAt(cam.current, there)) return;
          fly(back);
          wasFit.current = fitBefore;
        }, FLIGHT_MS + holdMs);
      },
      /*
       * OUT, IN, BACK — the three legs, and why each one is there.
       *
       * See `BoardHandle.tour` for the ask. The wide shot first because the
       * question this answers is "which one of those is a shrine", and a dive
       * onto a hex from a board you were already reading close-up shows you a
       * hex with nothing around it. `fitCamera` with the frontier focus is the
       * same wide shot FIT gives, so the trip's first leg is a view the player
       * already has a button for and recognises.
       *
       * `NEAR_ZOOM` for the dive: the same "close enough to read a hex, far
       * enough to see a pocket" that HERE stands at, rather than a second
       * number meaning the same thing. `cameraAt` clamps it, so a board whose
       * ceiling is lower simply goes as close as it can.
       *
       * Then back to the camera the player had — centre AND zoom, which is what
       * "same view" means — with `wasFit` restored, because the excursion's
       * three flights would otherwise leave the camera cycle believing the
       * player had chosen the fit themselves.
       *
       * Every leg checks the board did not move under it and abandons the rest
       * of the trip if it did, which is `visit`'s rule applied twice. Reduced
       * motion skips the whole thing for `visit`'s reason, and more so: three
       * hard cuts is worse than two.
       */
      tour(hex, holdMs) {
        if (reducedMotion) return;
        const back = cam.current;
        const fitBefore = wasFit.current;
        const { q, r } = parse(hex);
        const p = place({ q, r }, { ...UNIT, orientation: theme.orientation });
        const wide = fitCamera(frameRef.current, focusRef.current);
        const near = cameraAt(frameRef.current, NEAR_ZOOM, p.x, p.y);
        trip.current = { back, fitBefore, leg: wide };
        fly(wide);
        if (visiting.current !== 0) clearTimeout(visiting.current);
        visiting.current = setTimeout(() => {
          if (!stillAt(cam.current, wide)) {
            visiting.current = 0;
            trip.current = null;
            return;
          }
          if (trip.current !== null) trip.current = { ...trip.current, leg: near };
          fly(near);
          visiting.current = setTimeout(() => {
            visiting.current = 0;
            const t = trip.current;
            trip.current = null;
            if (t === null || !stillAt(cam.current, near)) return;
            fly(back);
            wasFit.current = fitBefore;
          }, FLIGHT_MS + holdMs);
        }, FLIGHT_MS + TOUR_WIDE_HOLD_MS);
      },
      /*
       * CUT THE TRIP SHORT AND COME HOME — a tap is a finger, and a finger
       * outranks a journey (2026-09-08).
       *
       * The rule was already written for a DRAG: the timers check that the
       * camera is still where the last leg put it, and abandon the rest if it
       * is not, because a journey that yanks the board out from under a hand is
       * worse than one that never returns. A TAP was the hole in it. The board
       * stays live all through a tour, so a thumb that has just pressed GOT IT
       * and wants to place a tile was raycasting into a board two seconds into
       * a flight — landing on whatever hex the camera happened to be over.
       * Playwright found it the first run: `no legal hex found in the search
       * rings`, in the spec that taps the frontier as the board grows.
       *
       * Swallowing the tap would be worse and this repository has already ruled
       * on it — *"a tap that cannot build used to be a silent no-op, which is
       * the worst answer a game can give a deliberate action"*. So the tap has
       * an ANSWER: the trip ends and the board comes back to where the player
       * left it, which is a visible reply needing no words, and the next tap
       * lands on the board they were looking at.
       *
       * It comes home only if the trip is still the one steering. A player who
       * has dragged during a tour has already chosen a view, and flying them
       * off it would be the exact fault the drag rule exists to prevent,
       * arrived at through the other door.
       *
       * **"Still steering" is two conditions, and the second one is the bug the
       * first version shipped.** The timers can ask `stillAt(cam, leg)` because
       * they only ever fire once a leg has LANDED. This can be called at any
       * moment, and a tap 100ms into a 320ms flight finds the camera between
       * two places and at neither — so a lone `stillAt` read a trip in perfect
       * health as one the player had taken over, declined to come home, and
       * left the board parked at the wide shot with the flight still finishing
       * underneath it. Playwright caught it as ninety-six ring taps missing a
       * board that had stopped being where they were aiming. A flight already
       * bound for the leg is the trip, so it counts.
       */
      endTour() {
        if (visiting.current !== 0) clearTimeout(visiting.current);
        visiting.current = 0;
        const t = trip.current;
        trip.current = null;
        if (t === null) return;
        const inFlight = flight.current !== null && stillAt(flight.current.to, t.leg);
        if (!inFlight && !stillAt(cam.current, t.leg)) return;
        fly(t.back);
        wasFit.current = t.fitBefore;
      },
      /*
       * A small picture of the board as it stands.
       *
       * Marc, 2026-08-29: *"in the end screen i loved having my real map to
       * check it back again, keep it that way just like we did."* The diary
       * has rendered `detail.shot` as an `<img>` since Stage 4 and NOTHING has
       * ever supplied one — so every row in the hall of fame was a picture
       * frame with no picture, and the end screen had no map at all.
       *
       * Rendered and read in the same turn, because the canvas is created
       * without `preserveDrawingBuffer`: after the browser composites, the
       * drawing buffer is gone and `toDataURL` returns a blank. Forcing one
       * draw here means the pixels are still there when they are read.
       *
       * Copied down to a thumbnail first. `SHOT_CHAR_MAX` caps a diary entry
       * at 24k characters — a phone's storage quota is real and twenty of
       * these are kept — and a full-resolution board does not come close to
       * fitting. It is a memento, not a screenshot.
       */
      snapshot() {
        try {
          gl.render(scene, camera);
          const source = gl.domElement;
          if (source.width === 0 || source.height === 0) return null;
          const wide = 240;
          const tall = Math.max(1, Math.round((source.height / source.width) * wide));
          const flat = document.createElement('canvas');
          flat.width = wide;
          flat.height = tall;
          const ctx = flat.getContext('2d');
          if (ctx === null) return null;
          ctx.drawImage(source, 0, 0, wide, tall);
          const shot = flat.toDataURL('image/webp', 0.6);
          // A browser without webp answers with a PNG, which can be larger
          // than the cap — better no picture than a diary row that refuses to
          // save the run it belongs to.
          return shot.length <= SHOT_CHAR_MAX ? shot : null;
        } catch {
          // A lost context, a tainted canvas, a browser that refuses the
          // export. A memento is never worth an exception on the one screen
          // that tells a player their run counted.
          return null;
        }
      },
      zoomLevel: () => flight.current?.to.zoom ?? cam.current.zoom,
      zoomMax: () => zoomMaxOf(frameRef.current),
    }),
    [invalidate, fly, theme.orientation, gl, scene, camera, reducedMotion],
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
      /*
       * The slop is a THRESHOLD, not a DEBT (2026-08-29).
       *
       * Marc: *"when trying to drag left or right or up or down, its not
       * smooth."* A drag is ignored until it clears `TAP_SLOP`, which is what
       * keeps a shaky tap from sliding the board — and then the first move
       * that cleared it panned by the WHOLE distance from where the finger
       * landed, slop included. So every drag began with a five pixel jump
       * before the board started following the thumb. Small, and there every
       * single time you touch the board.
       *
       * Crossing the threshold now ARMS the drag and re-anchors it under the
       * finger; the next move pans from there. It costs one pointer event —
       * about a frame — and buys a board that never travels further than the
       * thumb did.
       */
      if (!moved) {
        if (Math.hypot(dx, dy) < TAP_SLOP) return;
        moved = true;
        flight.current = null;
        glide.current = null;
        last = { x: e.clientX, y: e.clientY };
        return;
      }
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
        if (glide.current !== null) {
          /*
           * Stamp the clock AT THE LAUNCH, not at the first step.
           *
           * `glidedAt` held whatever the last glide's final frame wrote —
           * seconds or minutes earlier — so the opening step of every throw
           * asked `glided` for the travel of a 64ms frame (the clamp) and
           * applied all of it at once. The board lurched the instant the
           * finger left and decayed smoothly from there: four frames of
           * travel spent on one, which is exactly the part of a flick a thumb
           * is watching.
           */
          glidedAt.current = performance.now();
          invalidate();
        }
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
