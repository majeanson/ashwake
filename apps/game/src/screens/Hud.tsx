import { useState } from 'react';
import { TUNING } from '@content/tuning';
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
    <div className="hud" data-hud="stats">
      {STATS.map((id) => {
        const shown = valueOf(id, hud);
        if (shown === null) return null;
        return (
          <button
            key={id}
            type="button"
            className="stat"
            data-stat={id}
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
 * Short labels rather than sentences — `♦` for the purse and `↗` for reach are
 * Ashwake 1's, and the two words that ARE words follow the locale. Anything
 * longer than this belongs in the catalogue, and `statNote` is where it is.
 */
export function statLabel(id: StatId, s: Strings): string {
  switch (id) {
    case 'tiles':
      return s.locale === 'fr-CA' ? 'TUILES' : 'TILES';
    case 'points':
      return 'PTS';
    case 'luck':
      return '♦';
    case 'map':
      return '↗';
    case 'cost':
      return '$';
    case 'left':
      return s.locale === 'fr-CA' ? 'RESTE' : 'LEFT';
  }
}
