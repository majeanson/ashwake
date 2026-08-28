import { LANDMARK_GLYPH } from '@theme/tokens';
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
  if (cell.ripe && cell.worth > 0) return { text: String(cell.worth), faint: false };
  if (cell.legal && cell.preview !== null && cell.preview > 0) {
    return { text: String(cell.preview), faint: true };
  }
  return null;
}
