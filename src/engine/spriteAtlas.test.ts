import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadPhotoWithFallback, preloadSprites } from './spriteAtlas';

describe('spriteAtlas photo loading', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('handles image loading gracefully without throwing', async () => {
    // In Node / jsdom environment, Image can be mocked
    const originalImage = globalThis.Image;
    try {
      let callCount = 0;
      // @ts-expect-error Mocking Image constructor for test
      globalThis.Image = class {
        crossOrigin = '';
        src = '';
        naturalWidth = 200;
        naturalHeight = 200;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;

        constructor() {
          callCount++;
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 5);
        }
      };

      const img = await loadPhotoWithFallback('https://static.inaturalist.org/photos/123/medium.jpg');
      expect(img).toBeDefined();
      expect(callCount).toBeGreaterThan(0);
    } finally {
      globalThis.Image = originalImage;
    }
  });

  it('preloadSprites completes progress even when photo list is empty', async () => {
    let progressVal = 0;
    const sprites = await preloadSprites([], [], (p) => {
      progressVal = p;
    });

    expect(sprites.photos.size).toBe(0);
    expect(progressVal).toBe(1);
  });
});
