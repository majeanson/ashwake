import { describe, expect, it } from 'vitest';
import { TUNING } from '@content/tuning';
import { enterRun, type Door, type Wiring } from './beginning';
import type { Session } from './store';

/**
 * THE DOOR, AND THE ORDER IT PUTS THINGS DOWN IN (2026-09-09).
 *
 * `enterRun` is the one place every way into a run passes through, and three
 * bugs in three sessions were all the same thing: a flag whose lifetime was
 * wrong. `Session.detour` was fixed for the life of the PAGE, so a shared
 * link's flag survived into the player's own world. RESET ALL cleared four
 * things and not `daily`, so a private run banked as today's shared score.
 * `note` — the strip over the board — was cleared by nothing at all, so the
 * first frame of a new run carried the last run's last sentence.
 *
 * A door is not testable by reading it: what matters is that every flag is set
 * and that the ORDER holds, and both are invisible from inside any one caller.
 * So this hands `enterRun` a wiring of spies and asserts the sequence.
 *
 * It is deliberately not a test of what each hand DOES — every one of those has
 * its own test. It is a test that the door still calls all of them, in an order
 * where nothing is undone by the step after it.
 */

type Call = readonly [string, ...unknown[]];

const spies = () => {
  const calls: Call[] = [];
  const spy =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([name, ...args]);
    };
  const session = {
    theme: null,
    strings: null,
    detour: false,
    get: () => null,
    subscribe: () => () => undefined,
    dispatch: spy('dispatch'),
    restart: spy('restart'),
  } as unknown as Session;
  const w: Wiring = {
    session,
    setDaily: spy('setDaily'),
    forgetEnding: spy('forgetEnding'),
    forgetWorld: spy('forgetWorld'),
    saidOnce: { current: new Set(['pop' as never]) },
    startedFrom: { current: { reach: 9, perks: [], unlocks: [] } },
    banked: { current: {} as never },
    setLens: spy('setLens'),
    forgetNote: spy('forgetNote'),
    setWalking: spy('setWalking'),
    leaveMenus: spy('leaveMenus'),
    frameTheRun: spy('frameTheRun'),
    begin: spy('begin'),
    wentAgain: spy('wentAgain'),
  };
  return { w, calls, names: () => calls.map((c) => c[0]) };
};

const DOOR: Door = {
  daily: null,
  resume: null,
  seed: 4242,
  memory: undefined,
  economy: TUNING,
  wakeAt: null,
  from: { reach: 0, perks: [], unlocks: [] },
  detour: false,
  keepsWorld: false,
  fromMenus: true,
};

const at = (names: readonly string[], name: string) => names.indexOf(name);

describe('every door into a run', () => {
  it('points the keeper at the place BEFORE the board exists', () => {
    const { w, names } = spies();
    enterRun(w, DOOR);
    // The keeper is made from the place, and nothing may write before it
    // points at the right one — a run written to the wrong place is the
    // corruption the seed guards exist to refuse.
    expect(at(names(), 'setDaily')).toBeLessThan(at(names(), 'restart'));
  });

  it('clears what the SCREEN carried over before the arrival speaks', () => {
    const { w, names } = spies();
    enterRun(w, DOOR);
    // `begin` says the arrival line, and on a veteran device it may say
    // nothing at all — which is how the last run's note came to stand over the
    // first frame of the next one. Clearing after `begin` would delete what
    // the arrival just said; clearing before it is the only order that works.
    for (const hand of ['setLens', 'forgetNote', 'setWalking']) {
      expect(at(names(), hand), hand).toBeGreaterThan(-1);
      expect(at(names(), hand), hand).toBeLessThan(at(names(), 'begin'));
    }
  });

  it('puts the last run down before starting this one', () => {
    const { w, names } = spies();
    enterRun(w, DOOR);
    expect(at(names(), 'forgetEnding')).toBeLessThan(at(names(), 'restart'));
  });

  it('frames the board only once there is one, and marks the gate last', () => {
    const { w, names } = spies();
    enterRun(w, DOOR);
    expect(at(names(), 'restart')).toBeLessThan(at(names(), 'begin'));
    expect(at(names(), 'begin')).toBeLessThan(at(names(), 'frameTheRun'));
    expect(at(names(), 'wentAgain')).toBe(names().length - 1);
  });

  it('resets the per-run refs, all three of them', () => {
    const { w } = spies();
    enterRun(w, DOOR);
    expect(w.saidOnce.current.size, 'a sentence said once stayed said').toBe(0);
    expect(w.startedFrom.current, 'the run measured against the last one').toBe(DOOR.from);
    expect(w.banked.current, 'the next ending could not bank').toBeNull();
  });

  /**
   * `detour` reaches the session, and that is the whole 2026-09-09 fix: it used
   * to be fixed at boot, so every door out of a shared link left it set and
   * fourteen readers answered for the wrong run.
   */
  it('tells the session whether THIS run is on a foreign board', () => {
    const { w, calls } = spies();
    enterRun(w, { ...DOOR, detour: true });
    const restart = calls.find((c) => c[0] === 'restart');
    expect(restart?.[6], 'the door did not pass its own detour flag').toBe(true);
  });

  it('lets go of the held world, except for the crossing that just minted one', () => {
    const plain = spies();
    enterRun(plain.w, DOOR);
    expect(plain.names()).toContain('forgetWorld');

    const crossing = spies();
    enterRun(crossing.w, { ...DOOR, keepsWorld: true });
    // The crossing hands the new world to the keeper itself, so letting go
    // would throw away the only copy that exists.
    expect(crossing.names(), 'the crossing dropped the world it just minted').not.toContain(
      'forgetWorld',
    );
  });

  it('closes the panels only when it was pressed from inside one', () => {
    const menus = spies();
    enterRun(menus.w, DOOR);
    expect(menus.names()).toContain('leaveMenus');

    const board = spies();
    enterRun(board.w, { ...DOOR, fromMenus: false });
    expect(board.names()).not.toContain('leaveMenus');
  });
});
