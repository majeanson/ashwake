import { useState } from 'react';
import { TUNING } from '@content/tuning';
import type { IconName } from '@theme/icons';
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

export type HudProps = {
  readonly hud: HudView;
  readonly s: Strings;
  readonly onNote: (text: string) => void;
};

/** The ids `statNote` answers to, in the order Ashwake 1 laid them out. */
const STATS = ['tiles', 'points', 'luck', 'map', 'cost', 'left'] as const;

export type StatId = (typeof STATS)[number];

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
                The TABLE decides which stats are marks, not this line
                (2026-09-08). It read `id === 'luck' ? <Icon name="luck"/>`,
                with `STAT_ICON` — the table written to answer exactly that
                question — declared below and read by nothing: this body's
                signature miss, one export wide. The render is identical; what
                changes is that a direction wanting a second mark now has one
                place to say so, the way `LANDMARK_GLYPH` is the authority on
                what a destination MEANS rather than each drawing site being.
              */}
              {STAT_ICON[id] === undefined ? (
                statLabel(id, s)
              ) : (
                <Icon name={STAT_ICON[id]} title={statLabel(id, s)} />
              )}
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
 * The marks on the row.
 *
 * Short labels rather than sentences, and the two words that ARE words follow
 * the locale. Anything longer belongs in the catalogue, and `statNote` is
 * where it is.
 *
 * **LUCK is the registry's mark, not a lookalike** (2026-08-29, Marc: "reuse
 * symbols, cards, etc."). Luck is one of the two currencies that follow a
 * player between the board, the shop and the end screen, so it is one of the
 * seven ideas the concept registry names — and this row drew `♦` instead, a
 * second symbol for the thing the registry already had. The ACTION BAR's purse
 * toggle drew `♦` too, for a day longer.
 *
 * **REACH and COST are WORDS again** (2026-08-30). They were `↗` and `$`,
 * which `theme/tokens.ts` had already ruled against in as many words: marks
 * are for cross-screen CONCEPTS and stats stay words. Neither has a registry
 * entry, neither should gain one for this row's sake, and neither is an icon —
 * so once the symbol language became Phosphor (Marc: "no emojis only phosphor
 * icons or assets") they were the two characters left standing on the busiest
 * row in the game. The row is a grid now and a word fits.
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

/**
 * The stats that are drawn as a mark rather than as a word.
 *
 * **This table shipped inert from the day it was written until 2026-09-08** —
 * declared, exported, and read by nothing, while the render hard-coded `id ===
 * 'luck'`. It has a consumer now, and it renders exactly what it rendered
 * before, because it says exactly what that branch said.
 *
 * ## A SECOND ENTRY IS MARC'S, AND HERE IS THE EVIDENCE FOR IT
 *
 * `DEFAULT_LOCALE` is `fr-CA`, so the French stat row is the row a player sees
 * unless they change it — and it is the one that does not fit. Every one of
 * the fifteen `clipped` findings in `audit-shots/report.md` is this element in
 * French: `TUILES` losing 20px and `PORTÉE` 18px at 320, and 3–6px at **390,
 * which is an ordinary phone**. English never clips at either width.
 *
 * That is a known, ARGUED state and not an oversight: `IMPROVEMENTS.md` B7.11
 * ruled the ellipsis in deliberately, on the reasoning that a measured 3px
 * behind a `…` beats an unmeasured word running into its neighbour, and
 * `.stat-label` in `ui.css` carries the rest of the argument — the label is
 * the half that gives so the number survives, and it is pinned in px so a
 * bigger root cannot spend the one budget already spent.
 *
 * The ellipsis is what you do when the word must be a word. **A mark is the
 * other lever, and it is the one that dissolves the problem rather than
 * dressing it**: `luck` has not clipped in any language at any width, because
 * it is not a word. Five entries here would end the finding outright.
 *
 * It is not taken, and the reason is `CLAUDE.md`'s: a mark instead of a word
 * is a LOOK decision — six glyphs where six labels are is a different HUD, and
 * a stat is the one control on the board that explains rather than acts, so
 * making it wordless costs the thing it is for. The ring repaint of
 * 2026-09-02 is why this is stated rather than guessed at. **The finding is
 * the deliverable; the choice is Marc's, and it is one look at a phone in
 * French.** See `NEXT.md` §5d.
 */
export const STAT_ICON: Partial<Record<StatId, IconName>> = { luck: 'luck' };
