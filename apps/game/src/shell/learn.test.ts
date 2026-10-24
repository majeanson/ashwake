import { describe, expect, it } from 'vitest';
import { LEARN_SEED } from '@content/learn';
import { pickLocale } from '@content/locale';
import { stringsFor } from '@text/index';
import { resolveTheme } from '@theme/index';
import type { Tuning } from '@content/tuning';
import { economyFor } from './economy';
import { createSession } from './store';
import { walk } from './walk';

/**
 * The first world is a chosen one (2026-10-12) — see `content/learn.ts` for why
 * and for what was looked for. This pins what was found, because the board is
 * a pure function of a seed AND of the rules, and a rule that moves the ground
 * or the deal would otherwise turn a tutorial into a different board without
 * anything failing.
 *
 * Measured the way the search measured it: the bot, one placement at a time,
 * noting the first placement at which each thing is in view.
 */
const firstSeen = (
  seed: number,
  steps: number,
  tuning?: Tuning,
): { first: Record<string, number>; best: number[] } => {
  const s = createSession({
    seed,
    theme: resolveTheme(null),
    strings: stringsFor(pickLocale(['en'])),
    ...(tuning === undefined ? {} : { tuning }),
  });
  const first: Record<string, number> = {};
  const best: number[] = [];
  const note = (k: string, i: number): void => {
    first[k] ??= i;
  };
  const look = (i: number): void => {
    const { board, hud } = s.get();
    for (const c of board.cells) {
      if (c.kind === 'landmark' && !c.claimed && c.landmark !== null) note(c.landmark, i);
      if (c.kind === 'wall') note('wall', i);
    }
    if (hud.canHarvest) note('pop', i);
    // The best ANY card in the hand can do anywhere it may go: the same
    // numbers the board prints, read one card at a time.
    const selected = Math.max(
      0,
      hud.draft.findIndex((d) => d.selected),
    );
    let top = 0;
    for (let k = 0; k < hud.draft.length; k++) {
      s.dispatch({ type: 'SELECT', index: k });
      for (const c of s.get().board.cells) if (c.legal) top = Math.max(top, c.preview ?? 0);
    }
    s.dispatch({ type: 'SELECT', index: selected });
    best.push(top);
    if (hud.draft.some((d) => d.rarity !== 'common')) note('rare', i);
  };
  look(0);
  for (let i = 1; i <= steps; i++) {
    walk(s, 1);
    look(i);
  }
  return { first, best };
};

describe('the chosen first world', () => {
  const { first: seen, best } = firstSeen(LEARN_SEED, 30);
  const at = (k: string): number => seen[k] ?? Infinity;

  it('shows a wall and a cache early, so there is ground to name and somewhere to go', () => {
    expect(at('wall')).toBeLessThanOrEqual(6);
    expect(at('cache')).toBeLessThanOrEqual(10);
  });

  it('lets the first pocket be popped between the 8th and 14th placement', () => {
    expect(at('pop')).toBeGreaterThanOrEqual(8);
    expect(at('pop')).toBeLessThanOrEqual(14);
  });

  it('puts a site a short way off, as a goal', () => {
    expect(at('site')).toBeLessThanOrEqual(16);
  });

  it('deals a poor hand within eight placements of the first pop, so REDRAW has its moment', () => {
    const from = at('pop') + 1;
    const dips = best.slice(from, from + 8).filter((worth) => worth > 0 && worth <= 2);
    expect(dips.length).toBeGreaterThan(0);
  });

  it('keeps the things that earn a NEW chip out of the first twenty-four', () => {
    expect(at('shrine')).toBeGreaterThan(24);
    expect(at('territory')).toBeGreaterThan(24);
    expect(at('rare')).toBeGreaterThan(14);
  });
});

/**
 * The same board, as the tutorial a daily link sends a stranger to (2026-10-19):
 * a daily's economy with no magic tiles and no caravan (`economyFor`'s
 * `learn`). The ground is the same seed, so the walk's moments must still land.
 */
describe('the chosen first world, as the daily link’s tutorial', () => {
  const tuning = economyFor({ kind: 'learn' });
  const { first: seen } = firstSeen(LEARN_SEED, 30, tuning);
  const at = (k: string): number => seen[k] ?? Infinity;

  it('keeps the walk’s moments: a wall, a cache, and a first pop in the same window', () => {
    expect(at('wall')).toBeLessThanOrEqual(6);
    expect(at('cache')).toBeLessThanOrEqual(10);
    expect(at('pop')).toBeGreaterThanOrEqual(8);
    expect(at('pop')).toBeLessThanOrEqual(14);
  });

  it('deals no magic tile and brings no caravan, all run long', () => {
    expect(at('rare')).toBe(Infinity);
    const s = createSession({
      seed: LEARN_SEED,
      theme: resolveTheme(null),
      strings: stringsFor(pickLocale(['en'])),
      tuning,
    });
    for (let i = 0; i < 40; i++) {
      walk(s, 1);
      expect(s.get().hud.caravan).toBeNull();
      expect(s.get().hud.draft.every((d) => d.rarity === 'common')).toBe(true);
    }
  });
});
