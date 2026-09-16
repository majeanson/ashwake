/**
 * WHETHER THE CANVAS IS BUILT WITH ANTIALIASING — decided once, before the
 * first render, by nothing that needs the renderer (2026-09-11).
 *
 * This lived in `Board.tsx` beside the `<Canvas>` it configures, and moved the
 * evening a SETTINGS row started asking for it: `App` importing a VALUE from
 * `Board` pulled three, fiber and troika into the first paint — 450 KB gzipped
 * where the bar is 174 — and `pnpm budget` caught it before CI did the same.
 * The row is gone (below); the module stays in front of the door because the
 * lesson about the import does not.
 *
 * The antialiasing half of the pixel budget — see the `<Canvas>` in `Board.tsx`
 * for the argument. Read once: a phone's `devicePixelRatio` is fixed for the
 * life of the page, and this decides how the renderer is BUILT. Unlike the
 * resolution half (`renderScale`, `board/quality.ts`), this cannot become a
 * live dial — it is a WebGL context flag, fixed at creation, and the canvas
 * may never remount to pick up a new one.
 *
 * OFF FROM RATIO 2 (2026-09-16, Marc). B4.16's guess dropped MSAA only ABOVE
 * ratio 2, and `perf/report.md`'s `msaa` column measured what a ratio-2 phone
 * was paying to keep it: 1.3×–2.1× the CPU of the same walk without. Marc
 * compared the two on his phone through a temporary SETTINGS row and said
 * _"hard to tell"_ — an eye that cannot see it against a CPU that can, so the
 * cheap one ships and the row is removed (`NEXT.md` §1a). A ratio-1 desktop
 * keeps it: there a stair-step is a whole pixel wide.
 */
const DENSE = typeof devicePixelRatio === 'number' && devicePixelRatio >= 2;

/**
 * `?aa=1` / `?aa=0` — NOT a player dial, a MEASURING one (`PASS.md` P5.3).
 *
 * B4.16 shipped two low-end defaults together — cap the pixel ratio, drop MSAA
 * on a dense screen — and `perf/report.md` can measure the first by changing
 * the ratio. It cannot measure the SECOND that way, because the ratio is what
 * decides it: every dense row is also an MSAA-off row, so the table says what
 * the pair costs and nothing about either. One URL override separates them, at
 * one module-scope read, and it is the only way this question is answerable
 * without a second canvas — which `CLAUDE.md` forbids outright.
 *
 * It is deliberately not in `shell/look.ts` with the look dials: those reach
 * the board as props and this one cannot, because a context flag is fixed
 * before the first render. A device that has never been sent an `?aa=`
 * renders the default.
 */
const AA_OVERRIDE = ((): boolean | null => {
  try {
    const asked = new URLSearchParams(location.search).get('aa');
    return asked === null || asked === '' ? null : asked !== '0';
  } catch {
    return null;
  }
})();

/** What this page's canvas is built with. `Board.tsx` builds with it. */
export const ANTIALIAS: boolean = AA_OVERRIDE ?? !DENSE;
