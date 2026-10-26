import type { LoadedImage } from '../types';

export async function loadImageFile(file: File): Promise<LoadedImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    bitmap = await createImageBitmap(file);
  }
  return {
    bitmap,
    name: file.name || 'clipboard-image.png',
    width: bitmap.width,
    height: bitmap.height,
  };
}
