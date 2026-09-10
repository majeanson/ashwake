import type { IconName } from '@theme/icons';
import { Icon } from './Icon';
/**
 * Label over value, in a grid (Stage 3, 2026-08-29).
 *
 * Ashwake 1 wrote this builder twice — the atlas and the end screen's six
 * cells — and they had already drifted in their markup. One shape.
 */

type Fact = {
  readonly label: string;
  /** A mark drawn INSTEAD of the label. `label` stays the accessible name. */
  readonly icon?: IconName | undefined;
  readonly value: string | number;
};

export function FactGrid({ facts }: { readonly facts: readonly Fact[] }) {
  return (
    <div className="facts">
      {facts.map((fact) => (
        <div key={fact.label}>
          <span className="fact-label">
            {fact.icon === undefined ? fact.label : <Icon name={fact.icon} title={fact.label} />}
          </span>
          <span className="fact-value">{fact.value}</span>
        </div>
      ))}
    </div>
  );
}
