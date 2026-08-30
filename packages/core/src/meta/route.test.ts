import { describe, expect, it } from 'vitest';

import { DAILY_FIRST } from '@meta/daily';
import { HOME, parseRoute } from '@meta/route';

describe('parseRoute', () => {
  it('reads an empty search as home', () => {
    expect(parseRoute('')).toEqual(HOME);
    expect(parseRoute('?')).toEqual(HOME);
  });

  it('reads a shared seed', () => {
    expect(parseRoute('?seed=7').seed).toBe(7);
  });

  it('truncates a fractional seed rather than passing it on', () => {
    // The engine seeds from an integer; a hand-typed 7.9 must open the same
    // world as 7 rather than something no other phone can reproduce.
    expect(parseRoute('?seed=7.9').seed).toBe(7);
    expect(parseRoute('?seed=-7.9').seed).toBe(-7);
  });

  it('refuses a seed that is not a number', () => {
    expect(parseRoute('?seed=banana').seed).toBeNull();
    expect(parseRoute('?seed=Infinity').seed).toBeNull();
  });

  /**
   * Pinned as SHIPPED, not as designed: `Number('')` is 0, so a hand-typed
   * `?seed=` has always opened seed 0 as a shared run. Nothing generates that
   * link — `shareOf` always writes a real number — and this refactor moved the
   * parser without changing it. Written down here so the next person meets it
   * as a decision rather than a surprise.
   */
  it('reads a bare ?seed= as seed 0, as it always has', () => {
    expect(parseRoute('?seed=').seed).toBe(0);
  });

  it('reads a playable daily date', () => {
    expect(parseRoute(`?daily=${DAILY_FIRST}`).daily).toBe(DAILY_FIRST);
  });

  it('refuses garbage and unplayable dates — a URL is not a promise', () => {
    expect(parseRoute('?daily=yesterday').daily).toBeNull();
    expect(parseRoute('?daily=2026-13-40').daily).toBeNull();
    // Before the daily shipped: a real date, but never a daily.
    expect(parseRoute('?daily=1999-01-01').daily).toBeNull();
  });

  it('reads camp only as exactly 1', () => {
    expect(parseRoute('?camp=1').camp).toBe(true);
    expect(parseRoute('?camp=true').camp).toBe(false);
    expect(parseRoute('?camp=0').camp).toBe(false);
  });

  it('ignores the device rig entirely', () => {
    expect(parseRoute('?ff=debug.overlay&theme=daylight&hex=flat')).toEqual(HOME);
  });
});
