import { COLOURS, type Colour, type Tuning } from '@content/tuning';
import { namesOf, type Theme } from '@theme/tokens';
import type { Strings } from '@text/Strings';
import { colourLesson } from './view';

/**
 * CHOOSING A GROUND (2026-10-12, Marc: _"add more strategy in how to play
 * towards colours … each colour could have their own explanation + general
 * strategy"_).
 *
 * The rules of the four grounds already had three doors (the colour card, the
 * hand's tap answer, the manual's THE FOUR GROUNDS rows) and all three say
 * what a ground DOES. None said when to take it, which is the question a
 * player has every hand. This is that, as a pure builder like the lessons are:
 * the RULE of each ground is `colourLesson` itself, so the tab and the card
 * cannot describe a ground two ways, and the advice is the catalogue's, in
 * this run's own numbers.
 *
 * **A ground whose power is zeroed is not taught** — `colourLesson` returns
 * null and the ground is left out, advice and all, the same contract the card
 * keeps. Nothing here is a rule: every figure below is derived from the
 * tuning, not restated, so a rebalance moves the tab with it.
 */

type GroundAdvice = {
  readonly colour: Colour;
  /** What it does: `colourLesson`, verbatim. */
  readonly rule: string;
  /** When to take it. */
  readonly pick: string;
  /** What undoes it. */
  readonly watch: string;
};

type GroundGuide = {
  readonly head: string;
  readonly pickWhen: string;
  readonly watchFor: string;
  /** Advice that holds for every ground, one sentence each. */
  readonly general: readonly string[];
  readonly grounds: readonly GroundAdvice[];
};

/** A hex has six sides, and every figure below is "all six paying". */
const SIDES = 6;

export function groundGuide(t: Tuning, theme: Theme, s: Strings): GroundGuide {
  const names = namesOf(theme, s.locale);
  const x = s.strategy;
  const advice: Record<Colour, { pick: string; watch: string }> = {
    green: {
      // Six green sides pay six matches, and every one past the first a crowd
      // bonus on top.
      pick: x.green.pick(t.greenCrowdBonus, SIDES + (SIDES - 1) * t.greenCrowdBonus),
      watch: x.green.watch,
    },
    yellow: {
      // Every neighbouring tile pays yellow: a match if it shares the colour,
      // company if not. A full ring is therefore six times the larger of the
      // two — but only where company counts every stranger; counting distinct
      // colours caps it at three, and there is no single figure to quote.
      pick: x.yellow.pick(t.yellowCompanyAll ? SIDES * Math.max(1, t.yellowCompanyBonus) : null),
      watch: x.yellow.watch,
    },
    red: { pick: x.red.pick(t.redAshWalls), watch: x.red.watch },
    blue: {
      pick: x.blue.pick(t.blueTideEvery, t.blueTideCap),
      watch: x.blue.watch(t.blueTideCap),
    },
  };
  return {
    head: x.head,
    pickWhen: x.pickWhen,
    watchFor: x.watchFor,
    general: [
      x.general.pocket,
      x.general.compare(names),
      x.general.stone(t.redAshMatches ? names.red : null),
      x.general.distance,
      x.general.hand,
    ],
    grounds: COLOURS.flatMap((colour): GroundAdvice[] => {
      const rule = colourLesson(colour, t, theme, s);
      return rule === null ? [] : [{ colour, rule, ...advice[colour] }];
    }),
  };
}
