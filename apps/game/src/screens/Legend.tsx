import { COLOURS, TUNING } from '@content/tuning';
import {
  COLOUR_MARK,
  CONCEPT_MARK,
  hex,
  LANDMARK_GLYPH,
  namesOf,
  TILE_GLYPH,
  type Theme,
} from '@theme/tokens';
import { LESSON_FOR_REWARD, lessonName, lessonOf } from '@view/lessons';
import { powerOf } from '@view/view';
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
const PLACES = (Object.keys(LESSON_FOR_REWARD) as (keyof typeof LESSON_FOR_REWARD)[]).map(
  (reward) => ({ reward, id: LESSON_FOR_REWARD[reward] }),
);

export type LegendProps = {
  readonly theme: Theme;
  readonly s: Strings;
};

export function Legend({ theme, s }: LegendProps) {
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
            {/*
              The grounds say what they DO, right here.

              They are the one thing in this legend with no section under it —
              the manual teaches RIPE and POCKET and CACHE, and never once says
              what MOSS is for. So a player met four names, four colours and
              four marks, and had to find the answer by tapping a card in the
              hand. `powerOf` is the core's one-line statement of a colour's
              power and is already what the hand's card prints, so this is the
              same sentence in a second place rather than a second sentence.
              A dial at zero returns '' and the row is just a name again.
            */}
            <span className="legend-name">
              {names[colour]}
              {powerOf(colour, TUNING, s) === '' ? null : (
                <span className="legend-note note"> — {powerOf(colour, TUNING, s)}</span>
              )}
            </span>
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
              {/*
                A NAME, not a button (2026-08-29). It was tappable, on the
                argument that the term card is where the full definition lives
                and a legend repeating it would be a second copy. True of the
                sentence, wrong about the screen: this legend opens the PLAY
                tab and every one of these five has its own section a thumb's
                length below it, so the card it opened was quoting the page it
                was opened from. Marc: "make sure cache, site, shrine, etc. are
                not clickable ... they should get the explanation directly
                readable."
              */}
              <span className="legend-name" data-term={id}>
                {lesson === undefined ? id : lessonName(lesson, s)}
              </span>
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
          {/* The mark the board prints on a wall, so the legend teaches the
              same thing the board shows — stone beside it stays wordless,
              which is how the two are told apart. */}
          <span className="legend-mark" aria-hidden="true">
            {CONCEPT_MARK.wall}
          </span>
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
