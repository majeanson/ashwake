import { Fragment, useEffect, useState } from 'react';
import { TUNING } from '@content/tuning';
import { NAME } from '@meta/identity';
import type { Theme } from '@theme/tokens';
import {
  LESSONS,
  lessonDetail,
  lessonLines,
  lessonName,
  lessonOf,
  type Lesson,
  type LessonId,
  type RowKey,
} from '@view/lessons';
import type { FigureId } from '@view/figure';
import type { Strings } from '@text/Strings';
import { Fold } from '../ui/Fold';
import { Icon } from '../ui/Icon';
import { Figure } from '../ui/Figure';
import { Panel } from '../ui/Panel';
import { ProseLines, type OnTerm } from '../ui/Prose';
import { TipRows } from '../ui/TipRows';
import { panelOf, tabOf, Tabs } from '../ui/Tabs';

/**
 * The manual — HOW TO PLAY (Stage 3, 2026-08-29).
 *
 * **Every sentence here is a lesson's.** Ashwake 1's manual carried a second
 * copy of the prose as literals inside its section builder, which is precisely
 * how the manual and the teaching cards drifted apart and why
 * `teaching.pin.test.ts` exists. Here a section IS a lesson: `lessonLines`
 * writes the paragraphs, `lessonDetail` fills the DETAILS fold, and the figure
 * is the lesson's own. There is nowhere for a second wording to live.
 *
 * The tabs group lessons by when a player meets them, which is the one editorial
 * decision this file makes and the reason it is a table rather than a switch.
 *
 * **BACK and Escape are the only exits.** Ashwake 1 removed tap-to-close on
 * 2026-08-27 after it kept dismissing the manual mid-sentence.
 */

const TABS = ['start', 'grounds', 'world', 'hand'] as const;
type TabId = (typeof TABS)[number];

/** The key list, in the order somebody learns it: point at a hex, act on it,
 *  then move the camera, then the shortcuts that only save time. */
const KEY_LINES = [
  'move',
  'act',
  'pan',
  'zoom',
  'turn',
  'lean',
  'view',
  'cards',
  'hold',
  'undo',
  'mouse',
] as const;

/**
 * Which lessons belong under which tab, in reading order. The registry says
 * (`Lesson.tab`, and array order in `LESSONS`); this only filters it. The
 * GROUNDS tab is THE FOUR GROUNDS lesson and nothing else (2026-10-13: it was
 * a block of its own, `GroundGuide`), and it appears when that lesson has
 * been met, like every section that grows in. The history below is why the
 * lessons sit where they do.
 *
 * **Regrouped 2026-08-29** (Marc): a lesson belongs beside the thing it is
 * about, not on a tab named for when you happen to meet it. AFTER held the
 * three that had nowhere else — and every one of them had somewhere else.
 *
 *   - SIZE BONUS is a rule about what a POP pays, so it reads right after POP.
 *   - BOUNTY is what a SITE opens, so it belongs with the destinations.
 *   - RELICS are what LUCK turns into, so it closes the hand.
 *
 * AFTER is gone with them rather than left as an empty tab.
 *
 * **The marks of the board are rows now (2026-10-13).** The Legend listed every
 * mark the board can show beside the sections that explained them; the
 * destinations moved under THE MAP, the grounds under THE FOUR GROUNDS, the
 * rare ring under MAGIC, and the last four — stone, the ripe edge under POP, a
 * wall and the legal edge under THE EXPEDITION — in this phase, so each mark
 * now sits beside the rule that uses it. A row's `lines` print here, never on
 * a card. SACRIFICE is gone (its dials are 0 for good; `lessons.ts` says where
 * to find it in git).
 */
const sectionsOf = (tab: TabId): readonly Lesson[] => LESSONS.filter((l) => l.tab === tab);

/**
 * THE MANUAL IS COMPLETE, ALWAYS (2026-10-15, Marc: _"how to play should be
 * complete all the time"_). It used to grow in as a device met each concept
 * (2026-09-02), so a reader who opened it early found tabs with nothing on
 * them — MONDE was a blank page. The first-contact CARDS are what is kept short
 * and in order now; the book is where everything lives, and a fresh device may
 * read all of it.
 */

/** The tab a lesson's section is printed on, or null where this manual does not print it. */
const tabFor = (id: LessonId | undefined): TabId | null =>
  (id === undefined ? undefined : lessonOf(id))?.tab ?? null;

/**
 * The lessons of one tab, each with the figure it should actually draw.
 *
 * A figure is claimed by the FIRST lesson on the tab that carries it; every
 * lesson after gets `null` and reads under the picture already there.
 */
function drawnOnce(
  lessons: readonly Lesson[],
): readonly { id: LessonId; lesson: Lesson; figure: FigureId | null }[] {
  const drawn = new Set<FigureId>();
  const out: { id: LessonId; lesson: Lesson; figure: FigureId | null }[] = [];
  for (const lesson of lessons) {
    const { id } = lesson;
    const figure = lesson.figure !== undefined && !drawn.has(lesson.figure) ? lesson.figure : null;
    if (figure !== null) drawn.add(figure);
    out.push({ id, lesson, figure });
  }
  return out;
}

type ManualProps = {
  readonly theme: Theme;
  readonly s: Strings;
  /** Whether this device has a real pointer, and so probably a keyboard. The
   *  keys work everywhere; this only decides whether to spend a screen of a
   *  phone's manual listing keys nobody there has. */
  readonly keyboard?: boolean;
  /**
   * WHICH GAME the reader is in right now (2026-09-02).
   *
   * The manual described one game and the player might be in any of three.
   * That matters most for the reader least equipped to notice: a `?seed=`
   * link's recipient opens START first, and every sentence about keeping
   * ground, banking relics and buying upgrades is false for them. Ashwake 1
   * put this section here after finding exactly that, and its note is the
   * reason it is not folded away: this is the most-read passage in the game
   * and it was the most-read false one.
   *
   * Absent means an unknown mode — a bare test, the gallery — and the section
   * simply does not print rather than guessing.
   */
  readonly mode?: 'world' | 'shared' | 'daily';
  /**
   * WHERE TO OPEN (2026-10-13): a card's HOW TO PLAY › lands on its lesson's
   * section, at the row it was opened at where it has one. Absent is the menu's
   * plain open, on the first tab.
   */
  readonly open?: ManualOpen | undefined;
  /**
   * A term whose section this manual does not print (not yet met on this
   * device, say) opens its card as it does anywhere else. A term whose section
   * IS printed navigates the book instead (`go`), never a card over a book.
   */
  readonly onTerm: OnTerm;
  readonly onBack: () => void;
};

/** A lesson, and the row of it, to scroll the manual to. */
export type ManualOpen = { readonly at: LessonId; readonly row?: RowKey | undefined };

/** How long a section or row sent to by a link stays lit. */
const FLASH_MS = 1600;

export function Manual({ theme, s, keyboard, mode, open, onTerm, onBack }: ManualProps) {
  const [on, setOn] = useState<TabId>(() => tabFor(open?.at) ?? TABS[0]);
  // The place to scroll to. A fresh object per request, so asking for the same
  // section twice scrolls twice.
  const [goto, setGoto] = useState<ManualOpen | null>(open === undefined ? null : { ...open });

  /*
   * A tapped term NAVIGATES THE BOOK (2026-10-13, Marc's linking decision;
   * this reverses 2026-08-29's "nothing in the manual is tappable"): switch to
   * the tab the term's lesson lives on and scroll to its section, leading its
   * row where the word is a row's own. A card over the book would repeat the
   * section it names.
   */
  const go: OnTerm = (id, row) => {
    const tab = tabFor(id);
    if (tab === null) {
      onTerm(id, row);
      return;
    }
    setOn(tab);
    setGoto(row === undefined ? { at: id } : { at: id, row });
  };

  useEffect(() => {
    if (goto === null) return;
    const section = document.getElementById(`manual-${goto.at}`);
    const row =
      goto.row === undefined ? null : (section?.querySelector(`[data-row="${goto.row}"]`) ?? null);
    const target = row ?? section;
    target?.scrollIntoView?.({ block: 'start' });
    target?.classList.add('manual-flash');
    const timer = setTimeout(() => target?.classList.remove('manual-flash'), FLASH_MS);
    return () => {
      clearTimeout(timer);
      target?.classList.remove('manual-flash');
    };
  }, [goto]);

  return (
    <Panel
      id="manual"
      title={NAME}
      back={s.ui.back}
      closeAll={s.ui.closeAll}
      onBack={onBack}
      tabbed={{ panelId: panelOf('manual', on), labelledBy: tabOf('manual', on) }}
      head={
        <Tabs
          base="manual"
          label={s.ui.howToPlay}
          tabs={TABS.map((id) => ({ id, label: s.ui.tabs[id] }))}
          on={on}
          onPick={setOn}
        />
      }
    >
      {/*
        THE EXPEDITION opens the manual (2026-08-29; a lesson since 2026-10-13,
        so it is the first section of the registry's START tab and no longer a
        block of its own).

        Marc: *"instead of START call it EXPEDITION or similar and then explain
        its normal to die or have some kind of backstory"*. The manual opened
        on RIPE — a mechanic — and never said what the player was doing or that
        running out of tiles is how a run ENDS rather than how it is failed.
        A roguelite that does not say so reads as a game you keep losing. The
        game in two sentences is its core, the same words the goal card says
        (2026-10-12, Marc), and the `place` figure under its rows is drawn at
        last (2026-09-03).
      */}

      {/*
        WHICH GAME — see `mode` (2026-09-02).

        The line that says which of the three you are in comes first; the
        three definitions follow IN THE OPEN since 2026-09-03 (Marc: "remove
        details and explain each"). They folded for a day on the argument that
        only one of them is about the run in front of you — but the section
        exists precisely for the reader in the WRONG run (a `?seed=` link's
        recipient), and a definition behind a DETAILS tap is a definition that
        reader never opens. Four short paragraphs is what a fold saves; a
        false mental model is what it costs.
      */}

      {/*
        The keys, on the tab a player opens first and only where there is a
        keyboard to press (2026-08-29). The board grew a marker that arrows
        walk and Enter acts on, and an input nobody is told about is an input
        nobody uses — which is how the colour lens and the stash spent a stage
        each being unreachable.

        Every line is the catalogue's whole sentence, key name included: the
        key names ARE words per language (Entrée, Page précédente), so a
        component that supplied the key and let the catalogue caption it would
        be deciding half of what a player reads.
      */}

      {/*
        One picture per tab, however many lessons share it (2026-08-30).

        MAGIC and UNIQUE carry the same figure BY DESIGN — `lessons.ts`
        gives them the same shared sentence for the same reason — and its
        caption says "magic, then unique", so it is one picture about a
        pair. The HAND tab drew it twice, identical, a paragraph apart.

        The first lesson to want a figure gets it; the ones after read the
        text with the picture already above them. Tracked here rather than
        in the registry because it is a fact about a PAGE, not about a
        lesson: a teaching card shows the same figure and should.
      */}
      {/* WHICH GAME: straight under the opening (THE EXPEDITION) for a reader in a
          shared or daily run (the section exists for the reader in the wrong
          run), and after the rules for one in their own world, who has the least
          need of it. */}
      {drawnOnce(sectionsOf(on)).map(({ id, lesson, figure }) => (
        <Fragment key={id}>
          <Section lesson={lesson} figure={figure} theme={theme} s={s} onTerm={go} />
          {id === 'expedition' && mode !== undefined && mode !== 'world' && (
            <WhichGame mode={mode} s={s} />
          )}
        </Fragment>
      ))}

      {on === 'start' && mode === 'world' && <WhichGame mode={mode} s={s} />}

      {/* The keys come last: they only save time (2026-10-12). */}
      {on === 'start' && keyboard === true && (
        <section className="lesson">
          <h2 className="panel-title marked">
            <span>{s.ui.board.keys.title}</span>
          </h2>
          <ul className="keys">
            {KEY_LINES.map((id) => (
              <li key={id}>{s.ui.board.keys[id]}</li>
            ))}
          </ul>
        </section>
      )}
    </Panel>
  );
}

/**
 * WHICH GAME — see `mode` (2026-09-02). The line that says which of the three
 * you are in comes first; the three definitions follow in the open (Marc,
 * 2026-09-03: "remove details and explain each"), because the section exists
 * for the reader in the WRONG run and a definition behind a tap is one they
 * never open.
 */
function WhichGame({
  mode,
  s,
}: {
  readonly mode: 'world' | 'shared' | 'daily' | undefined;
  readonly s: Strings;
}) {
  if (mode === undefined) return null;
  return (
    <section className="lesson">
      <h2 className="panel-title marked">
        <span>{s.ui.which.title}</span>
      </h2>
      <p>
        {mode === 'world'
          ? s.ui.which.nowWorld
          : mode === 'shared'
            ? s.ui.which.nowShared
            : s.ui.which.nowDaily}
      </p>
      <p>{s.ui.which.world}</p>
      <p>{s.ui.which.shared}</p>
      <p>{s.ui.which.daily}</p>
      <p>{s.ui.which.howToShare}</p>
    </section>
  );
}

/**
 * One lesson, printed whole.
 *
 * **Its terms are buttons since 2026-10-13** (Marc's linking decision: if the
 * game names it, you can tap it). This reverses 2026-08-29's ruling — "make
 * sure cache, site, shrine, etc. are not clickable" — which was right about
 * what the tap DID then: it opened a card repeating the section two inches
 * below. It no longer does that. A tap here scrolls the book to the section the
 * word names (`Manual`'s `go`), and the word that names THIS section stays
 * plain text (`Prose`'s `within`), so no paragraph links to itself.
 */
function Section({
  lesson,
  figure,
  theme,
  s,
  onTerm,
}: {
  readonly lesson: Lesson;
  /** The figure to draw under this section, or null where a section above it
   *  on this tab has already drawn the same one. */
  readonly figure: FigureId | null;
  readonly theme: Theme;
  readonly s: Strings;
  readonly onTerm: OnTerm;
}) {
  const lines = lessonLines(lesson, TUNING, theme, s);
  const rows = lesson.rows?.(TUNING, theme, s) ?? [];
  const detail = lessonDetail(lesson, TUNING, theme, s);
  // A dial turned to zero removes its own sentences, so a section can be empty
  // — and an empty heading is worse than an absent one.
  if (lines.length === 0) return null;

  return (
    <section className="lesson" id={`manual-${lesson.id}`}>
      {/*
        The heading wears the lesson's own mark, where it has one: a rule about
        a thing you can SEE on the board should be findable by that thing. The
        mark comes from the lesson, which reads it from a registry — nothing
        here picks a shape.

        The COLUMN is reserved either way (2026-08-30, Marc: "make sure all
        indentation is good"). Half the lessons carry a mark and half do not,
        so POCKET began at the margin and BOUNTY an icon's width in, down a
        page of sections meant to read as one list. `.panel-title.marked` is a
        two-column grid whether or not the first column has anything in it.
      */}
      <h2 className="panel-title marked">
        <span className="card-glyph" aria-hidden="true">
          {lesson.icon !== undefined && <Icon name={lesson.icon} />}
        </span>
        <span>{lessonName(lesson, s)}</span>
      </h2>
      <ProseLines text={lines.join('\n')} s={s} onTerm={onTerm} within={lesson.id} />
      {rows.length > 0 && (
        <TipRows rows={rows} theme={theme} s={s} withLines onTerm={onTerm} within={lesson.id} />
      )}
      {lesson.manualFigure !== undefined && (
        <Figure id={lesson.manualFigure} theme={theme} s={s} caption />
      )}
      {figure !== null && <Figure id={figure} theme={theme} s={s} caption />}
      {detail.length > 0 && (
        <Fold summary={s.ui.details}>
          <ProseLines text={detail.join('\n')} s={s} onTerm={onTerm} within={lesson.id} />
        </Fold>
      )}
    </section>
  );
}
