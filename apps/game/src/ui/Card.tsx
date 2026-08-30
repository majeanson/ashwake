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
 *
 * ## BRIEF: the same card, for something already learned
 *
 * Marc, 2026-08-30: *"after the first pop, we don't need to have the pop card
 * appear, we can keep it briefly but easy to tap out."* A pop's accounting is
 * worth a card the first time and worth a glance every time after, and the
 * modal was charging the full price on both — a dialog, a focus move, and a
 * deliberate press, several times a minute, on a screen whose whole argument
 * is that the board gets the space.
 *
 * A brief card keeps the words and drops every claim on the player: it does
 * not take focus, it does not trap it, ANY tap sends it away, and it leaves on
 * its own if none comes. It stays a card rather than falling back to the toast
 * because the toast is the strip the eye is not on while the cascade plays —
 * which is the finding that made pops cards in the first place.
 */

/**
 * How long a brief card stays.
 *
 * Long enough to read two short lines without hurrying, short enough that a
 * player popping steadily is never waiting on it. It is a FEEL number and has
 * not been felt on a phone.
 */
const BRIEF_MS = 4200;

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
  /**
   * Something the player has already been taught once: it takes no focus, any
   * tap dismisses it, and it goes on its own. Never for a card that offers an
   * `action` — a choice must be made, not waited out.
   */
  readonly brief?: boolean | undefined;
};

export function Card({
  id,
  glyph,
  name,
  children,
  dismiss,
  onDismiss,
  action,
  ink,
  brief = false,
}: CardProps) {
  const panel = useRef<HTMLDivElement>(null);
  // The handler as of this render, without making it a dependency: the shell
  // passes a fresh closure every time it renders, and a timer keyed on that
  // would restart itself instead of running out.
  const latest = useRef(onDismiss);
  useEffect(() => {
    latest.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    // A brief card must NOT take focus. It is over a board the player is still
    // holding, and pulling focus off it would end their keyboard's place on
    // the board to say something they did not ask about.
    if (!brief) panel.current?.focus();
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onDismiss, brief]);

  // Mounted per utterance (the shell keys on the said id), so the clock is the
  // card's own and a second pop is a second card rather than a reset one.
  useEffect(() => {
    if (!brief) return;
    const timer = setTimeout(() => latest.current(), BRIEF_MS);
    return () => clearTimeout(timer);
  }, [brief]);

  return (
    <div
      className={brief ? 'card-scrim brief' : 'card-scrim'}
      /* Any tap, anywhere, including on the card itself — the button inside
         does the same thing, so a press that lands on it is not a different
         outcome, only a more deliberate one. */
      {...(brief ? { onClick: onDismiss } : {})}
    >
      <div
        ref={panel}
        className="card"
        {...(brief
          ? { role: 'status', 'aria-live': 'polite' as const }
          : { role: 'dialog', 'aria-modal': true, tabIndex: -1 })}
        aria-labelledby={name === undefined ? undefined : `${id}-name`}
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
