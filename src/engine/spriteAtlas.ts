import { SVG_PATHS, TaxonVisual } from '../assets/icons/taxaIcons';

export interface PreloadedSprites {
  taxa: Map<string, HTMLCanvasElement>;
  star: HTMLCanvasElement;
  comment: HTMLCanvasElement;
  photos: Map<number, HTMLImageElement>;
}

export function renderSvgToCanvas(svgPath: string, fillColor: string, size = 48): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Scale from 24x24 viewBox to target size
  const scale = size / 24;
  ctx.save();
  ctx.scale(scale, scale);
  const path2d = new Path2D(svgPath);
  ctx.fillStyle = fillColor;
  ctx.fill(path2d);
  ctx.restore();

  return canvas;
}

export async function preloadSprites(
  visuals: TaxonVisual[],
  photoUrls: { id: number; url: string }[],
  onProgress?: (progress: number) => void
): Promise<PreloadedSprites> {
  const taxaMap = new Map<string, HTMLCanvasElement>();

  // Render taxa icons
  for (const v of visuals) {
    taxaMap.set(v.key, renderSvgToCanvas(v.svgPath, v.color, 48));
  }

  // Render star and comment icons
  const starCanvas = renderSvgToCanvas(SVG_PATHS.star, '#ffb300', 48);
  const commentCanvas = renderSvgToCanvas(SVG_PATHS.comment, '#00e5ff', 48);

  // Preload highlight photos
  const photoMap = new Map<number, HTMLImageElement>();
  let loaded = 0;
  const total = photoUrls.length;

  await Promise.all(
    photoUrls.map(({ id, url }) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          photoMap.set(id, img);
          loaded++;
          if (onProgress && total > 0) onProgress(loaded / total);
          resolve();
        };
        img.onerror = () => {
          // If fails to load photo, proceed gracefully
          loaded++;
          if (onProgress && total > 0) onProgress(loaded / total);
          resolve();
        };
        img.src = url;
      });
    })
  );

  return {
    taxa: taxaMap,
    star: starCanvas,
    comment: commentCanvas,
    photos: photoMap,
  };
}

