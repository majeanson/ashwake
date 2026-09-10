import { useState } from 'react';
import { TUNING } from '@content/tuning';
import { STAT_ICON } from '@theme/icons';
import { Icon } from '../ui/Icon';
import { statNote, type HudView } from '@view/view';
import type { Strings } from '@text/Strings';

/**
 * The stat row (Stage 3, 2026-08-29).
 *
 * Every number the run is made of, and every one of them TAPPABLE: Ashwake 1's
 * ruling is that a number a player cannot ask about is a number they have to
 * guess at, and `statNote` in the core already writes the answer. The row holds
 * facts; the sentence explaining one is the catalogue's.
 *
 * Deliberately **not** an `aria-live` region. It is rebuilt on every action, so
 * announcing it would read six numbers aloud after every single placement. The
 * toast and the guide line are the live regions; this is a display.
 */

type HudProps = {
  readonly hud: HudView;
  readonly s: Strings;
  readonly onNote: (text: string) => void;
};

/** The ids `statNote` answers to, in the order Ashwake 1 laid them out. */
const STATS = ['tiles', 'points', 'luck', 'map', 'cost', 'left'] as const;

type StatId = (typeof STATS)[number];

export function Hud({ hud, s, onNote }: HudProps) {
  const [rose, setRose] = useState<StatId | null>(null);

  return (
    <div
      className="hud"
      /* Below the 44px floor on purpose — see `.stat` in ui.css. A stat is an
         explanation, never an action, and the row would eat a third of the
         screen at tap size. Stated here so the audit counts it as decided. */
      data-audit-compact=""
      data-hud="stats"
    >
      {STATS.map((id) => {
        const shown = valueOf(id, hud);
        if (shown === null) return null;
        return (
          <button
            key={id}
            type="button"
            className="stat"
            data-stat={id}
            /*
             * The 44px exemption is declared on the ROW, not here.
             *
             * `data-audit-compact` on `.hud` above is the convention this
             * repo already had, and `e2e/targets.spec.ts` reads the same
             * attribute — a second marker meaning the same thing is how two
             * checks come to disagree about which controls are allowed to be
             * small. A stat explains rather than acts: `statNote` costs a
             * sentence on a mis-tap, and holding the row to tap size would
             * spend a third of the screen on six things nobody presses.
             */
            onClick={() => {
              onNote(statNote(id, hud, TUNING, s));
              setRose(id);
            }}
          >
            <span className="stat-label">
              {/*
                ALL SIX ARE MARKS since 2026-09-08 (Marc's answer), and the
                TABLE decides which — this line read `id === 'luck' ? <Icon
                name="luck"/>` while `STAT_ICON`, the table written to answer
                exactly that question, sat exported and read by nothing.

                `statLabel` is still here and still per-locale: it is the
                button's accessible NAME, so a screen reader reads TUILES where
                an eye sees a hexagon. A mark is the label's shorthand, not its
                replacement — and the tap still prints the stat's own sentence.
                See `STAT_ICON` in `theme/icons.ts` for why the row stopped
                being words at all.
              */}
              <Icon name={STAT_ICON[id]} title={statLabel(id, s)} />
            </span>{' '}
            <b className={`stat-value${rose === id ? ' rose' : ''}`}>{shown}</b>
          </button>
        );
      })}
    </div>
  );
}

function valueOf(id: StatId, hud: HudView): number | null {
  switch (id) {
    case 'tiles':
      return hud.tiles;
    case 'points':
      // Where the economy hides score mid-run, the slot goes to the purse.
      return hud.showPoints ? hud.points : null;
    case 'luck':
      return hud.showPoints && hud.luck === 0 ? null : hud.luck;
    case 'map':
      return hud.depthValue;
    case 'cost':
      return hud.cost;
    case 'left':
      // Null where there is no clock, which is the shipped economy.
      return hud.left;
  }
}

/**
 * A stat's NAME — which since 2026-09-08 is what a screen reader hears and
 * what a sighted player never sees.
 *
 * The row draws marks now (`STAT_ICON`), so this is the `title` on each icon
 * and the button's accessible name, and it is still per-locale for exactly
 * that reason: the mark is a shorthand for the word, and the word is what a
 * reader is owed.
 *
 * **The history is worth keeping, because this row has changed its mind
 * twice.** REACH and COST were `↗` and `$` until 2026-08-30, when they became
 * words again on the rule that marks are for cross-screen CONCEPTS and stats
 * stay words. That rule held until the French pass measured what it cost:
 * `TUILES` and `PORTÉE` clipping on an ordinary phone in the default locale,
 * with no fix available to a word that was not a way of losing gracefully.
 * The marks are back, chosen from the vendored Phosphor set rather than
 * invented as characters — which is the part of 2026-08-30's argument that
 * was right and is why `↗` and `$` are not what came back.
 *
 * **LUCK is the registry's mark, not a lookalike** (2026-08-29, Marc: "reuse
 * symbols, cards, etc."). Luck is one of the two currencies that follow a
 * player between the board, the shop and the end screen, so it is one of the
 * seven ideas the concept registry names — and this row drew `♦` instead, a
 * second symbol for the thing the registry already had. It is why its NAME
 * still comes from the lesson below rather than from `s.ui.stats`.
 */
/*
 * **The words come from the CATALOGUE** (2026-09-02).
 *
 * Four of these were `s.locale === 'fr-CA' ? 'TUILES' : 'TILES'`, written out
 * here — and grepping for that shape found it nowhere else in the app, so this
 * function was the single place a screen decided what a word is in a language.
 * D4 exists so that a missing sentence is a type error rather than a branch
 * nobody wrote; a ternary is exactly the branch nobody wrote. See `s.ui.stats`.
 *
 * LUCK stays different, and stays here: it is one of the concept registry's
 * seven ideas, so the row asks the LESSON for its name rather than inventing a
 * fifth word for a thing the board, the purse and the shop already agree on.
 */
export function statLabel(id: StatId, s: Strings): string {
  // Drawn as the icon; this is its accessible name and its fallback.
  return id === 'luck' ? s.lesson.luck.name : s.ui.stats[id];
}
