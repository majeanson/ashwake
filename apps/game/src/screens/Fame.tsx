import { useMemo, useState } from 'react';
import { ordinal } from '@text/index';
import type { Strings } from '@text/Strings';
import { dailiesOf, runsOf, streamOf, type TimelineEntry } from '@meta/timeline';
import type { RecordBook } from '@meta/records';
import { ONLY_WORLD } from '@meta/records';
import { perkText } from '@meta/progress';
import type { WorldMemory } from '@meta/world';
import { FactGrid } from '../ui/FactGrid';
import { Fold } from '../ui/Fold';
import { Icon } from '../ui/Icon';
import { Panel } from '../ui/Panel';
import { panelOf, tabOf, Tabs } from '../ui/Tabs';
import { SLOTS, type Slot } from '../shell/storage';

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
  /**
   * The three worlds, for the TOTALS tab (2026-09-02).
   *
   * A hall of fame that reports only device-wide sums answers "how much" and
   * never "where", and the perk shelf in particular is per-world — so the only
   * place a player could see a perk they found on world 2 was by standing in
   * world 2. See the TOTALS block below.
   */
  readonly worlds: Readonly<Record<Slot, WorldMemory | null>>;
};

export function Fame({ timeline, records, s, onBack, worlds }: FameProps) {
  const [on, setOn] = useState<TabId>('diary');
  // `null` slot: every world. The diary is the DEVICE's story, and the
  // per-world filter chips arrive with the crossing that makes them mean
  // something.
  const stream = useMemo(() => [...streamOf(timeline, null)].reverse(), [timeline]);
  const dailies = useMemo(() => [...dailiesOf(timeline)].reverse(), [timeline]);
  const runs = useMemo(() => runsOf(timeline, null), [timeline]);
  const book = records[ONLY_WORLD];
  /* Every perk this device holds, and which world it was found in. Flattened
     from the three worlds because a perk belongs to the world that found it —
     `Progress.found` is a per-world composite, so the device has no single
     shelf to read and this is the only place all three can be seen at once. */
  const found = useMemo(
    () =>
      SLOTS.flatMap((slot) =>
        (worlds[slot]?.perks ?? []).map((perk) => ({
          slot,
          perk,
          worn: worlds[slot]?.worn === perk,
        })),
      ),
    [worlds],
  );

  return (
    <Panel
      id="fame"
      title={s.ui.fame.title}
      back={s.ui.back}
      closeAll={s.ui.closeAll}
      onBack={onBack}
      tabbed={{ panelId: panelOf('fame', on), labelledBy: tabOf('fame', on) }}
      head={
        <Tabs
          base="fame"
          growsNote={s.ui.tabGrows}
          label={s.ui.fame.title}
          tabs={[
            { id: 'diary', label: s.ui.fame.diary },
            { id: 'daily', label: s.ui.daily },
            { id: 'totals', label: s.ui.fame.totals },
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
        <>
          <FactGrid
            facts={[
              { label: s.ui.newRun, value: runs.length },
              { label: s.ui.stats.points, value: book?.bestPoints ?? 0 },
              { label: s.ui.pop, value: (book?.tilesHarvests ?? 0) + (book?.pointsHarvests ?? 0) },
              { label: s.ui.daily, value: dailies.length },
            ]}
          />

          {/*
            THE THREE WORLDS, AND WHAT HAS BEEN FOUND IN THEM (2026-09-02).

            This tab was four device-wide numbers, which is the hall of fame
            answering "how much" and never "where". Ashwake 1 listed the worlds
            and the perks here for the reason the diary rows exist at all: a
            list of scores is not a memory. A perk found on world 2 three weeks
            ago is a thing that happened somewhere, and the shelf in the shop
            only ever shows the world you are standing in.

            Untouched worlds say so rather than being hidden: three slots is the
            shape of the game, and a list that showed two would be describing a
            different one.
          */}
          <section>
            <h2 className="fact-label">{s.ui.worlds}</h2>
            <ul className="survey">
              {SLOTS.map((slot) => {
                const world = worlds[slot];
                return (
                  <li key={slot}>
                    <Icon name={world === null ? 'notYet' : 'met'} />
                    <span>{s.ui.worldN(slot)}</span>
                    <b>
                      {world === null
                        ? s.ui.emptyWorld
                        : `${world.runs} · ${world.bestPoints} · ${world.farthestReach}`}
                    </b>
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <h2 className="fact-label">{s.ui.perksFound}</h2>
            {found.length === 0 ? (
              <p className="note">{s.ui.noPerksYet}</p>
            ) : (
              <ul className="survey">
                {found.map(({ slot, perk, worn }) => (
                  <li key={`${slot}-${perk}`} className={worn ? 'met' : undefined}>
                    <Icon name="fame" />
                    <span>{perkText(perk, s).name}</span>
                    <b>{worn ? `${s.ui.worldN(slot)} · ${s.ui.worn}` : s.ui.worldN(slot)}</b>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
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
  /*
   * BOTH DATES IN THE SAME ROW, IN THE SAME FORM (2026-09-02).
   *
   * A daily row printed `entry.date` — the raw `2026-09-02` a daily is keyed
   * by — directly beside `when`, which is the same kind of fact rendered
   * through `toLocaleDateString`. Two date formats in one line, one of them a
   * database key.
   *
   * `entry.date` is midnight UTC of that day; read back through the browser's
   * own parser it can land on the day before in a western timezone, so the
   * parts are handed to `Date` explicitly rather than parsed from the string.
   */
  const dayOf = (iso: string): string => {
    const [y, m, d] = iso.split('-').map(Number);
    if (y === undefined || m === undefined || d === undefined) return iso;
    return new Date(y, m - 1, d).toLocaleDateString(s.locale);
  };
  /*
   * AND A DAILY SAYS ITS DATE ONCE (2026-09-03).
   *
   * Localising `entry.date` above was right and it exposed a redundancy the
   * two formats had been hiding: a daily row was `DAILY · <date> · <try>` and
   * then `· <when>`, and a daily can only be played on its own day — so those
   * are the same date, and printing it as `2026-09-02` beside `2 sept. 2026`
   * was the only thing making them look like two facts.
   *
   * A daily's date IS its identity, so the title keeps it and the row drops the
   * timestamp. An ordinary run has no date of its own and keeps `when`, which
   * is the only thing placing it in a device's history at all.
   */
  /*
   * AND A SHARED BOARD SAYS WHOSE IT WAS (2026-09-09, Marc's ruling on
   * `NEXT.md` §1).
   *
   * A shared run left no trace at all until today. Its row leads with the SEED
   * because that is a shared board's only identity — it belongs to no world of
   * yours — the same way a daily's row leads with its date. The score, the arc
   * and the timestamp follow in the shape every other row uses, so the diary
   * reads as one list rather than three.
   */
  const summary =
    entry.kind === 'daily'
      ? `${s.ui.daily} · ${dayOf(entry.date)} · ${ordinal(entry.try, s.locale)}`
      : entry.kind === 'shared'
        ? `${s.ui.fame.shared(entry.seed)} · ${entry.score} · ${entry.arc} · ${when}`
        : `${entry.score} · ${entry.arc} · ${when}`;

  return (
    <Fold summary={summary}>
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
              { label: s.ui.stats.points, value: entry.score },
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
