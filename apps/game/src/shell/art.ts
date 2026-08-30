import { useEffect, useMemo, useState } from 'react';
import type { Colour } from '@content/tuning';
import {
  assetPath,
  decodeManifest,
  EMPTY_MANIFEST,
  manifestHas,
  type AssetManifest,
} from '@theme/assets';
import type { AssetId, ThemeId } from '@theme/tokens';

/**
 * A baked art slot, for the screens that are DOM rather than board
 * (2026-08-29).
 *
 * `board/assets.ts` already loads a direction's art for the renderer, as
 * `ImageBitmap`s a WebGL material can take. The chrome wants the same
 * question answered in a different currency: not "give me pixels" but "is
 * there a file here, and what is its URL", so an `<img>` can point at it.
 *
 * **The answer is allowed to be no, and that is the normal case.** A direction
 * is playable with no art at all — every screen draws something of its own and
 * simply gets better when a file lands — which is why this returns `null`
 * rather than a placeholder, and why the caller keeps its own drawn version as
 * the thing it renders in the meantime. `ui.logo` and `ui.runEnd` were
 * DECLARED in `theme/assets.ts` from the day the core was lifted and shipped
 * empty in every direction until the bakers came back on 2026-08-29.
 *
 * The manifest is fetched rather than probed, for the reason `vite.config.ts`
 * gives: probing slots from the client is a wall of 404s on a phone
 * connection, once per load.
 */

let manifest: Promise<AssetManifest> | null = null;

/** One fetch per session, shared. The board asks for the same file. */
function theManifest(): Promise<AssetManifest> {
  manifest ??= (async () => {
    try {
      const res = await fetch('/assets/manifest.json', { cache: 'no-cache' });
      if (!res.ok) return EMPTY_MANIFEST;
      return decodeManifest(await res.json());
    } catch {
      return EMPTY_MANIFEST;
    }
  })();
  return manifest;
}

/** The URL of a baked slot for this direction, or null where none is baked. */
export function useArtSlot(themeId: ThemeId, slot: AssetId): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void theManifest().then((book) => {
      if (!alive) return;
      setUrl(manifestHas(book, themeId, slot) ? assetPath(themeId, slot) : null);
    });
    return () => {
      alive = false;
    };
  }, [themeId, slot]);

  return url;
}

/**
 * The four grounds' baked hexes, for the chrome that draws a TILE.
 *
 * Marc, 2026-08-30: *"I also liked the tile card we had having the tile
 * itself."* Ashwake 1's hand cards carried the baked hex — the very PNG the
 * board composites into its surface — so a card in your hand and the ground it
 * would become were the same picture. This body drew a rounded rectangle in
 * the terrain fill instead, which says the colour and nothing about the place.
 *
 * Four fixed `useArtSlot` calls rather than a loop: hooks are positional, and
 * the four grounds are a closed set the rules will not add to. Null per colour
 * where nothing is baked, which is the ordinary state for a direction with no
 * art — the card keeps its drawn version and simply gets better.
 */
export function useTerrainArt(themeId: ThemeId): Readonly<Record<Colour, string | null>> {
  const ground = useGroundArt(themeId);
  return useMemo(
    () => ({ green: ground.green, yellow: ground.yellow, red: ground.red, blue: ground.blue }),
    [ground],
  );
}

/** Every ground a player can be shown, including the two that are never
 *  playable. `GroundArt` is keyed the way `FigCell.ground` is, so a figure and
 *  a legend row ask for their picture the same way. */
export type GroundArt = Readonly<Record<Colour | 'stone' | 'wall', string | null>>;

/**
 * The baked hex for every ground (2026-08-30).
 *
 * Marc: *"in how to play we reuse the same visuals as in game for all."* The
 * manual drew its grounds as flat rectangles of `theme.terrain[c].fill` while
 * the board drew the same grounds as baked, textured hexes — so the legend was
 * teaching an alphabet in a typeface the game does not use. STONE and WALL are
 * here for the same reason: the legend names them, the board draws them, and
 * they had the same flat square standing in.
 *
 * Six fixed `useArtSlot` calls rather than a loop, for the reason
 * `useTerrainArt` had four: hooks are positional, and the grounds are a closed
 * set. Null per ground where nothing is baked, which is the ordinary state and
 * why every caller keeps its drawn fallback.
 */
export function useGroundArt(themeId: ThemeId): GroundArt {
  const green = useArtSlot(themeId, 'terrain.green');
  const yellow = useArtSlot(themeId, 'terrain.yellow');
  const red = useArtSlot(themeId, 'terrain.red');
  const blue = useArtSlot(themeId, 'terrain.blue');
  const stone = useArtSlot(themeId, 'terrain.stone');
  const wall = useArtSlot(themeId, 'terrain.wall');
  return useMemo(
    () => ({ green, yellow, red, blue, stone, wall }),
    [green, yellow, red, blue, stone, wall],
  );
}
