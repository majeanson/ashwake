import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';
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
  /** What ← says to a screen reader. Every panel has one; no tap-to-close. */
  readonly back: string;
  /** What ✕ says to a screen reader, when the stack is deep enough to show it. */
  readonly closeAll: string;
  readonly onBack: () => void;
  readonly children: ReactNode;
  /** A row of its own under the head — the manual's tabs live here. */
  readonly head?: ReactNode;
};

export function Panel({ id, title, back, closeAll, onBack, children, head }: PanelProps) {
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
      data-panel={id}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      tabIndex={-1}
      // A panel under another panel is not reachable, and says so.
      {...(top ? {} : { inert: true })}
    >
      {/*
        The head and whatever rides under it are ONE sticky block.

        They used to stick separately, with the tab row offset by a hand-typed
        `top: 3.2rem` guessing the head's height — a guess that went stale the
        moment the head grew a ✕ and 44px controls, clipping the tabs under it.
        A number that has to agree with a layout it cannot see is a number that
        will disagree with it.
      */}
      <div className="panel-top">
        <div className="panel-head">
          {/*
          ← goes back one, ✕ leaves entirely — two different promises, so the
          ✕ only appears when there is more than one step to undo. On a single
          panel it would be a second button making the first one's promise.
        */}
          <button type="button" className="panel-back" onClick={onBack} aria-label={back}>
            <Icon name="back" />
          </button>
          <h1 className="panel-title" id={`${id}-title`}>
            {title}
          </h1>
          {stack.depth > 1 && (
            <button
              type="button"
              className="panel-close"
              data-close-all=""
              onClick={stack.closeAll}
              aria-label={closeAll}
            >
              <Icon name="close" />
            </button>
          )}
        </div>
        {/* Tabs get their own row. Crammed in beside the title and BACK they
          overflow the moment there are more than two, and the one control a
          player needs to leave with is the one that gets pushed off. */}
        {head}
      </div>
      <div className="panel-body">{children}</div>
    </div>
  );
}

/** A column of quiet choices — the shape MORE and WORLDS are made of. */
export function PanelMenu({ children }: { readonly children: ReactNode }) {
  return <nav className="panel-menu">{children}</nav>;
}
