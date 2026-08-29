import { COLOUR_MARK, hex, namesOf, type Theme } from '@theme/tokens';
import type { Colour } from '@content/tuning';
import type { Rarity } from '@engine/state';
import type { Strings } from '@text/Strings';

/**
 * One card in the hand (Stage 3, 2026-08-29).
 *
 * Ashwake 1 built draft cards and held cards with two near-identical builders,
 * which is why the held one was missing the rarity badge for a week. One
 * component, one `held` flag.
 *
 * The name is the DIRECTION's word for that ground, per language — torchlit's
 * French red is LICHEN, not a translation of MOSS — so it comes through
 * `namesOf` and never from a component.
 *
 * **A card says its colour three ways** (2026-08-29, Marc: "tile card should
 * have their symbol and their background color"). The NAME is words, the FILL
 * is hue, and the MARK is shape — and the third one is the one that survives
 * everything the other two do not: greyscale, sunlight, colour blindness, and
 * a 56px card on a six-card hand where the name has to shrink. `COLOUR_MARK`
 * is the registry and `theme/tokens.ts` says in as many words that the cards
 * keep it; this body had dropped it and painted the fill only when a card was
 * SELECTED, so an unselected hand was four words in one colour.
 *
 * The mark is `aria-hidden`: it is the same fact the name already states, and
 * a screen reader that reads "▲ MOSS" is reading a decoration aloud.
 *
 * Selection moved to an OUTLINE for this. It used to be the fill, which is
 * now every card's; the border still belongs to rarity, so the ring is the
 * one channel left that says "this one" without taking a channel that already
 * means something else.
 */

export type TileProps = {
  readonly colour: Colour;
  readonly rarity: Rarity;
  readonly theme: Theme;
  readonly s: Strings;
  readonly selected?: boolean;
  readonly held?: boolean;
  /** Which stash slot this card is, when it is one. Names itself for a
   *  screen reader, and marks itself for a test. */
  readonly slot?: number | undefined;
  readonly onPick?: (() => void) | undefined;
  /** Long-press or right-click: the colour lens. */
  readonly onLens?: (() => void) | undefined;
};

export function Tile({
  colour,
  rarity,
  theme,
  s,
  selected,
  held,
  slot,
  onPick,
  onLens,
}: TileProps) {
  const name = namesOf(theme, s.locale)[colour];
  const fill = hex(theme.terrain[colour].fill);
  const rare = rarity !== 'common';
  return (
    <button
      type="button"
      className="tile"
      data-colour={colour}
      data-rarity={rarity}
      // The label is haloed rather than re-coloured — see `.tile` in ui.css.
      // The audit cannot measure a halo, so it is told the halo is there.
      data-audit-halo=""
      aria-pressed={selected === true}
      {...(slot === undefined ? {} : { 'data-hold': slot, 'aria-label': s.ui.holdSwap(name) })}
      onClick={onPick}
      onContextMenu={
        onLens === undefined
          ? undefined
          : (event) => {
              event.preventDefault();
              onLens();
            }
      }
      style={{
        borderColor: rare ? hex(rarity === 'magic' ? theme.ink.magic : theme.ink.unique) : fill,
        borderWidth: rare ? 2 : 1,
        // Every card wears its ground, always — see the note above.
        background: fill,
        // Selection is a ring OUTSIDE the box, so it neither moves the card
        // (an outline takes no layout) nor argues with the rarity border.
        outline: selected === true ? `3px solid ${hex(theme.ink.accent)}` : undefined,
        outlineOffset: selected === true ? '-1px' : undefined,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.1rem',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-label)',
        letterSpacing: 'var(--label-tracking)',
        fontSize: '0.8rem',
        flex: '1 1 0',
      }}
    >
      <span className="tile-mark" aria-hidden="true">
        {COLOUR_MARK[colour]}
      </span>
      <span>{name}</span>
      {rare && (
        <span
          className={rarity === 'magic' ? 'ink-magic' : 'ink-unique'}
          style={{ fontSize: '0.7rem' }}
        >
          {rarity === 'magic' ? s.lesson.rare.name : s.lesson.rareUnique.name}
        </span>
      )}
      {held === true && (
        <span className="fact-label" style={{ fontSize: '0.6rem' }}>
          {s.figure.held}
        </span>
      )}
    </button>
  );
}
