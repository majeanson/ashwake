import type { ReactNode } from 'react';

/**
 * A disclosure (Stage 3, 2026-08-29).
 *
 * Six of these in Ashwake 1, two of them hand-rolled instead of using
 * `<details>` — which is how one of them ended up not being keyboard
 * reachable. `<details>` is the element for this, it is free, and the only
 * thing worth adding is that the summary meets the tap target.
 */
export function Fold({
  summary,
  children,
  open,
}: {
  readonly summary: string;
  readonly children: ReactNode;
  readonly open?: boolean;
}) {
  return (
    <details className="fold" {...(open === true ? { open: true } : {})}>
      <summary>{summary}</summary>
      {children}
    </details>
  );
}
