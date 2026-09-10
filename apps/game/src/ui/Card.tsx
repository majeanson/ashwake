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
 *
 * **And the tap that dismisses it still lands.** The obvious build puts the
 * dismiss on the scrim, which means the scrim has to catch pointer events,
 * which means the first tap after every pop is EATEN — a player popping
 * steadily loses a placement's worth of tapping to a card they were not
 * reading. So the scrim passes pointers through (`pointer-events: none` in
 * `ui.css`) and the dismissal rides a document-level `pointerdown` instead:
 * tap the board and the tile goes down AND the card goes away, which is what
 * "easy to tap out" has to mean on a board you are still playing.
 */

/**
 * How long a brief card stays.
 *
 * Long enough to read two short lines without hurrying, short enough that a
 * player popping steadily is never waiting on it. It is a FEEL number and has
 * not been felt on a phone.
 */
const BRIEF_MS = 4200;

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
  /**
   * Something the player has already been taught once: it takes no focus, any
   * tap dismisses it, and it goes on its own. Never for a card that offers an
   * `action` — a choice must be made, not waited out.
   */
  readonly brief?: boolean | undefined;
};

export function Card({
  id,
  icon,
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
    // ANY press, anywhere, including one that is also doing something else.
    // On the document rather than on the scrim, because the scrim deliberately
    // does not catch pointers — see the note at the top of this file.
    const onDown = (): void => latest.current();
    document.addEventListener('pointerdown', onDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [brief]);

  return (
    <div className={brief ? 'card-scrim brief' : 'card-scrim'}>
      <div
        ref={panel}
        className="card"
        /* WHICH card this is, for a test that has to tell one from another
           (2026-09-09). The id was reachable only as `#${id}-name` on the lead
           paragraph, which a card without a name does not render — so "is a
           lesson on screen right now" had no answer. Same `data-` convention
           as `data-action`, `data-door` and `data-stat`. */
        data-card={id}
        /*
         * A BRIEF CARD IS NOT A LIVE REGION (2026-09-02).
         *
         * It used to declare `role="status" aria-live="polite"` — and it is
         * mounted per utterance (the shell keys it on the said id, deliberately,
         * so a second pop is a second card). **A live region inserted together
         * with its content is not reliably announced at all**: the rule the
         * toast and `screens/Device` both state, broken here by the one thing
         * that makes the card work.
         *
         * So the region moved to the shell, where it can outlive any one card,
         * and this is what it always actually was: a note over the board. It
         * takes no focus, it takes no role, and any tap sends it away.
         */
        {...(brief ? {} : { role: 'dialog', 'aria-modal': true, tabIndex: -1 })}
        {...(brief || name === undefined ? {} : { 'aria-labelledby': `${id}-name` })}
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
        {/*
          A BRIEF CARD HAS NO BUTTON (2026-09-02).

          It had one, and it was worse than useless. It was pointless, because
          any pointerdown anywhere dismisses a brief card — a button that does
          what tapping anywhere already does is a control that teaches nothing,
          which is the same argument `App`'s toast makes about its own plain
          sentences. And it was harmful: it is focusable, it is the only
          focusable thing inside the card, and the 4200ms clock removes it from
          under whatever focus it is holding — dropping a keyboard player to
          `<body>`, off the board, mid-run, for a note they never asked for.

          A card that goes on its own is not a card you dismiss.
        */}
        {!brief && (
          <p className="card-acts">
            {action}
            <button type="button" onClick={onDismiss}>
              {dismiss}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
