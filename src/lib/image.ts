import UTIF from 'utif';
import type { LoadedImage, SourceFormat } from '../types';
import { estimateJpegQuality } from './jpegQuality';

/**
 * Formats the browser can re-encode via canvas. "原格式" export is only
 * offered for these; everything else (HEIC/AVIF/GIF/BMP) is decode-only.
 */
export const ORIGINAL_EXPORTABLE: Record<SourceFormat, boolean> = {
  png: true,
  jpeg: true,
  webp: true,
  tiff: true,
  heic: false,
  avif: false,
  gif: false,
  bmp: false,
  unknown: false,
};

export const SOURCE_LABEL: Record<SourceFormat, string> = {
  png: 'PNG',
  jpeg: 'JPEG',
  webp: 'WebP',
  tiff: 'TIFF',
  heic: 'HEIC',
  avif: 'AVIF',
  gif: 'GIF',
  bmp: 'BMP',
  unknown: 'Unknown',
};

/** Sniff the real container format from magic bytes; MIME is only a fallback. */
export async function detectFormat(file: File): Promise<SourceFormat> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const ascii = (start: number, len: number) =>
    String.fromCharCode(...head.slice(start, start + len));

  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'jpeg';
  if (head[0] === 0x89 && ascii(1, 3) === 'PNG') return 'png';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'webp';
  if (ascii(0, 2) === 'II' && head[2] === 0x2a) return 'tiff';
  if (ascii(0, 2) === 'MM' && head[3] === 0x2a) return 'tiff';
  if (ascii(0, 3) === 'GIF') return 'gif';
  if (head[0] === 0x42 && head[1] === 0x4d) return 'bmp';
  if (ascii(4, 4) === 'ftyp') {
    const brand = ascii(8, 4).toLowerCase();
    if (brand.startsWith('avi')) return 'avif'; // avif / avis
    return 'heic'; // heic / heix / hevc / heif / mif1 / msf1 / ...
  }

  switch (file.type) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpeg';
    case 'image/webp':
      return 'webp';
    case 'image/tiff':
      return 'tiff';
    case 'image/heic':
    case 'image/heif':
      return 'heic';
    case 'image/avif':
      return 'avif';
    case 'image/gif':
      return 'gif';
    case 'image/bmp':
      return 'bmp';
    default:
      return 'unknown';
  }
}

async function decodeHeic(file: File): Promise<ImageBitmap> {
  // libheif wasm is large — load it only when actually needed.
  const heic2any = (await import('heic2any')).default;
  const out = await heic2any({ blob: file, toType: 'image/png' });
  const blob = Array.isArray(out) ? out[0] : out;
  return createImageBitmap(blob);
}

async function decodeTiff(file: File): Promise<ImageBitmap> {
  const buffer = await file.arrayBuffer();
  const ifds = UTIF.decode(buffer);
  if (ifds.length === 0) throw new Error('empty tiff');
  UTIF.decodeImage(buffer, ifds[0], ifds);
  const rgba = UTIF.toRGBA8(ifds[0]);
  const data = new ImageData(new Uint8ClampedArray(rgba), ifds[0].width, ifds[0].height);
  return createImageBitmap(data);
}

export async function decodeImageFile(
  file: File,
  sourceFormat: SourceFormat,
): Promise<LoadedImage> {
  let bitmap: ImageBitmap;
  let originalQuality: number | null = null;
  if (sourceFormat === 'heic') {
    bitmap = await decodeHeic(file);
  } else if (sourceFormat === 'tiff') {
    bitmap = await decodeTiff(file);
  } else {
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      bitmap = await createImageBitmap(file);
    }
    if (sourceFormat === 'jpeg') {
      // DQT lives in the first few KB; read a generous slice.
      const head = new Uint8Array(await file.slice(0, 65536).arrayBuffer());
      originalQuality = estimateJpegQuality(head);
    }
  }
  return {
    bitmap,
    name: file.name || 'clipboard-image.' + (sourceFormat === 'unknown' ? 'png' : sourceFormat),
    width: bitmap.width,
    height: bitmap.height,
    sourceFormat,
    originalQuality,
  };
}
