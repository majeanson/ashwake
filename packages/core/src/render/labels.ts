import { CONCEPT_ICON, LANDMARK_ICON, type IconName } from '@theme/icons';
import type { CellView } from './Renderer';

/**
 * What a cell PRINTS, if anything — the one rule every renderer shares.
 *
 * Lifted out of `PixiRenderer` on 2026-08-28 when the core became a package:
 * the rule is about the game (faint means SPENT — `labels.test.ts` carries the
 * story), not about Pixi, and a 3D board has to print the same glyphs for the
 * same reasons or the two bodies would disagree about what a star means.
 */
export type Label =
  /** A number the board prints on a hex: a worth, or a preview of one. */
  | { readonly text: string; readonly icon?: undefined; readonly faint: boolean }
  /** A MARK the board draws on a hex, named rather than spelled — see
   *  `@theme/icons`. It was a Unicode character until 2026-08-30, drawn by
   *  `cinzel.ttf`, a font chosen for a wordmark and asked to answer for
   *  `✚ ★ ◈ ❖ ✦ ▦`. */
  | { readonly icon: IconName; readonly text?: undefined; readonly faint: boolean };

export function labelFor(cell: CellView): Label | null {
  // A shimmer carries `landmark: null` and must stay wordless — printing any
  // glyph would tell the player WHAT is out there, which is exactly the thing
  // the sense upgrade does not sell. The old `?? 'territory'` fallback would
  // have done precisely that.
  if (cell.kind === 'landmark') {
    return cell.landmark === null
      ? null
      : { icon: LANDMARK_ICON[cell.landmark], faint: cell.claimed };
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
   * could walk to. `CONCEPT_ICON.wall` is the mark this game already owns for
   * exactly this idea — declared for it, spoken only in prose until now.
   *
   * Stone stays wordless on purpose, so the two read apart by PRESENCE rather
   * than by telling `▦` from `▨` at hex size — which is the discrimination
   * that retired the per-colour glyphs in 2026-08-18.
   *
   * **On the live board only** (2026-09-01). Marc, with a phone photo of a
   * remembered world: *"still see some weird block shapes."* They are these —
   * a brick at eight pixels is a white rectangle, and once the fog was actually
   * drawn (2026-09-01, `RunMemory.revealed`) there was one on every wall of a
   * three-hundred-run world, at full ink, scattered across the whole map. It
   * had been an invisible cost for as long as the fog was: a handful of live
   * walls carry a handful of marks, and nobody counts them.
   *
   * The mark's own argument is what rules it out there. It exists to separate a
   * wall from SPENT STONE while you are choosing where to place — and
   * remembered ground has no stone in it (`toBoardView` reconstructs the fog as
   * landmark, wall or empty) and no placement to choose. A wall in the fog is
   * the shape of the world, which its own dark fill already draws. So the fog
   * names DESTINATIONS and nothing else, which is the same editorial rule it
   * already keeps about worths and previews.
   */
  if (cell.kind === 'wall') {
    return cell.remembered ? null : { icon: CONCEPT_ICON.wall, faint: false };
  }
  if (cell.ripe && cell.worth > 0) return { text: String(cell.worth), faint: false };
  if (cell.legal && cell.preview !== null && cell.preview > 0) {
    return { text: String(cell.preview), faint: true };
  }
  return null;
}
