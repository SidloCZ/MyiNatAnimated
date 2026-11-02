import { SVG_ELEMENTS, TaxonVisual } from '../assets/icons/taxaIcons';

export interface PreloadedSprites {
  taxa: Map<string, HTMLCanvasElement>;
  star: HTMLCanvasElement;
  comment: HTMLCanvasElement;
  photos: Map<number, HTMLImageElement>;
}

export function renderSvgToCanvasAsync(svgInner: string, fillColor: string, size = 64): Promise<HTMLCanvasElement> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve({ width: size, height: size } as unknown as HTMLCanvasElement);
      return;
    }
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

/**
 * Loads a photo with a multi-tier fallback:
 * 1. Direct load with crossOrigin = 'anonymous' (works for AWS S3 Open Data, Unsplash, Flickr, etc.)
 * 2. CORS-enabled proxy via images.weserv.nl with crossOrigin = 'anonymous' (provides CORS headers
 *    for static.inaturalist.org so canvas is not tainted for MP4/GIF export)
 * 3. Direct load without crossOrigin attribute (guarantees image display in player canvas even if offline/proxy unreachable)
 */
export function loadPhotoWithFallback(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    // 1. Try direct with crossOrigin
    const directCors = new Image();
    directCors.crossOrigin = 'anonymous';
    directCors.onload = () => resolve(directCors);
    directCors.onerror = () => {
      // 2. Try proxy with crossOrigin for clean canvas export
      const cleanUrl = url.replace(/^https?:\/\//, '');
      const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=800`;
      const proxyImg = new Image();
      proxyImg.crossOrigin = 'anonymous';
      proxyImg.onload = () => resolve(proxyImg);
      proxyImg.onerror = () => {
        // 3. Fallback to direct without crossOrigin attribute (always renders in player)
        const directImg = new Image();
        directImg.onload = () => resolve(directImg);
        directImg.onerror = (e) => reject(e);
        directImg.src = url;
      };
      proxyImg.src = proxyUrl;
    };
    directCors.src = url;
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
    photoUrls.map(async ({ id, url }) => {
      try {
        const img = await loadPhotoWithFallback(url);
        if (img) {
          photoMap.set(id, img);
        }
      } catch {
        // Gracefully ignore failed images
      } finally {
        loaded++;
        if (onProgress && total > 0) {
          onProgress(loaded / total);
        }
      }
    })
  );

  return {
    taxa: taxaMap,
    star: starCanvas,
    comment: commentCanvas,
    photos: photoMap,
  };
}
