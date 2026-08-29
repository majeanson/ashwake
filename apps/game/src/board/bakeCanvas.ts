import { hex, rgba } from '@theme/tokens';
import type { Mark, PaintOp, PatternTile } from '@render/paint';

/**
 * The paint plan, drawn (Stage 2c, 2026-08-29).
 *
 * The impure half of Ashwake 1's `bake.ts`. It owns a canvas and makes no
 * decisions: every number, every layer and every ordering question was settled
 * in `@render/paint`, and this walks the answer. That is the whole point of the
 * split — there is nothing in this file a test would have caught, and
 * everything that could be wrong is on the other side of it, in the core, where
 * `paint.test.ts` reads it without a DOM.
 *
 * The switch has no `default`, so a new kind of paint is a type error here
 * rather than a layer that silently does not draw.
 */

/** The texture is square and spans the hex's circumscribed square — what
 *  `prism.ts` maps onto the top face. */
export function bakePlan(
  plan: readonly PaintOp[],
  px: number,
  art: CanvasImageSource | null,
): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return null;

  for (const op of plan) {
    switch (op.op) {
      case 'fill':
        ctx.fillStyle = hex(op.colour);
        ctx.fillRect(0, 0, px, px);
        break;

      case 'gradient': {
        const gradient = ctx.createLinearGradient(0, 0, 0, px);
        gradient.addColorStop(0, hex(op.from));
        gradient.addColorStop(1, hex(op.to));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, px, px);
        break;
      }

      case 'art':
        // A slot whose art has not loaded is a stale manifest, not a fatal
        // one: the ground keeps the procedural floor it was painted with.
        if (art !== null) {
          ctx.globalAlpha = op.alpha;
          ctx.drawImage(art, 0, 0, px, px);
          ctx.globalAlpha = 1;
        }
        break;

      case 'pattern': {
        const fill = ctx.createPattern(tileCanvas(op.tile), 'repeat');
        if (fill === null) break;
        // Stripes are authored as vertical bars and rotated into place: a
        // rotated pattern transform is exact at any angle and a hand-drawn
        // diagonal is not. Where `setTransform` is missing the pattern lands
        // unrotated — a texture that reads slightly wrong rather than a board
        // that does not draw.
        if (
          op.angleDeg !== 0 &&
          typeof DOMMatrix === 'function' &&
          typeof fill.setTransform === 'function'
        ) {
          fill.setTransform(new DOMMatrix().rotate(op.angleDeg));
        }
        ctx.fillStyle = fill;
        ctx.fillRect(0, 0, px, px);
        break;
      }

      case 'wash': {
        const gradient = ctx.createLinearGradient(0, 0, 0, px);
        for (const stop of op.stops) gradient.addColorStop(stop.at, rgba(stop.colour, stop.alpha));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, px, px);
        break;
      }

      case 'blot': {
        const cx = px * op.cx;
        const cy = px * op.cy;
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, px * op.r);
        for (const stop of op.stops) gradient.addColorStop(stop.at, rgba(stop.colour, stop.alpha));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, px, px);
        break;
      }
    }
  }

  return canvas;
}

/** One repeat of a pattern, drawn from its marks. */
function tileCanvas(tile: PatternTile): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(tile.w));
  canvas.height = Math.max(1, Math.round(tile.h));
  const ctx = canvas.getContext('2d');
  if (ctx !== null) for (const mark of tile.marks) paintMark(ctx, mark);
  return canvas;
}

function paintMark(ctx: CanvasRenderingContext2D, mark: Mark): void {
  ctx.fillStyle = rgba(mark.colour, mark.alpha);
  switch (mark.shape) {
    case 'rect':
      ctx.fillRect(mark.x, mark.y, mark.w, mark.h);
      break;
    case 'disc':
      ctx.beginPath();
      ctx.arc(mark.cx, mark.cy, mark.r, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'poly': {
      const [first, ...rest] = mark.points;
      if (first === undefined) break;
      ctx.beginPath();
      ctx.moveTo(first[0], first[1]);
      for (const [x, y] of rest) ctx.lineTo(x, y);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }
}
