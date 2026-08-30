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
import type { Strings } from '@text/Strings';
import { Fold } from '../ui/Fold';
import { Figure } from '../ui/Figure';
import { Legend } from './Legend';
import { Panel } from '../ui/Panel';
import { ProseLines } from '../ui/Prose';
import { Tabs } from '../ui/Tabs';

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
  start: ['ripe', 'pop', 'sizeBonus', 'worth'],
  play: ['pocket', 'bounty'],
  hand: ['rare', 'rareUnique', 'stash', 'luck', 'relic'],
};

export type ManualProps = {
  readonly theme: Theme;
  readonly s: Strings;
  /** Whether this device has a real pointer, and so probably a keyboard. The
   *  keys work everywhere; this only decides whether to spend a screen of a
   *  phone's manual listing keys nobody there has. */
  readonly keyboard?: boolean;
  readonly onBack: () => void;
  /** The MENU tab's contents — settings, restart, the door home. Host-supplied
   *  because they are the SHELL's business, not the manual's. */
  readonly menu?: React.ReactNode;
};

export function Manual({ theme, s, keyboard, onBack, menu }: ManualProps) {
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
      head={
        <Tabs
          label={s.ui.howToPlay}
          tabs={tabs.map((id) => ({ id, label: s.ui.tabs[id] }))}
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
        <section>
          <h2 className="panel-title">{s.ui.expedition.title}</h2>
          {s.ui.expedition.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
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
        <section>
          <h2 className="panel-title">{s.ui.board.keys.title}</h2>
          <ul className="keys">
            {KEY_LINES.map((id) => (
              <li key={id}>{s.ui.board.keys[id]}</li>
            ))}
          </ul>
        </section>
      )}

      {on === 'menu'
        ? menu
        : SECTIONS[on].map((id) => {
            const lesson = LESSONS.find((l) => l.id === id);
            return lesson === undefined ? null : (
              <Section key={id} lesson={lesson} theme={theme} s={s} />
            );
          })}
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
  theme,
  s,
}: {
  readonly lesson: Lesson;
  readonly theme: Theme;
  readonly s: Strings;
}) {
  const lines = lessonLines(lesson, TUNING, theme, s);
  const detail = lessonDetail(lesson, TUNING, theme, s);
  // A dial turned to zero removes its own sentences, so a section can be empty
  // — and an empty heading is worse than an absent one.
  if (lines.length === 0) return null;

  return (
    <section>
      {/* The heading wears the lesson's own mark, where it has one: a rule
          about a thing you can SEE on the board should be findable by that
          thing. The glyph comes from the lesson, which reads it from a
          registry — nothing here picks a character. */}
      <h2 className="panel-title">
        {lesson.glyph !== undefined && (
          <span className="card-glyph" aria-hidden="true">
            {lesson.glyph}{' '}
          </span>
        )}
        {lessonName(lesson, s)}
      </h2>
      <ProseLines text={lines.join('\n')} s={s} />
      {lesson.figure !== undefined && <Figure id={lesson.figure} theme={theme} s={s} caption />}
      {detail.length > 0 && (
        <Fold summary={s.ui.details}>
          <ProseLines text={detail.join('\n')} s={s} />
        </Fold>
      )}
    </section>
  );
}
