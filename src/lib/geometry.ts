import type { Selection } from '../types';

export interface Pt {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const HANDLES: readonly Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

const OPPOSITE: Record<Handle, Handle> = {
  nw: 'se',
  n: 's',
  ne: 'sw',
  e: 'w',
  se: 'nw',
  s: 'n',
  sw: 'ne',
  w: 'e',
};

export const HANDLE_CURSOR: Record<Handle, string> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
};

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function normalizeBox(a: Pt, b: Pt): Box {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  };
}

/** Constrain a drag to a square / circle anchored at the start point. */
export function constrainSquare(start: Pt, cur: Pt): Box {
  const dx = cur.x - start.x;
  const dy = cur.y - start.y;
  const s = Math.max(Math.abs(dx), Math.abs(dy));
  return normalizeBox(start, {
    x: start.x + (dx < 0 ? -s : s),
    y: start.y + (dy < 0 ? -s : s),
  });
}

export function clampBox(b: Box, imgW: number, imgH: number): Box {
  const x = clamp(b.x, 0, imgW);
  const y = clamp(b.y, 0, imgH);
  return { x, y, w: clamp(b.x + b.w, 0, imgW) - x, h: clamp(b.y + b.h, 0, imgH) - y };
}

export function clampPosition(sel: Selection, imgW: number, imgH: number): Selection {
  return {
    ...sel,
    x: clamp(sel.x, 0, imgW - sel.w),
    y: clamp(sel.y, 0, imgH - sel.h),
  };
}

export function handlePoint(sel: Selection, handle: Handle): Pt {
  const midX = sel.x + sel.w / 2;
  const midY = sel.y + sel.h / 2;
  switch (handle) {
    case 'nw':
      return { x: sel.x, y: sel.y };
    case 'n':
      return { x: midX, y: sel.y };
    case 'ne':
      return { x: sel.x + sel.w, y: sel.y };
    case 'e':
      return { x: sel.x + sel.w, y: midY };
    case 'se':
      return { x: sel.x + sel.w, y: sel.y + sel.h };
    case 's':
      return { x: midX, y: sel.y + sel.h };
    case 'sw':
      return { x: sel.x, y: sel.y + sel.h };
    case 'w':
      return { x: sel.x, y: midY };
  }
}

export function hitHandle(sel: Selection, p: Pt, tol: number): Handle | null {
  for (const h of HANDLES) {
    const hp = handlePoint(sel, h);
    if (Math.abs(p.x - hp.x) <= tol && Math.abs(p.y - hp.y) <= tol) return h;
  }
  return null;
}

export function hitInside(sel: Selection, p: Pt): boolean {
  if (sel.shape === 'ellipse') {
    const rx = sel.w / 2;
    const ry = sel.h / 2;
    if (rx <= 0 || ry <= 0) return false;
    const dx = (p.x - (sel.x + rx)) / rx;
    const dy = (p.y - (sel.y + ry)) / ry;
    return dx * dx + dy * dy <= 1;
  }
  return p.x >= sel.x && p.x <= sel.x + sel.w && p.y >= sel.y && p.y <= sel.y + sel.h;
}

/**
 * Resize by dragging one handle. The opposite handle / edge stays anchored.
 * keepAspect (Shift) only applies to corner handles.
 */
export function resizeSelection(
  orig: Selection,
  handle: Handle,
  p: Pt,
  imgW: number,
  imgH: number,
  keepAspect: boolean,
): Selection {
  const isCorner = handle.length === 2;
  let x1 = orig.x;
  let y1 = orig.y;
  let x2 = orig.x + orig.w;
  let y2 = orig.y + orig.h;
  if (handle.includes('n')) y1 = p.y;
  if (handle.includes('s')) y2 = p.y;
  if (handle.includes('w')) x1 = p.x;
  if (handle.includes('e')) x2 = p.x;

  let nx = Math.min(x1, x2);
  let ny = Math.min(y1, y2);
  let nw = Math.max(Math.abs(x2 - x1), 2);
  let nh = Math.max(Math.abs(y2 - y1), 2);

  if (keepAspect && isCorner && orig.w > 0 && orig.h > 0) {
    const aspect = orig.w / orig.h;
    if (nw / nh > aspect) nh = nw / aspect;
    else nw = nh * aspect;
    const a = handlePoint(orig, OPPOSITE[handle]);
    nx = handle.includes('w') ? a.x - nw : a.x;
    ny = handle.includes('n') ? a.y - nh : a.y;
  }

  return { shape: orig.shape, ...clampBox({ x: nx, y: ny, w: nw, h: nh }, imgW, imgH) };
}

export function selectionPath(sel: Selection, radiusRatio: number): Path2D {
  const p = new Path2D();
  const { x, y, w, h } = sel;
  if (sel.shape === 'ellipse') {
    p.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else if (sel.shape === 'roundRect' && radiusRatio > 0) {
    const r = Math.min(radiusRatio * Math.min(w, h), Math.min(w, h) / 2);
    p.moveTo(x + r, y);
    p.arcTo(x + w, y, x + w, y + h, r);
    p.arcTo(x + w, y + h, x, y + h, r);
    p.arcTo(x, y + h, x, y, r);
    p.arcTo(x, y, x + w, y, r);
    p.closePath();
  } else {
    p.rect(x, y, w, h);
  }
  return p;
}
