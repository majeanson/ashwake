import { useEffect, useState } from 'react';
import {
  assetPath,
  decodeManifest,
  EMPTY_MANIFEST,
  manifestHas,
  type AssetManifest,
} from '@theme/assets';
import type { AssetId, ThemeId } from '@theme/tokens';

/**
 * The direction's own art, where any has loaded (Stage 2c, 2026-08-29).
 *
 * Ashwake 1's precedence, unchanged: **asset beats pattern beats fill**. A
 * direction is playable with no bitmaps at all, gets better as art lands slot
 * by slot, and never breaks in between — which is why nothing here is awaited
 * before the first frame and why every failure resolves to "no art" rather
 * than to an error. A manifest that names a file the server will not serve is
 * stale, not fatal.
 *
 * The board asks for `ImageBitmap`s because a 2D canvas has to be able to draw
 * them: the art is composited INTO the baked surface (`bakeCanvas.ts`), under
 * the pattern that carries the readable channel, rather than laid over the top
 * as a decal.
 */

export type AssetBook = {
  readonly has: (id: AssetId) => boolean;
  readonly image: (id: AssetId) => CanvasImageSource | null;
};

/** What a direction with no art loaded looks like — and the dial's zero. */
export const NO_ASSETS: AssetBook = { has: () => false, image: () => null };

/**
 * Load a direction's art, once, after the first frame.
 *
 * Returns `NO_ASSETS` until something arrives, so the board draws its
 * procedural floor immediately and simply gets better. `enabled` is the
 * `?art=` dial: at zero not even the manifest is fetched, which is what keeps
 * the default session's payload to the bundle and the font.
 */
export function useAssets(themeId: ThemeId, enabled: boolean): AssetBook {
  const [book, setBook] = useState<AssetBook>(NO_ASSETS);

  useEffect(() => {
    if (!enabled) {
      setBook(NO_ASSETS);
      return;
    }
    let alive = true;
    void loadBook(themeId).then((loaded) => {
      if (alive) setBook(loaded);
    });
    return () => {
      alive = false;
    };
  }, [themeId, enabled]);

  return book;
}

async function loadBook(themeId: ThemeId): Promise<AssetBook> {
  const manifest = await loadManifest();
  const slots = manifest[themeId] ?? [];
  const images = new Map<AssetId, ImageBitmap>();

  await Promise.all(
    slots.map(async (id) => {
      const bitmap = await loadBitmap(assetPath(themeId, id));
      if (bitmap !== null) images.set(id, bitmap);
    }),
  );

  return {
    has: (id) => manifestHas(manifest, themeId, id) && images.has(id),
    image: (id) => images.get(id) ?? null,
  };
}

async function loadManifest(): Promise<AssetManifest> {
  try {
    const res = await fetch('/assets/manifest.json', { cache: 'no-cache' });
    if (!res.ok) return EMPTY_MANIFEST;
    return decodeManifest(await res.json());
  } catch {
    // No manifest is the state this repository ships in until art lands.
    return EMPTY_MANIFEST;
  }
}

async function loadBitmap(url: string): Promise<ImageBitmap | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await createImageBitmap(await res.blob());
  } catch {
    return null;
  }
}
