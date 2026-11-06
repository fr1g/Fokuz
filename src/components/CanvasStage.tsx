import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  HANDLE_CURSOR,
  HANDLES,
  clamp,
  clampBox,
  clampPosition,
  constrainSquare,
  handlePoint,
  hitHandle,
  hitInside,
  normalizeBox,
  resizeSelection,
  type Handle,
  type Pt,
} from '../lib/geometry';
import { buildObscureLayer, renderScene } from '../lib/render';
import type { EditorState, LoadedImage, Selection, Shape } from '../types';

const HANDLE_TOL_PX = 12; // handle hit threshold in screen px
const MAX_SCALE = 8;

interface View {
  scale: number; // screen px per image px
  x: number;
  y: number;
}

type Gesture =
  | {
      kind: 'draw';
      start: Pt;
      startScreen: Pt;
      baseline: EditorState;
      active: boolean;
      /** Last previewed selection — avoids depending on React having flushed. */
      last: Selection | null;
    }
  | { kind: 'move'; grab: Pt; baseline: EditorState; orig: Selection }
  | { kind: 'resize'; handle: Handle; baseline: EditorState; orig: Selection }
  | { kind: 'pan'; last: Pt }
  | { kind: 'pinch' };

interface CanvasStageProps {
  image: LoadedImage;
  tool: Shape;
  state: EditorState;
  onPreview: (next: EditorState) => void;
  onCommitBaseline: (baseline: EditorState) => void;
}

export function CanvasStage({ image, tool, state, onPreview, onCommitBaseline }: CanvasStageProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [view, setViewState] = useState<View>({ scale: 1, x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  // Mirror props into refs so native event listeners always read fresh values.
  const viewRef = useRef(view);
  const stateRef = useRef(state);
  const toolRef = useRef(tool);
  const imageRef = useRef(image);
  viewRef.current = view;
  stateRef.current = state;
  toolRef.current = tool;
  imageRef.current = image;
  const onPreviewRef = useRef(onPreview);
  const onCommitRef = useRef(onCommitBaseline);
  onPreviewRef.current = onPreview;
  onCommitRef.current = onCommitBaseline;

  const gestureRef = useRef<Gesture | null>(null);
  const pointersRef = useRef(new Map<number, Pt>());
  const pinchRef = useRef<{ dist: number; center: Pt; view: View } | null>(null);
  const spaceRef = useRef(false);
  const didFitRef = useRef(false);

  // Rebuilt only when mode/strength changes, so dragging stays smooth.
  const obscureLayer = useMemo(
    () => buildObscureLayer(image.bitmap, state.effects.obscure),
    [image, state.effects.obscure.mode, state.effects.obscure.strength],
  );
  const obscureRef = useRef(obscureLayer);
  obscureRef.current = obscureLayer;

  // ---------- rendering ----------

  const draw = useCallback(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const cw = wrap.clientWidth;
    const ch = wrap.clientHeight;
    if (cw === 0 || ch === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const bw = Math.round(cw * dpr);
    const bh = Math.round(ch * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const v = viewRef.current;
    const st = stateRef.current;
    const img = imageRef.current;

    ctx.setTransform(dpr * v.scale, 0, 0, dpr * v.scale, dpr * v.x, dpr * v.y);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    renderScene(ctx, img.bitmap, st.selection, st.effects, obscureRef.current);

    // Screen-space overlays from here on (CSS px units).
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sel = st.selection;
    if (sel) {
      const g = gestureRef.current?.kind;
      if (g === 'draw' || g === 'move' || g === 'resize') drawGuides(ctx, sel, v);
      else drawHandles(ctx, sel, v);
    }
  }, []);

  const rafRef = useRef(0);
  const scheduleDraw = useCallback(() => {
    if (rafRef.current === 0) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        draw();
      });
    }
  }, [draw]);

  useEffect(() => {
    scheduleDraw();
  }, [state, view, obscureLayer, scheduleDraw]);

  // ---------- view helpers ----------

  const fitView = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const img = imageRef.current;
    const cw = wrap.clientWidth;
    const ch = wrap.clientHeight;
    if (cw === 0 || ch === 0) return;
    const scale = Math.min(cw / img.width, ch / img.height);
    const v: View = {
      scale,
      x: (cw - img.width * scale) / 2,
      y: (ch - img.height * scale) / 2,
    };
    viewRef.current = v;
    setViewState(v);
  }, []);

  useEffect(() => {
    didFitRef.current = false;
  }, [image]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setContainerSize((prev) =>
        Math.abs(prev.w - r.width) < 0.5 && Math.abs(prev.h - r.height) < 0.5
          ? prev
          : { w: r.width, h: r.height },
      );
      scheduleDraw();
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [scheduleDraw]);

  useEffect(() => {
    if (!didFitRef.current && containerSize.w > 0 && containerSize.h > 0) {
      didFitRef.current = true;
      fitView();
    }
  }, [image, containerSize, fitView]);

  const minScale = () => {
    const wrap = wrapRef.current;
    const img = imageRef.current;
    if (!wrap || wrap.clientWidth === 0 || wrap.clientHeight === 0) return 0.01;
    return Math.min(wrap.clientWidth / img.width, wrap.clientHeight / img.height);
  };

  const applyView = (v: View) => {
    viewRef.current = v;
    setViewState(v);
  };

  const screenPtOf = (e: { clientX: number; clientY: number }): Pt => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const toImage = (sp: Pt): Pt => {
    const v = viewRef.current;
    return { x: (sp.x - v.x) / v.scale, y: (sp.y - v.y) / v.scale };
  };

  const clampToImagePt = (p: Pt): Pt => {
    const img = imageRef.current;
    return { x: clamp(p.x, 0, img.width), y: clamp(p.y, 0, img.height) };
  };

  const zoomAt = (sp: Pt, factor: number) => {
    const v = viewRef.current;
    const scale = clamp(v.scale * factor, minScale(), MAX_SCALE);
    if (scale === v.scale) return;
    const ip = toImage(sp);
    applyView({ scale, x: sp.x - ip.x * scale, y: sp.y - ip.y * scale });
  };

  const zoomAtCenter = (factor: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    zoomAt({ x: wrap.clientWidth / 2, y: wrap.clientHeight / 2 }, factor);
  };

  // ---------- interaction ----------

  const updateCursor = (sp: Pt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (spaceRef.current) {
      canvas.style.cursor = 'grab';
      return;
    }
    const g = gestureRef.current;
    if (g) {
      canvas.style.cursor =
        g.kind === 'pan'
          ? 'grabbing'
          : g.kind === 'pinch'
            ? 'grab'
            : g.kind === 'move'
              ? 'move'
              : g.kind === 'resize'
                ? HANDLE_CURSOR[g.handle]
                : 'crosshair';
      return;
    }
    const sel = stateRef.current.selection;
    if (sel) {
      const ip = toImage(sp);
      const h = hitHandle(sel, ip, HANDLE_TOL_PX / viewRef.current.scale);
      if (h) {
        canvas.style.cursor = HANDLE_CURSOR[h];
        return;
      }
      if (hitInside(sel, ip)) {
        canvas.style.cursor = 'move';
        return;
      }
    }
    canvas.style.cursor = 'crosshair';
  };

  const cancelGesture = () => {
    const g = gestureRef.current;
    if (g && (g.kind === 'draw' || g.kind === 'move' || g.kind === 'resize')) {
      onPreviewRef.current(g.baseline);
    }
    gestureRef.current = null;
    pinchRef.current = null;
    scheduleDraw();
  };

  useEffect(() => {
    const canvas = canvasRef.current!;
    if (!canvas) return;

    const centroidOf = (pts: Pt[]): Pt => ({
      x: (pts[0].x + pts[1].x) / 2,
      y: (pts[0].y + pts[1].y) / 2,
    });

    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 2) return;
      e.preventDefault();
      // Synthetic pointers (tests) have no active pointer id to capture.
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      const sp = screenPtOf(e);
      pointersRef.current.set(e.pointerId, sp);

      // Second finger → pinch zoom / pan takes over whatever was happening.
      if (pointersRef.current.size === 2) {
        cancelGesture();
        const pts = [...pointersRef.current.values()];
        const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
        pinchRef.current = { dist: d, center: centroidOf(pts), view: viewRef.current };
        gestureRef.current = { kind: 'pinch' };
        canvas.style.cursor = 'grab';
        return;
      }
      if (pointersRef.current.size > 2) return;

      if (e.button === 1 || spaceRef.current) {
        gestureRef.current = { kind: 'pan', last: sp };
        canvas.style.cursor = 'grabbing';
        return;
      }
      if (e.button !== 0) return;

      const ip = toImage(sp);
      const sel = stateRef.current.selection;
      const tol = HANDLE_TOL_PX / viewRef.current.scale;
      if (sel) {
        const h = hitHandle(sel, ip, tol);
        if (h) {
          gestureRef.current = { kind: 'resize', handle: h, baseline: stateRef.current, orig: sel };
          return;
        }
        if (hitInside(sel, ip)) {
          gestureRef.current = {
            kind: 'move',
            grab: { x: ip.x - sel.x, y: ip.y - sel.y },
            baseline: stateRef.current,
            orig: sel,
          };
          return;
        }
      }
      gestureRef.current = {
        kind: 'draw',
        start: clampToImagePt(ip),
        startScreen: sp,
        baseline: stateRef.current,
        active: false,
        last: null,
      };
    };

    const onPointerMove = (e: PointerEvent) => {
      const sp = screenPtOf(e);
      if (pointersRef.current.has(e.pointerId)) pointersRef.current.set(e.pointerId, sp);

      const g = gestureRef.current;

      if (g?.kind === 'pinch') {
        if (pointersRef.current.size >= 2 && pinchRef.current) {
          const pts = [...pointersRef.current.values()];
          const p0 = pinchRef.current;
          const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
          const c = centroidOf(pts);
          const scale = clamp((p0.view.scale * d) / p0.dist, minScale(), MAX_SCALE);
          const imgC = {
            x: (p0.center.x - p0.view.x) / p0.view.scale,
            y: (p0.center.y - p0.view.y) / p0.view.scale,
          };
          applyView({ scale, x: c.x - imgC.x * scale, y: c.y - imgC.y * scale });
        }
        return;
      }
      if (!g) {
        updateCursor(sp);
        return;
      }

      switch (g.kind) {
        case 'pan': {
          const v = viewRef.current;
          applyView({ ...v, x: v.x + (sp.x - g.last.x), y: v.y + (sp.y - g.last.y) });
          g.last = sp;
          break;
        }
        case 'draw': {
          if (!g.active && Math.hypot(sp.x - g.startScreen.x, sp.y - g.startScreen.y) < 4) break;
          g.active = true;
          const img = imageRef.current;
          const ip = clampToImagePt(toImage(sp));
          const base = e.shiftKey ? constrainSquare(g.start, ip) : normalizeBox(g.start, ip);
          const sel: Selection = { shape: toolRef.current, ...clampBox(base, img.width, img.height) };
          g.last = sel;
          onPreviewRef.current({ ...stateRef.current, selection: sel });
          break;
        }
        case 'move': {
          const ip = toImage(sp);
          const img = imageRef.current;
          const sel = clampPosition(
            { ...g.orig, x: ip.x - g.grab.x, y: ip.y - g.grab.y },
            img.width,
            img.height,
          );
          onPreviewRef.current({ ...stateRef.current, selection: sel });
          break;
        }
        case 'resize': {
          const ip = clampToImagePt(toImage(sp));
          const img = imageRef.current;
          const sel = resizeSelection(g.orig, g.handle, ip, img.width, img.height, e.shiftKey);
          onPreviewRef.current({ ...stateRef.current, selection: sel });
          break;
        }
      }
    };

    const finish = (e: PointerEvent, cancelled: boolean) => {
      pointersRef.current.delete(e.pointerId);
      const g = gestureRef.current;
      if (g?.kind === 'pinch') {
        if (pointersRef.current.size < 2) {
          gestureRef.current = null;
          pinchRef.current = null;
        }
        return;
      }
      if (!g) return;
      if (g.kind === 'move' || g.kind === 'resize') {
        if (!cancelled) onCommitRef.current(g.baseline);
        else onPreviewRef.current(g.baseline);
      } else if (g.kind === 'draw') {
        const sel = g.last;
        const valid = !cancelled && g.active && !!sel && sel.w >= 2 && sel.h >= 2;
        if (valid) onCommitRef.current(g.baseline);
        else onPreviewRef.current(g.baseline);
      }
      gestureRef.current = null;
      updateCursor(screenPtOf(e));
      scheduleDraw();
    };
    const onPointerUp = (e: PointerEvent) => finish(e, false);
    const onPointerCancel = (e: PointerEvent) => finish(e, true);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(screenPtOf(e), Math.exp(-e.deltaY * 0.0015));
    };
    const onDoubleClick = () => fitView();
    const onContextMenu = (e: Event) => e.preventDefault();

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerCancel);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('dblclick', onDoubleClick);
    canvas.addEventListener('contextmenu', onContextMenu);
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('dblclick', onDoubleClick);
      canvas.removeEventListener('contextmenu', onContextMenu);
    };
    // All handlers read state through refs, so they only need to be bound once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Space = temporary pan tool.
  useEffect(() => {
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return (
        !!el &&
        (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
      );
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isTyping(e.target)) return;
      e.preventDefault();
      if (!spaceRef.current) {
        spaceRef.current = true;
        const c = canvasRef.current;
        if (c && !gestureRef.current) c.style.cursor = 'grab';
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      spaceRef.current = false;
      const c = canvasRef.current;
      if (c && !gestureRef.current) c.style.cursor = 'crosshair';
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const zoomPct = Math.round(view.scale * 100);
  const atMin = view.scale <= minScale() + 0.0001;
  const atMax = view.scale >= MAX_SCALE - 0.0001;

  return (
    <div ref={wrapRef} className="relative min-h-0 flex-1 touch-none select-none overflow-hidden bg-[#121212]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />
      <div className="absolute right-3 bottom-14 flex items-center overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900/90 text-sm shadow-lg md:bottom-3">
        <button
          type="button"
          title="缩小"
          disabled={atMin}
          onClick={() => zoomAtCenter(1 / 1.25)}
          className="h-8 w-8 text-neutral-300 hover:bg-neutral-700 hover:text-white disabled:pointer-events-none disabled:opacity-30"
        >
          −
        </button>
        <span className="w-13 text-center tabular-nums text-neutral-300">{zoomPct}%</span>
        <button
          type="button"
          title="放大"
          disabled={atMax}
          onClick={() => zoomAtCenter(1.25)}
          className="h-8 w-8 text-neutral-300 hover:bg-neutral-700 hover:text-white disabled:pointer-events-none disabled:opacity-30"
        >
          +
        </button>
        <button
          type="button"
          title="适应窗口（双击画布空白处）"
          onClick={fitView}
          className="h-8 border-l border-neutral-700 px-2 text-xs text-neutral-300 hover:bg-neutral-700 hover:text-white"
        >
          适应
        </button>
      </div>
    </div>
  );
}

// ---------- screen-space overlays ----------

function drawGuides(ctx: CanvasRenderingContext2D, sel: Selection, v: View) {
  const x1 = sel.x * v.scale + v.x;
  const y1 = sel.y * v.scale + v.y;
  const x2 = (sel.x + sel.w) * v.scale + v.x;
  const y2 = (sel.y + sel.h) * v.scale + v.y;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  ctx.save();
  // Cross lines: for ellipse these are the two diameters (major/minor axes),
  // for rect / roundRect the center lines marking width and height.
  for (const pass of [0, 1]) {
    ctx.strokeStyle = pass === 0 ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.95)';
    ctx.lineWidth = pass === 0 ? 3 : 1.25;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(x1, cy);
    ctx.lineTo(x2, cy);
    ctx.moveTo(cx, y1);
    ctx.lineTo(cx, y2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.font = '600 12px ui-sans-serif, system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  outlineText(ctx, `${Math.round(sel.w)} px`, cx, cy - 14);
  outlineText(ctx, `${Math.round(sel.h)} px`, cx, cy + 15);
  ctx.restore();
}

function outlineText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x, y);
}

function drawHandles(ctx: CanvasRenderingContext2D, sel: Selection, v: View) {
  ctx.save();
  for (const h of HANDLES) {
    const p = handlePoint(sel, h);
    const sx = p.x * v.scale + v.x;
    const sy = p.y * v.scale + v.y;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(sx - 4, sy - 4, 8, 8);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
