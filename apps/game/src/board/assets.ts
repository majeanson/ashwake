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
 * HOW LONG THE BOARD WAITS FOR ITS ART BEFORE DRAWING WITHOUT IT
 * (2026-09-11, Marc: "no way to not have the full reload of the board when
 * placing 1-2 tiles?").
 *
 * The board used to draw its procedural floor the instant it mounted and
 * "simply get better" when the PNGs landed — and getting better meant every
 * batch with an art slot changing key and rebuilding its mesh at once, a
 * second or two into the run. Two things fix it. `ground.ts` keeps the mesh
 * key stable so a late book swaps materials rather than meshes; and this
 * number keeps the field OFF the screen for a moment so that, on any ordinary
 * line, the board appears once, already in the look it will keep.
 *
 * Measured from the board's mount, which is behind the front door, and the
 * book is asked for even earlier (`preloadAssets`, from the shell as soon as
 * it knows the direction) — so the hold is spent while the door is being read
 * and the only player who can see it is one who taps BEGIN inside a second.
 * On a line slower than that the field draws procedural at the cap and the
 * art arrives through the material swap, which is the quiet version of what
 * every build before this one did loudly.
 */
export const ART_HOLD_MS = 1500;

/** One load per direction for the life of the page, whoever asks first. */
const BOOKS = new Map<ThemeId, Promise<AssetBook>>();
/** The loads that have finished, so a mount after the fact needs no render. */
const READY = new Map<ThemeId, AssetBook>();

/**
 * Start loading a direction's art, without waiting for it.
 *
 * The same promise `useAssets` will wait on, so calling this from the shell
 * at boot is a head start rather than a second download — the manifest and
 * the PNGs fetch alongside the renderer's chunk instead of after it, which is
 * most of the second the board used to spend procedural.
 */
export function preloadAssets(themeId: ThemeId): Promise<AssetBook> {
  let pending = BOOKS.get(themeId);
  if (pending === undefined) {
    pending = loadBook(themeId).then((book) => {
      READY.set(themeId, book);
      return book;
    });
    BOOKS.set(themeId, pending);
  }
  return pending;
}

/**
 * A direction's art, or `null` while it is still worth waiting for.
 *
 * Three answers, in order:
 *   - `NO_ASSETS` when the `?art=` dial is at zero — not even the manifest is
 *     fetched, which is what keeps the default session's payload to the
 *     bundle and the font;
 *   - the book, once it has loaded (at once, if `preloadAssets` finished
 *     before this mounted);
 *   - `null` until then, for at most `holdMs` — after which `NO_ASSETS`, so
 *     the procedural floor draws and the book swaps in when it lands.
 *
 * A direction CHANGE mid-session never answers `null`: there is a board on
 * screen, and a field that vanished for a second while a new direction's
 * PNGs arrived would be worse than the procedural floor it draws instead.
 */
export function useAssets(
  themeId: ThemeId,
  enabled: boolean,
  holdMs: number = ART_HOLD_MS,
): AssetBook | null {
  const [book, setBook] = useState<{ readonly theme: ThemeId; readonly book: AssetBook } | null>(
    () => {
      const ready = READY.get(themeId);
      return ready === undefined ? null : { theme: themeId, book: ready };
    },
  );
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void preloadAssets(themeId).then((loaded) => {
      if (alive) setBook({ theme: themeId, book: loaded });
    });
    return () => {
      alive = false;
    };
  }, [themeId, enabled]);

  useEffect(() => {
    if (!enabled || holdMs <= 0 || READY.has(themeId)) return;
    const timer = setTimeout(() => setWaited(true), holdMs);
    return () => clearTimeout(timer);
  }, [themeId, enabled, holdMs]);

  /*
   * The dial's zero is DERIVED, not set (2026-09-02).
   *
   * The effect used to open with `setBook(NO_ASSETS)` on the disabled path —
   * which is the DEFAULT path, so every board mount ran a state update whose
   * only job was to write the value the state already held. It was harmless
   * only because `NO_ASSETS` is a module constant and React bails out on an
   * identical reference; the shape is a cascading render waiting for somebody
   * to make that object inline.
   *
   * "No art when the dial is at zero" is a fact about the arguments, and a
   * fact about the arguments belongs in the return. So is the hold.
   */
  if (!enabled) return NO_ASSETS;
  if (book !== null) return book.theme === themeId ? book.book : NO_ASSETS;
  return waited || holdMs <= 0 ? NO_ASSETS : null;
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
