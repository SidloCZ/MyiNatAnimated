import { SVG_ELEMENTS, TaxonVisual } from '../assets/icons/taxaIcons';

export interface PreloadedSprites {
  taxa: Map<string, HTMLCanvasElement>;
  star: HTMLCanvasElement;
  comment: HTMLCanvasElement;
  photos: Map<number, HTMLImageElement>;
}

export function renderSvgToCanvasAsync(svgInner: string, fillColor: string, size = 64): Promise<HTMLCanvasElement> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(canvas);
      return;
    }

    const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="${fillColor}">${svgInner}</svg>`;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      resolve(canvas);
    };
    img.onerror = () => {
      resolve(canvas);
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(fullSvg);
  });
}

export async function preloadSprites(
  visuals: TaxonVisual[],
  photoUrls: { id: number; url: string }[],
  onProgress?: (progress: number) => void
): Promise<PreloadedSprites> {
  const taxaMap = new Map<string, HTMLCanvasElement>();

  // Render taxa icons asynchronously from official SVG vectors
  for (const v of visuals) {
    const canvas = await renderSvgToCanvasAsync(v.svgInner, v.color, 64);
    taxaMap.set(v.key, canvas);
  }

  // Render star and comment icons
  const starCanvas = await renderSvgToCanvasAsync(SVG_ELEMENTS.star || '', '#ffb300', 64);
  const commentCanvas = await renderSvgToCanvasAsync(SVG_ELEMENTS.comment || '', '#00e5ff', 64);

  // Preload highlight photos
  const photoMap = new Map<number, HTMLImageElement>();
  let loaded = 0;
  const total = photoUrls.length;

  if (total === 0 && onProgress) {
    onProgress(1);
  }

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
