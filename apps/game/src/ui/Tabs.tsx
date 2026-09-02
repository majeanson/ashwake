/**
 * One row of tabs (Stage 3, 2026-08-29).
 *
 * Ashwake 1 implemented this TWICE — the manual's five and the hall of fame's
 * three — with identical logic and identical CSS, which is exactly the kind of
 * duplication that makes two surfaces drift apart for no reason anyone chose.
 * Its own duplication is the argument for this file.
 */

export type Tab<Id extends string> = {
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

export type TabsProps<Id extends string> = {
  readonly label: string;
  readonly tabs: readonly Tab<Id>[];
  readonly on: Id;
  readonly onPick: (id: Id) => void;
};

export function Tabs<Id extends string>({ label, tabs, on, onPick }: TabsProps<Id>) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          className="tab"
          data-tab={tab.id}
          data-grows={tab.grows === true ? '' : undefined}
          aria-selected={tab.id === on}
          onClick={() => onPick(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
