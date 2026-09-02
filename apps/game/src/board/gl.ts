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
export function watchContext(canvas: HTMLCanvasElement, redraw: () => void): () => void {
  const lost = (event: Event): void => {
    // Ask for it back. Without this the loss is permanent.
    event.preventDefault();
  };
  const restored = (): void => redraw();
  canvas.addEventListener('webglcontextlost', lost);
  canvas.addEventListener('webglcontextrestored', restored);
  return () => {
    canvas.removeEventListener('webglcontextlost', lost);
    canvas.removeEventListener('webglcontextrestored', restored);
  };
}
