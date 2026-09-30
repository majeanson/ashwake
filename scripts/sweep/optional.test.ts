import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { optionalSweep } from './optional';
import { ROOT, workspace } from './program';

const FIXTURE = join(ROOT, 'scripts', 'sweep', 'fixtures', 'shared-name');

/**
 * `NEXT.md` §4 (found 2026-09-29): a same-NAMED key in an unrelated literal
 * silenced a real "nothing supplies this". The caravan wrote
 * `{ index, kind, from, until }` into a `CaravanAsk`, and the ruling on
 * `allow.ts#Ruling.until` stopped matching. The fault was `keys.ts` reading
 * every object-literal key as unattributable; the fixture is that shape.
 */
describe('the optional pass', () => {
  const w = workspace(['ruling.ts', 'ask.ts', 'bars.ts'].map((f) => join(FIXTURE, f)));
  const ids = optionalSweep(w).map((f) => f.id);
  const at = (file: string, symbol: string): string =>
    `scripts/sweep/fixtures/shared-name/${file}#${symbol}`;

  it('reports an option nobody supplies, whatever else shares its name', () => {
    expect(ids).toContain(at('ruling.ts', 'Ruling.until'));
  });

  it('keeps counting the genuine suppliers', () => {
    expect(ids).not.toContain(at('ask.ts', 'Ask.until'));
    expect(ids).not.toContain(at('ask.ts', 'Cap.until'));
    expect(ids).not.toContain(at('ask.ts', 'Bar.paint'));
  });

  it('reports nothing else', () => {
    expect(ids).toEqual([at('ruling.ts', 'Ruling.until')]);
  });
});
