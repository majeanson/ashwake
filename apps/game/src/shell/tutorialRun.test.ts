import { describe, expect, it } from 'vitest';
import { LEARN_SEED } from '@content/learn';
import { EMPTY_PROGRESS, meet, type Progress } from '@meta/progress';
import { pickLocale } from '@content/locale';
import { key } from '@engine/hex';
import { stringsFor } from '@text/index';
import { resolveTheme } from '@theme/index';
import { NO_MEMORY } from './storage';
import { createSession } from './store';
import { isTutorialRun, tutorialDoor } from './tutorialRun';

/**
 * THE TUTORIAL IS THE SAME EVERY TIME (2026-10-13, Marc: _"similar to a daily
 * we reset fog in tutorial so it's always the same"_).
 */
const over: Progress = meet(meet(EMPTY_PROGRESS, 'walked'), 'toured');

describe('the tutorial run', () => {
  it('is a run on the chosen seed until the first run has ended, and never another seed', () => {
    expect(isTutorialRun(LEARN_SEED, EMPTY_PROGRESS)).toBe(true);
    expect(isTutorialRun(LEARN_SEED, meet(EMPTY_PROGRESS, 'walked'))).toBe(true);
    expect(isTutorialRun(LEARN_SEED, over)).toBe(false);
    expect(isTutorialRun(LEARN_SEED + 1, EMPTY_PROGRESS)).toBe(false);
  });

  it('is handed a world nobody has played: no fog, no claims, no finds, nothing re-armed', () => {
    const door = tutorialDoor();
    expect(door.memory.revealed).toEqual([]);
    expect(door.memory.claimed).toEqual([]);
    expect(door.memory.finds).toEqual([]);
    expect(door.memory.rearmed).toEqual({});
    // A fresh world deals its chosen deal, not a later run's fresh one.
    expect('deal' in door.memory).toBe(false);
  });

  it('is the same every time it is asked', () => {
    expect(tutorialDoor()).toEqual(tutorialDoor());
  });

  it('clears the fog a world had kept, on the board itself', () => {
    // A world that has revealed a disc of ground, handed to a session the way
    // NEW RUN hands it...
    const fog = [];
    for (let q = -12; q <= 12; q++) {
      for (let r = Math.max(-12, -q - 12); r <= Math.min(12, -q + 12); r++) fog.push(key(q, r));
    }
    const session = createSession({
      seed: LEARN_SEED,
      theme: resolveTheme(null),
      strings: stringsFor(pickLocale(['en'])),
      memory: { ...NO_MEMORY, revealed: fog },
    });
    const remembered = () => session.get().board.cells.filter((c) => c.remembered).length;
    expect(remembered(), 'the fixture world showed no fog to clear').toBeGreaterThan(0);

    // ...and then the tutorial's door, which is what a replay and a restart use.
    const door = tutorialDoor();
    session.restart(LEARN_SEED, null, door.memory, door.economy, null, false);
    expect(remembered()).toBe(0);
  });
});
