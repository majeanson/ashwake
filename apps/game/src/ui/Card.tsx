import { useEffect, useRef, type ReactNode } from 'react';
import type { IconName } from '@theme/icons';
import { Icon } from './Icon';

/**
 * A card: something the game says, dismissed on purpose (Stage 3, 2026-08-29).
 *
 * Ashwake 1 had two of these — the event card and the term card — as two
 * copies of the same markup sharing almost all their CSS. They are one
 * component here, and the shape is the one both wanted: a glyph, a name, a
 * body, an optional figure or rows, and one or two buttons.
 *
 * A card is a dialog like a panel is, with one difference that matters: it is
 * dismissed by a deliberate act. A teaching card that vanished when you tapped
 * the board would be a lesson the player never read.
 *
 * ## There was a BRIEF kind, and it is gone (2026-08-30 → 2026-09-16)
 *
 * Marc, 2026-08-30: *"after the first pop, we don't need to have the pop card
 * appear, we can keep it briefly but easy to tap out."* That was built here as
 * a card that took no focus, dismissed on any tap anywhere, and left on its
 * own after 4.2 s. He looked at a run of them the same day and said it again,
 * harder — *"just show points in the bottom and we can tap for details or tap
 * out"* — and a routine pop became a LINE in the toast strip (`App`'s
 * `note`). From that day no caller set `brief`, and the whole path — a scrim
 * that passed pointers through, a document-level `pointerdown`, a clock, a
 * live region in the shell — sat correct and unreachable for two weeks
 * (`NEXT.md` §5c). Asked once more on 2026-09-16 whether any receipt should
 * show without being put down, Marc said no, so the path is cut rather than
 * kept for a moment that never came. This paragraph is what is left of it:
 * every card holds the screen, and the toast is the thing that does not.
 */

type CardProps = {
  readonly id: string;
  /** The mark that says what KIND of thing this is. From the registries only
   *  (`@theme/icons`), and an icon rather than a character since 2026-08-30. */
  readonly icon?: IconName | undefined;
  readonly name?: string | undefined;
  readonly children: ReactNode;
  /** The dismiss button's word — GOT IT, or STAY when there is an action. */
  readonly dismiss: string;
  readonly onDismiss: () => void;
  /** An offer the card makes: the crossing's CROSS, and nothing else so far. */
  readonly action?: ReactNode;
  /** Colours the name, for MAGIC and UNIQUE. */
  readonly ink?: 'ink-magic' | 'ink-unique' | undefined;
};

export function Card({ id, icon, name, children, dismiss, onDismiss, action, ink }: CardProps) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.focus();
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  return (
    <div className="card-scrim">
      <div
        ref={panel}
        className="card"
        /* WHICH card this is, for a test that has to tell one from another
           (2026-09-09). The id was reachable only as `#${id}-name` on the lead
           paragraph, which a card without a name does not render — so "is a
           lesson on screen right now" had no answer. Same `data-` convention
           as `data-action`, `data-door` and `data-stat`. */
        data-card={id}
        role="dialog"
        aria-modal
        tabIndex={-1}
        {...(name === undefined ? {} : { 'aria-labelledby': `${id}-name` })}
      >
        {(icon !== undefined || name !== undefined) && (
          <p className="card-lead" id={`${id}-name`}>
            {icon !== undefined && (
              <span className="card-glyph" aria-hidden="true">
                <Icon name={icon} />
              </span>
            )}
            {name !== undefined && <span className={ink}>{name}</span>}
          </p>
        )}
        {children}
        <p className="card-acts">
          {action}
          <button type="button" onClick={onDismiss}>
            {dismiss}
          </button>
        </p>
      </div>
    </div>
  );
}
