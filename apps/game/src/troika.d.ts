/**
 * `troika-three-text` ships no types, and this declares the ONE function this
 * app calls out of it (2026-09-22, `LOG.md` Session 111).
 *
 * `drei` owns the `<Text>` component and types it; what it does not re-export
 * is `preloadFont`, which is how the font can be started with the renderer
 * chunk instead of with the first number on the board (`board/Labels.tsx`).
 * The package is `drei`'s own dependency, pinned here to the version `drei`
 * resolves so there is one copy in the bundle.
 *
 * Narrow on purpose: the real signature takes more options (`sdfGlyphSize`,
 * a font list) and returns nothing. Declaring only what is used means a
 * version that changed this call would be a type error here rather than an
 * `any` sailing through — which is the whole reason this file exists instead
 * of an `allowJs` escape hatch.
 */
declare module 'troika-three-text' {
  export function preloadFont(
    options: { font: string; characters?: string | readonly string[] },
    callback: () => void,
  ): void;
}
