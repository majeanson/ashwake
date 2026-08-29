import { Text } from '@react-three/drei';
import { useMemo } from 'react';
import type { HexKey } from '@engine/hex';
import type { CellView } from '@render/Renderer';
import { labelFor } from '@render/labels';
import { place, type Layout } from '@render/layout';
import type { Theme } from '@theme/tokens';
import { kindOf, topOf } from './relief';

/**
 * What a cell prints (Stage 2c, 2026-08-29 — lifted out of `HexField`).
 *
 * `labelFor` in the core is the rule — a worth, a preview, a landmark's glyph,
 * and faint means SPENT. This file only draws it. The font is self-hosted
 * (`/fonts/cinzel.ttf`), because a default font would fetch from a CDN and make
 * "nothing leaves your phone" a lie — the trap Ashwake 1 fell into on
 * 2026-08-20 and climbed out of. **woff2 is not a format troika reads**, so it
 * ships as TTF; a font that fails to load takes the whole frame with it, which
 * is why the smoke test checks for a picture rather than for silence.
 */

const FONT = '/fonts/cinzel.ttf';
/** How far above the top face a label floats, so it never z-fights it. */
const LABEL_LIFT = 0.02;

type PlacedLabel = {
  readonly key: HexKey;
  readonly text: string;
  readonly faint: boolean;
  readonly x: number;
  readonly z: number;
  readonly top: number;
};

export type LabelsProps = {
  readonly cells: readonly CellView[];
  readonly theme: Theme;
  readonly layout: Layout;
  readonly relief: number;
  /** Degrees the board is turned under the camera — the labels turn back. */
  readonly yaw: number;
};

export function Labels({ cells, theme, layout, relief, yaw }: LabelsProps) {
  const labels = useMemo<readonly PlacedLabel[]>(() => {
    const out: PlacedLabel[] = [];
    for (const cell of cells) {
      if (cell.dimmed) continue;
      const label = labelFor(cell);
      if (label === null || kindOf(cell) === null) continue;
      const p = place({ q: cell.q, r: cell.r }, layout);
      out.push({
        key: cell.key,
        text: label.text,
        faint: label.faint,
        x: p.x,
        z: p.y,
        top: topOf(cell, relief) + LABEL_LIFT,
      });
    }
    return out;
  }, [cells, layout, relief]);

  return (
    <>
      {labels.map((label) => (
        <Text
          key={label.key}
          font={FONT}
          fontSize={0.62}
          color={label.faint ? theme.ink.inkFaint : theme.ink.ink}
          // The palette is authored in display colours and graded to 4.5:1 by
          // `contrast.test.ts`. Tone mapping between that grade and the screen
          // would make the whole budget a description of a board that does not
          // exist — the canvas turns it off, and so does every label.
          outlineWidth={theme.ink.haloWidth * 0.4}
          outlineColor={theme.ink.halo}
          anchorX="center"
          anchorY="middle"
          position={[label.x, label.top, label.z]}
          // Lying flat on the hex's top, and turned back by the yaw: a number
          // printed on a board that has been turned 45 degrees is a number read
          // at 45 degrees, and a number on a hex has to be read at a glance.
          rotation={[-Math.PI / 2, 0, (yaw * Math.PI) / 180]}
          raycast={() => null}
        >
          {label.text}
        </Text>
      ))}
    </>
  );
}
