import { describe, expect, it } from 'vitest';
import { pickLocale } from '@content/locale';
import { stringsFor } from '@text/index';
import { resolveTheme } from '@theme/index';
import { createSession } from './store';
import { onceARun, type OnceId } from './onceARun';
import { walk } from './walk';

/**
 * The three things a run says once.
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
  it('says once that the purse has outrun the clock, in the shipped tuning’s words', () => {
    // The state Marc found on the board (202 tiles, 167 placements left) is
    // the HUD's own boolean; the helper reads it rather than re-deriving it,
    // so the case is the flag and not a walk that happens to reach it.
    const now = session().get();
    const spare = { ...now.hud, tilesSpare: true };
    const said = onceARun({ state: now.state, hud: spare, reachAtStart: 99, said: none }, s);
    expect(said?.id).toBe('tilesSpare');
    expect(said?.text).toBe(
      now.state.tuning.singlePayout ? s.view.guide.tilesSpareSingle : s.view.guide.tilesSpare,
    );
    // And never again this run.
    expect(
      onceARun(
        { state: now.state, hud: spare, reachAtStart: 99, said: new Set<OnceId>(['tilesSpare']) },
        s,
      ),
    ).toBeNull();
  });

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

/**
 * A RUN WITH NO WORLD (2026-09-02).
 *
 * NEW GROUND says "farther than THIS WORLD has ever reached". A daily has no
 * world and a shared seed is somebody else's, so on both the claim is about
 * nothing — and the shell used to hand either of them the HOME world's reach,
 * which made the sentence wrong in two directions at once: a player whose
 * world had reached 20 had to out-reach their own history before the daily
 * would say a word, and a player on a fresh device was told the daily was new
 * ground on their first placement.
 *
 * `null` is the mode saying it has nothing to measure against. UNIQUE is a
 * fact about the HAND and keeps firing, which is the half a blanket "say
 * nothing on a daily" guard would have thrown away.
 */
describe('a run with no world', () => {
  it('never claims new ground', () => {
    const sess = session();
    walk(sess, 12);
    const now = sess.get();
    expect(now.hud.depthValue, 'the fixture never left home').toBeGreaterThan(0);

    expect(
      onceARun({ state: now.state, hud: now.hud, reachAtStart: 0, said: none }, s)?.id,
      'a run WITH a world still marks new ground',
    ).toBe('newGround');

    expect(
      onceARun({ state: now.state, hud: now.hud, reachAtStart: null, said: none }, s)?.id,
      'a daily claimed ground for a world it does not have',
    ).not.toBe('newGround');
  });

  it('still says what a hand can say', () => {
    const sess = session();
    walk(sess, 12);
    const now = sess.get();
    // Force the other moment: a unique in the draft is a fact about this run,
    // true on a daily as much as anywhere.
    const withUnique = {
      ...now.state,
      draft: [{ id: 'u1', colour: 'green', rarity: 'unique' }, ...now.state.draft],
    } as typeof now.state;
    expect(
      onceARun({ state: withUnique, hud: now.hud, reachAtStart: null, said: none }, s)?.id,
    ).toBe('unique');
  });
});
