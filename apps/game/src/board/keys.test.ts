import { describe, expect, it } from 'vitest';
import { commandFor, focusKindOf, LEAN_STEP, takesKey, TURN_STEP, type Chord } from './keys';

/**
 * The key map, held to the two things a key map is always wrong about: which
 * keys belong to the browser, and which belong to whatever has focus.
 *
 * Everything else here is a table, and a table is cheap to pin — which is the
 * reason it is a pure function in the first place. The handler in `App` is a
 * switch over what this file returns, so a map that is right is a keyboard that
 * is right.
 */

const press = (over: Partial<Chord> = {}): Chord => ({
  key: 'a',
  code: 'KeyA',
  shiftKey: false,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  ...over,
});

describe('the key map', () => {
  it('walks the marker with the arrows, and slides the board with Shift', () => {
    expect(commandFor(press({ key: 'ArrowUp', code: 'ArrowUp' }))).toEqual({
      kind: 'cursor',
      dir: 'up',
    });
    expect(commandFor(press({ key: 'ArrowLeft', code: 'ArrowLeft', shiftKey: true }))).toEqual({
      kind: 'pan',
      dir: 'left',
    });
  });

  it('acts on Enter and on Space, however the browser spells Space', () => {
    expect(commandFor(press({ key: 'Enter', code: 'Enter' }))).toEqual({ kind: 'act' });
    expect(commandFor(press({ key: ' ', code: 'Space' }))).toEqual({ kind: 'act' });
  });

  it('zooms on plus and minus, including the ones that need a Shift to print', () => {
    // `+` is Shift and `=` on a US keyboard, so a map that refused a held Shift
    // outright would have no way to zoom in at all.
    expect(commandFor(press({ key: '+', code: 'Equal', shiftKey: true }))).toEqual({
      kind: 'zoom',
      closer: true,
    });
    expect(commandFor(press({ key: '=', code: 'Equal' }))).toEqual({ kind: 'zoom', closer: true });
    expect(commandFor(press({ key: '-', code: 'Minus' }))).toEqual({ kind: 'zoom', closer: false });
  });

  it('turns and leans by letter or by the dedicated navigation keys', () => {
    // Two spellings on purpose: QERF is what a desktop player guesses, and it
    // is not on every layout — `Q` is where `A` is on an AZERTY board, and this
    // game ships in French.
    expect(commandFor(press({ key: 'q', code: 'KeyQ' }))).toEqual({ kind: 'turn', by: -TURN_STEP });
    expect(commandFor(press({ key: 'Home', code: 'Home' }))).toEqual({
      kind: 'turn',
      by: -TURN_STEP,
    });
    expect(commandFor(press({ key: 'E', code: 'KeyE' }))).toEqual({ kind: 'turn', by: TURN_STEP });
    expect(commandFor(press({ key: 'End', code: 'End' }))).toEqual({ kind: 'turn', by: TURN_STEP });
    expect(commandFor(press({ key: 'r', code: 'KeyR' }))).toEqual({ kind: 'lean', by: LEAN_STEP });
    expect(commandFor(press({ key: 'PageDown', code: 'PageDown' }))).toEqual({
      kind: 'lean',
      by: -LEAN_STEP,
    });
  });

  it('reads the card digits by POSITION, so an AZERTY row needs no Shift', () => {
    // An AZERTY digit row prints `&` where a US one prints `1`, and asking a
    // French player to hold Shift to pick up a card would be a worse map.
    expect(commandFor(press({ key: '&', code: 'Digit1' }))).toEqual({ kind: 'card', index: 0 });
    expect(commandFor(press({ key: '8', code: 'Digit8' }))).toEqual({ kind: 'card', index: 7 });
    expect(commandFor(press({ key: '3', code: 'Numpad3' }))).toEqual({ kind: 'card', index: 2 });
    // Nine is past the widest hand there is, and means nothing.
    expect(commandFor(press({ key: '9', code: 'Digit9' }))).toBeNull();
  });

  it('gives zero to the view cycle, so one key presses the button on screen', () => {
    expect(commandFor(press({ key: '0', code: 'Digit0' }))).toEqual({ kind: 'view' });
  });

  it('gives H to the stash, in either case, because Caps Lock is not an opinion', () => {
    expect(commandFor(press({ key: 'h', code: 'KeyH' }))).toEqual({ kind: 'hold' });
    expect(commandFor(press({ key: 'H', code: 'KeyH' }))).toEqual({ kind: 'hold' });
  });

  it('refuses every key a modifier claims, because those are not ours', () => {
    // Ctrl+W is a closed tab, and a closed tab is a lost run.
    for (const held of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }]) {
      expect(commandFor(press({ key: 'ArrowUp', code: 'ArrowUp', ...held })), 'arrow').toBeNull();
      expect(commandFor(press({ key: 'q', code: 'KeyQ', ...held })), 'letter').toBeNull();
      expect(commandFor(press({ key: '1', code: 'Digit1', ...held })), 'digit').toBeNull();
    }
  });

  it('says nothing about keys it has no business with', () => {
    expect(commandFor(press({ key: 'Tab', code: 'Tab' }))).toBeNull();
    expect(commandFor(press({ key: 'Escape', code: 'Escape' }))).toBeNull();
    expect(commandFor(press({ key: 'z', code: 'KeyZ' }))).toBeNull();
  });
});

describe('what has focus', () => {
  /** A detached element, which is all `focusKindOf` reads. */
  const element = (html: string): Element => {
    const host = document.createElement('div');
    host.innerHTML = html;
    return host.firstElementChild!;
  };

  it('names a text field, a control, and everything else', () => {
    expect(focusKindOf(null)).toBe('none');
    expect(focusKindOf(element('<input />'))).toBe('text');
    expect(focusKindOf(element('<textarea></textarea>'))).toBe('text');
    expect(focusKindOf(element('<button>POP</button>'))).toBe('control');
    expect(focusKindOf(element('<summary>DETAILS</summary>'))).toBe('control');
    expect(focusKindOf(element('<div role="button">x</div>'))).toBe('control');
    expect(focusKindOf(element('<div></div>'))).toBe('none');
  });

  it('leaves a focused button its Enter and Space, and takes nothing else from it', () => {
    // The case the whole window listener rests on: a player who just pressed
    // POP still has focus on POP, and must be able to walk the marker without
    // clicking the board first — while Enter still presses POP again.
    expect(takesKey('control', { kind: 'act' })).toBe(false);
    expect(takesKey('control', { kind: 'cursor', dir: 'up' })).toBe(true);
    expect(takesKey('control', { kind: 'card', index: 0 })).toBe(true);
    expect(takesKey('control', { kind: 'zoom', closer: true })).toBe(true);
  });

  it('gives a text field every key it is handed', () => {
    for (const command of [
      { kind: 'act' },
      { kind: 'cursor', dir: 'up' },
      { kind: 'card', index: 0 },
    ] as const) {
      expect(takesKey('text', command)).toBe(false);
    }
  });
});
