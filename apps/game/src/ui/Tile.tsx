import { COLOUR_ICON } from '@theme/icons';
import { hex, namesOf, type Theme } from '@theme/tokens';
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
 * Selection moved to an OUTLINE for this. It used to be the fill, which is
 * now every card's; the border still belongs to rarity, so the ring is the
 * one channel left that says "this one" without taking a channel that already
 * means something else.
 *
 * **And where the direction has baked art, the card IS the tile** (2026-08-30,
 * Marc: *"I also liked the tile card we had having the tile itself"*). Ashwake
 * 1 put the baked hex on the card — the same PNG the board composites into the
 * ground it draws — so what you are holding and what it becomes are one
 * picture rather than two descriptions of one colour. The fill stays as the
 * fallback, and `art` being null is the ordinary state for a direction with
 * nothing baked: nothing here waits on a file.
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
  const fill = hex(theme.terrain[colour].fill);
  const rare = rarity !== 'common';
  const hasArt = art !== null && art !== undefined && art !== '';
  return (
    <button
      type="button"
      className={hasArt ? 'tile has-art' : 'tile'}
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
        /*
         * THREE things a card can say at once, on three different channels
         * (2026-08-29, Marc: "revise the highlights of the selected tiles based
         * on each background color and also magic = unique. they should all be
         * easily identifiable and not confused").
         *
         * They were all saying it in HUE, on a card that had just started
         * wearing its ground — so a violet border, an orange border and a gold
         * selection ring were three colours competing on a fourth. In torchlit
         * the selection ring (`accent`, 0xc79a4b) and UNIQUE (0xf2914a) are
         * both warm gold-orange, which is the confusion reported.
         *
         *   RARITY  keeps the hue, on the BORDER — magic violet, unique
         *           orange, and they are far apart on every direction's wheel.
         *           Thicker, because a 2px hue on a coloured ground is a hint.
         *   SELECTED is the label INK, not a hue at all. The ink is graded
         *           against every terrain fill by `contrast.test.ts`, so it is
         *           the one colour guaranteed to read on all four grounds — and
         *           being colourless it can never be mistaken for a rarity.
         *   GROUND   is the fill, and the mark and the name say it too.
         */
        borderColor: rare ? hex(rarity === 'magic' ? theme.ink.magic : theme.ink.unique) : fill,
        borderWidth: rare ? 3 : 1,
        /*
         * The baked hex carries the ground, so the flat swatch behind it gets
         * out of the way — Ashwake 1's `.tile.has-art` rule, and the reason is
         * that a hex printed on its own colour has no shape. The panel is
         * where `.tile-art`'s outline is graded against (see ui.css).
         */
        background: hasArt ? 'var(--panel)' : fill,
        // Outside the box, so it takes no layout and cannot reflow the row —
        // and offset outward so it never sits on top of the rarity border it
        // has to be told apart from.
        outline: selected === true ? `3px solid ${hex(theme.ink.ink)}` : undefined,
        outlineOffset: selected === true ? '2px' : undefined,
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
      {hasArt && (
        <img
          className="tile-art"
          src={art ?? undefined}
          alt=""
          draggable={false}
          aria-hidden="true"
        />
      )}
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
    </button>
  );
}
