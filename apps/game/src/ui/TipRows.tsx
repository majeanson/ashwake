import { hex, type Theme } from '@theme/tokens';
import type { TipRow } from '@view/view';
import type { Strings } from '@text/Strings';
import { Prose } from './Prose';
import type { LessonId } from '@view/lessons';

/**
 * A marked list (Stage 3, 2026-08-29).
 *
 * Four hosts in Ashwake 1 — manual sections, event cards, the shop's perk fold
 * and the purse lesson — and the rule that keeps it honest is the core's:
 * **a row never invents a symbol.** It carries a terrain colour or a glyph
 * from the registries, or neither, and the mark column is reserved either way
 * so the text of a markless row still lines up with the text of a marked one.
 *
 * `art` is a data URL of the real baked tile where the caller has one. Without
 * it the row falls back to the flat colour swatch, which is why this works
 * before a single texture has loaded.
 */
export function TipRows({
  rows,
  theme,
  s,
  onTerm,
}: {
  readonly rows: readonly TipRow[];
  readonly theme: Theme;
  readonly s: Strings;
  readonly onTerm?: ((id: LessonId) => void) | undefined;
}) {
  return (
    <>
      {rows.map((row, i) => (
        <p className="tip-row" key={i}>
          <span className="tip-mark" aria-hidden="true">
            {row.art !== undefined ? (
              <img src={row.art} alt="" width={18} height={18} />
            ) : row.colour !== undefined ? (
              <span
                className="tip-swatch"
                style={{ background: hex(theme.terrain[row.colour].fill) }}
              />
            ) : (
              (row.glyph ?? '')
            )}
          </span>
          <span>
            <Prose text={row.text} s={s} onTerm={onTerm} />
          </span>
        </p>
      ))}
    </>
  );
}
