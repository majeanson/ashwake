import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { RecordBook } from '@meta/records';
import type { Timeline } from '@meta/timeline';
import type { WorldMemory } from '@meta/world';
import {
  ledgersChangedAt,
  onLedgersChanged,
  readRecords,
  readTimeline,
  readWorld,
  SLOTS,
  type Slot,
} from './storage';

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
 *
 * ## And the disk says so itself now (2026-09-02)
 *
 * `at` alone was a hand-kept list of the ways the ledgers can change, built by
 * the caller, one file away from the writers. `App` passed
 * `${fame.open}${shop.open}${worlds.open}${snap.hud.ended}` and that list had
 * missed four of them — RESTORE, RESET ALL, `takeCrossing` and `onSettle` — so
 * restoring a backup with the WORLDS panel already open showed the device from
 * before the restore, and a crossing left the panel describing the world just
 * left. `ui/dialog.tsx`'s docblock makes this exact argument against Ashwake
 * 1's `resetShell()`: a maintained list of things to re-do on every change is a
 * list that has already missed three.
 *
 * `shell/storage.ts` bumps a stamp from inside `write` and `drop`, which every
 * writer goes through and none can avoid, and only for the three ledger keys —
 * so the run keeper's several-times-a-minute writes do not drag a full decode
 * of every world behind them.
 *
 * `at` STAYS, and is not redundant: it is what makes opening a panel a re-read
 * even when nothing was written, which is the cheap "I have just been asked"
 * signal the hook was designed around, and it covers anything a future writer
 * does outside this file.
 */
export function useLedgers(at: unknown): Ledgers {
  const stamp = useSyncExternalStore(onLedgersChanged, ledgersChangedAt, ledgersChangedAt);
  const [ledgers, setLedgers] = useState<Ledgers>(readLedgers);
  /*
   * DECODED ONCE AT BOOT, not twice (2026-09-02).
   *
   * `useState(readLedgers)` reads the disk, and then the effect below ran on
   * mount and read all of it again — the shelf, the diary and three worlds,
   * each of which carries every hex the player has ever revealed — and set
   * state with the result, guaranteeing a second render of everything that
   * takes ledgers before the first frame was done. On the boot path, which is
   * the one measurement a stranger's first minute is made of.
   *
   * The initialiser IS the first read. This says so.
   */
  const last = useRef({ at, stamp });
  useEffect(() => {
    if (last.current.at === at && last.current.stamp === stamp) return;
    last.current = { at, stamp };
    setLedgers(readLedgers());
  }, [at, stamp]);
  return ledgers;
}
