import { useEffect, useRef, type ReactNode } from 'react';

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
 */

export type CardProps = {
  readonly id: string;
  /** The mark that says what KIND of thing this is. From the registries only. */
  readonly glyph?: string | undefined;
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

export function Card({ id, glyph, name, children, dismiss, onDismiss, action, ink }: CardProps) {
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
        role="dialog"
        aria-modal="true"
        aria-labelledby={name === undefined ? undefined : `${id}-name`}
        tabIndex={-1}
      >
        {(glyph !== undefined || name !== undefined) && (
          <p className="card-lead" id={`${id}-name`}>
            {glyph !== undefined && (
              <span className="card-glyph" aria-hidden="true">
                {glyph}
              </span>
            )}
            {name !== undefined && <span className={ink}>{name}</span>}
          </p>
        )}
        {children}
        <p style={{ display: 'flex', gap: '0.5rem', margin: 0 }}>
          {action}
          <button type="button" onClick={onDismiss} style={{ marginLeft: 'auto' }}>
            {dismiss}
          </button>
        </p>
      </div>
    </div>
  );
}
