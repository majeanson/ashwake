import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pickLocale } from '@content/locale';
import { stringsFor } from '@text/index';
import { resolveTheme } from '@theme/index';
import type { GameState } from '@engine/state';
import { createSession } from './store';

/**
 * The trust boundary, tested (2026-09-02).
 *
 * `storage.ts` is 620 lines and opens by declaring itself the only file that
 * touches storage, for three reasons it says Ashwake 1 paid for: **storage
 * throws**, **a decoder is a trust boundary**, and **keys are a contract with
 * the past**. It had no test.
 *
 * What is pinned here is exactly those three claims plus the two mechanisms
 * that were built on top of them and are invisible when they fail:
 *
 *   - the SHED LADDER, whose order survived a real bug in Ashwake 1 and whose
 *     final rung — every rung spent, the run lost — said nothing at all until
 *     this pass;
 *   - the LEDGER STAMP, which is what tells `useLedgers` the disk moved. It
 *     must fire for the three ledger keys and must NOT fire for the run key,
 *     because the keeper writes that several times a minute and a stamp there
 *     would drag a full decode of every world behind every write.
 *
 * Every test re-imports the module. `storage.ts` samples whether storage is
 * usable ONCE, at first use, and caches the answer deliberately (the probe
 * writes) — so a suite that shared one instance would be testing whichever
 * disk the first test happened to install.
 */

type Storage = Awaited<ReturnType<typeof fresh>>;
const fresh = () => import('./storage');

/** A `localStorage` this test owns, with a quota it can close. */
class Disk {
  readonly items = new Map<string, string>();
  /** Refuse every write once set — a full quota, or a browser blocking data. */
  full = false;

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    // The probe has to keep working, or `usable()` decides there is no storage
    // at all and the ladder is never reached — which is a different failure and
    // not the one under test.
    if (this.full && !key.endsWith('.probe')) throw new Error('QuotaExceededError');
    this.items.set(key, value);
  }
  removeItem(key: string): void {
    this.items.delete(key);
  }
  clear(): void {
    this.items.clear();
  }
  key(i: number): string | null {
    return [...this.items.keys()][i] ?? null;
  }
  get length(): number {
    return this.items.size;
  }
}

let disk: Disk;

/** A real run, because `writeRun` goes through the core's encoder and a
 *  hand-built object would be a test of a fixture. */
const aRun = (): GameState =>
  createSession({
    seed: 3,
    theme: resolveTheme(null),
    strings: stringsFor(pickLocale(['en'])),
  }).get().state;

const load = async (): Promise<Storage> => {
  vi.resetModules();
  return fresh();
};

beforeEach(() => {
  disk = new Disk();
  vi.stubGlobal('localStorage', disk);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('storage, when the disk is ordinary', () => {
  it('answers with a default rather than throwing on a blob it did not write', async () => {
    const s = await load();
    disk.items.set('ashwake.progress.v1', '{not json at all');
    // The whole reason every read goes through a core decoder: what is on the
    // disk was written by an older build or by a hand in devtools.
    expect(s.readProgress()).toEqual(s.EMPTY_PROGRESS);
  });

  it('keeps the shop levels through an encoder rather than a bare stringify', async () => {
    const s = await load();
    s.writeShopLevels(1, { tiles: 3, odds: 0, sense: 2 });
    // A level of zero is not a level: the encoder drops what the parser would
    // have dropped, so a round trip is the identity rather than a near miss.
    expect(s.readShopLevels(1)).toEqual({ tiles: 3, sense: 2 });
  });
});

describe('storage, when there is none at all', () => {
  it('reads answer and writes are silent, rather than the game failing to boot', async () => {
    vi.stubGlobal('localStorage', {
      get length(): number {
        throw new Error('site data blocked');
      },
      getItem() {
        throw new Error('site data blocked');
      },
      setItem() {
        throw new Error('site data blocked');
      },
      removeItem() {
        throw new Error('site data blocked');
      },
      clear() {
        throw new Error('site data blocked');
      },
      key() {
        throw new Error('site data blocked');
      },
    });
    const s = await load();
    expect(s.isEphemeral()).toBe(true);
    expect(s.readProgress()).toEqual(s.EMPTY_PROGRESS);
    expect(() => s.writeProgress(s.EMPTY_PROGRESS)).not.toThrow();
  });
});

/*
 * The ladder's ORDER, and the rule that the world being played is never a rung,
 * are `shed.test.ts`'s and are not restated here — that file was written for
 * them and covers them properly. What is left is the END of the ladder, which
 * had no words at all until 2026-09-02, and the registry that reports it.
 */
describe('the shed ladder, when it runs out', () => {
  it('says the run was lost when every rung is spent', async () => {
    const s = await load();
    const rungs: string[] = [];
    s.onShed((rung) => rungs.push(rung));
    disk.full = true;
    s.writeProgress(s.EMPTY_PROGRESS);
    // Silent until 2026-09-02: `onShed` reported the rungs that WORKED, so a
    // device that shed everything and still could not save said nothing — the
    // one outcome a player can act on was the one with no words.
    expect(rungs.at(-1)).toBe('lost');
  });

  it('hands back an unsubscribe, so a language change cannot leak a listener', async () => {
    const s = await load();
    const heard: string[] = [];
    const stop = s.onShed((rung) => heard.push(rung));
    stop();
    disk.full = true;
    s.writeProgress(s.EMPTY_PROGRESS);
    expect(heard).toEqual([]);
  });
});

describe('the ledger stamp', () => {
  it('moves when a ledger key is written', async () => {
    const s = await load();
    const before = s.ledgersChangedAt();
    s.writeTimeline([]);
    expect(s.ledgersChangedAt()).toBeGreaterThan(before);
  });

  it('does NOT move when the run is saved', async () => {
    const s = await load();
    const before = s.ledgersChangedAt();
    // The keeper writes this several times a minute. A stamp here would mean
    // decoding the shelf, the diary and three worlds on every batch of play —
    // which is the difference between a signal and a cost.
    s.writeRun(1, aRun());
    expect(disk.items.has('ashwake.run.1.v1'), 'the run was not written at all').toBe(true);
    expect(s.ledgersChangedAt()).toBe(before);
  });

  it('moves when a world is dropped, not only when one is written', async () => {
    const s = await load();
    s.writeTimeline([]);
    const before = s.ledgersChangedAt();
    s.clearSlot(1);
    expect(s.ledgersChangedAt()).toBeGreaterThan(before);
  });

  it('tells whoever asked, and stops when they are done', async () => {
    const s = await load();
    let heard = 0;
    const stop = s.onLedgersChanged(() => {
      heard += 1;
    });
    s.writeTimeline([]);
    expect(heard).toBe(1);
    stop();
    s.writeTimeline([]);
    expect(heard).toBe(1);
  });
});

describe('restore', () => {
  it('replaces rather than merges, so a device is one history and never two', async () => {
    const s = await load();
    disk.items.set('ashwake.theme.v1', 'torchlit');
    disk.items.set('ashwake.locale.v1', 'en');
    s.writeAll({
      format: 1,
      sha: 'test',
      at: '',
      legacy: false,
      keys: { 'ashwake.theme.v1': 'settlement' },
    });
    expect(disk.items.get('ashwake.theme.v1')).toBe('settlement');
    // Ashwake 1's ruling: a merged backup is two histories interleaved and
    // nobody can say what the device now is.
    expect(disk.items.has('ashwake.locale.v1')).toBe(false);
  });
});
