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

const TABS = ['start', 'play', 'hand', 'after'] as const;
type TabId = (typeof TABS)[number];

/** Which lessons belong under which tab, in reading order. */
const SECTIONS: Readonly<Record<TabId, readonly LessonId[]>> = {
  start: ['ripe', 'pop', 'worth'],
  play: ['pocket', 'stone', 'cache', 'site', 'shrine', 'territory'],
  hand: ['rare', 'rareUnique', 'stash', 'luck'],
  after: ['relic', 'bounty', 'sizeBonus'],
};

export type ManualProps = {
  readonly theme: Theme;
  readonly s: Strings;
  readonly onBack: () => void;
  readonly onTerm: (id: LessonId) => void;
  /** The MENU tab's contents — settings, restart, the door home. Host-supplied
   *  because they are the SHELL's business, not the manual's. */
  readonly menu?: React.ReactNode;
};

export function Manual({ theme, s, onBack, onTerm, menu }: ManualProps) {
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
      {on === 'play' && <Legend theme={theme} s={s} onTerm={onTerm} />}

      {on === 'menu'
        ? menu
        : SECTIONS[on].map((id) => {
            const lesson = LESSONS.find((l) => l.id === id);
            return lesson === undefined ? null : (
              <Section key={id} lesson={lesson} theme={theme} s={s} onTerm={onTerm} />
            );
          })}
    </Panel>
  );
}

function Section({
  lesson,
  theme,
  s,
  onTerm,
}: {
  readonly lesson: Lesson;
  readonly theme: Theme;
  readonly s: Strings;
  readonly onTerm: (id: LessonId) => void;
}) {
  const lines = lessonLines(lesson, TUNING, theme, s);
  const detail = lessonDetail(lesson, TUNING, theme, s);
  // A dial turned to zero removes its own sentences, so a section can be empty
  // — and an empty heading is worse than an absent one.
  if (lines.length === 0) return null;

  return (
    <section>
      <h2 className="panel-title">{lessonName(lesson, s)}</h2>
      <ProseLines text={lines.join('\n')} s={s} onTerm={onTerm} />
      {lesson.figure !== undefined && <Figure id={lesson.figure} theme={theme} s={s} caption />}
      {detail.length > 0 && (
        <Fold summary={s.ui.details}>
          <ProseLines text={detail.join('\n')} s={s} onTerm={onTerm} />
        </Fold>
      )}
    </section>
  );
}
