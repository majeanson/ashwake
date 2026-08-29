import { COLOURS } from '@content/tuning';
import { COLOUR_MARK, hex, LANDMARK_GLYPH, namesOf, TILE_GLYPH, type Theme } from '@theme/tokens';
import { lessonName, lessonOf, type LessonId } from '@view/lessons';
import type { Strings } from '@text/Strings';

/**
 * Every mark the board can show you, and what it means (Stage 5, 2026-08-29).
 *
 * Marc's ask: *"adding visuals and assets and symbols in the how to play"*.
 * The manual explains the RULES well and has never once shown the alphabet
 * they are written in — a player meets `◈` on a hex and the only way to learn
 * it is to tap that hex, which requires already having walked to it.
 *
 * **Nothing here invents a mark.** Every glyph is read from the registry that
 * owns it — `COLOUR_MARK`, `LANDMARK_GLYPH`, `TILE_GLYPH` — and every name
 * from the lesson that already defines it or from the direction's own terrain
 * names. That is the whole point of a legend: it must be the same alphabet the
 * board is drawing, not a second copy of it that can drift.
 *
 * The colour swatches are the direction's real terrain fills, so the legend
 * repaints with the board when a direction changes.
 */

/** The five destinations, and the lesson that names each. */
const PLACES: readonly { readonly reward: keyof typeof LANDMARK_GLYPH; readonly id: LessonId }[] = [
  { reward: 'cache', id: 'cache' },
  { reward: 'site', id: 'site' },
  { reward: 'shrine', id: 'shrine' },
  { reward: 'territory', id: 'territory' },
  { reward: 'find', id: 'relic' },
];

export type LegendProps = {
  readonly theme: Theme;
  readonly s: Strings;
  readonly onTerm: (id: LessonId) => void;
};

export function Legend({ theme, s, onTerm }: LegendProps) {
  const names = namesOf(theme, s.locale);

  return (
    <section className="legend">
      <h3 className="fact-label">{s.ui.legendGrounds}</h3>
      <ul>
        {COLOURS.map((colour) => (
          <li key={colour}>
            <span
              className="legend-swatch"
              aria-hidden="true"
              style={{ background: hex(theme.terrain[colour].fill) }}
            />
            <span className="legend-mark" aria-hidden="true">
              {COLOUR_MARK[colour]}
            </span>
            <span className="legend-name">{names[colour]}</span>
          </li>
        ))}
      </ul>

      <h3 className="fact-label">{s.ui.legendPlaces}</h3>
      <ul>
        {PLACES.map(({ reward, id }) => {
          const lesson = lessonOf(id);
          return (
            <li key={reward}>
              <span className="legend-mark" aria-hidden="true">
                {LANDMARK_GLYPH[reward]}
              </span>
              {/* Tappable, because the term card is where the full definition
                  already lives — a legend that repeated it would be a second
                  copy of a sentence this project keeps in one place. */}
              <button type="button" className="term" data-term={id} onClick={() => onTerm(id)}>
                {lesson === undefined ? id : lessonName(lesson, s)}
              </button>
            </li>
          );
        })}
      </ul>

      <h3 className="fact-label">{s.ui.legendMarks}</h3>
      <ul>
        <li>
          <span className="legend-mark" aria-hidden="true">
            {TILE_GLYPH}
          </span>
          <span className="legend-name">{s.ui.legendRare}</span>
        </li>
        <li>
          <span
            className="legend-swatch"
            aria-hidden="true"
            style={{ background: hex(theme.stone.fill) }}
          />
          <span className="legend-name">{s.ui.legendStone}</span>
        </li>
        <li>
          <span
            className="legend-swatch"
            aria-hidden="true"
            style={{ background: hex(theme.wall.fill) }}
          />
          <span className="legend-name">{s.ui.legendWall}</span>
        </li>
        <li>
          <span
            className="legend-swatch legend-edge"
            aria-hidden="true"
            style={{ borderColor: hex(theme.board.ripeEdge) }}
          />
          <span className="legend-name">{s.ui.legendRipe}</span>
        </li>
        <li>
          <span
            className="legend-swatch legend-edge"
            aria-hidden="true"
            style={{ borderColor: hex(theme.board.legalEdge) }}
          />
          <span className="legend-name">{s.ui.legendLegal}</span>
        </li>
      </ul>
    </section>
  );
}
