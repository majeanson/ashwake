import {
  decodeDailyBook,
  decodeDailyRun,
  encodeDailyBook,
  encodeDailyRun,
  type DailyBook,
} from '@meta/daily';
import { decodeFeatures, encodeFeatures, type FeatureSet } from '@meta/features';
import { decodeProgress, encodeProgress, EMPTY_PROGRESS, type Progress } from '@meta/progress';
import { decodeRecords, encodeRecords, type RecordBook } from '@meta/records';
import { decodeRun, encodeRun } from '@meta/save';
import { decodeTimeline, encodeTimeline, type Timeline } from '@meta/timeline';
import { SHED_LADDER, type ShedRungId } from '@meta/shedLadder';
import { decodeWorld, encodeWorld, type WorldMemory } from '@meta/world';
import type { GameState } from '@engine/state';

/**
 * Every key this game owns, and the only file that touches storage
 * (Stage 4, 2026-08-29).
 *
 * One edge, for three reasons Ashwake 1 paid for:
 *
 * 1. **Storage throws.** Private windows, a full quota, an in-app browser with
 *    storage disabled — all of them raise rather than returning null, and a
 *    game that dies on boot because it could not remember your theme is a game
 *    nobody plays twice. Every read here answers with a default and every write
 *    is allowed to fail silently; the one that matters (a run) is retried by
 *    simply being written again on the next action.
 * 2. **A decoder is a trust boundary.** Everything in storage was written by an
 *    older version of this game or by a hand in devtools, so every blob goes
 *    through the core's own decoder, which is written to treat its input as
 *    hostile and return a default rather than throw.
 * 3. **Keys are a contract with the past.** They carry a version so a shape
 *    change is a new key rather than a corrupt read, and they are namespaced
 *    `ashwake.` so this body and Ashwake 1 could share a device without
 *    either one reading the other's saves.
 */

const NS = 'ashwake';

/** Device-wide: the same whichever world is open. */
const DEVICE = {
  features: `${NS}.features.v1`,
  theme: `${NS}.theme.v1`,
  locale: `${NS}.locale.v1`,
  records: `${NS}.records.v1`,
  timeline: `${NS}.timeline.v1`,
  daily: `${NS}.daily.v1`,
  /**
   * The daily board put down mid-run — ONE key, whichever date it belongs to.
   *
   * One key rather than one per date because the guard is the whole rule: a
   * board is handed back only for the date it was played on, and yesterday's
   * abandoned expedition opening on today's shared world is the single thing a
   * daily may never do. `dailyRunFor` is where that guard lives; this is only
   * where the string sits.
   */
  dailyRun: `${NS}.daily.run.v1`,
  slot: `${NS}.slot.v1`,
  /** The teaching ledger is a DEVICE fact: you learn what RIPE means once. */
  progress: `${NS}.progress.v1`,
  /**
   * The last thing that broke, for SETTINGS ▸ LAST ERROR.
   *
   * Kept so a player who hit something an hour ago can still send it — a
   * failure panel a stranger tapped CONTINUE on is a bug report that walked
   * away. Overwritten rather than appended: the newest failure is the one
   * somebody can still describe.
   */
  lastError: `${NS}.error.v1`,
} as const;

export type Slot = 1 | 2 | 3;
export const SLOTS: readonly Slot[] = [1, 2, 3];

/** Per-world: three of each, so three worlds can be kept side by side. */
const slotKeys = (slot: Slot) =>
  ({
    world: `${NS}.world.${slot}.v1`,
    run: `${NS}.run.${slot}.v1`,
  }) as const;

/**
 * Whether this device has storage at all.
 *
 * Sampled once, because the probe WRITES: `localStorage` can throw on ACCESS
 * and not only on use, in a browser configured to block site data, and a
 * getter that throws is a getter no `??` will save you from. Probing on every
 * read would also be wrong on a FULL disk — the probe's own `setItem` would
 * throw and the game would conclude the device is ephemeral, when in truth it
 * is merely out of room and the shed ladder is what that calls for.
 */
function usable(): boolean {
  try {
    const probe = `${NS}.probe`;
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/**
 * The ANSWER is cached; the handle is not.
 *
 * Caching the `Storage` object itself is what the probe seemed to imply and it
 * is one step too far: what is expensive and dangerous is the probe, not the
 * property read. Resolving the handle each call costs nothing, and it means
 * this module has no memo for a test to have to reach past.
 */
let has: boolean | undefined;
const disk = (): Storage | null => {
  if (has === undefined) has = usable();
  return has ? localStorage : null;
};

/** True when nothing can be kept — SETTINGS says so rather than pretending. */
export const isEphemeral = (): boolean => disk() === null;

function read(key: string): string | null {
  try {
    return disk()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/**
 * Told when a write had to spend a rung of the shed ladder, so the shell can
 * say which. Registered once; a device that never fills its quota never calls
 * it.
 */
let reportShed: ((rung: ShedRungId) => void) | null = null;
export const onShed = (report: (rung: ShedRungId) => void): void => {
  reportShed = report;
};

/**
 * Write, and if the disk is full, MAKE room rather than lose the run.
 *
 * The old comment here said a failed write is not a reason to lose the frame
 * because "the next write of the same key is the retry, and there is always a
 * next write" — which is true right up until the quota is genuinely full, and
 * then every write fails forever and the run in progress is the thing that
 * dies. `meta/shedLadder.ts` exists for exactly this and had no caller.
 *
 * The ladder's order survived a real bug (Ashwake 1, 2026-08-20): an earlier
 * version shed a WORLD while leaving its run, so the next boot minted a fresh
 * world and resumed a run whose seed no longer matched it, merging a foreign
 * geography into it. Hence the rule the ladder encodes — spend the genuinely
 * cheap things first, and **never touch the world being played**.
 */
function write(key: string, value: string): void {
  const d = disk();
  if (d === null) return;
  try {
    d.setItem(key, value);
    return;
  } catch {
    // Fall through to the ladder. A quota error and a disabled-storage error
    // look the same here, which is why the null check above is separate.
  }

  for (const rung of SHED_LADDER) {
    shed(rung.id);
    try {
      d.setItem(key, value);
      reportShed?.(rung.id);
      return;
    } catch {
      // Not enough yet. Climb.
    }
  }
  // Every rung spent and still no room. The run in progress is lost, and
  // there is nothing left to give that is not the world being played.
}

/** Free one rung's worth of room. The ORDER is the ladder's; which keys each
 *  rung owns is this file's, because only this file knows the key shapes. */
function shed(rung: ShedRungId): void {
  const here = activeSlot();
  switch (rung) {
    case 'lastError':
      drop(DEVICE.lastError);
      return;
    case 'otherReceipts':
      // No per-slot receipts in this body yet, so this rung is free and
      // frees nothing. Kept as a rung rather than deleted: the ladder's
      // ORDER is the part that was paid for, and a missing rung is how an
      // order gets quietly re-argued.
      return;
    case 'timeline':
      drop(DEVICE.timeline);
      return;
    case 'otherWorlds':
      for (const slot of SLOTS) {
        if (slot === here) continue;
        clearSlot(slot);
      }
      return;
  }
}

function drop(key: string): void {
  try {
    disk()?.removeItem(key);
  } catch {
    /* nothing to undo */
  }
}

/* ---- the device ---------------------------------------------------------- */

export const readFeatures = (): FeatureSet => decodeFeatures(read(DEVICE.features));
export const writeFeatures = (set: FeatureSet): void => write(DEVICE.features, encodeFeatures(set));

export const readTheme = (): string | null => read(DEVICE.theme);
export const writeTheme = (id: string): void => write(DEVICE.theme, id);

export const readLocale = (): string | null => read(DEVICE.locale);
export const writeLocale = (locale: string): void => write(DEVICE.locale, locale);

export const readProgress = (): Progress => decodeProgress(read(DEVICE.progress));
export const writeProgress = (p: Progress): void => write(DEVICE.progress, encodeProgress(p));

export const readRecords = (): RecordBook => decodeRecords(read(DEVICE.records));
export const writeRecords = (b: RecordBook): void => write(DEVICE.records, encodeRecords(b));

export const readTimeline = (): Timeline => decodeTimeline(read(DEVICE.timeline));
export const writeTimeline = (t: Timeline): void => write(DEVICE.timeline, encodeTimeline(t));

export const readDailyBook = (): DailyBook => decodeDailyBook(read(DEVICE.daily));
export const writeDailyBook = (b: DailyBook): void => write(DEVICE.daily, encodeDailyBook(b));

/** Which world is open. Out-of-range or unreadable answers with the first. */
export function activeSlot(): Slot {
  const stored = Number(read(DEVICE.slot));
  return SLOTS.includes(stored as Slot) ? (stored as Slot) : 1;
}

export const setActiveSlot = (slot: Slot): void => write(DEVICE.slot, String(slot));

/* ---- the last failure ----------------------------------------------------- */

export type LastError = {
  readonly text: string;
  /** Short sha, so an issue names the build it came from. */
  readonly sha: string;
  readonly at: string;
  readonly count: number;
};

export function readLastError(): LastError | null {
  const raw = read(DEVICE.lastError);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { text, sha, at, count } = parsed as Record<string, unknown>;
    if (typeof text !== 'string' || text === '') return null;
    return {
      text,
      sha: typeof sha === 'string' ? sha : 'unknown',
      at: typeof at === 'string' ? at : '',
      count: typeof count === 'number' && Number.isFinite(count) ? count : 1,
    };
  } catch {
    return null;
  }
}

export const writeLastError = (error: LastError): void =>
  write(DEVICE.lastError, JSON.stringify(error));

export const clearLastError = (): void => drop(DEVICE.lastError);

/* ---- the daily ------------------------------------------------------------ */

/**
 * Today, as the LOCAL date the daily is named after.
 *
 * Local rather than UTC because the ritual is "a new one when I wake up"
 * (Marc's Wordle rule) — a player in Montréal must not get tomorrow's board at
 * 8pm. `Date` is banned in the core and belongs here for exactly this reason:
 * the shell samples the clock, the core does the arithmetic.
 */
export function localToday(now: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** The daily board kept for `date`, or null — the date guard is the core's. */
export function readDailyRun(date: string): GameState | null {
  const kept = decodeDailyRun(read(DEVICE.dailyRun));
  return kept === null || kept.date !== date ? null : decodeRun(kept.run);
}

export const writeDailyRun = (date: string, state: GameState): void =>
  write(DEVICE.dailyRun, encodeDailyRun({ date, run: encodeRun(state) }));

export const clearDailyRun = (): void => drop(DEVICE.dailyRun);

/* ---- one world ----------------------------------------------------------- */

export const readWorld = (slot: Slot): WorldMemory | null =>
  decodeWorld(read(slotKeys(slot).world));

export const writeWorld = (slot: Slot, world: WorldMemory): void =>
  write(slotKeys(slot).world, encodeWorld(world));

export const readRun = (slot: Slot): GameState | null => decodeRun(read(slotKeys(slot).run));

export const writeRun = (slot: Slot, state: GameState): void =>
  write(slotKeys(slot).run, encodeRun(state));

/** A finished run is not a resumable one. Clearing is what makes BEGIN mean
 *  BEGIN rather than silently reopening a run that already ended. */
export const clearRun = (slot: Slot): void => drop(slotKeys(slot).run);

/** Everything about one world, gone. The world memory too — SETTLE and NEW
 *  WORLD both mean "this one is over", and a half-erased world is a world
 *  that remembers ground the run below it never saw. */
export function clearSlot(slot: Slot): void {
  const keys = slotKeys(slot);
  drop(keys.world);
  drop(keys.run);
}

/** Every key this game owns. RESET ALL, and the thing RESTORE writes over. */
export function clearEverything(): void {
  for (const key of Object.values(DEVICE)) drop(key);
  for (const slot of SLOTS) clearSlot(slot);
}

/** For BACK UP: the raw blobs, so a backup is exactly what was on the device
 *  rather than a re-encoding that could quietly drop a field. */
export function readAll(): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  const keys = [...Object.values(DEVICE), ...SLOTS.flatMap((s) => Object.values(slotKeys(s)))];
  for (const key of keys) {
    const value = read(key);
    if (value !== null) out[key] = value;
  }
  return out;
}

/** For RESTORE: replace, never merge. Ashwake 1's ruling — a merged backup is
 *  two histories interleaved, and nobody can say what that device now is. */
export function writeAll(blobs: Readonly<Record<string, string>>): void {
  clearEverything();
  for (const [key, value] of Object.entries(blobs)) {
    if (key.startsWith(`${NS}.`)) write(key, value);
  }
}

export { EMPTY_PROGRESS };
