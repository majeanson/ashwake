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
import { LESSON_FOR_REWARD, lessonDefine, lessonName, lessonOf } from '@view/lessons';
import { powerOf } from '@view/view';
import type { Strings } from '@text/Strings';

/**
 * Every mark the board can show you, and what it means (Stage 5, 2026-08-29).
 *
 * Marc's ask: *"adding visuals and assets and symbols in the how to play"*.
 * The manual explains the RULES well and had never once shown the alphabet
 * they are written in — a player meets `◈` on a hex and the only way to learn
 * it is to tap that hex, which requires already having walked to it.
 *
 * **Nothing here invents a mark.** Every glyph is read from the registry that
 * owns it — `COLOUR_MARK`, `LANDMARK_GLYPH`, `TILE_GLYPH` — and every name and
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
 * sentences lives. STONE moved the same way and for the same reason; its row
 * used to carry a hand-shortened copy of the STONE lesson (`ui.legendStone`,
 * now deleted) rather than the lesson.
 *
 * The colour swatches are the direction's real terrain fills, so the legend
 * repaints with the board when a direction changes.
 */

/** The five destinations, and the lesson that names and explains each. */
const PLACES = (Object.keys(LESSON_FOR_REWARD) as (keyof typeof LESSON_FOR_REWARD)[]).map(
  (reward) => ({ reward, id: LESSON_FOR_REWARD[reward] }),
);

export type LegendProps = {
  readonly theme: Theme;
  readonly s: Strings;
};

export function Legend({ theme, s }: LegendProps) {
  const names = namesOf(theme, s.locale);
  const stone = lessonOf('stone');

  return (
    <section className="legend">
      <h3 className="fact-label">{s.ui.legendGrounds}</h3>
      <ul>
        {COLOURS.map((colour) => (
          <li key={colour} className="tall">
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
              <b className="legend-term">{names[colour]}</b>
              {powerOf(colour, TUNING, theme, s) === '' ? null : (
                <span className="legend-note note">
                  {' '}
                  {clause(powerOf(colour, TUNING, theme, s))}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <h3 className="fact-label">{s.ui.legendPlaces}</h3>
      <ul>
        {PLACES.map(({ reward, id }) => {
          const lesson = lessonOf(id);
          if (lesson === undefined) return null;
          return (
            <li key={reward} className="tall">
              <span className="legend-mark" aria-hidden="true">
                {LANDMARK_GLYPH[reward]}
              </span>
              {/*
                A NAME, not a button (2026-08-29). It was tappable, on the
                argument that the term card is where the full definition lives
                and a legend repeating it would be a second copy. True of the
                sentence, wrong about the screen — and moot since 2026-08-30,
                because the definition is now right here and there is nothing
                left for a card to add. Marc: "make sure cache, site, shrine,
                etc. are not clickable ... they should get the explanation
                directly readable."
              */}
              <span className="legend-name" data-term={id}>
                <b className="legend-term">{lessonName(lesson, s)}</b>{' '}
                <span className="legend-note note">{lessonDefine(lesson, TUNING, theme, s)}</span>
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
        <li className="tall">
          <span
            className="legend-swatch"
            aria-hidden="true"
            style={{ background: hex(theme.stone.fill) }}
          />
          <span className="legend-mark" aria-hidden="true">
            {CONCEPT_MARK.stone}
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
          <span
            className="legend-swatch"
            aria-hidden="true"
            style={{ background: hex(theme.wall.fill) }}
          />
          {/* The mark the board prints on a wall, so the legend teaches the
              same thing the board shows. Stone beside it carries its own mark
              for the same reason. */}
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

/**
 * `powerOf` returns an APPENDABLE fragment — it opens with " · " because it
 * was written to be tacked onto a line that already said something, which is
 * how Ashwake 1's card used it. The legend is its only caller today, and it
 * prints the clause on its own after the ground's name, so that separator
 * arrives with nothing on its left.
 *
 * Visible enough to fix once the power WORD started being dropped for a
 * direction whose names already say it (2026-08-29) — before that the "·" had
 * "crowds:" behind it and read as punctuation rather than as a leftover.
 * Trimmed here rather than in the catalogue, because the fragment is correct
 * for what it is; this is one host printing it standalone.
 */
const clause = (power: string): string => power.replace(/^ · /, '');
