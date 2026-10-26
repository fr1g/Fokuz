import type { EffectState, Selection } from '../types';
import { selectionPath } from './geometry';

export interface ObscureLayer {
  canvas: HTMLCanvasElement;
  /** Transparent padding around the image (blur only) that avoids edge falloff. */
  pad: number;
  /** Destination size in image coords. */
  drawW: number;
  drawH: number;
  /** false → nearest-neighbor upscale (mosaic). */
  smooth: boolean;
}

/**
 * Build the blur / mosaic layer once per (image, mode, strength) so dragging
 * the selection does not recompute it. Coordinates are in image pixels.
 */
export function buildObscureLayer(
  img: ImageBitmap,
  opts: { mode: string; strength: number },
): ObscureLayer | null {
  if (opts.mode === 'none' || opts.strength <= 0) return null;
  const w = img.width;
  const h = img.height;

  if (opts.mode === 'blur') {
    const s = opts.strength;
    const pad = Math.ceil(s * 2);
    const c = document.createElement('canvas');
    c.width = w + pad * 2;
    c.height = h + pad * 2;
    const g = c.getContext('2d')!;
    g.filter = `blur(${s}px)`;
    g.drawImage(img, pad, pad);
    // Stretch edge pixels outward so the blur does not fade to transparent
    // at the image borders when composited.
    g.drawImage(img, 0, 0, 1, h, 0, pad, pad, h);
    g.drawImage(img, w - 1, 0, 1, h, w + pad, pad, pad, h);
    g.drawImage(img, 0, 0, w, 1, pad, 0, w, pad);
    g.drawImage(img, 0, h - 1, w, 1, pad, h + pad, w, pad);
    g.drawImage(img, 0, 0, 1, 1, 0, 0, pad, pad);
    g.drawImage(img, w - 1, 0, 1, 1, w + pad, 0, pad, pad);
    g.drawImage(img, 0, h - 1, 1, 1, 0, h + pad, pad, pad);
    g.drawImage(img, w - 1, h - 1, 1, 1, w + pad, h + pad, pad, pad);
    g.filter = 'none';
    return { canvas: c, pad, drawW: c.width, drawH: c.height, smooth: true };
  }

  // mosaic: downscale here, upscale with nearest neighbor at composite time
  const block = Math.max(2, Math.round(opts.strength));
  const sw = Math.max(1, Math.ceil(w / block));
  const sh = Math.max(1, Math.ceil(h / block));
  const c = document.createElement('canvas');
  c.width = sw;
  c.height = sh;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, sw, sh);
  return { canvas: c, pad: 0, drawW: w, drawH: h, smooth: false };
}

/**
 * Draw the full scene in image coordinates. The caller sets the transform:
 * preview passes a view matrix (pan/zoom × dpr), export uses identity at
 * full resolution — both go through here so output matches the preview.
 */
export function renderScene(
  ctx: CanvasRenderingContext2D,
  img: ImageBitmap,
  sel: Selection | null,
  fx: EffectState,
  obscure: ObscureLayer | null,
): void {
  const w = img.width;
  const h = img.height;
  ctx.drawImage(img, 0, 0);

  // Path covering everything except the selection (evenodd of image + selection).
  const outside = new Path2D();
  outside.rect(0, 0, w, h);
  if (sel) outside.addPath(selectionPath(sel, fx.radius));

  if (obscure) {
    ctx.save();
    ctx.clip(outside, 'evenodd');
    ctx.imageSmoothingEnabled = obscure.smooth;
    ctx.drawImage(obscure.canvas, -obscure.pad, -obscure.pad, obscure.drawW, obscure.drawH);
    ctx.restore();
  }

  if (fx.overlay.enabled && fx.overlay.opacity > 0) {
    ctx.save();
    ctx.clip(outside, 'evenodd');
    ctx.fillStyle =
      fx.overlay.color === 'white'
        ? `rgba(255,255,255,${fx.overlay.opacity})`
        : `rgba(0,0,0,${fx.overlay.opacity})`;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  if (sel) {
    const selPath = selectionPath(sel, fx.radius);

    if (fx.magnify.enabled && fx.magnify.factor > 1) {
      ctx.save();
      ctx.clip(selPath);
      const cx = sel.x + sel.w / 2;
      const cy = sel.y + sel.h / 2;
      const f = fx.magnify.factor;
      ctx.translate(cx, cy);
      ctx.scale(f, f);
      ctx.translate(-cx, -cy);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    }

    if (fx.stroke.enabled && fx.stroke.width > 0) {
      ctx.lineWidth = fx.stroke.width;
      ctx.strokeStyle = fx.stroke.color;
      ctx.stroke(selPath);
    }
  }
}
