import { useState } from 'react';
import { TUNING } from '@content/tuning';
import { NAME } from '@meta/identity';
import type { Theme } from '@theme/tokens';
import {
  LESSONS,
  lessonDetail,
  lessonLines,
  lessonName,
  type Lesson,
  type LessonId,
} from '@view/lessons';
import type { FigureId } from '@view/figure';
import { TEACH_IDS, type TeachId } from '@meta/progress';
import type { Strings } from '@text/Strings';
import { Fold } from '../ui/Fold';
import { Icon } from '../ui/Icon';
import { Figure } from '../ui/Figure';
import { Legend } from './Legend';
import { Panel } from '../ui/Panel';
import { ProseLines } from '../ui/Prose';
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

const TABS = ['start', 'play', 'hand'] as const;
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
  'mouse',
] as const;

/**
 * Which lessons belong under which tab, in reading order.
 *
 * **Regrouped 2026-08-29** (Marc): a lesson belongs beside the thing it is
 * about, not on a tab named for when you happen to meet it. AFTER held the
 * three that had nowhere else — and every one of them had somewhere else.
 *
 *   - SIZE BONUS is a rule about what a POP pays, so it reads right after POP.
 *   - BOUNTY is what a SITE opens, so it belongs with the destinations.
 *   - RELICS are what LUCK and SACRIFICE turn into, so they close the hand.
 *
 * AFTER is gone with them rather than left as an empty tab.
 *
 * **The five destinations and STONE left the PLAY tab on 2026-08-30**, and
 * they did not lose a word doing it. Marc: *"in how to play, we have the
 * destinations enumerated, then later on explanations, make sure all is one."*
 * The tab opened with the legend naming the five places, then printed a
 * section for four of them saying what they do — the same five things, twice,
 * in one tab, each pass carrying half the answer. `Legend` now prints the
 * mark, the name and `lessonDefine` on one row, which is the very function
 * these sections were calling, so there is one place and not two.
 *
 * BOUNTY stays a section: it is a rule a SITE opens, not a mark on the board,
 * so it has no row in an alphabet.
 */
const SECTIONS: Readonly<Record<TabId, readonly LessonId[]>> = {
  start: ['ripe', 'pop', 'sacrifice', 'sizeBonus', 'worth'],
  play: ['pocket', 'bounty'],
  hand: ['rare', 'rareUnique', 'stash', 'luck', 'relic'],
};

/**
 * THE MANUAL GROWS WITH THE WORLD (2026-09-02).
 *
 * Ashwake 1's rule, from `ideas/teaching.md`, and it had not travelled: a
 * section about a concept this device has not MET stays out, and each
 * first-contact card carries the words the manual will grow, so the two can
 * never disagree. This body printed all thirteen lessons to everyone — so a
 * stranger opening HOW TO PLAY in their first minute read about relics, the
 * stash, magic, unique and the luck purse before meeting any of them, which is
 * the exact wall the teaching drip exists to take down.
 *
 * A `LessonId` is a superset of `TeachId`: six of them are words the manual
 * prints without ever firing a card. Those are ungated, because there is no
 * ledger entry that could gate them and hiding one would mean hiding a term
 * another lesson uses.
 *
 * **A device with no ledger shows everything.** That is the gallery, a bare
 * test, and the audit's own shots, and it is the same degradation the drip
 * itself keeps: `met === null` means "nothing is known about what is known",
 * which is not the same as "nothing has been met".
 */
function metHere(id: LessonId, met: ReadonlySet<TeachId> | null): boolean {
  if (met === null) return true;
  // The six that no card ever fires for — see above.
  if (!(TEACH_IDS as readonly string[]).includes(id)) return true;
  return met.has(id as TeachId);
}

/**
 * The lessons of one tab, each with the figure it should actually draw.
 *
 * A figure is claimed by the FIRST lesson on the tab that carries it; every
 * lesson after gets `null` and reads under the picture already there.
 */
function drawnOnce(
  ids: readonly LessonId[],
  met: ReadonlySet<TeachId> | null,
): readonly { id: LessonId; lesson: Lesson; figure: FigureId | null }[] {
  const drawn = new Set<FigureId>();
  const out: { id: LessonId; lesson: Lesson; figure: FigureId | null }[] = [];
  for (const id of ids) {
    if (!metHere(id, met)) continue;
    const lesson = LESSONS.find((l) => l.id === id);
    if (lesson === undefined) continue;
    const figure = lesson.figure !== undefined && !drawn.has(lesson.figure) ? lesson.figure : null;
    if (figure !== null) drawn.add(figure);
    out.push({ id, lesson, figure });
  }
  return out;
}

/** Whether a tab still has sections a player has not unlocked — the quiet
 *  promise that HOW TO PLAY is not all there is yet. */
const grows = (ids: readonly LessonId[], met: ReadonlySet<TeachId> | null): boolean =>
  met !== null && ids.some((id) => !metHere(id, met));

export type ManualProps = {
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
   * What this device has been taught, so the manual can grow with it.
   *
   * `undefined` means no ledger is available and every section prints — the
   * gallery, a bare test, the audit's shots. See `metHere`.
   */
  readonly met?: readonly TeachId[];
  readonly onBack: () => void;
  /** The MENU tab's contents — settings, restart, the door home. Host-supplied
   *  because they are the SHELL's business, not the manual's. */
  readonly menu?: React.ReactNode;
};

export function Manual({ theme, s, keyboard, mode, met, onBack, menu }: ManualProps) {
  const known = met === undefined ? null : new Set(met);
  const tabs = (menu === undefined ? TABS : (['menu', ...TABS] as const)) as readonly (
    TabId | 'menu'
  )[];
  const [on, setOn] = useState<TabId | 'menu'>(tabs[0]!);

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
          growsNote={s.ui.tabGrows}
          label={s.ui.howToPlay}
          tabs={tabs.map((id) => ({
            id,
            label: s.ui.tabs[id],
            // A tab with sections still to unlock says so — see `Tab.grows`.
            grows: id !== 'menu' && grows(SECTIONS[id], known),
          }))}
          on={on}
          onPick={setOn}
        />
      }
    >
      {/*
        The legend opens the PLAY tab: every mark the board can show, before
        any of the rules that use them. A player who has met a glyph on a hex
        had no way to learn it but to tap that hex, which needed them to have
        walked there first.
      */}
      {on === 'play' && <Legend theme={theme} s={s} />}

      {/*
        What an expedition IS, before any rule (2026-08-29).

        Marc: *"instead of START call it EXPEDITION or similar and then explain
        its normal to die or have some kind of backstory"*. The manual opened
        on RIPE — a mechanic — and never said what the player was doing or that
        running out of tiles is how a run ENDS rather than how it is failed.
        A roguelite that does not say so reads as a game you keep losing.

        Not a lesson: it teaches no term, carries no figure and is not
        something the teaching ledger should remember having said once.
      */}
      {on === 'start' && (
        <section className="lesson">
          <h2 className="panel-title marked">
            <span>{s.ui.expedition.title}</span>
          </h2>
          {s.ui.expedition.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>
      )}

      {/*
        WHICH GAME — see `mode` (2026-09-02).

        The line that says which of the three you are in is always visible; the
        three definitions fold, because they are a reference rather than a
        lesson and only one of them is about the run in front of you.
      */}
      {on === 'start' && mode !== undefined && (
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
          <Fold summary={s.ui.details}>
            <p>{s.ui.which.world}</p>
            <p>{s.ui.which.shared}</p>
            <p>{s.ui.which.daily}</p>
            <p>{s.ui.which.howToShare}</p>
          </Fold>
        </section>
      )}

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

      {on === 'menu'
        ? menu
        : /*
             One picture per tab, however many lessons share it (2026-08-30).

             MAGIC and UNIQUE carry the same figure BY DESIGN — `lessons.ts`
             gives them the same shared sentence for the same reason — and its
             caption says "magic, then unique", so it is one picture about a
             pair. The HAND tab drew it twice, identical, a paragraph apart.

             The first lesson to want a figure gets it; the ones after read the
             text with the picture already above them. Tracked here rather than
             in the registry because it is a fact about a PAGE, not about a
             lesson: a teaching card shows the same figure and should.
           */
          drawnOnce(SECTIONS[on], known).map(({ id, lesson, figure }) => (
            <Section key={id} lesson={lesson} figure={figure} theme={theme} s={s} />
          ))}
    </Panel>
  );
}

/**
 * One lesson, printed whole.
 *
 * **Nothing in the manual is tappable** (Marc, 2026-08-29: "make sure cache,
 * site, shrine, etc. are not clickable ... they should get the explanation
 * directly readable"). Elsewhere a term IS a button that opens a card saying
 * what it means, and that is right where the word appears alone — in a toast,
 * on the end screen, inside another lesson's card. Here it is not: the manual
 * is the place those cards quote, so tapping CACHE opened a card repeating the
 * section two inches below it, and every noun in a paragraph looked like a
 * control.
 *
 * `Prose` already draws a term as plain inked text when no handler is given,
 * so this is a prop NOT PASSED rather than a second rendering path. The words
 * keep their colour — a term still looks like the game's own vocabulary — and
 * simply stop pretending to be buttons.
 */
function Section({
  lesson,
  figure,
  theme,
  s,
}: {
  readonly lesson: Lesson;
  /** The figure to draw under this section, or null where a section above it
   *  on this tab has already drawn the same one. */
  readonly figure: FigureId | null;
  readonly theme: Theme;
  readonly s: Strings;
}) {
  const lines = lessonLines(lesson, TUNING, theme, s);
  const detail = lessonDetail(lesson, TUNING, theme, s);
  // A dial turned to zero removes its own sentences, so a section can be empty
  // — and an empty heading is worse than an absent one.
  if (lines.length === 0) return null;

  return (
    <section className="lesson">
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
      <ProseLines text={lines.join('\n')} s={s} />
      {figure !== null && <Figure id={figure} theme={theme} s={s} caption />}
      {detail.length > 0 && (
        <Fold summary={s.ui.details}>
          <ProseLines text={detail.join('\n')} s={s} />
        </Fold>
      )}
    </section>
  );
}
