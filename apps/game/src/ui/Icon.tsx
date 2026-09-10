import type { IconName } from '@theme/icons';
import { ICON_PATH } from './icons.gen';

/**
 * One mark, drawn (2026-08-30).
 *
 * Marc: *"no emojis only phosphor icons or assets."* Every symbol in this game
 * was a Unicode character, which is a REQUEST for a shape rather than a shape:
 * the answer differs by platform, by font stack, and by whether the glyph
 * exists at all. Three of the marks were being drawn by `cinzel.ttf`, a font
 * chosen for a wordmark.
 *
 * The core names the icon (`@theme/icons`), `scripts/phosphor.ts` vendors the
 * path, and this draws it. Nothing else in the chrome may reach for
 * `ICON_PATH` directly — one component, so the accessibility decision below is
 * made once.
 *
 * **Sized in `em`, coloured by `currentColor`.** Every call site used to be a
 * character inside a span the CSS had already sized and inked, and an icon
 * that inherits both is a drop-in: `.legend-mark`, `.card-glyph` and
 * `.tile-mark` keep the rules they already had. It also means a mark grows
 * with the text around it, which is what a reader who has scaled their type up
 * is asking for.
 *
 * **Hidden from screen readers unless it is the only thing saying it.** A mark
 * beside its own name is decoration and reading it aloud is noise — that was
 * already the rule for the characters (`aria-hidden` on every `.tile-mark` and
 * `.legend-mark`). Where an icon IS the control's whole label, the caller
 * passes `title` and it becomes an `img` with a name.
 */

type IconProps = {
  readonly name: IconName;
  /**
   * The accessible name, where this icon is the only thing saying what it is.
   * Absent means decorative, which is the common case and the safe default:
   * an unlabelled icon beside its own word is silence, and an unlabelled icon
   * that IS the button is a button called "button".
   */
  readonly title?: string | undefined;
  /** Extra classes, for a call site that already had a rule for its mark. */
  readonly className?: string | undefined;
};

export function Icon({ name, title, className }: IconProps) {
  return (
    <svg
      className={className === undefined ? 'icon' : `icon ${className}`}
      viewBox="0 0 256 256"
      width="1em"
      height="1em"
      fill="currentColor"
      {...(title === undefined
        ? { 'aria-hidden': true, focusable: false }
        : { role: 'img', 'aria-label': title })}
    >
      <path d={ICON_PATH[name]} />
    </svg>
  );
}
