import { TUNING } from '@content/tuning';
import { CONCEPT_ICON } from '@theme/icons';
import type { Theme } from '@theme/tokens';
import { lessonDefine, lessonName, lessonOf } from '@view/lessons';
import type { Strings } from '@text/Strings';
import { useGroundArt } from '../shell/art';
import { Hex } from '../ui/Hex';
import { Icon } from '../ui/Icon';

/**
 * THE MARKS THAT ARE NOT PLACES (2026-10-13). The destinations left this legend
 * for THE MAP, whose rows draw the same lit hex and carry the rule beside it;
 * the grounds went to THE FOUR GROUNDS the day before, and the rare ring went
 * to MAGIC (its UNIQUE row draws the ringed tile, its figure the pair). What is
 * left is stone, a wall, the ripe and legal edges — until those move under POP
 * and THE EXPEDITION and this file goes (phase 6 of the one-teaching-system
 * plan).
 *
 * Every mark the board can show you, and what it means (Stage 5, 2026-08-29).
 *
 * Marc's ask: *"adding visuals and assets and symbols in the how to play"*.
 * The manual explains the RULES well and had never once shown the alphabet
 * they are written in — a player meets a mark on a hex and the only way to
 * learn it is to tap that hex, which requires already having walked to it.
 *
 * **Nothing here invents a mark.** Every icon is read from the registry that
 * owns it — `COLOUR_ICON`, `LANDMARK_ICON`, `TILE_ICON` — and every name and
 * sentence from the lesson that already defines it, or from the direction's
 * own terrain names. That is the whole point of a legend: it must be the same
 * alphabet the board is drawing, not a second copy of it that can drift.
 *
 * ## The list and the explanation are ONE list (2026-08-30)
 *
 * Marc: *"in how to play, we have the destinations enumerated, then later on
 * explanations, make sure all is one."* The PLAY tab opened with this legend
 * naming the five destinations, and then, a thumb's length below, printed a
 * section for each of four of them saying what they do. Two passes over the
 * same five things, in the same tab, in a different order, and neither one
 * complete: the list had the marks and no rules, the sections had the rules
 * and no marks.
 *
 * So a row now carries the whole thing: the mark, the name, and the lesson's
 * own definition. The four sections are gone from `Manual`'s PLAY tab, and
 * nothing was rewritten to do it — `lessonDefine` is the same function those
 * sections were printing, so there is still exactly one place each of these
 * sentences lives. STONE moved the same way and for the same reason.
 *
 * ## And the pictures are the board's own (2026-08-30)
 *
 * Marc: *"in how to play we reuse the same visuals as in game for all."* A
 * ground was a rounded SQUARE of the terrain's flat fill, and an edge was a
 * square with a border — neither of which the board draws. Every swatch here
 * is a HEX now, at the direction's own facing, filled with the very PNG the
 * board composites into that ground (`ui/Hex`, the one drawing the figures and
 * the hand's cards also ask for); the two edge rows draw a ring the way the
 * board rings a hex. The legend has always repainted with
 * the board when a direction changes, and now it does so in the board's hand.
 *
 * ## Every row leads with a SWATCH (2026-09-03)
 *
 * Marc: *"if we have the indent, we have a standard on all line, so for
 * example the destinations would have a tile with yellow in left column."*
 * The grounds led with a hex and the destinations led with a bare mark, so
 * half the rows started a column early and the page read as two lists in one.
 * A destination on the board IS a picture the legend can reuse: a hex on the
 * wall's own ground, ringed in `ink.lit` — the exact cell the `destinations`
 * figure draws — so each of the five rows now opens with it. The rare-tile
 * row opens with the `rare` figure's own first cell (blue, ringed magic) for
 * the same reason. `.legend li > .legend-mark:first-child` had nothing left
 * to catch and is gone.
 */

type LegendProps = {
  readonly theme: Theme;
  readonly s: Strings;
};

export function Legend({ theme, s }: LegendProps) {
  const art = useGroundArt(theme.id);
  const stone = lessonOf('stone');

  return (
    /*
     * `h2`, not `h3` (2026-09-02).
     *
     * These three were `h3` under `Panel`'s `h1` with nothing at level two
     * between them, and the legend OPENS the PLAY tab — so the first heading
     * on the manual's longest page skipped a level, and a screen reader
     * skimming by heading level was told a section was missing. The manual's
     * own lesson headings below are `h2`; these are their siblings and now say
     * so.
     *
     * A level is a document structure, not a size: `.fact-label` sets the face,
     * so nothing about this moved a pixel.
     */
    <section className="legend">
      <h2 className="fact-label">{s.ui.legendMarks}</h2>
      <ul>
        <li className="tall">
          <Hex
            id="legend-stone"
            className="legend-swatch"
            theme={theme}
            ground="stone"
            art={art.stone}
          />
          <span className="legend-mark" aria-hidden="true">
            <Icon name={CONCEPT_ICON.stone} />
          </span>
          <span className="legend-name">
            {stone === undefined ? null : (
              <>
                <b className="legend-term">{lessonName(stone, s)}</b>{' '}
                <span className="legend-note note">{lessonDefine(stone, TUNING, theme, s)}</span>
              </>
            )}
          </span>
        </li>
        <li>
          <Hex
            id="legend-wall"
            className="legend-swatch"
            theme={theme}
            ground="wall"
            art={art.wall}
          />
          {/* The mark the board prints on a wall, so the legend teaches the
              same thing the board shows. Stone beside it carries its own mark
              for the same reason. */}
          <span className="legend-mark" aria-hidden="true">
            <Icon name={CONCEPT_ICON.wall} />
          </span>
          <span className="legend-name">{s.ui.legendWall}</span>
        </li>
        {/* The two rows that are about an EDGE rather than a ground: a ring
            around a hex, which is exactly what the board draws around one. */}
        <li>
          <Hex
            id="legend-ripe"
            className="legend-swatch"
            theme={theme}
            ring={theme.board.ripeEdge}
          />
          <span className="legend-name">{s.ui.legendRipe}</span>
        </li>
        <li>
          <Hex
            id="legend-legal"
            className="legend-swatch"
            theme={theme}
            ring={theme.board.legalEdge}
          />
          <span className="legend-name">{s.ui.legendLegal}</span>
        </li>
      </ul>
    </section>
  );
}
