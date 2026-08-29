import { hex, namesOf, type Theme } from '@theme/tokens';
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
 */

export type TileProps = {
  readonly colour: Colour;
  readonly rarity: Rarity;
  readonly theme: Theme;
  readonly s: Strings;
  readonly selected?: boolean;
  readonly held?: boolean;
  readonly onPick?: (() => void) | undefined;
  /** Long-press or right-click: the colour lens. */
  readonly onLens?: (() => void) | undefined;
};

export function Tile({ colour, rarity, theme, s, selected, held, onPick, onLens }: TileProps) {
  const name = namesOf(theme, s.locale)[colour];
  const fill = hex(theme.terrain[colour].fill);
  const rare = rarity !== 'common';
  return (
    <button
      type="button"
      data-colour={colour}
      data-rarity={rarity}
      aria-pressed={selected === true}
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
        borderWidth: selected === true ? 3 : 1,
        background: selected === true ? fill : 'transparent',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.15rem',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-label)',
        letterSpacing: 'var(--label-tracking)',
        fontSize: '0.8rem',
        flex: '1 1 0',
      }}
    >
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
