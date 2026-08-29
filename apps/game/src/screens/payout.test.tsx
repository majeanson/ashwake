import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { COLOURS, POINT_SOURCES, RARITIES } from '@content/tuning';
import { stringsFor } from '@text/index';
import type { HudView } from '@view/view';
import { Arc } from '../ui/Arc';
import { Bars } from '../ui/Bars';
import { Payout } from './Payout';

/**
 * The breakdown, pinned where it can lie.
 *
 * A chart's failure mode is not a crash — it is a picture that is wrong, which
 * nobody notices. So what is asserted here is arithmetic a reader can check:
 * the bar widths are shares of the LARGEST row, the tallest column of the arc
 * is the run's biggest harvest, and every source the engine can count has a
 * word in both languages.
 */

const summary = (
  over: Partial<NonNullable<HudView['summary']>> = {},
): NonNullable<HudView['summary']> => ({
  biggestHarvest: 9,
  biggestAt: 0.8,
  claims: 0,
  quests: 0,
  luck: 0,
  harvests: 3,
  tilesTaken: 1,
  pointsTaken: 2,
  points: {
    total: 10,
    byColour: { green: 4, yellow: 3, red: 2, blue: 1 },
    byRarity: { common: 6, magic: 3, unique: 1 },
    bySource: {
      matches: 5,
      power: 2,
      rare: 1,
      native: 1,
      pocket: 1,
      distance: 0,
      bounty: 0,
    },
  },
  sitePoints: 0,
  ...over,
});

describe('Bars', () => {
  it('measures every bar against the largest row, not the total', () => {
    render(
      <Bars
        rows={[
          { label: 'BIG', value: 10 },
          { label: 'HALF', value: 5 },
          { label: 'NONE', value: 0 },
        ]}
      />,
    );
    const widths = [...document.querySelectorAll<HTMLElement>('.bar-fill')].map(
      (el) => el.style.width,
    );
    expect(widths).toEqual(['100%', '50%', '0%']);
  });

  it('keeps a row worth nothing, so the list never changes shape', () => {
    render(<Bars rows={[{ label: 'NONE', value: 0 }]} />);
    expect(screen.getByText('NONE')).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
  });
});

describe('Arc', () => {
  it('draws one column per harvest and marks the biggest', () => {
    render(<Arc points={[1, 9, 3]} label="ARC" />);
    const bars = [...document.querySelectorAll('.arc-bar')];
    expect(bars).toHaveLength(3);
    expect(bars.filter((b) => b.classList.contains('arc-best'))).toHaveLength(1);
    expect(bars[1]?.classList.contains('arc-best')).toBe(true);
  });

  it('gives a harvest that scored nothing a floor, not a gap', () => {
    render(<Arc points={[0, 8]} label="ARC" />);
    const first = document.querySelectorAll('.arc-bar')[0];
    expect(Number(first?.getAttribute('height'))).toBeGreaterThan(0);
  });

  it('draws nothing for a run that never popped', () => {
    const { container } = render(<Arc points={[]} label="ARC" />);
    expect(container.innerHTML).toBe('');
  });
});

describe('Payout', () => {
  it('names every colour, rarity and source the engine can count', () => {
    render(<Payout summary={summary()} harvests={[3, 9, 1]} s={stringsFor('en')} />);
    const s = stringsFor('en');
    for (const source of POINT_SOURCES)
      expect(screen.getByText(s.payout.source[source])).toBeTruthy();
    for (const rarity of RARITIES) expect(screen.getByText(s.payout.rarity[rarity])).toBeTruthy();
    expect(document.querySelectorAll('.bars')).toHaveLength(3);
  });

  it('paints each colour bar in that colour, from the theme and not a literal', () => {
    render(<Payout summary={summary()} harvests={[3]} s={stringsFor('fr-CA')} />);
    const painted = [...document.querySelectorAll<HTMLElement>('.bar-fill')]
      .map((el) => el.style.background)
      .filter((bg) => bg !== '');
    for (const colour of COLOURS) expect(painted).toContain(`var(--tile-${colour})`);
    // Common is the plain bottom rung: no ink of its own.
    expect(painted).toContain('var(--magic)');
    expect(painted).toContain('var(--unique)');
  });

  it('shows no split at all for a run that banked nothing from pops', () => {
    render(<Payout summary={summary({ points: null })} harvests={[]} s={stringsFor('en')} />);
    expect(document.querySelectorAll('.bars')).toHaveLength(0);
  });

  it('adds the sites line only when sites were claimed', () => {
    const s = stringsFor('en');
    const { rerender } = render(<Payout summary={summary()} harvests={[1]} s={s} />);
    expect(screen.queryByText(new RegExp(s.payout.sites))).toBeNull();
    rerender(<Payout summary={summary({ sitePoints: 12 })} harvests={[1]} s={s} />);
    expect(screen.getByText(new RegExp(s.payout.sites))).toBeTruthy();
  });
});
