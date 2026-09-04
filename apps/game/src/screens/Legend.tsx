import { COLOURS, TUNING } from '@content/tuning';
import { COLOUR_ICON, CONCEPT_ICON, LANDMARK_ICON, TILE_ICON } from '@theme/icons';
import { namesOf, type Theme } from '@theme/tokens';
import { LESSON_FOR_REWARD, lessonDefine, lessonName, lessonOf } from '@view/lessons';
import { powerOf } from '@view/view';
import type { Strings } from '@text/Strings';
import { useGroundArt } from '../shell/art';
import { Figure } from '../ui/Figure';
import { Hex } from '../ui/Hex';
import { Icon } from '../ui/Icon';

/**
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
      <h2 className="fact-label">{s.ui.legendGrounds}</h2>
      <ul>
        {COLOURS.map((colour) => (
          <li key={colour} className="tall">
            <Hex
              id={`legend-${colour}`}
              className="legend-swatch"
              theme={theme}
              ground={colour}
              art={art[colour]}
            />
            <span className="legend-mark" aria-hidden="true">
              <Icon name={COLOUR_ICON[colour]} />
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

      <h2 className="fact-label">{s.ui.legendPlaces}</h2>
      <ul>
        {PLACES.map(({ reward, id }) => {
          const lesson = lessonOf(id);
          if (lesson === undefined) return null;
          return (
            <li key={reward} className="tall">
              {/* The board's own picture of an unclaimed destination: a hex on
                  the wall's ground, lit — the `destinations` figure's cell,
                  one per row, so every legend row leads with a swatch. */}
              <Hex
                id={`legend-${reward}`}
                className="legend-swatch"
                theme={theme}
                ground="wall"
                art={art.wall}
                ring={theme.ink.lit}
              />
              <span className="legend-mark" aria-hidden="true">
                <Icon name={LANDMARK_ICON[reward]} />
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

      {/*
        The `destinations` figure, drawn at last (2026-09-03).

        It has existed since Stage 3 with a caption written, pinned and
        translated — "Lit is unclaimed and still pays. Faint means you have
        already spent it." — and NO lesson carried it, so nothing ever drew
        it: the manual's figures reach a page only through `Lesson.figure`.
        That caption is also the one place the manual states FAINT MEANS
        SPENT (`render/labels.test.ts`'s rule), which a list of live marks
        cannot show. It belongs to this list, so it hangs under it.
      */}
      <Figure id="destinations" theme={theme} s={s} caption />

      <h2 className="fact-label">{s.ui.legendMarks}</h2>
      <ul>
        <li>
          {/* What the sentence beside it claims: a ground ringed in a rarity's
              colour. The `rare` figure's own first cell (blue, ringed magic),
              so this row's swatch and the HAND tab's picture agree. */}
          <Hex
            id="legend-rare"
            className="legend-swatch"
            theme={theme}
            ground="blue"
            art={art.blue}
            ring={theme.ink.magic}
          />
          <span className="legend-mark" aria-hidden="true">
            <Icon name={TILE_ICON} />
          </span>
          <span className="legend-name">{s.ui.legendRare}</span>
        </li>
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
