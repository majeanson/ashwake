import type { ReactNode } from 'react';
import { CHROME_ICON } from '@theme/icons';
import { Icon } from './Icon';

/**
 * A disclosure (Stage 3, 2026-08-29).
 *
 * Six of these in Ashwake 1, two of them hand-rolled instead of using
 * `<details>` — which is how one of them ended up not being keyboard
 * reachable. `<details>` is the element for this, it is free, and the only
 * thing worth adding is that the summary meets the tap target.
 *
 * The caret is an ELEMENT rather than a `::after { content: '▾' }`
 * (2026-08-30). It was the last character in the chrome doing an icon's job,
 * and a pseudo-element cannot hold an SVG — which is the whole reason it was
 * a character in the first place. It still turns on open; the rule that turns
 * it just names a class now.
 */
export function Fold({
  summary,
  children,
  open,
}: {
  /** Text, or text with a mark in it — the diary's ✦ count (2026-09-24). */
  readonly summary: ReactNode;
  readonly children: ReactNode;
  readonly open?: boolean;
}) {
  return (
    <details className="fold" {...(open === true ? { open: true } : {})}>
      <summary>
        {summary}
        <span className="fold-caret" aria-hidden="true">
          <Icon name={CHROME_ICON.more} />
        </span>
      </summary>
      {children}
    </details>
  );
}
