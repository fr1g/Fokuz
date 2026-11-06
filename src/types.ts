export type Shape = 'rect' | 'roundRect' | 'ellipse';

/** Image container formats the tool can import. */
export type SourceFormat = 'png' | 'jpeg' | 'webp' | 'tiff' | 'heic' | 'avif' | 'gif' | 'bmp' | 'unknown';

export type ExportFormat = 'png' | 'jpeg' | 'webp' | 'tiff';

/** The three export buttons: keep the source format & specs, or re-encode. */
export type ExportChoice = 'original' | 'jpeg' | 'webp';

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
  /** Container format of the imported file; drives the default export format. */
  sourceFormat: SourceFormat;
  /** Estimated quality the source JPEG was encoded with (1-100), null otherwise. */
  originalQuality: number | null;
}

export const DEFAULT_EFFECTS: EffectState = {
  overlay: { enabled: true, color: 'black', opacity: 0.5 },
  obscure: { mode: 'none', strength: 16 },
  stroke: { enabled: true, color: '#ff4d4f', width: 6 },
  magnify: { enabled: false, factor: 2 },
  radius: 0.25,
};
