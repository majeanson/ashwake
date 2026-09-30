import { describe, expect, it } from 'vitest';
import { pickLocale } from '@content/locale';
import { TUNING } from '@content/tuning';
import { WARE_IDS } from '@content/caravan';
import { answers, caravanVisitAt, waresOnSale } from '@engine/caravan';
import { newRun, reduce } from '@engine/reduce';
import { harvestValue, legalPlacements, ripeClusters } from '@engine/rules';
import type { GameState } from '@engine/state';
import { stringsFor } from '@text/index';
import { SETTLEMENT } from '@theme/themes/settlement';
import { lessonDetail, lessonLines, lessonOf } from './lessons';
import { harvestNote, pocketNote, toHudView } from './view';

/**
 * THE HIDDEN CARAVAN, as the player reads it (2026-09-30). Marc: _"remove ui
 * that displays when the caravan arrives and its points … a 'caravan is in
 * town' and 'caravan left town' so people can try their pop"_. So the screen
 * may say where it is and what a pop did — never, before the pop, what it
 * wants.
 */
const s = stringsFor(pickLocale(['en']));
const at = (state: GameState, placements: number): GameState => ({ ...state, placements });

/** The first placement a visit no longer stands at, found by walking the rule. */
const leaves = (seed: number, visit: { index: number; from: number }): number => {
  let p = visit.from;
  while (caravanVisitAt(seed, p, TUNING)!.index === visit.index) p++;
  return p;
};

/** A run with a pocket of three or more ripe on it, and that pocket. */
function ripe(seed: number): { state: GameState; pocket: string[] } {
  let state: GameState = newRun(seed, TUNING);
  for (let i = 0; i < 300; i++) {
    const pocket = ripeClusters(state.cells).find((p) => p.length >= 3);
    if (pocket !== undefined) return { state, pocket };
    const hex = legalPlacements(state.cells, state.tuning)[0];
    if (hex === undefined) break;
    state = reduce(reduce(state, { type: 'SELECT', index: 0 }), { type: 'PLACE', hex });
  }
  throw new Error(`seed ${seed} grew no pocket of 3`);
}

describe('where the caravan is', () => {
  it('is on its way, then in town, then gone — from the run itself', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const run = newRun(seed, TUNING);
      const first = caravanVisitAt(seed, 0, TUNING)!;
      expect(toHudView(at(run, 0), s).caravan).toBe('coming');
      expect(toHudView(at(run, first.from), s).caravan).toBe('town');
      expect(toHudView(at(run, leaves(seed, first)), s).caravan).toBe('left');
      // Answered, it leaves town at once.
      const met = { ...at(run, first.from), caravan: { ...run.caravan, met: [first.index] } };
      expect(toHudView(met, s).caravan).toBe('left');
    }
    expect(toHudView(newRun(1, { ...TUNING, caravanEvery: 0 }), s).caravan).toBeNull();
  });
});

describe('what a pop in town says', () => {
  it('takes the pocket that fits, passes on one that does not, and never said which', () => {
    let took = 0;
    let passed = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const { state, pocket } = ripe(seed);
      // Stand the run inside each of its first visits in turn.
      for (let n = 0, p = 0; n < 6; n++) {
        const visit = caravanVisitAt(seed, p, TUNING)!;
        const inTown = at(state, visit.from);
        const value = harvestValue(inTown, pocket[0]);
        const note = harvestNote(inTown, 'tiles', value, s);
        if (answers(value.count, visit.kind)) {
          expect(note).toContain(s.caravan.answered(1));
          took++;
        } else {
          expect(note).toContain(s.caravan.passed);
          passed++;
        }
        // Before the pop, nothing on the pocket names the caravan.
        expect(pocketNote(inTown, pocket[0]!, s)).not.toMatch(/caravan/i);
        // And a pop out of town says nothing of it at all.
        const away = at(state, leaves(seed, visit));
        if (toHudView(away, s).caravan !== 'town')
          expect(harvestNote(away, 'tiles', harvestValue(away, pocket[0]), s)).not.toMatch(
            /caravan/i,
          );
        p = leaves(seed, visit);
      }
    }
    expect(took).toBeGreaterThan(0);
    expect(passed).toBeGreaterThan(0);
  });
});

describe('what the manual says of it', () => {
  it('lists exactly the wares an offer can draw, in their picker words', () => {
    // 2026-09-30: the DETAILS fold lists the wares, so a ware the picker can
    // show and the manual cannot, or the reverse, is a rule said two ways.
    const lesson = lessonOf('caravan')!;
    const detail = lessonDetail(lesson, TUNING, SETTLEMENT, s);
    for (const ware of WARE_IDS) {
      const line = s.lesson.caravan.ware(s.caravan.ware[ware].name, s.caravan.ware[ware].note);
      expect(detail.includes(line)).toBe(waresOnSale(TUNING).includes(ware));
    }
    // With the caravan off, the section still says what it is, and no more.
    const off = { ...TUNING, caravanEvery: 0 };
    expect(lessonDetail(lesson, off, SETTLEMENT, s)).toEqual([]);
    expect(lessonLines(lesson, off, SETTLEMENT, s).length).toBeGreaterThan(0);
  });
});
