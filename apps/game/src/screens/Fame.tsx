import { useMemo, useState } from 'react';
import { ordinal } from '@text/index';
import type { Strings } from '@text/Strings';
import { dailiesOf, runsOf, streamOf, type TimelineEntry } from '@meta/timeline';
import type { RecordBook } from '@meta/records';
import { ONLY_WORLD } from '@meta/records';
import { FactGrid } from '../ui/FactGrid';
import { Fold } from '../ui/Fold';
import { Panel } from '../ui/Panel';
import { Tabs } from '../ui/Tabs';

/**
 * THE HALL OF FAME (Stage 4, 2026-08-29).
 *
 * What this device has done, in three views of one store: the DIARY newest
 * first, the DAILY's own ladder, and the TOTALS that were the whole thing
 * before a diary existed.
 *
 * **A row opens.** Ashwake 1's finding was that a list of scores is a list of
 * numbers, and a list of numbers is not a memory — what makes a run come back
 * is its epitaph, its shape, and the board as it stood when it ended. So every
 * row is a disclosure, and rows written before a device kept detail simply
 * open with less rather than not opening at all.
 *
 * Hidden entirely on a device with no history: an empty hall of fame teaches
 * nothing and reads as something broken.
 */

type TabId = 'diary' | 'daily' | 'totals';

export type FameProps = {
  readonly timeline: readonly TimelineEntry[];
  readonly records: RecordBook;
  readonly s: Strings;
  readonly onBack: () => void;
};

export function Fame({ timeline, records, s, onBack }: FameProps) {
  const [on, setOn] = useState<TabId>('diary');
  // `null` slot: every world. The diary is the DEVICE's story, and the
  // per-world filter chips arrive with the crossing that makes them mean
  // something.
  const stream = useMemo(() => [...streamOf(timeline, null)].reverse(), [timeline]);
  const dailies = useMemo(() => [...dailiesOf(timeline)].reverse(), [timeline]);
  const runs = useMemo(() => runsOf(timeline, null), [timeline]);
  const book = records[ONLY_WORLD];

  return (
    <Panel
      id="fame"
      title={s.ui.tabs.after}
      back={s.ui.back}
      closeAll={s.ui.closeAll}
      onBack={onBack}
      head={
        <Tabs
          label={s.ui.tabs.after}
          tabs={[
            { id: 'diary', label: s.ui.tabs.after },
            { id: 'daily', label: s.ui.daily },
            { id: 'totals', label: s.ui.tabs.hand },
          ]}
          on={on}
          onPick={setOn}
        />
      }
    >
      {on === 'diary' &&
        (stream.length === 0 ? (
          <p className="note">{s.view.arc.early}</p>
        ) : (
          stream.map((entry, i) => <Row key={`${entry.at}-${i}`} entry={entry} s={s} />)
        ))}

      {on === 'daily' &&
        (dailies.length === 0 ? (
          <p className="note">{s.view.arc.early}</p>
        ) : (
          dailies.map((entry, i) => <Row key={`${entry.at}-${i}`} entry={entry} s={s} />)
        ))}

      {on === 'totals' && (
        <FactGrid
          facts={[
            { label: s.ui.newRun, value: runs.length },
            { label: 'PTS', value: book?.bestPoints ?? 0 },
            { label: s.ui.pop, value: (book?.tilesHarvests ?? 0) + (book?.pointsHarvests ?? 0) },
            { label: s.ui.daily, value: dailies.length },
          ]}
        />
      )}
    </Panel>
  );
}

/**
 * One night, folded.
 *
 * The summary line is what a list needs — a score and the shape of the run —
 * and everything that makes it a memory rather than a number is inside.
 */
function Row({ entry, s }: { readonly entry: TimelineEntry; readonly s: Strings }) {
  if (entry.kind === 'world') {
    return <p className="note">{entry.event}</p>;
  }

  const when = new Date(entry.at).toLocaleDateString(s.locale);
  const title =
    entry.kind === 'daily'
      ? `${s.ui.daily} · ${entry.date} · ${ordinal(entry.try, s.locale)}`
      : `${entry.score} · ${entry.arc}`;

  return (
    <Fold summary={`${title} · ${when}`}>
      {entry.detail !== undefined && (
        <>
          {entry.detail.epitaph !== '' && <p className="note">{entry.detail.epitaph}</p>}
          {/* The board as it stood when it ended. Only the last twenty runs
              keep one — a diary that grows forever is a game that one day
              cannot save at all. */}
          {entry.detail.shot !== undefined && (
            <img src={entry.detail.shot} alt="" className="fame-shot" />
          )}
          <FactGrid
            facts={[
              { label: 'PTS', value: entry.score },
              { label: s.ui.atlasFarthest, value: entry.reach },
              { label: s.ui.pop, value: entry.detail.harvests },
              { label: s.lesson.relic.name, icon: 'relic', value: entry.detail.relics },
            ]}
          />
        </>
      )}
    </Fold>
  );
}
