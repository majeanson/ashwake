import { describe, expect, it } from 'vitest';
import { pickLocale } from '@content/locale';
import { stringsFor } from '@text/index';
import { resolveTheme } from '@theme/index';
import { createSession } from './store';
import { onceARun, type OnceId } from './onceARun';
import { walk } from './walk';

/**
 * The two things a run says once.
 *
 * Not teaching: the teaching ledger is a DEVICE fact, and these are true
 * afresh every run. The one that has to be right is NEW GROUND — measured
 * against the world's reach as it was when the run BEGAN, because the world's
 * memory is kept current by the shell's merge, and reading it live would move
 * the boundary the moment a run crossed it.
 */

const s = stringsFor(pickLocale(['en']));
const session = () => createSession({ seed: 7, theme: resolveTheme(null), strings: s });

const none: ReadonlySet<OnceId> = new Set();

describe('once a run', () => {
  it('says nothing at all on an opening board', () => {
    const now = session().get();
    expect(
      onceARun({ state: now.state, hud: now.hud, reachAtStart: 99, said: none }, s),
    ).toBeNull();
  });

  it('marks new ground the moment the run passes the world’s reach', () => {
    const sess = session();
    walk(sess, 12);
    const now = sess.get();
    expect(now.hud.depthValue).toBeGreaterThan(0);

    const said = onceARun({ state: now.state, hud: now.hud, reachAtStart: 0, said: none }, s);
    expect(said?.id).toBe('newGround');
    expect(said?.text).toBe(s.onceARun.newGround);
  });

  it('says nothing when the world has already been farther', () => {
    const sess = session();
    walk(sess, 12);
    const now = sess.get();
    expect(
      onceARun(
        { state: now.state, hud: now.hud, reachAtStart: now.hud.depthValue + 5, said: none },
        s,
      ),
    ).toBeNull();
  });

  it('never says the same thing twice in one run', () => {
    const sess = session();
    walk(sess, 12);
    const now = sess.get();
    expect(
      onceARun({ state: now.state, hud: now.hud, reachAtStart: 0, said: new Set(['newGround']) }, s)
        ?.id,
    ).not.toBe('newGround');
  });
});
