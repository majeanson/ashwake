import { COLOUR_ICON } from '@theme/icons';
import { namesOf, type Theme } from '@theme/tokens';
import { Hex, HEX_R } from './Hex';
import { Icon } from './Icon';
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
 * a 56px card on a six-card hand where the name has to shrink. `COLOUR_ICON`
 * is the registry and `theme/icons.ts` says in as many words that the cards
 * keep it; this body had dropped it and painted the fill only when a card was
 * SELECTED, so an unselected hand was four words in one colour.
 *
 * The mark is `aria-hidden`: it is the same fact the name already states, and
 * a screen reader that reads "▲ MOSS" is reading a decoration aloud.
 *
 * **Only the chosen card wears a box** (2026-08-30, Marc: *"make sure
 * unselected card tiles blend in with the game, no border, only the selected
 * one"*). Every card used to sit in a bordered, panel-coloured rectangle, so
 * the hand read as a row of boxes with hexes inside them rather than as a row
 * of tiles. A card is its hex now: no border, no ground of its own, sitting on
 * the controls panel — and the one you have picked up is the one with an
 * outline round it.
 *
 * That freed the border, which had been carrying RARITY. It is a ring around
 * the HEX now, which is where the board has always drawn it
 * (`board/rings.ts`): magic violet, unique orange, both far from the ink the
 * selection uses and from each other on every direction's wheel. A rounded
 * rectangle around a hexagon was never the right shape for it.
 *
 * **A card with nothing to do is not a button** (2026-08-30). The manual draws
 * real cards in its STASH figure — Marc: *"in how to play we reuse the same
 * visuals as in game for all"* — and a `<button>` there would be a tab stop
 * that does nothing, on the one screen whose standing rule is that nothing in
 * it is tappable. No `onPick` means no button: same markup, same CSS, drawn as
 * a picture with a name.
 *
 * **And the card IS the tile** (2026-08-30, Marc: *"I also liked the tile card
 * we had having the tile itself"*). Ashwake 1 put the baked hex on the card —
 * the same PNG the board composites into the ground it draws — so what you are
 * holding and what it becomes are one picture rather than two descriptions of
 * one colour. It is `ui/Hex`, the same drawing the manual's legend and figures
 * ask for, and `art` being null is the ordinary state for a direction with
 * nothing baked: the hex is still drawn, in the flat fill, and nothing here
 * waits on a file.
 */

export type TileProps = {
  readonly colour: Colour;
  readonly rarity: Rarity;
  readonly theme: Theme;
  readonly s: Strings;
  readonly selected?: boolean;
  readonly held?: boolean;
  /** The baked hex for this ground, where the direction has one. See
   *  `shell/art.ts`; null is the ordinary state and the card draws itself. */
  readonly art?: string | null | undefined;
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
  art,
  onPick,
  onLens,
}: TileProps) {
  const name = namesOf(theme, s.locale)[colour];
  const rare = rarity !== 'common';
  // A card the player can act on is a button; a card in a diagram is a
  // picture. Same class, same style, so the two cannot drift apart.
  const Box = onPick === undefined ? 'span' : 'button';
  return (
    <Box
      {...(onPick === undefined
        ? { role: 'img', 'aria-label': name }
        : { type: 'button' as const, 'aria-pressed': selected === true, onClick: onPick })}
      className={selected === true ? 'tile chosen' : 'tile'}
      data-colour={colour}
      data-rarity={rarity}
      // The label is haloed rather than re-coloured — see `.tile` in ui.css.
      // The audit cannot measure a halo, so it is told the halo is there.
      data-audit-halo=""
      {...(slot === undefined ? {} : { 'data-hold': slot, 'aria-label': s.ui.holdSwap(name) })}
      onContextMenu={
        onLens === undefined
          ? undefined
          : (event) => {
              event.preventDefault();
              onLens();
            }
      }
    >
      {/*
        THE THREE CHANNELS a card speaks on (2026-08-29, Marc: "revise the
        highlights of the selected tiles based on each background color and also
        magic = unique. they should all be easily identifiable and not
        confused").

        They were once all saying it in HUE — a violet border, an orange border
        and a gold selection ring, three colours competing on a fourth. In
        torchlit the old selection ring (`accent`, 0xc79a4b) and UNIQUE
        (0xf2914a) are both warm gold-orange, which is the confusion reported.

          GROUND   is the hex itself: its baked art, its mark and its name.
          RARITY   keeps the hue, as a RING ON THE HEX — magic violet, unique
                   orange, far apart on every direction's wheel, and the shape
                   the board already uses for exactly this.
          SELECTED is the label INK, not a hue at all, drawn as the one box in
                   the row. The ink is graded against every terrain fill by
                   `contrast.test.ts`, so it reads on all four grounds — and
                   being colourless it can never be mistaken for a rarity.
      */}
      <Hex
        id={`tile-${colour}-${rarity}-${slot ?? 'hand'}`}
        className="tile-art"
        theme={theme}
        ground={colour}
        art={art}
        {...(rare
          ? {
              ring: rarity === 'magic' ? theme.ink.magic : theme.ink.unique,
              // The board's own arithmetic for a rarity ring (`board/rings.ts`
              // draws `edgeWidth * 2.5` in hex radii), read off the direction
              // rather than eyeballed — so a card's ring is the width the board
              // would draw round the same tile, in whichever direction.
              ringWidth: theme.board.edgeWidth * 2.5 * HEX_R,
            }
          : {})}
      />
      <span className="tile-mark" aria-hidden="true">
        <Icon name={COLOUR_ICON[colour]} />
      </span>
      <span>{name}</span>
      {rare && (
        <span className={`tile-rarity ${rarity === 'magic' ? 'ink-magic' : 'ink-unique'}`}>
          {rarity === 'magic' ? s.lesson.rare.name : s.lesson.rareUnique.name}
        </span>
      )}
      {held === true && (
        <span className="fact-label" style={{ fontSize: '0.6rem' }}>
          {s.figure.held}
        </span>
      )}
    </Box>
  );
}
