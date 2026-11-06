import UTIF from 'utif';
import type { EditorState, ExportChoice, ExportFormat, LoadedImage } from '../types';
import { buildObscureLayer, renderScene } from './render';

const MIME: Record<ExportFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  tiff: 'image/tiff',
};

export const EXT: Record<ExportFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
  tiff: 'tif',
};

function toBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), mime, quality));
}

/**
 * Map the dialog choice to a concrete format + quality:
 * - "original" keeps the source container and re-encodes with the source's
 *   own compression spec (JPEG: quality estimated from its DQT tables).
 * - "jpeg" / "webp" re-encode with the user-chosen quality.
 */
export function resolveExport(
  image: LoadedImage,
  choice: ExportChoice,
  quality: number,
): { format: ExportFormat; quality: number } {
  if (choice === 'jpeg') return { format: 'jpeg', quality };
  if (choice === 'webp') return { format: 'webp', quality };
  switch (image.sourceFormat) {
    case 'jpeg':
      return { format: 'jpeg', quality: image.originalQuality ?? 90 };
    case 'webp':
      return { format: 'webp', quality: 90 };
    case 'tiff':
      return { format: 'tiff', quality: 100 };
    default:
      return { format: 'png', quality: 100 };
  }
}

/** Render the final image at original resolution and encode it. */
export async function renderExport(
  image: LoadedImage,
  state: EditorState,
  format: ExportFormat,
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  if (format === 'jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  const obscure = buildObscureLayer(image.bitmap, state.effects.obscure);
  renderScene(ctx, image.bitmap, state.selection, state.effects, obscure);

  if (format === 'tiff') {
    // Uncompressed single-page TIFF (canvas cannot encode TIFF natively).
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const ab = UTIF.encodeImage(new Uint8Array(data.data), canvas.width, canvas.height);
    return new Blob([ab], { type: MIME.tiff });
  }

  const blob = await toBlob(canvas, MIME[format], quality / 100);
  if (!blob || blob.type !== MIME[format]) {
    // e.g. WebP encoding unsupported in this browser → lossless PNG fallback
    const png = await toBlob(canvas, 'image/png');
    if (png) return png;
  }
  if (!blob) throw new Error('export failed');
  return blob;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '') || 'image';
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
