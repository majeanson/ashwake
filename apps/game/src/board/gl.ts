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
