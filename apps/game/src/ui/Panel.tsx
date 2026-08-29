import { useEffect, useRef, type ReactNode } from 'react';
import { useDialogStack } from './dialog';

/**
 * A panel, and the door it opens through (Stage 3, 2026-08-29).
 *
 * **One component, not two.** Ashwake 1 had `panelDoor()` and `.panel-sheet`
 * and used them together every single time; the manual was the one surface
 * that had a sheet without a door, and that was a known inconsistency rather
 * than a design — it is why the manual grew its own close handling and its own
 * bugs. Here a panel IS a door.
 *
 * Every panel is a modal dialog: it covers the screen, its siblings go `inert`
 * while it is open, Escape closes only the top of the stack, and focus goes to
 * the panel on the way in and back to the opener on the way out.
 */

export type PanelProps = {
  /** Stack identity — also what `useDoor` opens and closes. */
  readonly id: string;
  readonly title: string;
  /** What BACK says. Every panel has one; there is no tap-to-close. */
  readonly back: string;
  readonly onBack: () => void;
  readonly children: ReactNode;
  /** A row of its own under the head — the manual's tabs live here. */
  readonly head?: ReactNode;
};

export function Panel({ id, title, back, onBack, children, head }: PanelProps) {
  const sheet = useRef<HTMLDivElement>(null);
  const stack = useDialogStack();
  const top = stack.isTop(id);

  // Focus the sheet itself rather than the first control: Ashwake 1's ruling,
  // and the reason is that landing on BACK reads as "you are about to leave"
  // when the panel has only just opened.
  useEffect(() => {
    sheet.current?.focus();
  }, []);

  return (
    <div
      ref={sheet}
      className="panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      tabIndex={-1}
      // A panel under another panel is not reachable, and says so.
      {...(top ? {} : { inert: true })}
    >
      <div className="panel-head">
        <h1 className="panel-title" id={`${id}-title`}>
          {title}
        </h1>
        <button type="button" className="panel-back" onClick={onBack}>
          {back}
        </button>
      </div>
      {/* Tabs get their own row. Crammed in beside the title and BACK they
          overflow the moment there are more than two, and the one control a
          player needs to leave with is the one that gets pushed off. */}
      {head}
      <div className="panel-body">{children}</div>
    </div>
  );
}

/** A column of quiet choices — the shape MORE and WORLDS are made of. */
export function PanelMenu({ children }: { readonly children: ReactNode }) {
  return <nav className="panel-menu">{children}</nav>;
}
