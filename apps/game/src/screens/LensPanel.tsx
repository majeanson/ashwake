import type { CSSProperties } from 'react';
import { COLOURS } from '@content/tuning';
import type { Colour, Tuning } from '@content/tuning';
import { COLOUR_ICON, LENS_ICON, type IconName } from '@theme/icons';
import { hex, namesOf, type Theme } from '@theme/tokens';
import { fmt1 } from '@text/index';
import type { Strings } from '@text/Strings';
import { colourLesson, priceRows, type HudView } from '@view/view';
import { Fold } from '../ui/Fold';
import { Icon } from '../ui/Icon';

/**
 * THE LENS PANEL — what the board is worth, per ground (2026-09-16).
 *
 * Ashwake 1 answered a long-pressed card with a five-clause report under the
 * board: tiles standing, worth, the power's share, what is ripe. This body lit
 * the lens and said the ground's NAME, and `HudView.colours` — the same five
 * numbers, measured per colour by tallying the board twice — went unread for
 * two weeks until `pnpm sweep` asked. Offered the toast, a shorter line or
 * cutting the tally, Marc answered with a fourth thing (2026-09-10): _"maybe a
 * lens button where we can see actual points of all board, check per color,
 * etc."_ — and, shown three drawings on 2026-09-16, placed it: _"beside luck
 * action button maybe."_
 *
 * So: a sheet over the hand, the shape the purse already has — STANDING and
 * the board's total worth in the head, one row per ground with its mark, its
 * name, its tiles and its worth, and under each what the power earned and
 * what is ripe. A row is a button: pressing it holds the lens on that ground,
 * which is the gesture the hand's long-press already makes, so the panel and
 * the board agree by construction (`App`'s `holdLens` is the one writer).
 *
 * WORTH, not points. `ColourPotential.worth` is the unit the points formula
 * sums, before the pocket size and the distance multiply it, and it is the
 * same whether the run hides its score (`hidePoints`) or not. A panel that
 * printed "pts" would be wrong on the one board that hides them and only
 * approximately right on every other. It is a decimal — luck multiplies it —
 * and the catalogue prints it the way the receipts do, with one decimal.
 */

type LensPanelProps = {
  readonly hud: HudView;
  /** For the held ground's power sentence — the one a tapped tile speaks. */
  readonly tuning: Tuning;
  readonly theme: Theme;
  readonly s: Strings;
  /** Hold the lens on this ground, or let it go if it is already held. */
  readonly onHold: (colour: Colour) => void;
};

export function LensPanel({ hud, tuning, theme, s, onHold }: LensPanelProps) {
  const names = namesOf(theme, s.locale);
  const held = hud.spotlight?.colour ?? null;
  const total = hud.colours.reduce((sum, c) => sum + c.worth, 0);

  return (
    <div className="drawer lens-sheet" id="lens" data-hud="lens">
      <div className="spends-head">
        <span className="fact-label">{s.ui.lensPanel.standing}</span>
        <b className="spends-luck">{s.ui.lensPanel.worth(total)}</b>
      </div>

      {COLOURS.map((colour) => {
        const c = hud.colours.find((p) => p.colour === colour);
        if (c === undefined) return null;
        const rule = held === colour ? colourLesson(colour, tuning, theme, s) : null;
        return (
          <div key={colour} className="lens-ground">
            <button
              type="button"
              className="lens-row"
              data-lens-row={colour}
              aria-pressed={held === colour}
              onClick={() => onHold(colour)}
            >
              <span
                className="spend-swatch"
                aria-hidden="true"
                style={{ background: hex(theme.terrain[colour].fill) }}
              >
                <Icon name={COLOUR_ICON[colour]} />
              </span>
              <span className="lens-main">
                <span className="spend-name">{names[colour]}</span>
                <span className="lens-sub note">
                  {s.ui.lensPanel.power(c.bonus)}
                  {' · '}
                  {c.ripeCount > 0
                    ? s.ui.lensPanel.ripe(c.ripeCount, c.ripeWorth)
                    : s.ui.lensPanel.ripeNone}
                </span>
              </span>
              <span className="lens-figures">
                <span className="lens-tiles note">{s.ui.lensPanel.tiles(c.count)}</span>
                <span className="spend-cost">{s.ui.lensPanel.worth(c.worth)}</span>
              </span>
            </button>
            {/*
              THE HELD GROUND, IN DETAIL — a stat sheet (2026-09-24). Marc,
              planning it: an ICON, a LABEL and a NUMBER per stat, the icons in
              the ground's own colour; the hints, the ground's power and the
              pop's arithmetic "on expand", the arithmetic "as a table like the
              1st". Under the row that holds the lens, and only that one. The
              table's terms are `harvestValue`'s own, so it adds up to the
              price POP pays.
            */}
            {held === colour && (
              <div
                className="lens-detail"
                data-lens-detail={colour}
                style={{ '--ground': hex(theme.terrain[colour].fill) } as CSSProperties}
              >
                <dl className="lens-stats">
                  {total > 0 && (
                    <Stat
                      icon={LENS_ICON.share}
                      label={s.ui.lensPanel.rows.share}
                      value={s.ui.lensPanel.share(Math.round((c.worth / total) * 100))}
                    />
                  )}
                  {c.count > 0 && (
                    <Stat
                      icon={LENS_ICON.perTile}
                      label={s.ui.lensPanel.rows.perTile}
                      value={dec(s, c.worth / c.count)}
                    />
                  )}
                  <Stat
                    icon={LENS_ICON.pockets}
                    label={s.ui.lensPanel.rows.pockets}
                    value={String(c.pockets)}
                  />
                  {c.best !== null && (
                    <Stat
                      icon={LENS_ICON.best}
                      label={s.ui.lensPanel.rows.best}
                      value={s.ui.lensPanel.best(c.best.count, hud.showPoints ? c.best.paid : null)}
                    />
                  )}
                  <Stat
                    icon={LENS_ICON.inHand}
                    label={s.ui.lensPanel.rows.inHand}
                    value={String(c.inHand)}
                  />
                </dl>
                <Fold summary={s.ui.lensPanel.why}>
                  {rule !== null && <p className="note">{rule}</p>}
                  <ul className="lens-hints note">
                    {total > 0 && <li>{s.ui.lensPanel.hints.share}</li>}
                    {c.count > 0 && <li>{s.ui.lensPanel.hints.perTile}</li>}
                    <li>{s.ui.lensPanel.hints.pockets}</li>
                    {c.best !== null && <li>{s.ui.lensPanel.hints.best}</li>}
                    <li>{s.ui.lensPanel.hints.inHand}</li>
                  </ul>
                  {c.best !== null && hud.showPoints && (
                    <>
                      <p className="fact-label">{s.ui.lensPanel.sum.title}</p>
                      <dl className="lens-stats lens-sum" data-lens-sum={colour}>
                        {priceRows(c.best, tuning, s).map((row, i, all) => (
                          <Stat
                            key={row.text}
                            icon={row.icon ?? LENS_ICON.points}
                            label={row.text}
                            value={row.value ?? ''}
                            {...(i === all.length - 1 ? { total: true } : {})}
                          />
                        ))}
                      </dl>
                    </>
                  )}
                </Fold>
              </div>
            )}
          </div>
        );
      })}

      <p className="note lens-foot">{s.ui.lensPanel.foot}</p>
    </div>
  );
}

/** One row of the sheet: the mark in the ground's colour, the label, the number. */
function Stat({
  icon,
  label,
  value,
  total,
}: {
  readonly icon: IconName;
  readonly label: string;
  readonly value: string;
  readonly total?: boolean;
}) {
  return (
    <div className={total === true ? 'lens-stat total' : 'lens-stat'}>
      <dt>
        <span className="lens-stat-icon" aria-hidden="true">
          <Icon name={icon} />
        </span>
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}

/** A worth to one decimal, through the catalogue's own locale formatter —
 *  a French comma is a French comma. */
const dec = (s: Strings, n: number): string => fmt1(n, s.locale);
