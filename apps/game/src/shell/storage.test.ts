import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pickLocale } from '@content/locale';
import { stringsFor } from '@text/index';
import { resolveTheme } from '@theme/index';
import type { GameState } from '@engine/state';
import { createSession } from './store';
import { dailySeed } from '@meta/daily';
import { newRun } from '@engine/reduce';
import { TUNING } from '@content/tuning';
import type { Replay } from '@meta/replay';

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
  /**
   * How many keys must be REMOVED before writes work again (2026-09-23).
   *
   * `full` alone is a disk that never takes another byte, which is the right
   * fake for the ladder running out — and the wrong one for testing its ORDER,
   * because every rung fails and the only thing reported is `lost`. A disk
   * that comes back once room is freed is what lets a test say WHICH rung paid
   * for the write. `Infinity` keeps every existing test exactly as it was.
   */
  freeAfter = Number.POSITIVE_INFINITY;
  private removed = 0;

  setItem(key: string, value: string): void {
    // The probe has to keep working, or `usable()` decides there is no storage
    // at all and the ladder is never reached — which is a different failure and
    // not the one under test.
    if (this.full && this.removed < this.freeAfter && !key.endsWith('.probe')) {
      throw new Error('QuotaExceededError');
    }
    this.items.set(key, value);
  }
  removeItem(key: string): void {
    // The usability probe writes a key and removes it again on first use, and
    // that removal is not room being freed — counting it would mean the disk
    // had already "recovered" before any rung of the ladder was climbed.
    const counts = this.items.delete(key) && !key.endsWith('.probe');
    if (counts) this.removed += 1;
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

describe('the daily run this device left unfinished (2026-09-09)', () => {
  /**
   * The date check has been here since Stage 4; the SEED check had not, and it
   * is the same asymmetry `settleDaily` had. `enterDaily` hands what comes
   * back straight to `restart` without asking, so one of the two callers was
   * already forgetting.
   *
   * Reachable: RESET ALL from inside a daily used to leave `daily` set, so the
   * keeper wrote the next run — played on a fresh WORLD — under today's date.
   * `App` clears the flag now; a device that did it before the fix still has
   * that run on disk.
   */
  const DAY = '2026-09-09';

  it('hands back a run played on that date’s own board', async () => {
    const s = await load();
    const run = newRun(dailySeed(DAY), TUNING);
    s.writeDailyRun(DAY, run);
    expect(s.readDailyRun(DAY)?.rootSeed).toBe(dailySeed(DAY));
  });

  it('refuses one played on any other board, however right the date', async () => {
    const s = await load();
    // Exactly the shape a reset-during-a-daily wrote: today's date, a world's
    // seed.
    s.writeDailyRun(DAY, newRun(s.worldSeedFor(1), TUNING));
    expect(s.readDailyRun(DAY), 'a foreign board resumed as today’s daily').toBeNull();
  });

  it('refuses another date’s, as it always did', async () => {
    const s = await load();
    s.writeDailyRun(DAY, newRun(dailySeed(DAY), TUNING));
    expect(s.readDailyRun('2026-09-10')).toBeNull();
  });
});

describe('the run a slot has unfinished, and which door asks how (2026-09-09)', () => {
  /**
   * A slot's run key is where a DETOUR's run lives too: the keeper is made from
   * the `Place`, a `?seed=` visitor is standing in a slot, so their board is
   * saved there under a foreign `rootSeed`. `App`'s boot ladder depends on
   * exactly that, which is why `readRun` must NOT filter by seed.
   *
   * `enterWorld` did ask by slot, though, and that was the bug: a visitor who
   * opened WORLDS mid-run and tapped WORLD 1 was handed **the shared board
   * back** under that world's name. Nothing was corrupted — `worldHeld`
   * refuses to merge a foreign seed and `settle` refuses to bank it — which is
   * what made it invisible: the board came back, the label said WORLD 1, and
   * nothing it did counted.
   */
  it('hands a foreign run back by SLOT, because a reload of a shared link needs it', async () => {
    const s = await load();
    const mine = s.worldSeedFor(1);
    const shared = mine + 1;
    s.writeRun(1, newRun(shared, TUNING));
    expect(s.readRun(1)?.rootSeed, 'a shared link could not survive a reload').toBe(shared);
  });

  it('refuses it by WORLD, which is what a door into that world must ask', async () => {
    const s = await load();
    const mine = s.worldSeedFor(1);
    s.writeRun(1, newRun(mine + 1, TUNING));
    expect(s.runFor(1, mine), 'a door into a world resumed somebody else’s board').toBeNull();
  });

  it('hands back the world’s own run', async () => {
    const s = await load();
    const mine = s.worldSeedFor(1);
    s.writeRun(1, newRun(mine, TUNING));
    expect(s.runFor(1, mine)?.rootSeed).toBe(mine);
  });
});

/**
 * THE FILMS (2026-09-23) — one key per watchable run, capped, and the first
 * thing a full disk gives up.
 *
 * Three claims, and each of them is a thing a player would only discover
 * weeks later: a row can find its own film, the store cannot grow without
 * end, and when the disk is full the films go before the diary does.
 */
describe('storage, keeping replays', () => {
  const aReplay = (seed: number): Replay => ({
    from: newRun(seed, TUNING, [], [], null),
    moves: [],
  });

  it('files a film under the diary row it belongs to, and hands it back', async () => {
    const s = await load();
    expect(s.hasReplay(111)).toBe(false);
    s.writeReplay(111, aReplay(3));
    expect(s.hasReplay(111), 'a row could not find its own film').toBe(true);
    expect(s.readReplay(111)?.from.rootSeed).toBe(3);
    // And a row with no film says so rather than handing back somebody else's.
    expect(s.readReplay(222)).toBeNull();
  });

  it('keeps the newest fifty and lets the oldest go', async () => {
    const s = await load();
    for (let i = 1; i <= 55; i++) s.writeReplay(i, aReplay(i));
    expect(s.hasReplay(55), 'the newest film was not kept').toBe(true);
    expect(s.hasReplay(6), 'the fiftieth-newest film was dropped early').toBe(true);
    expect(s.hasReplay(5), 'an old film outlived the cap').toBe(false);
    expect(s.hasReplay(1)).toBe(false);
  });

  /*
   * The rung, in the order `shedLadder.ts` argues for: a film is a thing to
   * look at and a diary row is a thing that happened, so a full disk spends
   * every film before it spends one fact.
   */
  it('gives up every film before it gives up the diary', async () => {
    const s = await load();
    s.writeReplay(9, aReplay(1));
    s.writeTimeline([
      { at: 9, kind: 'run', slot: 1, worldSeed: 1, score: 10, reach: 2, arc: '', highlights: [] },
    ]);
    const rungs: string[] = [];
    s.onShed((rung) => rungs.push(rung));

    /*
     * A disk that takes writes again once ONE key has gone. `lastError` and
     * `otherReceipts` are both free on this device — nothing is stored under
     * either — so the first rung that actually removes anything is the one
     * being asked about, and it has to be `replays`.
     */
    disk.full = true;
    disk.freeAfter = 1;
    s.writeRun(1, aRun());
    disk.full = false;

    expect(rungs, 'a rung other than the films paid for the write').toEqual(['replays']);
    expect(s.hasReplay(9), 'a film survived a full disk').toBe(false);
    expect(s.readTimeline().length, 'the diary was spent before the films').toBe(1);
  });
});
