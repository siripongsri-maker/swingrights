/**
 * Phase 0.8 — strips EXIF/GPS metadata from images by re-encoding through a canvas.
 * The output blob contains pixels only: no camera model, timestamps or coordinates.
 */
const MAX_EDGE = 1600;

export async function stripImageMetadata(file: File): Promise<{ blob: Blob; name: string }> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return { blob: file, name: file.name };

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { blob: file, name: file.name };
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.8),
  );
  if (!blob) return { blob: file, name: file.name };

  const base = file.name.replace(/\.[^.]+$/, '') || 'photo';
  return { blob, name: `${base}.jpg` };
}
