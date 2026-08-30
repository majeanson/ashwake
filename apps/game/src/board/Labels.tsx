import { Text } from '@react-three/drei';
import { useMemo } from 'react';
import type { HexKey } from '@engine/hex';
import type { IconName } from '@theme/icons';
import type { CellView } from '@render/Renderer';
import { labelFor } from '@render/labels';
import { place, type Layout } from '@render/layout';
import { hex, type Theme } from '@theme/tokens';
import { markTexture } from './marks';
import { kindOf, topOf } from './relief';

/**
 * What a cell prints (Stage 2c, 2026-08-29 — lifted out of `HexField`).
 *
 * `labelFor` in the core is the rule — a worth, a preview, a landmark's mark,
 * and faint means SPENT. This file only draws it.
 *
 * **A number and a mark are drawn by two different things** (2026-08-30), and
 * the split is the point. A NUMBER is text and wants a typeface: the font is
 * self-hosted (`/fonts/cinzel.ttf`), because a default font would fetch from a
 * CDN and make "nothing leaves your phone" a lie — the trap Ashwake 1 fell into
 * on 2026-08-20 and climbed out of. **woff2 is not a format troika reads**, so
 * it ships as TTF; a font that fails to load takes the whole frame with it,
 * which is why the smoke test checks for a picture rather than for silence.
 *
 * A MARK is not text and never was. It used to be set in the same wordmark
 * face as the numbers — `✚ ★ ◈ ❖ ✦ ▦` asked of Cinzel, which carries them by
 * luck rather than by design, and which a subset or a swap would have emptied
 * silently. Marc: *"no emojis only phosphor icons or assets."* A mark is a
 * Phosphor path now (`@theme/icons`), drawn into a texture by `marks.ts` and
 * laid on the hex as a plane, so what the board draws and what the manual
 * draws are the same shape from the same file.
 */

const FONT = '/fonts/cinzel.ttf';
/** How far above the top face a label floats, so it never z-fights it. */
const LABEL_LIFT = 0.02;

type PlacedLabel = {
  readonly key: HexKey;
  /** A number, or null on a cell whose label is a mark. */
  readonly text: string | null;
  /** A mark, or null on a cell whose label is a number. */
  readonly icon: IconName | null;
  readonly faint: boolean;
  /** A destination that has been reached — see `inkFor`. */
  readonly spent: boolean;
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
        text: label.text ?? null,
        icon: label.icon ?? null,
        faint: label.faint,
        spent: cell.kind === 'landmark' && cell.claimed,
        x: p.x,
        z: p.y,
        top: topOf(cell, relief) + LABEL_LIFT,
      });
    }
    return out;
  }, [cells, layout, relief]);

  return (
    <>
      {labels.map((label) =>
        label.icon === null ? null : (
          <Mark key={label.key} label={label} icon={label.icon} theme={theme} yaw={yaw} />
        ),
      )}
      {labels.map((label) =>
        label.text === null ? null : (
          <Text
            key={label.key}
            font={FONT}
            fontSize={0.62}
            color={inkFor(label, theme)}
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
        ),
      )}
    </>
  );
}

/** How much of a hex a mark covers. Sized against the numbers beside it: a
 *  destination has to read from across the board, and a worth has to stay the
 *  thing you look at when you are choosing where to build. */
const MARK_SIZE = 0.78;

/**
 * One mark, lying on its hex.
 *
 * A plane rather than a `Text`, and the same transform the numbers get: flat
 * on the top face, turned BACK by the yaw so a board turned 45 degrees does
 * not hand you a mark read at 45 degrees. `toneMapped` off for the reason the
 * canvas turns tone mapping off at all — the palette is graded to 4.5:1 in
 * display colours, and a curve between that grade and the screen would make
 * the whole budget a description of a board that does not exist.
 */
function Mark({
  label,
  icon,
  theme,
  yaw,
}: {
  readonly label: PlacedLabel;
  readonly icon: IconName;
  readonly theme: Theme;
  readonly yaw: number;
}) {
  const texture = useMemo(
    () => markTexture(icon, hex(inkFor(label, theme)), hex(theme.ink.halo)),
    [icon, label, theme],
  );
  if (texture === null) return null;
  return (
    <mesh
      position={[label.x, label.top, label.z]}
      rotation={[-Math.PI / 2, 0, (yaw * Math.PI) / 180]}
      raycast={() => null}
    >
      <planeGeometry args={[MARK_SIZE, MARK_SIZE]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/**
 * Which ink a label is drawn in, and why SPENT is not the faintest one.
 *
 * `labelFor` returns one `faint` flag, because in the core there is one rule:
 * faint means spent. Two very different things wear it, though, and they want
 * different amounts of ink:
 *
 *   - **A placement PREVIEW** — what a hex would be worth if you built there.
 *     It is a suggestion about a hex you are hovering over, and it should stay
 *     a whisper: `inkFaint` is exactly right.
 *   - **A claimed DESTINATION** — a shrine you already reached. Marc,
 *     2026-08-29: *"when a shrine is gone, make sure they conserve the same
 *     symbol, but greyed out."* It was conserving the symbol already; drawn in
 *     the faintest ink on a prop that also greys, it read as gone rather than
 *     as spent. A claimed shrine is a piece of a world's history and a place
 *     you can still tap for its line — it has to stay legible.
 *
 * So spent takes `inkDim`, which is the palette's own middle voice and the one
 * every "true but no longer urgent" thing on the chrome already uses.
 */
function inkFor(label: PlacedLabel, theme: Theme): number {
  if (label.spent) return theme.ink.inkDim;
  return label.faint ? theme.ink.inkFaint : theme.ink.ink;
}
