import { useState } from 'react';
import { TUNING } from '@content/tuning';
import { CONCEPT_MARK } from '@theme/tokens';
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
            <span className="stat-label">{statLabel(id, s)}</span>{' '}
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
 * symbols, cards, etc."). `CONCEPT_MARK.luck` is `✤` and exists precisely
 * because luck is one of the two currencies that follow a player between the
 * board, the shop and the end screen — and this row was drawing `♦` instead,
 * a second symbol for the thing the registry already names. The purse drawer,
 * the shop and the end screen all speak `✤`.
 *
 * "The stat row was the one place that did not" is what this comment said,
 * and it was wrong: the ACTION BAR's purse toggle was drawing `♦` too, and it
 * is the more-seen of the two. Fixed 2026-08-30. A claim about being the last
 * one is a claim worth grepping before writing down.
 *
 * `↗` for reach and `$` for cost stay as they are: `tokens.ts` rules that
 * marks are for cross-screen CONCEPTS and that stats stay words, so neither
 * has a registry entry to reuse and neither should gain one for this row's
 * sake alone.
 */
export function statLabel(id: StatId, s: Strings): string {
  switch (id) {
    case 'tiles':
      return s.locale === 'fr-CA' ? 'TUILES' : 'TILES';
    case 'points':
      return 'PTS';
    case 'luck':
      return CONCEPT_MARK.luck;
    case 'map':
      return '↗';
    case 'cost':
      return '$';
    case 'left':
      return s.locale === 'fr-CA' ? 'RESTE' : 'LEFT';
  }
}
