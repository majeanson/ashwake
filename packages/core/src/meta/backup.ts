import type { Strings } from '@text/Strings';
/**
 * The backup: every world, purse and perk this device holds, as one string.
 *
 * The game has no backend and no account by design, which makes the player's
 * own `localStorage` the only copy of everything they have. That is fine
 * until it is not: Safari evicts a non-persisted origin after about a week
 * of not visiting, in-app browsers (Instagram, TikTok) discard storage
 * wholesale, RESET ALL is two taps, and a phone can simply be replaced.
 *
 * None of those are bugs to be fixed — they are properties of the platform —
 * so the answer is not another guard. It is a door out: one file the player
 * can keep, send to themselves, and put back. Every other data-loss fix in
 * this codebase makes loss less LIKELY; this is the only one that makes it
 * SURVIVABLE.
 *
 * Pure by construction, like every other `meta/` module: strings in, strings
 * out, and the shell owns the storage and the share sheet. That is also what
 * makes it testable, which matters more here than almost anywhere — a backup
 * that silently restores nothing is worse than no backup at all, because the
 * player finds out at the exact moment they needed it.
 */

/** Everything the game keeps lives under this prefix. Nothing else is ours. */
/**
 * The namespace every key this game owns begins with.
 *
 * It said `tiles.` until 2026-08-29 — lifted verbatim with the rest of the
 * core, and wrong the moment the keys around it became `ashwake.`: a backup
 * filters by this prefix, so it would have produced an EMPTY file and a
 * restore would have wiped a device and put nothing back. The prefix is a
 * property of the body rather than of the rules, which is why it moved and
 * why the golden sim cannot see it.
 */
const PREFIX = 'ashwake.';

/**
 * Bumped only if a future build cannot read an older backup. It never has to
 * be: restore is key-by-key and every decoder in this codebase already
 * tolerates shapes it does not recognise, so an old backup lands as an old
 * save and migrates on the next boot exactly as it would have.
 */
const FORMAT = 1;

/**
 * Ashwake 1's namespace, and the key names that moved when the body did.
 *
 * `DECISIONS.md` D3 rules that the way a v1 player's worlds reach this body is
 * BACK UP MY WORLDS → RESTORE A BACKUP. That could not work while `decodeBackup`
 * filtered on `ashwake.` alone: every key in a v1 backup begins `tiles.`, so the
 * filter emptied it and the guard below refused the file. It refused SAFELY —
 * nothing was ever wiped — but the bridge D3 promised did not exist.
 *
 * A table rather than a prefix swap, because three shapes moved with the name:
 *
 *   - **The version suffix belongs to the BODY, not to the blob.** Ashwake 1
 *     had already moved `features` and `theme` to `v2` (a changed default it
 *     needed every device to re-derive) and `records` to `v2`; this body
 *     started all three at `v1`. The DECODER either side is the same file, so
 *     the value crosses unchanged and only the name has to be rewritten.
 *   - **Slot 1 kept the pre-slots names in Ashwake 1** (`tiles.world.v1`), so
 *     that every device older than slots simply WAS slot 1 with nothing to
 *     migrate. Here every slot is numbered, so slot 1 is the one that moves.
 *   - The daily's in-progress board went `dailyrun` → `daily.run`, and the
 *     last error `lasterror` → `error`.
 *
 * Three v1 keys have no home here and are dropped deliberately: the shrine
 * RECEIPT (this body has no per-slot receipts — see the `otherReceipts` rung
 * in `shell/storage.ts`), the board ORIENTATION (`tiles.hex.v1`), and the
 * install nudge's once-ever marker. None of the three is a world.
 */
const LEGACY_PREFIX = 'tiles.';

const LEGACY_KEYS: Readonly<Record<string, string>> = {
  'tiles.features.v2': 'ashwake.features.v1',
  'tiles.theme.v2': 'ashwake.theme.v1',
  'tiles.progress.v1': 'ashwake.progress.v1',
  'tiles.records.v2': 'ashwake.records.v1',
  'tiles.timeline.v1': 'ashwake.timeline.v1',
  'tiles.daily.v1': 'ashwake.daily.v1',
  'tiles.dailyrun.v1': 'ashwake.daily.run.v1',
  'tiles.slot.v1': 'ashwake.slot.v1',
  'tiles.lasterror.v1': 'ashwake.error.v1',
  // Slot 1 under Ashwake 1's pre-slots names, then 2 and 3 under theirs.
  'tiles.world.v1': 'ashwake.world.1.v1',
  'tiles.run.v1': 'ashwake.run.1.v1',
  'tiles.shop.s1.v1': 'ashwake.shop.1.v1',
  'tiles.world.s2.v1': 'ashwake.world.2.v1',
  'tiles.run.s2.v1': 'ashwake.run.2.v1',
  'tiles.shop.s2.v1': 'ashwake.shop.2.v1',
  'tiles.world.s3.v1': 'ashwake.world.3.v1',
  'tiles.run.s3.v1': 'ashwake.run.3.v1',
  'tiles.shop.s3.v1': 'ashwake.shop.3.v1',
};

/**
 * An Ashwake 1 backup, renamed into this body's keys.
 *
 * Total and forgiving in the same split as everything else here: a key with no
 * entry in the table is DROPPED rather than guessed at, because a key this body
 * does not know is a key none of its decoders was written against — writing it
 * would leave a blob on the device that nothing ever reads and every wipe has
 * to keep sweeping.
 */
export function migrateLegacy(
  keys: Readonly<Record<string, unknown>>,
): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(keys)) {
    const now = LEGACY_KEYS[key];
    if (now !== undefined && typeof value === 'string') out[now] = value;
  }
  return out;
}

/** True for a key Ashwake 1 wrote. */
export const isLegacyKey = (key: string): boolean => key.startsWith(LEGACY_PREFIX);

export type Backup = {
  readonly format: number;
  /** The build that wrote it, for a bug report that comes with a file. */
  readonly sha: string;
  /** ISO date. Informational only — restoring never reads it. */
  readonly at: string;
  readonly keys: Readonly<Record<string, string>>;
  /**
   * True when this came out of Ashwake 1 and was renamed on the way in.
   *
   * The screen says so before it overwrites anything: crossing bodies is a
   * thing a player should be told is happening, not a thing they infer
   * afterwards from a world that came back wearing a different name.
   */
  readonly legacy: boolean;
};

/**
 * Fold the device's stored keys into a backup. The caller passes what it
 * read; this module never touches storage.
 *
 * Keys outside the game's own prefix are dropped rather than trusted: a
 * backup is a copy of THIS game, and quietly carrying somebody else's
 * localStorage into a file the player is about to share would be a
 * surprising thing for a save button to do.
 */
export function buildBackup(
  entries: Readonly<Record<string, string>>,
  meta: { readonly sha: string; readonly at: string },
): Backup {
  const keys: Record<string, string> = {};
  for (const [key, value] of Object.entries(entries)) {
    if (key.startsWith(PREFIX) && typeof value === 'string') keys[key] = value;
  }
  return { format: FORMAT, sha: meta.sha, at: meta.at, keys, legacy: false };
}

export const encodeBackup = (backup: Backup): string => JSON.stringify(backup);

/**
 * Read a backup back, or null for anything that is not one.
 *
 * Deliberately strict about the ENVELOPE and forgiving about the contents:
 * a file that is not this game's backup must be refused outright — restoring
 * half of one over a live device is the worst outcome available here — while
 * an individual key whose value is not a string is simply skipped, because
 * the alternative is refusing an otherwise good backup over one bad entry.
 * The same split `decodeWorld` learned on 2026-08-20.
 */
export function decodeBackup(raw: string | null): Backup | null {
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;

  const { format, sha, at, keys } = parsed as {
    format?: unknown;
    sha?: unknown;
    at?: unknown;
    keys?: unknown;
  };
  if (typeof format !== 'number' || !Number.isFinite(format) || format < 1) return null;
  if (typeof keys !== 'object' || keys === null || Array.isArray(keys)) return null;

  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(keys)) {
    if (key.startsWith(PREFIX) && typeof value === 'string') clean[key] = value;
  }
  /*
   * Nothing of ours under our own name — so try Ashwake 1's (D3).
   *
   * Only ever as a FALLBACK, so a backup written by this body takes exactly the
   * path it always took and the bridge can never reinterpret a key that is
   * already ours. A file belonging to neither body still ends at the guard.
   */
  const legacy = Object.keys(clean).length === 0;
  if (legacy) Object.assign(clean, migrateLegacy(keys as Readonly<Record<string, unknown>>));

  // A backup carrying nothing of ours is not a backup, whatever its envelope
  // says — restoring it would wipe the device and put nothing back.
  if (Object.keys(clean).length === 0) return null;

  return {
    format,
    sha: typeof sha === 'string' ? sha : 'unknown',
    at: typeof at === 'string' ? at : '',
    keys: clean,
    legacy,
  };
}

/**
 * What restoring this backup would do, as a plan the shell can carry out and
 * a sentence it can show first.
 *
 * Restoring REPLACES: every `ashwake.` key on the device is removed and the
 * backup's are written. Merging was the other option and it is a trap —
 * two worlds' revealed ground unioned together is a map of somewhere that
 * never existed, and there is no rule for which of two purses wins. Replace
 * is the only version a player can predict, which is what matters for a
 * button that cannot be undone.
 */
export function restorePlan(backup: Backup): {
  readonly remove: readonly string[];
  readonly write: Readonly<Record<string, string>>;
} {
  return { remove: [PREFIX], write: backup.keys };
}

/** True for a key this game owns — the shell's filter when it clears. */
export const isOwnKey = (key: string): boolean => key.startsWith(PREFIX);

/**
 * One line describing a backup, for the confirm step. Counts worlds rather
 * than keys, because "3 worlds · 412 relics" is a thing a player recognises
 * as theirs and "17 keys" is not.
 */
export function describeBackup(backup: Backup, s: Strings): string {
  // Loose about the slot part, because the key shape has already changed
  // once: Ashwake 1 wrote `world.v1` and then `world.s1.v1`, and this body
  // writes `world.1.v1`. A pattern that knows only one of them counts zero
  // worlds — which is exactly the number a player would not recognise as
  // theirs, on the screen where they are deciding whether to overwrite a
  // device.
  const worlds = Object.keys(backup.keys).filter((k) =>
    /^ashwake\.world\.(?:s?\d+\.)?v\d+$/.test(k),
  );
  let relics = 0;
  const progress = backup.keys[`${PREFIX}progress.v1`];
  if (progress !== undefined) {
    try {
      const parsed: unknown = JSON.parse(progress);
      if (typeof parsed === 'object' && parsed !== null) {
        const { relics: r } = parsed as { relics?: unknown };
        if (typeof r === 'number' && Number.isFinite(r)) relics = Math.max(0, Math.floor(r));
      }
    } catch {
      // A backup whose purse will not parse still restores; it just cannot
      // be summarised. The number is a courtesy, not the contract.
    }
  }
  return s.backup.describe(worlds.length, relics, backup.at === '' ? null : backup.at.slice(0, 10));
}
