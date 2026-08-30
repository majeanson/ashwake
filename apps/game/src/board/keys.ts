import type { Direction } from './cursor';

/**
 * What a key press means to the board (2026-08-29).
 *
 * Marc: *"do a pass for keyboard + desktop play (all cam movement, etc.) and
 * easy tile placements."* Everything the two fingers learned in Stage 2d — pan,
 * zoom, turn, lean — plus the one gesture no finger ever had to be given,
 * because a finger can point: **saying which hex you mean.**
 *
 * Pure, and separate from the handler, for the reason every input rule in this
 * repo ends up here: a key map is a table, tables are where the mistakes are,
 * and a table can be read by a test. The handler's whole job below is
 * `commandFor` and a switch.
 *
 * ## The map
 *
 * | keys | what |
 * | --- | --- |
 * | arrows | move the marker, and say what it lands on |
 * | Enter · Space | do what a tap on the marker would do |
 * | Shift + arrows | slide the board |
 * | `+` · `-` | closer, further |
 * | `Q` · `E`, or Home · End | turn the board |
 * | `R` · `F`, or PageUp · PageDown | lean the camera back and forward |
 * | `0` | the VIEW button, without reaching for it |
 * | `1`–`8` | pick up that card |
 *
 * **Why the turn and the lean have two spellings each.** `Q`/`E`/`R`/`F` is
 * the vocabulary every 3D tool on a desktop already uses and the one a player
 * will guess. It is also the one that is not on every keyboard: `Q` sits where
 * `A` does on an AZERTY board, and this game ships in French. Home, End,
 * PageUp and PageDown are dedicated keys — same place, same name, every layout,
 * and a full-screen game has no other use for them. Neither spelling is a
 * fallback for the other; they are simply both true, which is cheaper than
 * being right about which keyboard is in the room.
 *
 * **A modifier means the key is not ours.** Ctrl, Alt and Cmd belong to the
 * browser and the OS, and a game that eats Ctrl+W is a game that ate a run.
 * Shift is the exception, and only on the arrows, where it is the one modifier
 * the page can safely claim.
 */

/** Degrees per press. The turn is the coarser of the two because a yaw wraps
 *  and a tilt runs out — a quarter turn is six presses, the whole lean is
 *  eleven. Both quantised the same half-degree the two-finger gesture is. */
export const TURN_STEP = 15;
export const LEAN_STEP = 5;

/** One press of the zoom, as a multiplier. The wheel's own step. */
export const ZOOM_STEP = 1.15;

/** How far one press of Shift+arrow slides the board, in CSS pixels. About a
 *  thumb's drag, so a board can be crossed in a handful of presses. */
export const PAN_STEP = 96;

export type BoardCommand =
  | { readonly kind: 'cursor'; readonly dir: Direction }
  | { readonly kind: 'pan'; readonly dir: Direction }
  | { readonly kind: 'zoom'; readonly closer: boolean }
  | { readonly kind: 'turn'; readonly by: number }
  | { readonly kind: 'lean'; readonly by: number }
  | { readonly kind: 'act' }
  | { readonly kind: 'view' }
  | { readonly kind: 'card'; readonly index: number }
  | { readonly kind: 'hold' };

/** The part of a `KeyboardEvent` a key map reads. A real event satisfies it,
 *  and a test can write one down. */
export type Chord = {
  readonly key: string;
  readonly code: string;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
};

const ARROW: Readonly<Record<string, Direction>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

/** `1`–`8` off the digit row or the numpad, by POSITION rather than by letter:
 *  an AZERTY digit row needs Shift to print a `1`, and asking a French player
 *  to hold Shift to pick up a card is a worse map than reading the code. */
function cardIndex(chord: Chord): number | null {
  const match = /^(?:Digit|Numpad)([1-8])$/.exec(chord.code);
  const digit = match?.[1] ?? (/^[1-8]$/.test(chord.key) ? chord.key : null);
  return digit === null ? null : Number(digit) - 1;
}

const isViewKey = (chord: Chord): boolean =>
  chord.key === '0' || chord.code === 'Digit0' || chord.code === 'Numpad0';

export function commandFor(chord: Chord): BoardCommand | null {
  // Ctrl, Alt and Cmd belong to the browser and the OS. Shift is ours, and
  // only on the arrows.
  if (chord.ctrlKey || chord.altKey || chord.metaKey) return null;

  const arrow = ARROW[chord.key];
  if (arrow !== undefined) return { kind: chord.shiftKey ? 'pan' : 'cursor', dir: arrow };

  // `+` is Shift and `=` on most keyboards, so the rest of the map cannot
  // refuse a held Shift outright — it simply does not read it.
  const key = chord.key.toLowerCase();

  if (chord.key === 'Enter' || chord.key === ' ' || chord.code === 'Space') return { kind: 'act' };

  if (key === '+' || key === '=' || chord.code === 'NumpadAdd') {
    return { kind: 'zoom', closer: true };
  }
  if (key === '-' || key === '_' || chord.code === 'NumpadSubtract') {
    return { kind: 'zoom', closer: false };
  }

  if (key === 'q' || chord.key === 'Home') return { kind: 'turn', by: -TURN_STEP };
  if (key === 'e' || chord.key === 'End') return { kind: 'turn', by: TURN_STEP };
  if (key === 'r' || chord.key === 'PageUp') return { kind: 'lean', by: LEAN_STEP };
  if (key === 'f' || chord.key === 'PageDown') return { kind: 'lean', by: -LEAN_STEP };

  // H for HOLD — the stash, which a thumb reaches by tapping a dashed slot and
  // a keyboard had no way to reach at all (2026-08-29).
  if (key === 'h') return { kind: 'hold' };

  if (isViewKey(chord)) return { kind: 'view' };

  const card = cardIndex(chord);
  return card === null ? null : { kind: 'card', index: card };
}

/**
 * What has focus, as much of it as the map needs to know.
 *
 * The board takes its keys from the WINDOW rather than from a focused element,
 * and that is deliberate: a desktop player who has just clicked POP should not
 * have to click the board again before an arrow works, and a phone that has
 * never focused anything should still answer a bluetooth keyboard. The price is
 * that the board must not take a key some control was going to use — which is a
 * short list, and this is it.
 */
export type FocusKind = 'none' | 'control' | 'text';

export function focusKindOf(element: Element | null): FocusKind {
  if (element === null) return 'none';
  const tag = element.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return 'text';
  if ((element as HTMLElement).isContentEditable) return 'text';
  if (tag === 'button' || tag === 'a' || tag === 'summary') return 'control';
  return element.getAttribute('role') === 'button' ? 'control' : 'none';
}

/**
 * Whether the board may act on this command, given what has focus.
 *
 * A text field owns every key it is handed. A focused control owns exactly two
 * — Enter and Space, which are how a button is pressed — and nothing else: a
 * player whose focus is parked on POP can still walk the marker, zoom, turn and
 * pick up a card without ever leaving it.
 */
export function takesKey(focus: FocusKind, command: BoardCommand): boolean {
  if (focus === 'text') return false;
  return !(focus === 'control' && command.kind === 'act');
}
