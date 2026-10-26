export type Shape = 'rect' | 'roundRect' | 'ellipse';

/** Bounding box in original image pixels (w, h > 0). */
export interface Selection {
  shape: Shape;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface EffectState {
  /** Dim layer applied outside the selection. */
  overlay: { enabled: boolean; color: 'black' | 'white'; opacity: number };
  /** Blur / mosaic applied outside the selection; strength is in image px. */
  obscure: { mode: 'none' | 'blur' | 'mosaic'; strength: number };
  stroke: { enabled: boolean; color: string; width: number };
  /** Loupe: magnify content inside the selection around its center. */
  magnify: { enabled: boolean; factor: number };
  /** roundRect corner radius as a fraction of min(w, h), 0 ~ 0.5. */
  radius: number;
}

export interface EditorState {
  selection: Selection | null;
  effects: EffectState;
}

export interface LoadedImage {
  bitmap: ImageBitmap;
  name: string;
  width: number;
  height: number;
}

export type ExportFormat = 'png' | 'jpeg' | 'webp';

export const DEFAULT_EFFECTS: EffectState = {
  overlay: { enabled: true, color: 'black', opacity: 0.5 },
  obscure: { mode: 'none', strength: 16 },
  stroke: { enabled: true, color: '#ff4d4f', width: 6 },
  magnify: { enabled: false, factor: 2 },
  radius: 0.25,
};
