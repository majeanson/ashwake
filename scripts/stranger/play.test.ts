import { describe, expect, it } from 'vitest';
import { policyByName } from '../../packages/core/src/sim/policy';
import { stringsFor } from '../../packages/core/src/text/index';
import { SETTLEMENT } from '../../packages/core/src/theme/themes/settlement';
import { toGesture } from './gestures';
import { decode, encode, parseGesture } from './play';
import { DEFAULT_OPTIONS, finish, open, playStranger, scripted, seen, step } from './run';

const s = stringsFor('fr-CA');
const theme = SETTLEMENT;

describe('the gesture grammar', () => {
  it('reads the GESTES line’s words into the same tool calls the model makes', () => {
    const read = (text: string) => {
      const { name, input } = parseGesture(text);
      return toGesture(name, input, theme, s);
    };
    expect(read('poser 1 0,-1')).toEqual({ name: 'poser', index: 1, hex: '0,-1' });
    expect(read('recolter tuiles')).toEqual({ name: 'recolter', choice: 'tiles', hex: null });
    expect(read('recolter points 1,0')).toEqual({ name: 'recolter', choice: 'points', hex: '1,0' });
    expect(read('toucher 2,2')).toEqual({ name: 'toucher', hex: '2,2' });
    expect(read('garder')).toEqual({ name: 'garder' });
    expect(read('stat cout')).toEqual({ name: 'stat', id: 'cost' });
    expect(read('manuel')).toEqual({ name: 'manuel', lesson: null });
    expect(read('poser x')).toHaveProperty('error');
  });
});

describe('a session on disk', () => {
  it('survives a round trip and plays on exactly as the in-memory one', async () => {
    const policy = policyByName('bank20')!;
    const live = await playStranger('drip', 2, scripted(policy, 2, s), s, theme);

    // The same policy, one turn at a time, through encode/decode every turn.
    const player = scripted(policy, 2, s);
    let session = open('drip', 2, s, theme);
    while (session.outcome === null) {
      session = decode(encode(session)).session;
      const decision = await player.decide(seen(session, s, theme), session.table);
      session = step(session, decision, DEFAULT_OPTIONS, s, theme);
    }
    const saved = finish(session, {}, { input: 0, cached: 0, output: 0 });
    expect(saved.result).toEqual(live.result);
    expect(saved.untaught).toEqual(live.untaught);
    expect(saved.turns.length).toBe(live.turns.length);

    // Finished, the file carries the run and decodes it back.
    const again = decode(encode(session, saved));
    expect(again.run?.result.points).toBe(live.result.points);
  });

  it('refuses a turn after the end, and calls eight idle turns a stall', async () => {
    const player = scripted(policyByName('bank20')!, 3, s);
    let session = open('silent', 3, s, theme);
    while (session.outcome === null) {
      const decision = await player.decide(seen(session, s, theme), session.table);
      session = step(session, decision, DEFAULT_OPTIONS, s, theme);
    }
    expect(session.outcome).toBe('died');
    const after = step(
      session,
      { belief: 'encore', gesture: { name: 'garder' }, trouble: null, usage: session.usage },
      DEFAULT_OPTIONS,
      s,
      theme,
    );
    expect(after).toBe(session);

    // A player who only taps the same hex changes nothing: a stall, not a hang.
    let idle = open('silent', 3, s, theme);
    while (idle.outcome === null) {
      idle = step(
        idle,
        { belief: '', gesture: { name: 'toucher', hex: '0,0' }, trouble: null, usage: idle.usage },
        DEFAULT_OPTIONS,
        s,
        theme,
      );
    }
    expect(idle.outcome).toBe('stalled');
    expect(idle.turns.length).toBe(DEFAULT_OPTIONS.patience);
  });
});
