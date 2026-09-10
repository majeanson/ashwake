import { useRef, type KeyboardEvent } from 'react';

/**
 * One row of tabs (Stage 3, 2026-08-29).
 *
 * Ashwake 1 implemented this TWICE — the manual's five and the hall of fame's
 * three — with identical logic and identical CSS, which is exactly the kind of
 * duplication that makes two surfaces drift apart for no reason anyone chose.
 * Its own duplication is the argument for this file.
 *
 * ## A tablist that was only a tablist in the markup (2026-09-02)
 *
 * It declared `role="tablist"` and `role="tab"` and then kept none of the
 * three promises those roles make, which is worse than declaring neither:
 * a screen reader announces "tab, 1 of 4" and then behaves like a row of
 * buttons.
 *
 *   - **No tabpanel.** Nothing said what a tab controls, so the relationship
 *     the roles exist to express was not in the document at all. `panelOf`
 *     below is the id, and `Panel` puts it on the scrollport it already has —
 *     rather than a wrapper `<div>`, which would silently break every
 *     `.panel-body > section` rule in `ui.css`.
 *   - **No roving tabindex.** All four tabs were tab stops, so Tab walked
 *     ACROSS the row instead of INTO the panel — the one movement the pattern
 *     is for. One stop now, on the selected tab.
 *   - **No arrow keys.** ← and → are how a tablist is moved, and Home and End
 *     are how it is jumped. They select as they go, which is the pattern's
 *     automatic-activation form and the right one here: every panel is already
 *     rendered from state, so there is nothing to load and no reason to make a
 *     player press twice.
 */

type Tab<Id extends string> = {
  readonly id: Id;
  readonly label: string;
  /**
   * This tab has more behind it than it is showing yet (2026-09-02).
   *
   * The manual grows with the world: a section about a concept this device has
   * not met stays out. Without a mark, a tab that hides three of its five
   * sections is indistinguishable from a tab that only ever had two, so the
   * drip reads as a thinner game rather than as a game arriving in order.
   * Ashwake 1 marked it and called the field `grows`.
   */
  readonly grows?: boolean;
};

type TabsProps<Id extends string> = {
  /**
   * What this row of tabs belongs to — `manual`, `fame`.
   *
   * Ids have to be unique in the DOCUMENT, and two panels can be open at once
   * (the stack allows it and MORE → HOW TO PLAY does it), so a tab named for
   * itself alone would collide with the other row's. Named after the panel,
   * because that is the thing it can never collide with.
   */
  readonly base: string;
  readonly label: string;
  readonly tabs: readonly Tab<Id>[];
  readonly on: Id;
  readonly onPick: (id: Id) => void;
  /** What a growing tab says out loud — `s.ui.tabGrows`. The catalogue's, so
   *  the dot and the sentence cannot describe different things. */
  readonly growsNote: string;
};

/** The id of one tab button. */
export const tabOf = (base: string, id: string): string => `${base}-tab-${id}`;

/** The id of the region a tab controls — see `Panel`'s `tabbed`. */
export const panelOf = (base: string, id: string): string => `${base}-tabpanel-${id}`;

export function Tabs<Id extends string>({
  base,
  label,
  tabs,
  on,
  onPick,
  growsNote,
}: TabsProps<Id>) {
  // The buttons, so a key that moves the selection can move the focus with it.
  // Focus does not follow state on its own, and a tablist whose arrow keys
  // change the panel while leaving the focus behind is one a keyboard cannot
  // press.
  const buttons = useRef(new Map<Id, HTMLButtonElement | null>());

  const go = (to: Id): void => {
    onPick(to);
    buttons.current.get(to)?.focus();
  };

  const onKey = (event: KeyboardEvent<HTMLButtonElement>): void => {
    const at = tabs.findIndex((tab) => tab.id === on);
    if (at < 0) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      // Wrapping, because a row of tabs is a ring: the pattern says so, and a
      // row that stops at its ends makes the last tab three presses from the
      // first for no reason a player can see.
      const step = event.key === 'ArrowRight' ? 1 : -1;
      const next = tabs[(at + step + tabs.length) % tabs.length];
      if (next !== undefined) {
        event.preventDefault();
        go(next.id);
      }
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      const next = event.key === 'Home' ? tabs[0] : tabs[tabs.length - 1];
      if (next !== undefined) {
        event.preventDefault();
        go(next.id);
      }
    }
  };

  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => {
        const selected = tab.id === on;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              buttons.current.set(tab.id, el);
            }}
            type="button"
            role="tab"
            id={tabOf(base, tab.id)}
            className="tab"
            data-tab={tab.id}
            data-grows={tab.grows === true ? '' : undefined}
            aria-selected={selected}
            // Only the tab that is ON names a region, because only one region
            // exists: the panel's scrollport is reused and carries the id of
            // whatever is showing. `aria-controls` pointing at an element that
            // is not in the document is worse than no `aria-controls`.
            {...(selected ? { 'aria-controls': panelOf(base, tab.id) } : {})}
            tabIndex={selected ? 0 : -1}
            onKeyDown={onKey}
            onClick={() => onPick(tab.id)}
          >
            {tab.label}
            {/* The dot was a `::after`, which is a thing only an eye can see —
                so the one piece of information the mark exists to carry was
                the one a screen reader never got (2026-09-02). The pseudo
                stays for the look; this is the same sentence in words. */}
            {tab.grows === true && <span className="visually-hidden">{growsNote}</span>}
          </button>
        );
      })}
    </div>
  );
}
