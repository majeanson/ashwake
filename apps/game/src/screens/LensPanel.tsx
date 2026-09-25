import { useState, type CSSProperties } from 'react';
import { COLOURS } from '@content/tuning';
import type { Colour, Tuning } from '@content/tuning';
import { COLOUR_ICON } from '@theme/icons';
import { hex, namesOf, type Theme } from '@theme/tokens';
import type { Strings } from '@text/Strings';
import { colourLesson, groundRows, priceRows, type HudView } from '@view/view';
import { Icon } from '../ui/Icon';
import { panelOf, tabOf, Tabs } from '../ui/Tabs';
import { TipRows } from '../ui/TipRows';

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
  // Which half of a held ground is showing. It stays put when the ground
  // changes, so a player comparing prices across grounds stays on the price.
  const [tab, setTab] = useState<'ground' | 'price'>('ground');

  return (
    <div className="drawer lens-sheet" id="lens" data-hud="lens">
      <div className="spends-head">
        <span className="fact-label">{s.ui.lensPanel.standing}</span>
        <b className="spends-luck">{s.ui.lensPanel.worth(total)}</b>
      </div>

      {COLOURS.map((colour) => {
        const c = hud.colours.find((p) => p.colour === colour);
        if (c === undefined) return null;
        /*
         * FOCUSED ON ONE (Marc, 2026-09-25: "remove other colors when were
         * focused on one"). While a ground is held, the panel is about that
         * ground and nothing else; tapping its row again lets go and the four
         * come back.
         */
        if (held !== null && held !== colour) return null;
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
                {/*
                  TWO TABS (Marc, 2026-09-25: "put it in 2 tabs otherwise its
                  too much height"): the ground — its power sentence and its
                  stats — and the price — the best pocket's table, or the
                  formula with nothing ripe. A board that hides its points has
                  no price to show, so it has no tabs and shows the ground.
                */}
                {hud.showPoints && (
                  <Tabs
                    base="lens"
                    label={s.ui.lensPanel.tabs.label}
                    tabs={[
                      { id: 'ground', label: s.ui.lensPanel.tabs.ground },
                      { id: 'price', label: s.ui.lensPanel.tabs.price },
                    ]}
                    on={tab}
                    onPick={setTab}
                    growsNote={s.ui.tabGrows}
                  />
                )}
                <div
                  {...(hud.showPoints
                    ? {
                        role: 'tabpanel',
                        id: panelOf('lens', tab),
                        'aria-labelledby': tabOf('lens', tab),
                      }
                    : {})}
                >
                  {tab === 'ground' || !hud.showPoints ? (
                    <>
                      {/*
                        THE GROUND'S POWER, IN WORDS (back 2026-09-25: Marc,
                        of the morning's cut, "not the points detail"). Its
                        numbers from the live tuning; null when the
                        personalities are off.
                      */}
                      {rule !== null && <p className="note lens-rule">{rule}</p>}
                      <div data-lens-stats={colour}>
                        <TipRows
                          rows={groundRows(c, total, hud.showPoints, s)}
                          theme={theme}
                          s={s}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/*
                        THE PRICE, ALWAYS (Marc, 2026-09-25: "the price table,
                        always"). The best pocket priced whole when there is
                        one; otherwise the same table with its terms unknown,
                        so the formula is on the screen before the first
                        pocket ripens. Every row explains itself on a tap, as
                        the receipt's do: they are one component, `TipRows`.
                      */}
                      <p className="fact-label">
                        {c.best === null ? s.ui.lensPanel.sum.none : s.ui.lensPanel.sum.title}
                      </p>
                      <div data-lens-sum={colour}>
                        <TipRows rows={priceRows(c.best, tuning, s)} theme={theme} s={s} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <p className="note lens-foot">{s.ui.lensPanel.foot}</p>
    </div>
  );
}
