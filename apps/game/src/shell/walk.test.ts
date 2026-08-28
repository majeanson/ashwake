import { describe, expect, it } from 'vitest';
import { pickLocale } from '@content/locale';
import { stringsFor } from '@text/index';
import { resolveTheme } from '@theme/index';
import { createSession } from './store';
import { walk } from './walk';

/**
 * The fixed hand: the same seed plays the same twelve placements, or a
 * screenshot of one camera angle is not comparable with a screenshot of
 * another.
 */

const session = (seed: number) =>
  createSession({
    seed,
    theme: resolveTheme(null),
    strings: stringsFor(pickLocale(['en'])),
  });

const played = (snap: ReturnType<ReturnType<typeof session>['get']>): string =>
  snap.board.cells
    .filter((c) => c.kind === 'tile')
    .map((c) => `${c.key}:${c.colour ?? '-'}`)
    .sort()
    .join(' ');

describe('the fixed hand', () => {
  it('plays the same board twice on the same seed', () => {
    const a = session(7);
    const b = session(7);
    walk(a, 12);
    walk(b, 12);
    expect(played(a.get())).toBe(played(b.get()));
    expect(a.get().board.cells.filter((c) => c.kind === 'tile').length).toBeGreaterThan(1);
  });

  it('plays a different board on a different seed', () => {
    const a = session(7);
    const b = session(8);
    walk(a, 12);
    walk(b, 12);
    expect(played(a.get())).not.toBe(played(b.get()));
  });

  it('does nothing at zero, and stops rather than spinning when the run stalls', () => {
    const idle = session(7);
    const before = played(idle.get());
    walk(idle, 0);
    expect(played(idle.get())).toBe(before);
    // Far more steps than a run has placements: it must return, not hang.
    const long = session(7);
    walk(long, 5000);
    expect(long.get().hud).toBeDefined();
  });
});
