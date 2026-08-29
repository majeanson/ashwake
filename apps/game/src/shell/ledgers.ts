import { useEffect, useState } from 'react';
import type { RecordBook } from '@meta/records';
import type { Timeline } from '@meta/timeline';
import type { WorldMemory } from '@meta/world';
import { readRecords, readTimeline, readWorld, SLOTS, type Slot } from './storage';

/**
 * What this device has done, read when it can have changed (Stage 4,
 * 2026-08-29).
 *
 * The shelf of bests, the diary and the three worlds are what the shop, the
 * hall of fame and the worlds panel show. They change at exactly two moments —
 * a run is banked, or a backup is restored — and never while a run is played,
 * so holding them in state and mutating them alongside the run would be a
 * second copy of the truth for no gain.
 *
 * Instead: re-read on a stamp the caller controls. A panel that opens is a
 * panel that has just asked, which is both the cheapest thing to do and the
 * only version that cannot go stale — the disk is the record, and this is a
 * look at it rather than a mirror of it.
 */

export type Ledgers = {
  readonly records: RecordBook;
  readonly timeline: Timeline;
  readonly worlds: Readonly<Record<Slot, WorldMemory | null>>;
};

export function readLedgers(): Ledgers {
  return {
    records: readRecords(),
    timeline: readTimeline(),
    worlds: Object.fromEntries(SLOTS.map((slot) => [slot, readWorld(slot)])) as Record<
      Slot,
      WorldMemory | null
    >,
  };
}

/**
 * `at` is any value that changes when the disk might have. The hook does not
 * care what it is — a door's open flag, a run's ending, a restore's counter —
 * only that it is different afterwards.
 */
export function useLedgers(at: unknown): Ledgers {
  const [ledgers, setLedgers] = useState<Ledgers>(readLedgers);
  useEffect(() => {
    setLedgers(readLedgers());
  }, [at]);
  return ledgers;
}
