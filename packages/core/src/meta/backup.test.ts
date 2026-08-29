import { describe, expect, it } from 'vitest';
import { STRINGS_EN as EN } from '@text/en';
import {
  buildBackup,
  decodeBackup,
  describeBackup,
  encodeBackup,
  isOwnKey,
  restorePlan,
} from './backup';

/**
 * The backup is the only thing standing between a player and a platform that
 * is entitled to delete their world — Safari's 7-day eviction, an in-app
 * browser, a new phone. A backup that silently restores nothing is worse
 * than none, because it fails at the one moment it was kept for, so this
 * file leans on the failure cases harder than the happy one.
 */

const META = { sha: 'abc1234', at: '2026-08-21T01:00:00.000Z' };

describe('building one', () => {
  it('takes this game’s keys and leaves everything else alone', () => {
    const backup = buildBackup(
      {
        'ashwake.world.1.v1': '{"worldSeed":7}',
        'ashwake.progress.v1': '{"relics":412}',
        // Somebody else's storage on the same origin. A save button that
        // quietly copied this into a file the player is about to SHARE would
        // be a surprising thing for a save button to do.
        'analytics.session': 'nope',
        theme: 'not ours either',
      },
      META,
    );

    expect(Object.keys(backup.keys).sort()).toEqual(['ashwake.progress.v1', 'ashwake.world.1.v1']);
    expect(backup.sha).toBe('abc1234');
    expect(backup.format).toBeGreaterThanOrEqual(1);
  });

  it('round-trips whole', () => {
    const backup = buildBackup(
      { 'ashwake.world.1.v1': '{"worldSeed":7}', 'ashwake.daily.v1': '{}' },
      META,
    );
    expect(decodeBackup(encodeBackup(backup))).toEqual(backup);
  });
});

describe('reading one back', () => {
  it('refuses anything that is not one, rather than half-restoring', () => {
    expect(decodeBackup(null)).toBeNull();
    expect(decodeBackup('not json')).toBeNull();
    expect(decodeBackup('[]')).toBeNull();
    expect(decodeBackup('{}')).toBeNull();
    // An envelope with no version is not this format.
    expect(decodeBackup('{"keys":{"ashwake.world.1.v1":"{}"}}')).toBeNull();
    // A well-formed envelope carrying nothing of OURS is not a backup: it
    // would wipe the device and put nothing back, which is the one outcome
    // this whole module exists to make impossible.
    expect(decodeBackup('{"format":1,"keys":{}}')).toBeNull();
    expect(decodeBackup('{"format":1,"keys":{"someone.else":"x"}}')).toBeNull();
  });

  it('keeps the good keys when one entry is rubbish', () => {
    // Strict about the envelope, forgiving about the contents — the same
    // split decodeWorld learned. Refusing a whole backup over one bad value
    // fails the player at the moment they needed it.
    const kept = decodeBackup(
      JSON.stringify({
        format: 1,
        keys: {
          'ashwake.world.1.v1': '{"worldSeed":7}',
          'ashwake.broken': 42,
          'ashwake.daily.v1': '{}',
        },
      }),
    );
    expect(kept).not.toBeNull();
    expect(Object.keys(kept!.keys).sort()).toEqual(['ashwake.daily.v1', 'ashwake.world.1.v1']);
  });

  it('survives a backup written by a build that knew more than this one', () => {
    // Forward compatibility is the whole reason `format` never has to move:
    // restore is key-by-key, and every decoder in this codebase already
    // tolerates shapes it does not recognise, so a newer backup lands as a
    // newer save and migrates on the next boot exactly as it would have.
    const future = decodeBackup(
      JSON.stringify({
        format: 99,
        sha: 'future',
        at: '2027-01-01T00:00:00.000Z',
        keys: { 'ashwake.world.1.v1': '{"worldSeed":7,"somethingNew":true}' },
        extra: 'a field this build has never heard of',
      }),
    );
    expect(future?.keys['ashwake.world.1.v1']).toContain('somethingNew');
  });
});

describe('restoring one', () => {
  it('REPLACES rather than merges, and says so in the plan', () => {
    // Merging two devices was the other option and it is a trap: two worlds'
    // revealed ground unioned together is a map of somewhere that never
    // existed, and there is no rule for which of two purses wins.
    const backup = buildBackup({ 'ashwake.world.1.v1': '{"worldSeed":7}' }, META);
    const plan = restorePlan(backup);
    expect(plan.remove).toEqual(['ashwake.']);
    expect(plan.write).toEqual({ 'ashwake.world.1.v1': '{"worldSeed":7}' });
  });

  it('knows which keys are the game’s to clear', () => {
    expect(isOwnKey('ashwake.world.1.v1')).toBe(true);
    expect(isOwnKey('ashwake.progress.v1')).toBe(true);
    expect(isOwnKey('analytics.session')).toBe(false);
    expect(isOwnKey('notashwake.world.1.v1')).toBe(false);
  });
});

describe('the bridge out of Ashwake 1 (D3)', () => {
  /**
   * A real v1 backup, in v1's key names.
   *
   * `DECISIONS.md` D3 rules this is HOW a player's worlds reach this body, and
   * it did not work: every key here begins `tiles.`, the filter took none of
   * them, and the file was refused. Safely — nothing was ever wiped — but the
   * promised bridge was not there.
   */
  const V1 = JSON.stringify({
    format: 1,
    sha: 'v1build',
    at: '2026-08-27T12:00:00.000Z',
    keys: {
      'tiles.world.v1': '{"worldSeed":7}',
      'tiles.run.v1': '{"phase":"play"}',
      'tiles.shop.s1.v1': '{"reach":2}',
      'tiles.world.s2.v1': '{"worldSeed":8}',
      'tiles.progress.v1': '{"relics":412}',
      'tiles.records.v2': '{"runs":9}',
      'tiles.features.v2': '{}',
      'tiles.theme.v2': 'torchlit',
      'tiles.dailyrun.v1': '{"date":"2026-08-27"}',
      'tiles.lasterror.v1': '{"text":"boom"}',
      // Three v1 keys with no home in this body. Dropped rather than written
      // as blobs no decoder here was ever built against.
      'tiles.shrinereceipt.v1': '{"woke":1}',
      'tiles.hex.v1': 'flat',
      'tiles.installnudge.v1': '1',
    },
  });

  it('accepts an Ashwake 1 backup and renames its keys into this body', () => {
    const backup = decodeBackup(V1);
    expect(backup).not.toBeNull();
    expect(backup?.legacy).toBe(true);
    expect(Object.keys(backup!.keys).sort()).toEqual([
      'ashwake.daily.run.v1',
      'ashwake.error.v1',
      'ashwake.features.v1',
      'ashwake.progress.v1',
      'ashwake.records.v1',
      'ashwake.run.1.v1',
      'ashwake.shop.1.v1',
      'ashwake.theme.v1',
      'ashwake.world.1.v1',
      'ashwake.world.2.v1',
    ]);
  });

  it('carries the VALUES across untouched — the decoders are the same file', () => {
    const backup = decodeBackup(V1);
    // Slot 1 kept the pre-slots names in Ashwake 1, so it is the slot that
    // moves; the world it names is the one a player has been walking.
    expect(backup?.keys['ashwake.world.1.v1']).toBe('{"worldSeed":7}');
    expect(backup?.keys['ashwake.world.2.v1']).toBe('{"worldSeed":8}');
    // The version suffix belongs to the body, not to the blob: v1's `records.v2`
    // holds exactly what this body reads out of `records.v1`.
    expect(backup?.keys['ashwake.records.v1']).toBe('{"runs":9}');
    expect(backup?.keys['ashwake.progress.v1']).toBe('{"relics":412}');
  });

  it('describes a v1 backup in the numbers a player recognises', () => {
    const backup = decodeBackup(V1);
    const line = describeBackup(backup!, EN);
    expect(line).toContain('2 worlds');
    expect(line).toContain('412 relics');
  });

  it('reads a backup from THIS body exactly as it always did', () => {
    // The legacy path is a fallback and must never reinterpret a key that is
    // already ours, or a v2 backup could be rewritten by the bridge.
    const mine = buildBackup({ 'ashwake.world.1.v1': '{"worldSeed":7}' }, META);
    const back = decodeBackup(encodeBackup(mine));
    expect(back?.legacy).toBe(false);
    expect(back?.keys).toEqual({ 'ashwake.world.1.v1': '{"worldSeed":7}' });
  });

  it('still refuses a file that belongs to neither body', () => {
    expect(decodeBackup('{"format":1,"keys":{"tiles.nothingweknow":"x"}}')).toBeNull();
  });
});

describe('describing one', () => {
  it('counts what a player recognises as theirs', () => {
    const backup = buildBackup(
      {
        'ashwake.world.1.v1': '{"worldSeed":1}',
        'ashwake.world.s2.v1': '{"worldSeed":2}',
        'ashwake.world.s3.v1': '{"worldSeed":3}',
        'ashwake.progress.v1': '{"relics":412}',
        'ashwake.daily.v1': '{}',
      },
      META,
    );
    const line = describeBackup(backup, EN);
    expect(line).toContain('3 worlds');
    expect(line).toContain('412 relics');
    expect(line).toContain('2026-08-21');
  });

  it('pluralises one world honestly, and survives an unreadable purse', () => {
    const one = buildBackup(
      { 'ashwake.world.1.v1': '{"worldSeed":1}', 'ashwake.progress.v1': 'not json' },
      { sha: 'x', at: '' },
    );
    const line = describeBackup(one, EN);
    expect(line).toContain('1 world ');
    expect(line).toContain('0 relics');
  });
});
