import { useState, type ReactNode } from 'react';
import { CHROME_ICON } from '@theme/icons';
import { hex, type Theme } from '@theme/tokens';
import { Icon } from './Icon';
import type { TipRow } from '@view/view';
import type { Strings } from '@text/Strings';
import { Prose } from './Prose';
import type { LessonId } from '@view/lessons';
import { useTerrainArt } from '../shell/art';

/**
 * A marked list (Stage 3, 2026-08-29).
 *
 * Four hosts in Ashwake 1 — manual sections, event cards, the shop's perk fold
 * and the purse lesson — and the rule that keeps it honest is the core's:
 * **a row never invents a symbol.** It carries a terrain colour or an icon
 * from the registries, or neither, and the mark column is reserved either way
 * so the text of a markless row still lines up with the text of a marked one.
 *
 * A ground's row draws the REAL baked tile (Marc, 2026-08-27: _"visuals with
 * real tiles or examples in the how to play"_), looked up here from the
 * theme's own bake. Until 2026-09-30 it was a `TipRow.art` each caller had to
 * supply, and in this body none ever did, so every ground row drew a flat
 * swatch. Until the bake lands the swatch is still what shows, which is why
 * this works before a single texture has loaded.
 *
 * **One component for every table the game prices** (2026-09-25, Marc: _"make
 * sure all those tabs we present have unified components and hints on each so
 * we can learn more about the calculation"_). The lens's stat sheet, its price
 * table and the pop receipt's DÉTAILS are all this, and a row that carries a
 * `hint` is a button: a tap opens the hint under it, a second tap or a tap on
 * another row closes it. One open at a time, so a table never grows taller
 * than one line of explanation.
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
  const [open, setOpen] = useState<number | null>(null);
  const art = useTerrainArt(theme.id);
  const priced = rows.some((row) => row.value !== undefined);
  const list = (
    <>
      {rows.map((row, i) => {
        const mark = (
          <span className="tip-mark" aria-hidden="true">
            {row.colour !== undefined && art[row.colour] !== null ? (
              <img src={art[row.colour]!} alt="" width={18} height={18} />
            ) : row.colour !== undefined ? (
              <span
                className="tip-swatch"
                style={{ background: hex(theme.terrain[row.colour].fill) }}
              />
            ) : row.icon !== undefined ? (
              <Icon name={row.icon} />
            ) : null}
          </span>
        );
        const value =
          row.value !== undefined ? <span className="tip-value">{row.value}</span> : null;
        if (row.hint === undefined) {
          return (
            <p className={row.total === true ? 'tip-row total' : 'tip-row'} key={i}>
              {mark}
              <span>
                <Prose text={row.text} s={s} onTerm={onTerm} />
              </span>
              {value}
            </p>
          );
        }
        // A hinted row's label is plain text: a Prose term is a button of its
        // own, and a button cannot sit inside this one.
        const shown = open === i;
        return (
          <Hinted
            key={i}
            hint={row.hint}
            shown={shown}
            closeLabel={s.ui.hintClose}
            onClose={() => setOpen(null)}
          >
            <button
              type="button"
              className={row.total === true ? 'tip-row tip-hinted total' : 'tip-row tip-hinted'}
              aria-expanded={shown}
              onClick={() => setOpen(shown ? null : i)}
            >
              {mark}
              <span>{row.text}</span>
              {value}
            </button>
          </Hinted>
        );
      })}
    </>
  );
  // A priced list is a TABLE (2026-09-25): its own box, so its rows sit close
  // and its total — the row marked `total` — can be set apart. Prose rows
  // stay loose, as every row list before today was.
  return priced ? <div className="tip-table">{list}</div> : list;
}

/**
 * A hinted row and, while it is open, its one line of explanation — with a
 * small ✕ that closes it (Marc, 2026-09-25: "add a small X to remove hint
 * too"). A second tap on the row still closes it as well; the ✕ is the way
 * that says so.
 */
function Hinted({
  hint,
  shown,
  closeLabel,
  onClose,
  children,
}: {
  readonly hint: string;
  readonly shown: boolean;
  readonly closeLabel: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}) {
  return (
    // Under the 44px floor on purpose, the row and its ✕ both: they only ever
    // explain, and a table of seven at tap size is a third of the screen. The
    // audit reads this as decided — see `.tip-hinted` in ui.css.
    <div className="tip-line" data-audit-compact="">
      {children}
      {shown && (
        <p className="tip-hint note">
          <span>{hint}</span>
          <button
            type="button"
            className="tip-hint-close"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <Icon name={CHROME_ICON.close} />
          </button>
        </p>
      )}
    </div>
  );
}
