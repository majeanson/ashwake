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
 * Storage, if this device has any.
 *
 * Sampled once and cached: `localStorage` can throw on ACCESS, not only on
 * use, in a browser configured to block site data, and a getter that throws is
 * a getter no `??` will save you from.
 */
function store(): Storage | null {
  try {
    const probe = `${NS}.probe`;
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

let cached: Storage | null | undefined;
const disk = (): Storage | null => (cached === undefined ? (cached = store()) : cached);

/** True when nothing can be kept — SETTINGS says so rather than pretending. */
export const isEphemeral = (): boolean => disk() === null;

function read(key: string): string | null {
  try {
    return disk()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    disk()?.setItem(key, value);
  } catch {
    // A full quota is not a reason to lose the frame. The next write of the
    // same key is the retry, and there is always a next write.
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
