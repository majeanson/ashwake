import { NoToneMapping, type WebGLRendererParameters } from 'three';

/**
 * How the canvas is configured, apart from the component that mounts it
 * (Stage 2c, 2026-08-29) — because two of these three settings are the
 * difference between a board that renders the palette and a board that renders
 * something near it, and that is worth a file with an argument in it rather
 * than three props in a JSX tag.
 */

/**
 * **No tone mapping**, and this is a fix rather than a preference.
 *
 * React Three Fiber sets `ACESFilmicToneMapping` unless the `<Canvas>` is given
 * `flat` — so every lit fragment went through the ACES roll-off, which
 * desaturates and compresses the highlights. drei's `Text` is tone-mapped too,
 * so **the label ink on screen was not `theme.ink.ink`**; the stroke rings
 * already passed `toneMapped={false}`, which meant the rings were honest and
 * the labels were not.
 *
 * `packages/core/src/theme/contrast.test.ts` grades the palette to 4.5:1 for
 * text and 3:1 for a mark. A filmic curve between those numbers and the screen
 * makes the whole budget a description of a board that does not exist. ACES
 * exists to fit high-dynamic-range renders into a display; this board is
 * authored directly in display colours and has no range to fit, so the curve
 * buys nothing and costs the only guarantee the palette has.
 */
export const GL_PROPS = {
  antialias: true,
  powerPreference: 'low-power',
  toneMapping: NoToneMapping,
} as const satisfies WebGLRendererParameters & { toneMapping: typeof NoToneMapping };

/**
 * WHEN THE BROWSER TAKES THE CONTEXT AWAY (2026-09-02).
 *
 * A phone under memory pressure, a tab in the background, a driver reset, a GPU
 * process crash — any of them and the canvas loses its WebGL context. Nothing
 * anywhere in this repository handled it: `grep webglcontextlost` over `apps/`
 * and `packages/` returned nothing.
 *
 * Two things then go wrong, and they are different sizes.
 *
 * **The browser does not try to restore unless you ask.** `webglcontextlost`
 * must be cancelled — `preventDefault()` — or the context is gone for the life
 * of the page and no `webglcontextrestored` is ever fired. This is the whole
 * fix and it is one line.
 *
 * **And `frameloop="demand"` means a restored context draws nothing.** The
 * board renders when something calls `invalidate()`, and a context coming back
 * is not something the board did — so a page that recovered perfectly would sit
 * there blank until the player happened to place a tile.
 *
 * ## What does NOT need doing, and why it is worth saying
 *
 * Nothing in the board's caches has to be thrown away. `three` re-initialises
 * on restore (`WebGLRenderer`'s own context handling calls `initGLContext`,
 * which drops its `properties` map — every cached GPU handle with it) and
 * re-uploads lazily from the CPU-side data each object still holds: a
 * `BufferGeometry` keeps its arrays and a `CanvasTexture` keeps its canvas.
 * The shared prisms, the mark textures, the glow disc and the baked surfaces
 * are all of that kind. Resetting them would mean rebuilding, from scratch, a
 * set of objects that are about to be re-uploaded anyway — on the one frame
 * where a phone has just proved it is short of memory.
 */
/**
 * HOW LONG A LOST CONTEXT GETS BEFORE THE PLAYER IS TOLD (P8.3, 2026-09-10).
 *
 * `preventDefault` above asks for the context back; it does not promise one.
 * A phone that is genuinely out of graphics memory, a driver that reset twice,
 * a GPU process that will not come up — any of those and `webglcontextrestored`
 * never fires. Until today that was a **blank canvas for the life of the page
 * with a live HUD on top of it**: taps answered, purse updated, score counted,
 * and no picture and no word about it, ever. The board does not draw itself
 * back and nothing was watching for the case.
 *
 * Four seconds because a restore that is coming arrives in well under one —
 * `three` re-initialises on the event and re-uploads lazily from the data each
 * object still holds (see above) — so this is long enough that a recoverable
 * blink never raises a panel, and short enough that nobody sits in front of a
 * black rectangle wondering whether the game is thinking.
 */
export const RESTORE_MS = 4000;

export function watchContext(
  canvas: HTMLCanvasElement,
  redraw: () => void,
  /**
   * What to do when it does not come back — required, not optional.
   *
   * `CLAUDE.md`: *"a hook a test can inject is a hook a test cannot prove is
   * connected"*, which is how `receipts.ts` handed out perks nobody was told
   * about. An optional callback here would have let this file be complete,
   * tested and green while the one real call site passed nothing and a player
   * still stared at a black board.
   */
  onLost: () => void,
): () => void {
  let waiting: ReturnType<typeof setTimeout> | null = null;
  const stopWaiting = (): void => {
    if (waiting !== null) clearTimeout(waiting);
    waiting = null;
  };

  const lost = (event: Event): void => {
    // Ask for it back. Without this the loss is permanent.
    event.preventDefault();
    stopWaiting();
    waiting = setTimeout(() => {
      waiting = null;
      onLost();
    }, RESTORE_MS);
  };
  const restored = (): void => {
    stopWaiting();
    redraw();
  };
  canvas.addEventListener('webglcontextlost', lost);
  canvas.addEventListener('webglcontextrestored', restored);
  return () => {
    stopWaiting();
    canvas.removeEventListener('webglcontextlost', lost);
    canvas.removeEventListener('webglcontextrestored', restored);
  };
}
