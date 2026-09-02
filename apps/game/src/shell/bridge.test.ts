import { beforeEach, describe, expect, it } from 'vitest';
import { buildBackup, decodeBackup, encodeBackup } from '@meta/backup';
import { newWorld } from '@meta/world';
import {
  clearEverything,
  readAll,
  readProgress,
  readWorld,
  writeAll,
  writeProgress,
  writeWorld,
} from './storage';
import { EMPTY_PROGRESS } from '@meta/progress';

/**
 * BACK UP → RESTORE, through the real edge — including out of Ashwake 1.
 *
 * `meta/backup.test.ts` pins the codec against synthetic key maps, and that is
 * where the shapes belong. What it cannot see is the half this screen actually
 * depends on: that `readAll` hands the codec every key the game owns and that
 * `writeAll` puts them back where the readers look. The two were never tested
 * TOGETHER, so "back up this device and restore it" — the only defence against
 * a platform entitled to delete a world — had never once run end to end.
 *
 * And `DECISIONS.md` D3 makes this the v1 → v2 migration path, which is the
 * case that could not work at all: every key in an Ashwake 1 backup begins
 * `tiles.`, and this body's filter took none of them.
 *
 * **Named for its SUBJECT, not for a module** — the one place this directory
 * departs from `x.ts` ↔ `x.test.ts`, and deliberately. What it pins crosses
 * several files at once and belongs to none of them; a name that picked one
 * would send a reader to the wrong place for the other half. `bridge`, `camp`,
 * `homeworld`, `shed` and `shelf` are the five, and they are the five that
 * describe a behaviour rather than a file (noted 2026-09-02).
 */

beforeEach(() => {
  clearEverything();
});

const META = { sha: 'abc1234', at: '2026-08-29T01:00:00.000Z' };

describe('a backup of this device', () => {
  it('round-trips a world and a purse through storage and back', () => {
    writeWorld(1, newWorld(7));
    writeProgress({ ...EMPTY_PROGRESS, relics: 412 });

    const text = encodeBackup(buildBackup(readAll(), META));
    clearEverything();
    expect(readWorld(1)).toBeNull();

    const back = decodeBackup(text);
    expect(back).not.toBeNull();
    writeAll(back!);

    expect(readWorld(1)?.worldSeed).toBe(7);
    expect(readProgress().relics).toBe(412);
  });

  it('REPLACES what was there rather than merging with it', () => {
    writeWorld(1, newWorld(7));
    const text = encodeBackup(buildBackup(readAll(), META));

    // A different world in the same slot, and a second one beside it. Restoring
    // must leave the device as the backup describes it and not as a union of
    // two histories, which is a map of somewhere that never existed.
    clearEverything();
    writeWorld(1, newWorld(99));
    writeWorld(2, newWorld(123));

    writeAll(decodeBackup(text)!);
    expect(readWorld(1)?.worldSeed).toBe(7);
    expect(readWorld(2)).toBeNull();
  });
});

describe('a backup out of Ashwake 1 (D3)', () => {
  /** v1's keys, with v1's names — the file a player exports from tiles. */
  const v1 = (): string =>
    JSON.stringify({
      format: 1,
      sha: 'v1build',
      at: '2026-08-27T12:00:00.000Z',
      keys: {
        // Slot 1 under the pre-slots names every v1 device actually used.
        'tiles.world.v1': JSON.stringify(newWorld(7)),
        'tiles.world.s2.v1': JSON.stringify(newWorld(8)),
        'tiles.progress.v1': JSON.stringify({ ...EMPTY_PROGRESS, relics: 412 }),
      },
    });

  it('lands the v1 worlds where this body reads them', () => {
    const back = decodeBackup(v1());
    expect(back?.legacy).toBe(true);
    writeAll(back!);

    // The whole point of the bridge: a world Marc walked in Ashwake 1 opens
    // here, in the slot he was playing, with its seed intact.
    expect(readWorld(1)?.worldSeed).toBe(7);
    expect(readWorld(2)?.worldSeed).toBe(8);
    expect(readProgress().relics).toBe(412);
  });

  it('fails SAFE on a file that is neither body’s — nothing is wiped', () => {
    writeWorld(1, newWorld(7));
    // The guard that made the broken bridge survivable: a well-formed envelope
    // carrying nothing of ours is refused outright, so the screen never gets a
    // plan that would clear the device and write nothing back.
    expect(decodeBackup('{"format":1,"keys":{"someone.else":"x"}}')).toBeNull();
    expect(readWorld(1)?.worldSeed).toBe(7);
  });
});
