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
  height = 360,
  speed = 1.0
): Promise<Blob> {
  const gif = GIFEncoder();
  const effectiveSpeed = speed > 0 ? speed : 1.0;
  const outputDuration = durationSeconds / effectiveSpeed;
  const totalFrames = Math.max(1, Math.ceil(outputDuration * fps));
  const delayMs = Math.round(1000 / fps);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Cannot create a 2D canvas for GIF encoding');

  for (let f = 0; f < totalFrames; f++) {
    const outputTime = f / fps;
    const timelineTime = Math.min(durationSeconds, outputTime * effectiveSpeed);
    await renderFrame(timelineTime, canvas);

    const imgData = ctx.getImageData(0, 0, width, height);
    const palette = quantize(imgData.data, 256, { format: 'rgb565' });
    const index = applyPalette(imgData.data, palette, 'rgb565');

    gif.writeFrame(index, width, height, { palette, delay: delayMs });

    if (onProgress) {
      onProgress({
        currentFrame: f + 1,
        totalFrames,
        percentage: Math.round(((f + 1) / totalFrames) * 100),
        phase: 'rendering',
      });
    }

    // Yield to event loop so React can render progress bar updates and prevent UI freeze
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  gif.finish();
  const bytes = gif.bytes();
  return new Blob([bytes as unknown as BlobPart], { type: 'image/gif' });
}
