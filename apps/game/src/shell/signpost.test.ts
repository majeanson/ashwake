import { describe, expect, it } from 'vitest';
import { pickLocale } from '@content/locale';
import { stringsFor } from '@text/index';
import { resolveTheme } from '@theme/index';
import { createSession } from './store';
import { signpostFor } from './signpost';
import { walk } from './walk';

/**
 * The destination signpost.
 *
 * The four rules that matter are the four this can be wrong about, and every
 * one of them is a rule Ashwake 1 paid for: it primes rather than greets, it
 * only speaks on a change, it stays silent until RIPE is taught, and it says
 * nothing at all where the core has nothing to point at.
 *
 * The last test is the one that would have caught the gap this file exists to
 * close: the core really does produce a hint on a walked board, so a body that
 * never reads it is throwing a live sentence away every few placements.
 */

const s = stringsFor(pickLocale(['en']));
const session = () => createSession({ seed: 7, theme: resolveTheme(null), strings: s });

describe('the signpost', () => {
  it('primes silently on the first look of a run', () => {
    expect(signpostFor({ hint: 'a CACHE, 5 out', last: undefined, knowsRipe: true })).toBeNull();
  });

  it('speaks when the nearest destination changes', () => {
    expect(signpostFor({ hint: 'a SHRINE, 3 out', last: 'a CACHE, 5 out', knowsRipe: true })).toBe(
      'a SHRINE, 3 out.',
    );
  });

  it('says nothing while the same thing is still nearest', () => {
    const same = 'a CACHE, 5 out';
    expect(signpostFor({ hint: same, last: same, knowsRipe: true })).toBeNull();
  });

  it('stays quiet until RIPE has been taught', () => {
    expect(
      signpostFor({ hint: 'a CACHE, 5 out', last: 'a SITE, 9 out', knowsRipe: false }),
    ).toBeNull();
  });

  it('says nothing where there is nothing to point at', () => {
    expect(signpostFor({ hint: null, last: 'a CACHE, 5 out', knowsRipe: true })).toBeNull();
  });

  it('has something real to say on a walked board', () => {
    const sess = session();
    walk(sess, 12);
    const { hint } = sess.get().hud;
    expect(hint, 'the core computes a hint the shell never read').not.toBeNull();
    expect(signpostFor({ hint, last: null, knowsRipe: true })).toBe(`${hint}.`);
  });
});
