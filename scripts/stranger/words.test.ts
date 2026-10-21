import { describe, expect, it } from 'vitest';
import { stringsFor } from '../../packages/core/src/text/index';
import { SETTLEMENT } from '../../packages/core/src/theme/themes/settlement';
import { renderScreen } from './screen';
import { apply, begin, lessonByName, newTable, snapshot } from './shell';

const s = stringsFor('fr-CA');
const theme = SETTLEMENT;

/**
 * What the strangers found wrong with the screen, pinned (2026-10-21,
 * `LOG.md` Session 140): the words a reader types, and the numbers the phone
 * does not show.
 */

describe('the manual, as a reader asks for it', () => {
  it('opens a section by its id, its name without accents, or a word it answers to', () => {
    expect(lessonByName('L’EXPÉDITION', s)).toBe('expedition');
    expect(lessonByName("L'EXPEDITION", s)).toBe('expedition');
    expect(lessonByName('expedition', s)).toBe('expedition');
    expect(lessonByName('mur', s)).toBe('expedition');
    expect(lessonByName('MÛR', s)).toBe('ripe');
    expect(lessonByName('recolter', s)).toBe('pop');
    expect(lessonByName('CACHE', s)).toBe('map');
    expect(lessonByName('', s)).toBeNull();
    expect(lessonByName('voler', s)).toBeNull();
  });
});

describe('the numbers on the board', () => {
  it('shows a tile’s worth only once it is ripe, and a preview only above zero — `labelFor`’s rule', () => {
    let turn = begin(newTable('silent', 1), s, theme);
    // Six tiles around the start ripen it.
    for (const hex of ['1,0', '1,-1', '0,-1', '-1,0', '-1,1', '0,1']) {
      turn = apply(turn.table, { name: 'poser', index: 0, hex }, s, theme);
    }
    const snap = snapshot(turn.table, s);
    const screen = renderScreen(turn.table, snap, s, theme);
    const tilesLine = screen.split('\n').find((l) => l.startsWith('  tuiles :'))!;
    const entries = tilesLine.replace('  tuiles : ', '').split(' · ');
    const ripe = entries.filter((e) => e.endsWith('*') || e.includes('* '));
    const unripe = entries.filter((e) => !e.includes('*'));
    expect(ripe.length).toBeGreaterThan(0);
    for (const e of ripe) expect(e).toMatch(/\(\d+\)\*/);
    for (const e of unripe) expect(e).not.toMatch(/\(/);
    // A legal edge with no worth for the chosen tile prints no number at all.
    const legalLine = screen.split('\n').find((l) => l.includes('arêtes lumineuses'))!;
    expect(legalLine).not.toContain('(+0)');
    expect(legalLine).not.toMatch(/\(\+\d+\.\d/);
  });
});
