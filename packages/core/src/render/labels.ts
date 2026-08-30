import { CONCEPT_MARK, LANDMARK_GLYPH } from '@theme/tokens';
import type { CellView } from './Renderer';

/**
 * What a cell PRINTS, if anything — the one rule every renderer shares.
 *
 * Lifted out of `PixiRenderer` on 2026-08-28 when the core became a package:
 * the rule is about the game (faint means SPENT — `labels.test.ts` carries the
 * story), not about Pixi, and a 3D board has to print the same glyphs for the
 * same reasons or the two bodies would disagree about what a star means.
 */
export function labelFor(cell: CellView): { text: string; faint: boolean } | null {
  // A shimmer carries `landmark: null` and must stay wordless — printing any
  // glyph would tell the player WHAT is out there, which is exactly the thing
  // the sense upgrade does not sell. The old `?? 'territory'` fallback would
  // have done precisely that.
  if (cell.kind === 'landmark') {
    return cell.landmark === null
      ? null
      : { text: LANDMARK_GLYPH[cell.landmark], faint: cell.claimed };
  }
  /*
   * A WALL says so on its face (2026-08-29, Marc: "make sure walls have some
   * kind of X on it or similar visual so that it easy to see vs spent ground
   * and that we cant place").
   *
   * It was told apart from spent stone by its fill alone, and the two are
   * neighbours by construction — both are the unplayable end of the same
   * greyscale ladder, and `theme.test.ts` only asks that they clear the LIVE
   * colours, not each other. On a leaned board they are two dark shapes.
   *
   * **Not a cross**, though a cross is what was asked for: `theme/tokens.ts`
   * rules that `✕` and `←` belong to the SCREEN and that nothing on the plane
   * may ever be either, so that "leave" can never be confused with a thing you
   * could walk to. `CONCEPT_MARK.wall` is the mark this game already owns for
   * exactly this idea — declared for it, spoken only in prose until now.
   *
   * Stone stays wordless on purpose, so the two read apart by PRESENCE rather
   * than by telling `▦` from `▨` at hex size — which is the discrimination
   * that retired the per-colour glyphs in 2026-08-18.
   */
  if (cell.kind === 'wall') return { text: CONCEPT_MARK.wall, faint: false };
  if (cell.ripe && cell.worth > 0) return { text: String(cell.worth), faint: false };
  if (cell.legal && cell.preview !== null && cell.preview > 0) {
    return { text: String(cell.preview), faint: true };
  }
  return null;
}
