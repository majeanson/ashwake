import { beforeEach, describe, expect, it } from 'vitest';
import { EMPTY_PROGRESS, grantFind, PERKS } from '@meta/progress';
import { aim, forgetShelf, perkAt, wornPerk } from './finds';

/**
 * What a find holds, for the receipt that names it.
 *
 * `receipts.test.ts` in the core proves the SENTENCES, and it proves them by
 * supplying `perkAt` itself — so it was green for four stages while nothing in
 * the app supplied one and every find in the real game reported "Nothing new
 * inside". This file is the other half: the answer the shell actually hands
 * over.
 *
 * The rule that has to hold is that this and `grantFind` cannot disagree,
 * because they are the receipt and the grant describing one event.
 */

const HEX = '4,-2';
const SEED = 991;

beforeEach(forgetShelf);

describe('what a find holds', () => {
  it('names the very perk the grant is about to give', () => {
    aim({ progress: EMPTY_PROGRESS, seed: SEED, grants: true });
    const granted = grantFind(EMPTY_PROGRESS, SEED, HEX);
    expect(granted, 'a bare shelf has something to give').not.toBeNull();
    expect(perkAt(HEX)).toBe(granted?.perk.id);
  });

  it('says nothing where nothing will be granted', () => {
    // A daily and a shared seed grant no perk, and their receipt has its own
    // honest sentence for that ("only on your own world"). A `perkAt` that
    // answered here would name a perk the player is never given.
    aim({ progress: EMPTY_PROGRESS, seed: SEED, grants: false });
    expect(perkAt(HEX)).toBeNull();
  });

  it('says nothing on a full shelf, exactly as the grant refuses', () => {
    const full = { ...EMPTY_PROGRESS, found: PERKS.map((p) => p.id) };
    aim({ progress: full, seed: SEED, grants: true });
    expect(grantFind(full, SEED, HEX), 'the grant refuses a full shelf').toBeNull();
    expect(perkAt(HEX)).toBeNull();
  });

  it('follows the shelf, so a second find is a different perk', () => {
    aim({ progress: EMPTY_PROGRESS, seed: SEED, grants: true });
    const first = perkAt(HEX);
    expect(first).not.toBeNull();
    // Once that one is carried, the same hex can no longer be it — which is
    // the rule `grantFind` keeps and the reason the shelf has to travel.
    aim({ progress: { ...EMPTY_PROGRESS, found: [first!] }, seed: SEED, grants: true });
    expect(perkAt(HEX)).not.toBe(first);
  });

  it('knows whether the perk is already worn', () => {
    aim({ progress: EMPTY_PROGRESS, seed: SEED, grants: true });
    const perk = perkAt(HEX)!;
    expect(wornPerk(perk)).toBe(false);
    aim({ progress: { ...EMPTY_PROGRESS, equipped: [perk] }, seed: SEED, grants: true });
    expect(wornPerk(perk)).toBe(true);
  });

  it('promises nothing before a board has aimed it', () => {
    expect(perkAt(HEX)).toBeNull();
  });
});
