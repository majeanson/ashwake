import { useEffect, useRef, useState } from 'react';

/**
 * The two-tap arm (Stage 3, 2026-08-29).
 *
 * **There is no modal confirm anywhere in Ashwake 1, and there should not be
 * one here.** Everything destructive is the same control asked twice: the
 * label becomes the question, `.armed` becomes the paint, and reaching for any
 * other control disarms it. A dialog that asks "are you sure?" is a dialog
 * people learn to dismiss without reading; a button that changes into the
 * consequence is a button they have to read to press.
 *
 * Ashwake 1 had one helper and four hand-rolled copies across seven controls,
 * which is how one of them ended up staying armed forever after a failed
 * action. One component.
 */

export type ConfirmingProps = {
  /** The quiet word, before anything is at stake. */
  readonly label: string;
  /** The consequence, stated. This is what the player actually reads. */
  readonly armed: string;
  readonly onConfirm: () => void;
  /** How long an armed control waits before going quiet again. */
  readonly holdMs?: number;
};

const HOLD_MS = 4000;

export function Confirming({ label, armed, onConfirm, holdMs = HOLD_MS }: ConfirmingProps) {
  const [ready, setReady] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  // Disarm on a timer, and on any touch outside this control: reaching for
  // something else is a change of mind, and an armed button left sitting is a
  // trap for the next tap.
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => setReady(false), holdMs);
    const away = (event: PointerEvent): void => {
      if (!(event.target instanceof Node) || !button.current?.contains(event.target)) {
        setReady(false);
      }
    };
    document.addEventListener('pointerdown', away);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', away);
    };
  }, [ready, holdMs]);

  return (
    <button
      ref={button}
      type="button"
      // It also took a `className` nothing ever passed, joined into this list
      // since the component was written (2026-09-02). A prop with no caller is
      // a promise an API makes and nobody collects.
      {...(ready ? { className: 'armed' } : {})}
      // The accessible name is whatever it currently SAYS, so a screen reader
      // hears the consequence at the moment the consequence is what is meant.
      onClick={() => {
        if (ready) {
          setReady(false);
          onConfirm();
        } else {
          setReady(true);
        }
      }}
    >
      {ready ? armed : label}
    </button>
  );
}
