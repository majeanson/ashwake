import { readAntialias } from '../shell/storage';

/**
 * WHETHER THE CANVAS IS BUILT WITH ANTIALIASING — decided once, before the
 * first render, by nothing that needs the renderer (2026-09-11).
 *
 * This lived in `Board.tsx` beside the `<Canvas>` it configures, and moved the
 * evening the SETTINGS row started asking for it: `App` importing a VALUE from
 * `Board` pulled three, fiber and troika into the first paint — 450 KB gzipped
 * where the bar is 174 — and `pnpm budget` caught it before CI did the same.
 * The decision imports nothing but a storage read, so it can live in front of
 * the door; `Board.tsx` reads it from here for `GL`.
 *
 * The antialiasing half of the pixel budget — see the `<Canvas>` in `Board.tsx`
 * for the argument. Read once: a phone's `devicePixelRatio` is fixed for the
 * life of the page, and this decides how the renderer is BUILT. Unlike the
 * resolution half (`renderScale`, `board/quality.ts`), this cannot become a
 * live dial — it is a WebGL context flag, fixed at creation, and the canvas
 * may never remount to pick up a new one.
 */
const DENSE = typeof devicePixelRatio === 'number' && devicePixelRatio > 2;

/**
 * `?aa=1` / `?aa=0` — NOT a player dial, a MEASURING one (`PASS.md` P5.3).
 *
 * B4.16 shipped two low-end defaults together — cap the pixel ratio, drop MSAA
 * above ratio 2 — and `perf/report.md` can measure the first by changing the
 * ratio. It cannot measure the SECOND that way, because the ratio is what
 * decides it: every high-ratio row is also an MSAA-off row, so the table says
 * what the pair costs and nothing about either. One URL override separates
 * them, at one module-scope read, and it is the only way this question is
 * answerable without a second canvas — which `CLAUDE.md` forbids outright.
 *
 * It is deliberately not in `shell/look.ts` with the look dials: those reach
 * the board as props and this one cannot, because a context flag is fixed
 * before the first render. A device that has never been sent an `?aa=` and
 * never touched the row renders exactly as before.
 */
const AA_OVERRIDE = ((): boolean | null => {
  try {
    const asked = new URLSearchParams(location.search).get('aa');
    return asked === null || asked === '' ? null : asked !== '0';
  } catch {
    return null;
  }
})();

/**
 * TEMPORARY (2026-09-11, Marc: "make the custom urls toggles in the settings
 * we can remove later"): the SETTINGS row sits between the URL and the
 * per-phone default, so `?aa=` still wins for a measurement and a device that
 * has never touched the row still renders exactly as before. Same module-scope
 * read, same reason — the flag is fixed before the first render. When the row
 * goes, this goes with it and `ANTIALIAS` is `AA_OVERRIDE ?? !DENSE` again.
 */
const STORED_AA = ((): boolean | null => {
  const choice = readAntialias();
  return choice === 'auto' ? null : choice === 'on';
})();

/** What this page's canvas is built with. `Board.tsx` builds with it; the
 *  SETTINGS row says it. */
export const ANTIALIAS: boolean = AA_OVERRIDE ?? STORED_AA ?? !DENSE;
