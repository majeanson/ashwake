import { ICON_DATA_URI, NAME, SITE } from '@meta/identity';
import { hex, type Theme } from '@theme/tokens';

/**
 * THE SHARE CARD (ported 2026-09-02; Ashwake 1 shipped it 2026-08-19).
 *
 * `shell/share.ts` calls sharing "the game's entire distribution mechanism":
 * there is no backend, no account and no store listing, so this game reaches a
 * person because somebody pasted it into a chat. Ashwake 1 pasted a PICTURE of
 * the run with the link. This body pasted the link.
 *
 * That is the single biggest thing the audit of 2026-09-02 found missing, and
 * it is missing on the one axis the project's growth depends on. A line of text
 * in a group chat is scrolled past; a card with a score, an arc and the board
 * behind it is the thing somebody taps.
 *
 * **This module only draws. It invents nothing.** Every string on the card is
 * handed in already worded, which is D4 read strictly: a picture is still
 * something a player reads, and no sentence may be composed outside `text/`.
 * Ashwake 1 wrote `${points} pts` and `REACH ${n}` straight into the canvas, in
 * English, on a card a French player was about to send — the same class of bug
 * D4 exists to make impossible.
 *
 * Rendered at the moment SHARE is pressed rather than baked ahead of time:
 * every field is this run's own, so there is nothing a build step could have
 * known. Same technique the og:image baker uses — compose, then rasterise —
 * except that runs in Node against one fixed direction and this runs in the
 * browser against whichever direction is actually live.
 */

/**
 * Exported since 2026-09-10, so `shell/handOver.ts` can BUILD one rather than
 * declare the same six fields a second time. Two spellings of one shape is how
 * a card comes to say a number the sentence did not.
 */
export type ShareCardData = {
  /** The score, worded — "8971 pts" / "8971 pts". */
  readonly scoreLine: string;
  /** How far out, worded — "REACH 13" / "PORTÉE 13". */
  readonly reachLine: string;
  /** One harvest's points, in the order they landed. The run's own shape. */
  readonly arc: readonly number[];
  /** NEW BEST, or null where this run did not set one. */
  readonly headline: string | null;
  /** RUN 12 / TRY 4, or the daily's own ladder line. */
  readonly topLine: string;
  /** SEED 123456789, or '' where none is worth sharing — a daily plays a date. */
  readonly footerLine: string;
  /**
   * The board's final frame as a data URL, ghosted full-bleed behind
   * everything else. The most-shared PNG this game produces should show actual
   * gameplay. Null where the renderer had no picture to give.
   */
  readonly shot?: string | null;
};

/** og:image's own aspect ratio, so a chat unfurl never crops the card. */
const W = 1200;
const H = 630;

/**
 * Rasterise the card, or `null`.
 *
 * Null wherever a browser is missing a piece of the canvas API — the same
 * honest-null contract the board's own `snapshot` keeps. Every caller falls
 * back to the text-and-link share, which needs none of this, so a card that
 * cannot be drawn costs a picture and never a share.
 */
export async function renderShareCard(theme: Theme, data: ShareCardData): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return null;

  // Best effort: a webfont still mid-fetch draws in the fallback stack rather
  // than blocking the share. Waiting past what the browser can already tell us
  // would turn a tap into a stall.
  try {
    await document.fonts.ready;
  } catch {
    // Font state unqueryable. Draw with whatever is cached.
  }

  const ink = hex(theme.ink.ink);
  const inkDim = hex(theme.ink.inkDim);
  const inkFaint = hex(theme.ink.inkFaint);
  const accent = hex(theme.ink.accent);

  ctx.fillStyle = hex(theme.board.background);
  ctx.fillRect(0, 0, W, H);

  // The board itself, ghosted under everything: aspect-filled and centred, at
  // an alpha low enough that every line above keeps its contrast against the
  // opaque ground just painted. A picture that fails to decode costs the ghost
  // and nothing else.
  if (data.shot !== undefined && data.shot !== null) {
    try {
      const board = await loadImage(data.shot);
      const iw = board.width > 0 ? board.width : W;
      const ih = board.height > 0 ? board.height : H;
      const scale = Math.max(W / iw, H / ih);
      ctx.globalAlpha = 0.18;
      ctx.drawImage(board, (W - iw * scale) / 2, (H - ih * scale) / 2, iw * scale, ih * scale);
      ctx.globalAlpha = 1;
    } catch {
      // No picture this time. The numbers still say what they say.
    }
  }

  // The warm pool: the direction's own accent faded to nothing, so torchlit's
  // card looks lit by the same source everything else in the game is.
  const pool = ctx.createRadialGradient(230, 250, 0, 230, 250, 560);
  pool.addColorStop(0, `${accent}26`);
  pool.addColorStop(1, `${accent}00`);
  ctx.fillStyle = pool;
  ctx.fillRect(0, 0, W, H);

  try {
    ctx.drawImage(await loadImage(ICON_DATA_URI), 90, 68, 200, 200);
  } catch {
    // The mark failed to decode. The numbers still say what they say.
  }

  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = ink;
  ctx.font = `700 46px ${theme.type.display}`;
  /*
   * The game's NAME, and the one case where a bare `toUpperCase` is right.
   *
   * `toUpperCase()` is locale-insensitive: it applies the Unicode default
   * mapping, which is wrong in Turkish (dotless ı) and in a handful of other
   * places, and `toLocaleUpperCase` is the call that respects the reader. Here
   * it does not matter and stating why is cheaper than leaving a reader to
   * wonder: `NAME` is a proper noun with a fixed spelling — 'Ashwake' — that is
   * the same in every language this game ships, by definition rather than by
   * translation. It is `@meta/identity`'s, and it is not in `text/` precisely
   * because it is not a word anybody translates.
   */
  ctx.fillText(NAME.toUpperCase(), 330, 140);

  ctx.fillStyle = inkDim;
  ctx.font = `26px ${theme.type.body}`;
  ctx.fillText(data.topLine, 330, 180);

  // The headline gets the same billing the ending gives it, in the same
  // accent, pushing the score down to make room rather than crowding in.
  const scoreY = data.headline === null ? 320 : 350;
  if (data.headline !== null) {
    ctx.fillStyle = accent;
    ctx.font = `700 32px ${theme.type.display}`;
    ctx.fillText(data.headline, 330, 232);
  }

  ctx.fillStyle = ink;
  ctx.font = `700 116px ${theme.type.display}`;
  ctx.fillText(data.scoreLine, 330, scoreY);

  ctx.fillStyle = inkDim;
  ctx.font = `30px ${theme.type.body}`;
  ctx.fillText(data.reachLine, 330, scoreY + 50);

  drawArc(ctx, data.arc, 90, 430, W - 180, 130, accent, inkDim, inkFaint);

  ctx.font = `24px ${theme.type.body}`;
  ctx.fillStyle = inkFaint;
  if (data.footerLine !== '') ctx.fillText(data.footerLine, 90, H - 40);

  // Where to go do something about it: this card's whole life is being
  // screenshotted out of the chat that had the link, and without the address it
  // is a score with no door.
  ctx.textAlign = 'right';
  ctx.fillText(SITE, W - 90, H - 40);
  ctx.textAlign = 'left';

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
}

/**
 * The arc, as bars — the same picture `ui/Arc.tsx` draws in the DOM, biggest
 * pop in the accent and the rest dim, redrawn in Canvas2D because there is no
 * SVG on this surface. One baseline, no ghost: comparing against a standing
 * best is the ending's job, not this card's.
 */
function drawArc(
  ctx: CanvasRenderingContext2D,
  points: readonly number[],
  x: number,
  y: number,
  w: number,
  h: number,
  accent: string,
  dim: string,
  faint: string,
): void {
  ctx.strokeStyle = faint;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.stroke();

  if (points.length === 0) return;
  const biggest = Math.max(...points, 1);
  const barW = Math.max(3, w / points.length - 4);
  points.forEach((p, i) => {
    const barH = Math.max(3, (Math.max(0, p) / biggest) * (h - 10));
    ctx.fillStyle = p === biggest ? accent : dim;
    ctx.fillRect(x + (i / points.length) * w, y + h - barH, barW, barH);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('share card: image failed to decode'));
    img.src = src;
  });
}
