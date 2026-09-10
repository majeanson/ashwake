import { Billboard, Text } from '@react-three/drei';
import { MeshBasicMaterial, PlaneGeometry, type Texture } from 'three';
import { useMemo } from 'react';
import type { HexKey } from '@engine/hex';
import type { IconName } from '@theme/icons';
import type { CellView } from '@render/Renderer';
import { labelFor } from '@render/labels';
import { place, type Layout } from '@render/layout';
import { hex, type Theme } from '@theme/tokens';
import { rad } from './camera';
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
  /** A beacon's mark has no hex under it to belong to — see `Mark`. */
  readonly beacon: boolean;
  readonly x: number;
  readonly z: number;
  readonly top: number;
};

type LabelsProps = {
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
        beacon: cell.beacon,
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
            rotation={[-Math.PI / 2, 0, rad(yaw)]}
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
 * One mark, lying on its hex — except a beacon's, which has no hex to lie on.
 *
 * A plane rather than a `Text`, and the same transform the numbers get: flat
 * on the top face, turned BACK by the yaw so a board turned 45 degrees does
 * not hand you a mark read at 45 degrees. `toneMapped` off for the reason the
 * canvas turns tone mapping off at all — the palette is graded to 4.5:1 in
 * display colours, and a curve between that grade and the screen would make
 * the whole budget a description of a board that does not exist.
 *
 * **A beacon's mark billboards instead** (2026-09-04). "Flat on the top face"
 * means flat on the GROUND, and every other mark can afford that because the
 * camera's fit frames the structure it stands on — `Board.tsx`'s fit excludes
 * beacons on purpose ("the fit frames the STRUCTURE, never the beacon disc"),
 * so a beacon can land anywhere in the frame, including low in it, where the
 * viewing ray grazes the ground at a much shallower angle than anything the
 * fit actually centred. A flat mark foreshortens with that angle same as the
 * hex under it — Marc, on a screenshot: *"look at the star, it was dark just
 * because of the 3d angle"* — and at a shallow enough angle the star that says
 * ACTIVE compresses to a smudge no ring colour can rescue. There is no tile
 * face here for the mark to "belong to" the way a number belongs to its hex
 * (`relief.ts`: "a beacon is a glow through ground that does not exist yet"),
 * so nothing is lost by having it face the camera instead.
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
  /*
   * ONE PLANE AND ONE MATERIAL PER MARK, SHARED (2026-09-02).
   *
   * Declaring `<planeGeometry>` and `<meshBasicMaterial>` as children means R3F
   * constructs and disposes one of each PER MARK — so a board with a dozen
   * beacons and a dozen claimed destinations built two dozen identical squares
   * and two dozen materials, and rebuilt them whenever the board re-rendered.
   *
   * The geometry is literally the same square every time: `MARK_SIZE` is a
   * constant. The material varies only by its texture, and `markTexture` is
   * already cached by `(icon, ink, halo)` — so a material cached by the same
   * texture is cached by the same three things.
   *
   * `toneMapped` off for the reason the canvas turns tone mapping off at all —
   * the palette is graded to 4.5:1 in display colours, and a curve between that
   * grade and the screen would make the whole budget a description of a board
   * that does not exist.
   */
  const mesh = (
    <mesh
      geometry={MARK_PLANE}
      material={markMaterial(texture)}
      renderOrder={MARK_ORDER}
      raycast={() => null}
    />
  );
  if (label.beacon) {
    /*
     * STANDING ON the ground rather than THROUGH it (2026-09-05, Marc:
     * *"some angles of 3d cut the icons in half (bottom half hidden) if i turn
     * around 360 degree it appears and hides again"*).
     *
     * A flat mark lies at its hex's top and has no thickness to bury. A
     * BILLBOARD stands up to face the camera, and it is centred on the point it
     * is given — so half the square was always below the ground it stands on,
     * and the terrain's own depth clipped whatever half the orbit put under the
     * surface. Turning the board swapped which half, which is exactly the
     * appear-and-hide Marc describes.
     *
     * It has been true since beacons started billboarding (2026-09-04) and was
     * invisible until yesterday, because the mark was being painted over by its
     * own disc anyway (`MARK_ORDER`) — one bug hiding inside another.
     *
     * Half a mark up puts the square's bottom edge on `label.top`, which is
     * where a thing standing on the ground has its feet.
     */
    return <Billboard position={[label.x, label.top + MARK_SIZE / 2, label.z]}>{mesh}</Billboard>;
  }
  return (
    <group position={[label.x, label.top, label.z]} rotation={[-Math.PI / 2, 0, rad(yaw)]}>
      {mesh}
    </group>
  );
}

/** The square every mark is drawn on. One, for all of them. */
const MARK_PLANE = new PlaneGeometry(MARK_SIZE, MARK_SIZE);

/**
 * A mark draws AFTER the ground it stands on (2026-09-05, Marc, on a phone:
 * *"i still have the 3d vs 2d grey'd shrine problems"*, with the same hex shot
 * flat and tilted).
 *
 * A beacon's disc is the one ground this board draws see-through —
 * `render/materials.ts` gives it `alpha: theme.board.beaconFade` and nothing
 * else on the plane gets an alpha at all. So a beacon's disc and the mark on
 * it are both in three's TRANSPARENT pass, where the order is by distance, and
 * the ground is an INSTANCED mesh — one object, sorted once by its own origin,
 * with per-instance depth counting for nothing. Flat on, the mark happened to
 * win that sort; tilted, the disc won it and was painted straight over the
 * mark at 0.72 opacity.
 *
 * Which is exactly what the screenshots showed, and why it looked like a
 * palette bug rather than a sorting one: 0.72 of a near-black disc over the
 * cream ink lands on (83, 78, 69) — a grey close enough to `inkDim` to read as
 * the SPENT ink (`inkFor`, below) on a shrine that was not spent. Measured
 * rather than guessed: the flat shot samples `0xf2e6cf` exactly, the tilted one
 * that grey, and `inkDim` is `0xbfae92`, neither of them.
 *
 * `renderOrder` rather than `depthTest: false` on purpose: a mark should still
 * be hidden by a wall standing in front of it. This only takes it out of the
 * distance sort with its own ground, which is the only thing it was ever
 * losing to. The keyboard's marker uses the same number a rung higher up
 * (`HexField`), where being drawn over solid ground IS the point.
 */
const MARK_ORDER = 1;

/**
 * A mark's material, cached by its texture.
 *
 * The texture is already the cache key that matters: `markTexture` hands back
 * the same object for the same `(icon, ink, halo)`, so two marks that look the
 * same share one, and two that do not cannot collide. Never disposed, for the
 * reason the shared prisms are not (`resources.ts`): the pool is bounded by the
 * icon registry crossed with three inks, and everything in it is about to be
 * asked for again.
 */
const MARK_MATERIALS = new Map<Texture, MeshBasicMaterial>();

function markMaterial(texture: Texture): MeshBasicMaterial {
  let material = MARK_MATERIALS.get(texture);
  if (material === undefined) {
    material = new MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    MARK_MATERIALS.set(texture, material);
  }
  return material;
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
