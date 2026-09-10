import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { CHROME_ICON } from '@theme/icons';
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

type PanelProps = {
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
  /**
   * This panel's body IS the region a tab controls (2026-09-02).
   *
   * `ui/Tabs` declared `role="tablist"` with nothing playing the part of the
   * panel, so the one relationship those roles exist to express was missing.
   * The obvious fix — wrap the children in a `role="tabpanel"` div — is a trap
   * here: `ui.css` scopes the section indent to `.panel-body > section`, and a
   * wrapper would put every section one level down and silently unstyle five
   * screens. CSS selectors match the DOM, so `display: contents` does not save
   * it either.
   *
   * The scrollport is already the right element. It just had no name.
   *
   * Absent on the panels that have no tabs, which is most of them: a
   * `tabpanel` with no `tablist` is the same kind of lie in the other
   * direction.
   */
  readonly tabbed?: { readonly panelId: string; readonly labelledBy: string } | undefined;
};

export function Panel({ id, title, back, closeAll, onBack, children, head, tabbed }: PanelProps) {
  const sheet = useRef<HTMLDivElement>(null);
  const stack = useDialogStack();
  const top = stack.isTop(id);

  /*
   * Focus the sheet itself rather than the first control: Ashwake 1's ruling,
   * and the reason is that landing on BACK reads as "you are about to leave"
   * when the panel has only just opened.
   *
   * **On every arrival, not only on mount** (2026-09-02). This ran once, with
   * `[]`, and `ui/dialog.tsx`'s `push` has supported RAISING an already-open
   * panel since 2026-08-30 — it was written for a real path: open the manual
   * from the board, go to its MENU tab, open MORE, tap HOW TO PLAY. The manual
   * comes back to the top, is no longer `inert`, paints over MORE, and had the
   * focus of a screen nobody is on. The whole point of the raise was that the
   * button appeared dead; half of it still did to a keyboard.
   */
  useEffect(() => {
    if (top) sheet.current?.focus();
  }, [top]);

  return (
    <div
      ref={sheet}
      className="panel"
      data-panel={id}
      /*
        The stack says which panel is on top; this is where it gets to say it in
        pixels. Panels are rendered from a fixed list in `App`, so without this
        the painter's order is that list's order — and MORE, which sits late in
        it, covered the manual and SETTINGS that opened FROM it. Inert, opaque,
        and on top of the panel taking the taps: the whole screen read as dead.
      */
      style={{ '--layer': Math.max(0, stack.layerOf(id)) } as CSSProperties}
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
            <Icon name={CHROME_ICON.back} />
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
              <Icon name={CHROME_ICON.close} />
            </button>
          )}
        </div>
        {/* Tabs get their own row. Crammed in beside the title and BACK they
          overflow the moment there are more than two, and the one control a
          player needs to leave with is the one that gets pushed off. */}
        {head}
      </div>
      <div
        className="panel-body"
        {...(tabbed === undefined
          ? {}
          : { role: 'tabpanel', id: tabbed.panelId, 'aria-labelledby': tabbed.labelledBy })}
      >
        {children}
      </div>
    </div>
  );
}

/** A column of quiet choices — the shape MORE and WORLDS are made of. */
export function PanelMenu({ children }: { readonly children: ReactNode }) {
  return <nav className="panel-menu">{children}</nav>;
}
