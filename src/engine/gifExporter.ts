import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { ExportProgress } from '../types/export';

export interface GifRenderFrameCallback {
  (timeSec: number, targetCanvas: HTMLCanvasElement): Promise<void>;
}

export async function exportToGif(
  durationSeconds: number,
  renderFrame: GifRenderFrameCallback,
  onProgress?: (progress: ExportProgress) => void,
  fps = 15,
  width = 640,
  height = 360
): Promise<Blob> {
  const gif = GIFEncoder();
  const totalFrames = Math.max(1, Math.ceil(durationSeconds * fps));
  const delayMs = Math.round(1000 / fps);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Nelze vytvořit 2D canvas pro GIF');

  for (let f = 0; f < totalFrames; f++) {
    const t = f / fps;
    await renderFrame(t, canvas);

    const imgData = ctx.getImageData(0, 0, width, height);
    const palette = quantize(imgData.data, 256, { format: 'rgba4444' });
    const index = applyPalette(imgData.data, palette, 'rgba4444');

    gif.writeFrame(index, width, height, { palette, delay: delayMs });

    if (onProgress) {
      onProgress({
        currentFrame: f + 1,
        totalFrames,
        percentage: Math.round(((f + 1) / totalFrames) * 100),
        phase: 'rendering',
      });
    }
  }

  gif.finish();
  const bytes = gif.bytes();
  return new Blob([bytes as unknown as BlobPart], { type: 'image/gif' });
}
